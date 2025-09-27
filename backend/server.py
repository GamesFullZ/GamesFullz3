from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Favorite(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    game_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GameRating(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    game_id: str
    rating: float  # 1.0 to 5.0
    review: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper function to get current user
async def get_current_user(request: Request):
    # Try to get session token from cookie first
    session_token = request.cookies.get("session_token")
    
    # If no cookie, try Authorization header
    if not session_token:
        credentials: HTTPAuthorizationCredentials = await security(request)
        if credentials:
            session_token = credentials.credentials
    
    if not session_token:
        return None
    
    # Find session in database
    session_data = await db.sessions.find_one({
        "session_token": session_token,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not session_data:
        return None
    
    # Find user
    user_data = await db.users.find_one({"id": session_data["user_id"]})
    if not user_data:
        return None
    
    return User(**user_data)

# Auth Routes
@api_router.get("/auth/session")
async def get_session_data(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@api_router.post("/auth/process-session")
async def process_session_id(session_id: str, response: Response):
    # Call Emergent auth service to get session data
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            auth_response.raise_for_status()
            session_data = auth_response.json()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to process session: {str(e)}")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": session_data["email"]})
    
    if existing_user:
        user = User(**existing_user)
    else:
        # Create new user
        user = User(
            email=session_data["email"],
            name=session_data["name"],
            picture=session_data.get("picture")
        )
        await db.users.insert_one(user.dict())
    
    # Create session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session = Session(
        user_id=user.id,
        session_token=session_data["session_token"],
        expires_at=expires_at
    )
    
    await db.sessions.insert_one(session.dict())
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_data["session_token"],
        max_age=7 * 24 * 60 * 60,  # 7 days
        httponly=True,
        secure=True,
        samesite="none",
        path="/"
    )
    
    return {"user": user, "message": "Session created successfully"}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    user = await get_current_user(request)
    if user:
        session_token = request.cookies.get("session_token")
        if session_token:
            await db.sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out successfully"}

# Game interaction routes
@api_router.get("/favorites")
async def get_user_favorites(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    favorites = await db.favorites.find({"user_id": user.id}).to_list(1000)
    return [Favorite(**fav) for fav in favorites]

@api_router.post("/favorites/{game_id}")
async def add_favorite(game_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if already favorited
    existing = await db.favorites.find_one({"user_id": user.id, "game_id": game_id})
    if existing:
        raise HTTPException(status_code=400, detail="Game already in favorites")
    
    favorite = Favorite(user_id=user.id, game_id=game_id)
    await db.favorites.insert_one(favorite.dict())
    return favorite

@api_router.delete("/favorites/{game_id}")
async def remove_favorite(game_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.favorites.delete_one({"user_id": user.id, "game_id": game_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    
    return {"message": "Favorite removed"}

@api_router.post("/ratings")
async def rate_game(rating_data: dict, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Remove existing rating if any
    await db.ratings.delete_one({
        "user_id": user.id, 
        "game_id": rating_data["game_id"]
    })
    
    rating = GameRating(
        user_id=user.id,
        game_id=rating_data["game_id"],
        rating=rating_data["rating"],
        review=rating_data.get("review")
    )
    
    await db.ratings.insert_one(rating.dict())
    return rating

@api_router.get("/ratings/{game_id}")
async def get_game_ratings(game_id: str):
    ratings = await db.ratings.find({"game_id": game_id}).to_list(1000)
    if not ratings:
        return {"average_rating": 0, "total_ratings": 0, "ratings": []}
    
    total = sum(r["rating"] for r in ratings)
    average = total / len(ratings)
    
    return {
        "average_rating": round(average, 1),
        "total_ratings": len(ratings),
        "ratings": [GameRating(**r) for r in ratings]
    }

# Basic routes
@api_router.get("/")
async def root():
    return {"message": "GameStack API v1.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc)}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()