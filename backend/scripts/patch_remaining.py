import os
import re

files_to_patch = [
    'app/routers/inventory.py',
    'app/routers/issues.py',
    'app/routers/purchase_orders.py',
    'app/routers/recipes.py',
    'app/routers/confirmations.py'
]

old_pattern = r'tenant_record = await db\.get\(Tenant, user_record\.tenant_id\) if user_record and user_record\.tenant_id else None'

new_code = '''tenant_id_str = user.get("tenant_id")
    tenant_record = None
    if user_record and tenant_id_str:
        from app.models.public import UserTenantMembership
        from sqlalchemy import select
        mem_res = await db.execute(
            select(Tenant).join(UserTenantMembership, UserTenantMembership.tenant_id == Tenant.id)
            .where(UserTenantMembership.user_id == user_record.id, UserTenantMembership.tenant_id == uuid.UUID(tenant_id_str))
        )
        tenant_record = mem_res.scalar_one_or_none()'''

for fp in files_to_patch:
    if os.path.exists(fp):
        with open(fp, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if 'user_record.tenant_id' in content:
            new_content = re.sub(old_pattern, new_code, content)
            if new_content != content:
                with open(fp, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Patched {fp}")
            else:
                print(f"Could not patch {fp} (pattern not found)")
    else:
        print(f"{fp} not found")
