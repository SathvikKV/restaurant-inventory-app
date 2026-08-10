import asyncio
import json
from app.database import engine
from sqlalchemy import text

async def fix():
    with open('items_to_fix.json', 'r') as f:
        items = json.load(f)

    async with engine.begin() as conn:
        for item in items:
            name = item['item'].lower()
            if 'sauce' in name or 'ketchup' in name or 'paste' in name:
                new_unit = 'ml'
            else:
                new_unit = 'g'

            await conn.execute(
                text("UPDATE minerva_coffee_shop.inventory SET unit = :unit WHERE id = :id"),
                {"unit": new_unit, "id": item['id']}
            )
        print(f"Updated {len(items)} items.")

asyncio.run(fix())
