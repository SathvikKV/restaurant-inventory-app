import pytest
import uuid

@pytest.fixture(scope="module")
def two_restaurant_tokens(client, auth_token):
    """
    Creates two distinct restaurant tenants and returns their scoped JWT tokens
    to verify dynamic tenant schema modeling and inter-table foreign keys across multiple schemas.
    """
    headers = {"Authorization": f"Bearer {auth_token}"}
    tokens = []
    
    for i in range(2):
        name = f"Recipe Test Restaurant {i+1} {uuid.uuid4().hex[:6]}"
        r = client.post("/restaurants", json={"name": name, "city": "TestCity", "tenant_type": "restaurant"}, headers=headers)
        assert r.status_code in [200, 201], f"Failed to create restaurant {i+1}: {r.text}"
        rest_id = r.json()["id"]
        
        r_sel = client.post(f"/restaurants/{rest_id}/select", headers=headers)
        assert r_sel.status_code == 200, f"Failed to select restaurant {i+1}: {r_sel.text}"
        tokens.append(r_sel.json()["access_token"])
        
    return tokens


def test_bulk_create_recipes_multiple_schemas(client, two_restaurant_tokens):
    """
    Test bulk creating recipes across two separate tenant schemas.
    This validates that f'{schema}.recipes.id' foreign key templating in make_tenant_models
    correctly resolves across multiple dynamically created PostgreSQL schemas.
    """
    for idx, token in enumerate(two_restaurant_tokens):
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "recipes": [
                {
                    "dish_name": f"Biryani Schema {idx+1}",
                    "ingredients": [
                        {"name": f"Basmati Rice {idx+1}", "unit": "g", "quantity_per_serving": 200.0, "category": "dry goods"},
                        {"name": f"Chicken {idx+1}", "unit": "g", "quantity_per_serving": 250.0, "category": "proteins"}
                    ]
                },
                {
                    "dish_name": f"Raita Schema {idx+1}",
                    "ingredients": [
                        {"name": f"Curd {idx+1}", "unit": "ml", "quantity_per_serving": 100.0, "category": "dairy"},
                        {"name": f"Cucumber {idx+1}", "unit": "g", "quantity_per_serving": 50.0, "category": "produce"}
                    ]
                }
            ]
        }
        r = client.post("/recipes/bulk-create", json=payload, headers=headers)
        assert r.status_code == 200, f"Bulk create failed for schema {idx+1}: {r.text}"
        data = r.json()
        assert data["status"] == "ok"
        assert data["recipes_created"] == 2
        assert data["ingredients_seeded"] == 4


def test_list_recipes_single_query_efficiency(client, two_restaurant_tokens):
    """
    Test GET /recipes returns accurate ingredient counts for all recipes across both schemas.
    Internally uses outer join + group by for single-query execution.
    """
    for idx, token in enumerate(two_restaurant_tokens):
        headers = {"Authorization": f"Bearer {token}"}
        r = client.get("/recipes", headers=headers)
        assert r.status_code == 200, f"List recipes failed for schema {idx+1}: {r.text}"
        recipes = r.json()
        assert len(recipes) == 2
        for rec in recipes:
            assert rec["ingredient_count"] == 2
            assert "id" in rec
            assert "name" in rec


def test_get_and_update_recipe_ingredients(client, two_restaurant_tokens):
    """
    Test retrieving full recipe ingredient list and full replace update via PUT /recipes/{id}/ingredients.
    """
    token = two_restaurant_tokens[0]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get first recipe ID
    r_list = client.get("/recipes", headers=headers)
    recipe = r_list.json()[0]
    recipe_id = recipe["id"]
    
    # Get recipe detail
    r_detail = client.get(f"/recipes/{recipe_id}", headers=headers)
    assert r_detail.status_code == 200
    data = r_detail.json()
    assert data["name"] == recipe["name"]
    assert len(data["ingredients"]) == 2
    
    # Replace ingredient list with 3 new items
    update_payload = {
        "ingredients": [
            {"name": "New Ing 1", "unit": "g", "quantity_per_serving": 10.0, "category": "misc"},
            {"name": "New Ing 2", "unit": "ml", "quantity_per_serving": 20.0, "category": "beverages"},
            {"name": "New Ing 3", "unit": "piece", "quantity_per_serving": 1.0, "category": "packaging"}
        ]
    }
    r_update = client.put(f"/recipes/{recipe_id}/ingredients", json=update_payload, headers=headers)
    assert r_update.status_code == 200, f"Update recipe failed: {r_update.text}"
    
    # Verify update persisted and replaced old ingredients
    r_check = client.get(f"/recipes/{recipe_id}", headers=headers)
    assert r_check.status_code == 200
    updated_data = r_check.json()
    assert len(updated_data["ingredients"]) == 3
    names = [i["name"] for i in updated_data["ingredients"]]
    assert "New Ing 1" in names
    assert "New Ing 2" in names
    assert "New Ing 3" in names
