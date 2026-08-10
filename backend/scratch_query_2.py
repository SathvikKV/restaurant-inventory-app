import asyncio
import json
from app.database import engine
from sqlalchemy import text

async def fix():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, item, current_qty FROM minerva_coffee_shop.inventory WHERE unit = 'other';"))
        items = [dict(row._mapping) for row in res]
        with open('items_to_fix.json', 'w') as f:
            json.dump([{'id': str(i['id']), 'item': i['item'], 'qty': i['current_qty']} for i in items], f)

asyncio.run(fix())
