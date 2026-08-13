import re
import os

target = "c:/Users/Sathvik/Documents/Projects/restaurant_store_mgmt/restaurant-inventory-app/backend/app/routers/users.py"

with open(target, "r") as f:
    content = f.read()

# 1. Imports
content = content.replace("from app.models.public import User, Tenant", "from app.models.public import User, Tenant, UserTenantMembership")

# 2. _map_user_response
content = content.replace(
"""def _map_user_response(user: User) -> dict:
    return {
        "id": str(user.id),
        "name": user.name or "",
        "phone": user.phone,
        "role": user.role.value if hasattr(user.role, 'value') else user.role,
        "restaurant_id": str(user.tenant_id) if user.tenant_id else "",
        "is_active": user.is_active,
    }""",
"""def _map_user_response(user: User, role: str, tenant_id: str) -> dict:
    return {
        "id": str(user.id),
        "name": user.name or "",
        "phone": user.phone,
        "role": role,
        "restaurant_id": tenant_id,
        "is_active": user.is_active,
    }""")

# 3. list_users
content = re.sub(
    r'stmt = select\(User\).where\(User.tenant_id == uuid.UUID\(tenant_id\)\)\s*result = await db.execute\(stmt\)\s*users = result.scalars\(\).all\(\)\s*return \[\_map_user_response\(u\) for u in users\]',
    '''stmt = select(User, UserTenantMembership).join(UserTenantMembership, User.id == UserTenantMembership.user_id).where(UserTenantMembership.tenant_id == uuid.UUID(tenant_id))
    result = await db.execute(stmt)
    rows = result.all()
    
    return [_map_user_response(u, m.role.value if hasattr(m.role, 'value') else m.role, tenant_id) for u, m in rows]''',
    content
)

# 4. get_user
content = re.sub(
    r'user = await db.get\(User, uuid.UUID\(user_id\)\)\s*if not user or str\(user.tenant_id\) != tenant_id:\s*raise HTTPException\(status_code=status.HTTP_404_NOT_FOUND, detail="User not found"\)\s*return \_map_user_response\(user\)',
    '''stmt = select(User, UserTenantMembership).join(UserTenantMembership, User.id == UserTenantMembership.user_id).where(User.id == uuid.UUID(user_id), UserTenantMembership.tenant_id == uuid.UUID(tenant_id))
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in this restaurant")
    user, membership = row
    return _map_user_response(user, membership.role.value if hasattr(membership.role, 'value') else membership.role, tenant_id)''',
    content
)

# 5. invite_user -> invite_to_restaurant
old_invite = """@router.post("/invite", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Invite a new user")
async def invite_user(
    body: UserCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")

    if current_user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only owner can invite users")

    # Check if user already exists
    stmt = select(User).where(User.phone == body.phone)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        if existing_user.tenant_id:
            raise HTTPException(status_code=400, detail="User already belongs to a restaurant")
        existing_user.name = body.name
        existing_user.role = body.role
        existing_user.tenant_id = uuid.UUID(tenant_id)
        existing_user.is_active = True
        user_to_return = existing_user
    else:
        new_user = User(
            phone=body.phone,
            name=body.name,
            role=body.role,
            tenant_id=uuid.UUID(tenant_id),
            is_active=True
        )
        db.add(new_user)
        user_to_return = new_user

    await db.commit()
    await db.refresh(user_to_return)
    return _map_user_response(user_to_return)"""

new_invite = """@router.post("/invite-to-restaurant", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Add existing user to restaurant")
async def invite_to_restaurant(
    body: UserCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="User has no assigned restaurant")

    if current_user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only owner can invite users")

    # Check if user already exists
    stmt = select(User).where(User.phone == body.phone)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if not existing_user:
        raise HTTPException(status_code=400, detail="This phone number hasn't signed up yet")

    # Check if they are already in this restaurant
    mem_stmt = select(UserTenantMembership).where(UserTenantMembership.user_id == existing_user.id, UserTenantMembership.tenant_id == uuid.UUID(tenant_id))
    mem_res = await db.execute(mem_stmt)
    existing_mem = mem_res.scalar_one_or_none()

    if existing_mem:
        raise HTTPException(status_code=400, detail="User already belongs to this restaurant")

    # Update name if it was null
    if not existing_user.name and body.name:
        existing_user.name = body.name

    new_membership = UserTenantMembership(
        user_id=existing_user.id,
        tenant_id=uuid.UUID(tenant_id),
        role=body.role
    )
    db.add(new_membership)

    await db.commit()
    await db.refresh(existing_user)
    return _map_user_response(existing_user, body.role, tenant_id)"""
content = content.replace(old_invite, new_invite)

# 6. update_user
old_update = """    user = await db.get(User, uuid.UUID(user_id))
    if not user or str(user.tenant_id) != tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if body.name is not None:
        user.name = body.name
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active

    await db.commit()
    await db.refresh(user)
    return _map_user_response(user)"""
new_update = """    stmt = select(User, UserTenantMembership).join(UserTenantMembership, User.id == UserTenantMembership.user_id).where(User.id == uuid.UUID(user_id), UserTenantMembership.tenant_id == uuid.UUID(tenant_id))
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in this restaurant")
    user, membership = row

    if body.name is not None:
        user.name = body.name
    if body.role is not None:
        membership.role = body.role
    if body.is_active is not None:
        # Note: changing is_active here deactivated the WHOLE user account before.
        # Now we'll just keep that behavior for legacy reasons, but usually you'd want to pause membership.
        user.is_active = body.is_active

    await db.commit()
    return _map_user_response(user, membership.role.value if hasattr(membership.role, 'value') else membership.role, tenant_id)"""
content = content.replace(old_update, new_update)

# 7. deactivate_user
old_deactivate = """    user = await db.get(User, uuid.UUID(user_id))
    if user and str(user.tenant_id) == tenant_id:
        user.is_active = False
        await db.commit()"""
new_deactivate = """    stmt = select(UserTenantMembership).where(UserTenantMembership.user_id == uuid.UUID(user_id), UserTenantMembership.tenant_id == uuid.UUID(tenant_id))
    result = await db.execute(stmt)
    membership = result.scalar_one_or_none()
    
    if membership:
        # Instead of deactivating the whole user account, just remove their membership from this restaurant
        await db.delete(membership)
        await db.commit()"""
content = content.replace(old_deactivate, new_deactivate)

with open(target, "w") as f:
    f.write(content)

print("Patching complete.")
