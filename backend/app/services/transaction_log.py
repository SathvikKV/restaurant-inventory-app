import uuid

async def log_transaction(db, models, item_id, item_name, action, quantity_delta, resulting_qty, unit, recorded_by, source_reference=None):
    InventoryTransaction = models["inventory_transactions"]
    if isinstance(item_id, str) and item_id.strip():
        try:
            item_id = uuid.UUID(item_id)
        except ValueError:
            pass
    db.add(InventoryTransaction(
        item_id=item_id, item_name=item_name, action=action,
        quantity_delta=quantity_delta, resulting_qty=resulting_qty, unit=unit,
        recorded_by=recorded_by, source_reference=source_reference,
    ))
