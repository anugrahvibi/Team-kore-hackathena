from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.v1.api import api_router
from .core.config import settings
from .core.database import connect_to_mongo, close_mongo_connection

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend for Cascadenet (Wayanad)",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"message": "Cascadenet Backend is running"}
