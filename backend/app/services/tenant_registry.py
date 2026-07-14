"""
Tenant model registry — caches dynamic SQLAlchemy models per schema.
Call get_tenant_models(schema) to get the models for a tenant.
"""
from app.models.tenant import make_tenant_models

_registry: dict = {}

def get_tenant_models(schema: str) -> dict:
    """
    Returns cached tenant models for the given schema.
    Creates and caches them on first call.
    """
    if schema not in _registry:
        _registry[schema] = make_tenant_models(schema)
    return _registry[schema]


def require_schema(user: dict) -> str:
    """
    Extracts schema from JWT claims. Raises 403 if not present.
    Use as a dependency helper in routers.
    """
    from fastapi import HTTPException
    schema = user.get("schema", "")
    if not schema:
        raise HTTPException(
            status_code=403,
            detail="No restaurant selected. Use /api/v1/restaurants/{id}/select to get a restaurant-scoped token."
        )
    return schema
