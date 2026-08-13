import asyncio
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.config import get_settings
settings = get_settings()

async def drop_legacy_columns():
    engine = create_async_engine(
        settings.database_url,
        echo=False,
    )
    
    try:
        async with engine.begin() as conn:
            # Check if columns exist
            result = await conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users' AND column_name IN ('tenant_id', 'role');
            """))
            columns = [row[0] for row in result.fetchall()]
            
            if 'tenant_id' in columns:
                logger.info("Dropping column 'tenant_id' from 'users'...")
                await conn.execute(text("ALTER TABLE users DROP COLUMN tenant_id;"))
            
            if 'role' in columns:
                logger.info("Dropping column 'role' from 'users'...")
                await conn.execute(text("ALTER TABLE users DROP COLUMN role;"))
                
            logger.info("Legacy columns successfully dropped.")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(drop_legacy_columns())
