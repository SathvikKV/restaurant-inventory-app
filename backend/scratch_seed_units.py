import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_async_engine(DATABASE_URL)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Replicating the current hardcoded dictionaries in app.services.units
UNIT_FAMILIES = {
    # Weights (base: g)
    "kg": ("weight", 1000.0),
    "g": ("weight", 1.0),
    "mg": ("weight", 0.001),
    "lbs": ("weight", 453.592),
    "oz": ("weight", 28.3495),

    # Volumes (base: ml)
    "l": ("volume", 1000.0),
    "ml": ("volume", 1.0),
    "gal": ("volume", 3785.41),
    "qt": ("volume", 946.353),
    "pt": ("volume", 473.176),
    "cup": ("volume", 236.588),

    # Counts (base: piece)
    "piece": ("count", 1.0),
    "pc": ("count", 1.0),
    "pcs": ("count", 1.0),
    "dozen": ("count", 12.0),
    "pkt": ("count", 1.0),
    "packet": ("count", 1.0),
    "box": ("count", 1.0),
    "bottle": ("count", 1.0),
    "can": ("count", 1.0),
    "tin": ("count", 1.0),
    "jar": ("count", 1.0),
    "bunch": ("count", 1.0),
    "bag": ("count", 1.0),
}

async def seed_units():
    async with async_session() as session:
        # Create table if not exists
        await session.execute(text("""
        CREATE TABLE IF NOT EXISTS public.units_of_measure (
            symbol VARCHAR(50) PRIMARY KEY,
            family VARCHAR(50) NOT NULL,
            factor_to_base FLOAT NOT NULL
        )
        """))
        
        for symbol, (family, factor) in UNIT_FAMILIES.items():
            await session.execute(
                text("""
                INSERT INTO public.units_of_measure (symbol, family, factor_to_base)
                VALUES (:symbol, :family, :factor)
                ON CONFLICT (symbol) DO UPDATE 
                SET family = EXCLUDED.family, factor_to_base = EXCLUDED.factor_to_base
                """),
                {"symbol": symbol, "family": family, "factor": factor}
            )
        await session.commit()
        print(f"Seeded {len(UNIT_FAMILIES)} units of measure.")

if __name__ == "__main__":
    asyncio.run(seed_units())
