from fastapi import APIRouter, Depends, HTTPException
from ....schemas import Notification
from ....core.database import get_db
from typing import List
from bson import ObjectId

router = APIRouter()

@router.get("/", response_model=List[Notification])
async def get_notifications(limit: int = 20):
    """Fetch recent notifications from MongoDB."""
    db = get_db()
    notifications = []
    async for doc in db.notifications.find().sort("timestamp", -1).limit(limit):
        doc["id"] = str(doc["_id"])
        notifications.append(doc)
    return notifications

@router.post("/", status_code=201)
async def create_notification(notification: Notification):
    """Create a new notification (triggered by risk threshold)."""
    db = get_db()
    doc = notification.model_dump()
    result = await db.notifications.insert_one(doc)
    return {"id": str(result.inserted_id)}

@router.patch("/{notification_id}/read")
async def mark_as_read(notification_id: str):
    """Mark a notification as read."""
    db = get_db()
    await db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"read": True}}
    )
    return {"status": "updated"}
