"""
Recipes router — Bulk creation, inventory seeding, and recipe management CRUD.
"""
import uuid
import asyncio
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from pydantic import BaseModel

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.services.tenant_registry import get_tenant_models
from app.services.embeddings import get_embedding
from app.services.units import normalize_to_base, to_display_pair
from app.models.public import User, Tenant

router = APIRouter()


class RecipeIngredientIn(BaseModel):
    name: str
    unit: str
    quantity_per_serving: float
    category: str


class RecipeIn(BaseModel):
    dish_name: str
    ingredients: List[RecipeIngredientIn]


class BulkRecipeCreate(BaseModel):
    recipes: List[RecipeIn]


class RecipeIngredientUpdateItem(BaseModel):
    name: str
    unit: str
    quantity_per_serving: float
    category: str


class BulkRecipeIngredientsUpdate(BaseModel):
    ingredients: List[RecipeIngredientUpdateItem]


@router.post("/bulk-create", summary="Save reviewed recipes and seed starting inventory")
async def bulk_create_recipes(
    body: BulkRecipeCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    Recipe = models["recipes"]
    RecipeIngredient = models["recipe_ingredients"]
    InventoryItem = models["inventory"]

    user_record = await db.get(User, uuid.UUID(user["user_id"]))
    tenant_id_str = user.get("tenant_id")
    tenant_record = None
    if user_record and tenant_id_str:
        from app.models.public import UserTenantMembership
        from sqlalchemy import select
        mem_res = await db.execute(
            select(Tenant).join(UserTenantMembership, UserTenantMembership.tenant_id == Tenant.id)
            .where(UserTenantMembership.user_id == user_record.id, UserTenantMembership.tenant_id == uuid.UUID(tenant_id_str))
        )
        tenant_record = mem_res.scalar_one_or_none()
    spreadsheet_id = tenant_record.spreadsheet_id if tenant_record else None

    recorded_by_name = getattr(user_record, "name", None) if user_record else user["user_id"]
    if not recorded_by_name:
        recorded_by_name = user["user_id"]

    seen_ingredients = {}  # name.lower() -> {"name", "unit", "category"} — dedup across all recipes
    for r in body.recipes:
        recipe = Recipe(name=r.dish_name)
        db.add(recipe)
        await db.flush()  # get recipe.id before adding children
        for ing in r.ingredients:
            norm_qty, norm_unit = normalize_to_base(ing.quantity_per_serving, ing.unit)
            db.add(
                RecipeIngredient(
                    recipe_id=recipe.id,
                    item_name=ing.name,
                    unit=norm_unit,
                    quantity_per_serving=norm_qty,
                    category=ing.category,
                )
            )
            key = ing.name.strip().lower()
            if key not in seen_ingredients:
                seen_ingredients[key] = {"name": ing.name, "unit": norm_unit, "category": ing.category}

    created_items = []
    for ing in seen_ingredients.values():
        db.add(
            InventoryItem(
                item=ing["name"],
                unit=ing["unit"],
                current_qty=0.0,
                previous_qty=0.0,
                reorder_threshold=0.0,
                category=ing["category"],
                last_updated=datetime.now(timezone.utc),
                embedding=await asyncio.to_thread(get_embedding, ing["name"]),
            )
        )
        created_items.append(ing["name"])

    await db.commit()

    from app.services.mise_writeback import push_to_mise

    for ing in seen_ingredients.values():
        disp_qty, disp_unit = to_display_pair(0.0, ing["unit"])
        asyncio.create_task(
            push_to_mise(
                action="adjust",
                item_name=ing["name"],
                quantity=disp_qty,
                unit=disp_unit,
                recorded_by=recorded_by_name,
                spreadsheet_id=spreadsheet_id,
            )
        )

    return {"status": "ok", "recipes_created": len(body.recipes), "ingredients_seeded": len(created_items)}


@router.get("", summary="List all recipes with ingredient counts")
async def list_recipes(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    Recipe = models["recipes"]
    RecipeIngredient = models["recipe_ingredients"]

    # Single SQL query with outer join and group by to avoid N+1 queries
    stmt = (
        select(Recipe, func.count(RecipeIngredient.id).label("ingredient_count"))
        .outerjoin(RecipeIngredient, Recipe.id == RecipeIngredient.recipe_id)
        .group_by(Recipe.id)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [{"id": str(r.id), "name": r.name, "ingredient_count": count} for r, count in rows]


@router.get("/{recipe_id}", summary="Get a recipe with its full ingredient list")
async def get_recipe(
    recipe_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    Recipe = models["recipes"]
    RecipeIngredient = models["recipe_ingredients"]

    recipe = await db.get(Recipe, uuid.UUID(recipe_id))
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    ing_result = await db.execute(select(RecipeIngredient).where(RecipeIngredient.recipe_id == recipe.id))
    ingredients = ing_result.scalars().all()

    return {
        "id": str(recipe.id),
        "name": recipe.name,
        "ingredients": [
            {
                "id": str(i.id),
                "name": i.item_name,
                "unit": i.unit,
                "quantity_per_serving": i.quantity_per_serving,
                "category": i.category,
            }
            for i in ingredients
        ],
    }


@router.put("/{recipe_id}/ingredients", summary="Replace a recipe's ingredient list")
async def update_recipe_ingredients(
    recipe_id: str,
    body: BulkRecipeIngredientsUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    schema = user.get("schema")
    if not schema:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")
    models = get_tenant_models(schema)
    Recipe = models["recipes"]
    RecipeIngredient = models["recipe_ingredients"]

    recipe = await db.get(Recipe, uuid.UUID(recipe_id))
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Full replace approach: delete existing rows and insert new list
    await db.execute(delete(RecipeIngredient).where(RecipeIngredient.recipe_id == recipe.id))

    for ing in body.ingredients:
        db.add(
            RecipeIngredient(
                recipe_id=recipe.id,
                item_name=ing.name,
                unit=ing.unit,
                quantity_per_serving=ing.quantity_per_serving,
                category=ing.category,
            )
        )

    await db.commit()
    return {"status": "ok", "message": "Recipe ingredients updated", "count": len(body.ingredients)}
