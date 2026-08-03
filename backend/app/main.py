"""
Kosh Backend — FastAPI application entry point.
"""
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine
from app.routers import auth, restaurants, inventory, purchase_orders, wastage, users, ai, reports, sync, recipes

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Bootstrap public schema
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title="Kosh API",
    description="Backend API for Kosh — Smart Inventory Management for Restaurants",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
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

logger = logging.getLogger("app.requests")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    logger.info(f"[REQUEST] {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        duration = (time.time() - start) * 1000
        logger.info(f"[RESPONSE] {request.method} {request.url.path} -> {response.status_code} ({duration:.0f}ms)")
        return response
    except BaseException as e:
        duration = (time.time() - start) * 1000
        logger.error(f"[REQUEST FAILED] {request.method} {request.url.path} after {duration:.0f}ms: {e}")
        raise

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
app.include_router(recipes.router,         prefix=f"{API_PREFIX}/recipes",         tags=["Recipes"])


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.api_route("/health", methods=["GET", "HEAD"])
async def health():
    return {"status": "ok", "service": "kosh-backend"}
