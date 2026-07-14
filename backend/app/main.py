"""
Kosh Backend — FastAPI application entry point.
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, restaurants, inventory, purchase_orders, wastage, users, ai, reports, sync

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="Kosh API",
    description="Backend API for Kosh — Smart Inventory Management for Restaurants",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
API_PREFIX = "/api/v1"

app.include_router(auth.router,            prefix=f"{API_PREFIX}/auth",            tags=["Auth"])
app.include_router(restaurants.router,     prefix=f"{API_PREFIX}/restaurants",     tags=["Restaurants"])
app.include_router(inventory.router,       prefix=f"{API_PREFIX}/inventory",       tags=["Inventory"])
app.include_router(purchase_orders.router, prefix=f"{API_PREFIX}/purchase-orders", tags=["Purchase Orders"])
app.include_router(wastage.router,         prefix=f"{API_PREFIX}/wastage",         tags=["Wastage"])
app.include_router(users.router,           prefix=f"{API_PREFIX}/users",           tags=["Users"])
app.include_router(ai.router,              prefix=f"{API_PREFIX}/ai",              tags=["AI"])
app.include_router(reports.router,         prefix=f"{API_PREFIX}/reports",         tags=["Reports"])
app.include_router(sync.router,            prefix=f"{API_PREFIX}/sync",            tags=["Sync"])


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.api_route("/health", methods=["GET", "HEAD"])
async def health():
    return {"status": "ok", "service": "kosh-backend"}
