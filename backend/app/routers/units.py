from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db

router = APIRouter(
    prefix="/units",
    tags=["Units"],
)

@router.get("", summary="Get all units")
async def get_units(db: AsyncSession = Depends(get_db)):
    """
    Returns a list of all valid units from public.units_of_measure.
    """
    res = await db.execute(text("SELECT unit FROM public.units_of_measure ORDER BY unit;"))
    units = [row[0] for row in res]
    return units
