import os
import re

def patch_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for old, new in replacements:
        content = content.replace(old, new)
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched {filepath}")
    else:
        print(f"No changes for {filepath}")

# 1. tenant_service.py
patch_file('app/services/tenant_service.py', [
    (
'''    if user and user.tenant_id:
        tenant = await db.get(Tenant, user.tenant_id)
        if tenant and tenant.is_active:
            role_str = user.role.value if hasattr(user.role, "value") else str(user.role)''',
'''    if user:
        mem_result = await db.execute(
            select(UserTenantMembership, Tenant)
            .join(Tenant, UserTenantMembership.tenant_id == Tenant.id)
            .where(UserTenantMembership.user_id == user.id, Tenant.is_active == True)
        )
        mem_row = mem_result.first()
        if mem_row:
            membership, tenant = mem_row
            role_str = membership.role.value if hasattr(membership.role, "value") else str(membership.role)'''
    )
])

# 2. push_notifications.py
patch_file('app/services/push_notifications.py', [
    (
'''            stmt = select(PushToken.expo_push_token).join(User).where(
                User.tenant_id == tenant_id,
                User.role.in_(["owner", "manager"]),
                User.is_active == True
            )''',
'''            from app.models.public import UserTenantMembership
            stmt = select(PushToken.expo_push_token).join(User).join(
                UserTenantMembership, User.id == UserTenantMembership.user_id
            ).where(
                UserTenantMembership.tenant_id == tenant_id,
                UserTenantMembership.role.in_(["owner", "manager"]),
                User.is_active == True
            )'''
    )
])

# 3. inventory.py
patch_file('app/routers/inventory.py', [
    (
'''        res = await db.execute(select(User).where(User.tenant_id == t_uuid))''',
'''        from app.models.public import UserTenantMembership
        res = await db.execute(select(User).join(UserTenantMembership, User.id == UserTenantMembership.user_id).where(UserTenantMembership.tenant_id == t_uuid))'''
    )
])

# 4. tenants.py
patch_file('app/routers/tenants.py', [
    (
'''    users_res = await db.execute(
        select(User, Tenant)
        .join(Tenant, User.tenant_id == Tenant.id)
        .where(User.is_active == True, Tenant.is_active == True)
    )
    for user, tenant in users_res.all():
        role_str = user.role.value if hasattr(user.role, "value") else str(user.role)''',
'''    from app.models.public import UserTenantMembership
    users_res = await db.execute(
        select(User, Tenant, UserTenantMembership)
        .join(UserTenantMembership, User.id == UserTenantMembership.user_id)
        .join(Tenant, UserTenantMembership.tenant_id == Tenant.id)
        .where(User.is_active == True, Tenant.is_active == True)
    )
    for user, tenant, membership in users_res.all():
        role_str = membership.role.value if hasattr(membership.role, "value") else str(membership.role)'''
    )
])

# 5. auth_service.py
patch_file('app/services/auth_service.py', [
    (
'''        .join(User, User.tenant_id == Tenant.id)''',
'''        .join(UserTenantMembership, UserTenantMembership.tenant_id == Tenant.id)
        .join(User, User.id == UserTenantMembership.user_id)'''
    )
])

# 6. auth.py
patch_file('app/routers/auth.py', [
    (
'''tenant_id=str(db_user.tenant_id) if db_user.tenant_id else "",''',
'''tenant_id="",  # Multi-membership users need to select a restaurant at login'''
    )
])
