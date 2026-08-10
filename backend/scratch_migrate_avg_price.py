import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def run_migration():
    async with AsyncSessionLocal() as session:
        # Get all schemas that belong to tenants
        result = await session.execute(text("SELECT schema_name FROM public.tenants;"))
        schemas = [row[0] for row in result]
        
        for schema in schemas:
            print(f"Migrating schema: {schema}")
            try:
                await session.execute(text(f"""
                    ALTER TABLE {schema}.inventory 
                    ADD COLUMN IF NOT EXISTS avg_price_per_base_unit INTEGER;
                """))
                await session.execute(text(f"""
                    ALTER TABLE {schema}.confirmations 
                    ADD COLUMN IF NOT EXISTS unit_price FLOAT;
                """))
                await session.execute(text(f"""
                    ALTER TABLE {schema}.confirmations 
                    ADD COLUMN IF NOT EXISTS purchase_unit VARCHAR(50);
                """))
            except Exception as e:
                print(f"Error migrating {schema}: {e}")
                
        await session.commit()
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(run_migration())
