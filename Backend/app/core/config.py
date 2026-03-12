import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cascadenet Backend"
    API_V1_STR: str = "/api/v1"
    
    # MongoDB Config
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "cascadenet")
    
    # AI/ML Paths
    AI_ML_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "AI_ML")
    DATA_DIR: str = os.path.join(AI_ML_DIR, "data")
    
    class Config:
        case_sensitive = True

settings = Settings()
