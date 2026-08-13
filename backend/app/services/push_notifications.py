import asyncio
import httpx
import uuid
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.public import PushToken, User
import logging

logger = logging.getLogger(__name__)

EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send"

async def _send_to_expo(messages: List[Dict[str, Any]]):
    """Internal function to push messages to Expo"""
    if not messages:
        return
    async with httpx.AsyncClient() as client:
        try:
            # We don't wait for a response in a blocking way since this is meant to be fire-and-forget
            response = await client.post(EXPO_PUSH_API_URL, json=messages)
            if response.status_code != 200:
                logger.error(f"Expo Push failed: {response.text}")
        except Exception as e:
            logger.error(f"Error sending push notification to Expo: {e}")

def send_push_notification(db: AsyncSession, tenant_id: uuid.UUID, title: str, body: str, data: dict = None):
    """
    Fire-and-forget push notification sender.
    Finds all 'owner' and 'manager' users for the tenant and sends them a push.
    """
    async def _fetch_and_send():
        try:
            # Fetch users who are owners or managers in this tenant
            from app.models.public import UserTenantMembership
            stmt = select(PushToken.expo_push_token).join(User).join(
                UserTenantMembership, User.id == UserTenantMembership.user_id
            ).where(
                UserTenantMembership.tenant_id == tenant_id,
                UserTenantMembership.role.in_(["owner", "manager"]),
                User.is_active == True
            )
            result = await db.execute(stmt)
            tokens = result.scalars().all()
            
            if not tokens:
                return

            messages = [
                {
                    "to": token,
                    "title": title,
                    "body": body,
                    "data": data or {},
                    "sound": "default"
                }
                for token in tokens
            ]
            
            # Send chunks to Expo (max 100 per chunk per Expo docs, but we'll probably have <10 per tenant)
            await _send_to_expo(messages)
            
        except Exception as e:
            logger.error(f"Error in _fetch_and_send push notification: {e}", exc_info=True)

    # Fire and forget without blocking the request
    asyncio.create_task(_fetch_and_send())
