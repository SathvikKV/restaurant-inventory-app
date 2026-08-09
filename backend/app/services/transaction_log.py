import uuid

async def log_transaction(db, models, item_id, item_name, action, quantity_delta, resulting_qty, unit, recorded_by, source_reference=None, notes=None):
    InventoryTransaction = models["inventory_transactions"]
    if isinstance(item_id, str) and item_id.strip():
        try:
            item_id = uuid.UUID(item_id)
        except ValueError:
            pass
    db.add(InventoryTransaction(
        item_id=item_id, item_name=item_name, action=action,
        quantity_delta=quantity_delta, resulting_qty=resulting_qty, unit=unit,
        recorded_by=recorded_by, source_reference=source_reference, notes=notes,
    ))
    
    if quantity_delta < 0:
        schema_name = InventoryTransaction.__table_args__.get("schema")
        if schema_name:
            from app.models.public import Tenant
            from sqlalchemy import select
            tenant_res = await db.execute(select(Tenant.id).where(Tenant.schema_name == schema_name))
            tenant_id = tenant_res.scalar_one_or_none()
            
            if tenant_id:
                InventoryItem = models["inventory"]
                item = await db.get(InventoryItem, item_id)
                if item and item.reorder_threshold > 0:
                    if item.previous_qty >= item.reorder_threshold and item.current_qty < item.reorder_threshold:
                        from app.services.push_notifications import send_push_notification
                        send_push_notification(db, tenant_id, "Low Stock Alert", f"{item.item} has dropped below minimum buffer.", {"type": "low_stock", "itemJson": {"id": str(item.id), "name": item.item, "quantity": item.current_qty, "unit": item.unit, "category": item.category, "suggested_purchase": item.reorder_threshold, "status": "low"}})

