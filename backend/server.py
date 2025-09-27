from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File
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
import base64
import re

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

# Profanity filter - comprehensive list for multiple languages
PROFANITY_WORDS = {
    # Spanish
    'es': ['puto', 'puta', 'cabrón', 'cabron', 'joder', 'mierda', 'coño', 'gilipollas', 'imbecil', 'idiota', 'estupido', 'estúpido', 'pendejo', 'pinche', 'verga', 'culero', 'ojete', 'maricon', 'maricón'],
    # English  
    'en': ['fuck', 'shit', 'bitch', 'asshole', 'damn', 'crap', 'bastard', 'whore', 'slut', 'retard', 'faggot', 'nigger', 'cunt', 'dick', 'pussy', 'cock', 'motherfucker', 'goddamn'],
    # French
    'fr': ['merde', 'putain', 'connard', 'salope', 'enculé', 'bordel', 'con', 'pute', 'bite', 'chatte', 'cul', 'foutre'],
    # German
    'de': ['scheiße', 'scheisse', 'arschloch', 'fotze', 'hurensohn', 'verdammt', 'fick', 'schwanz', 'muschi'],
    # Italian
    'it': ['merda', 'cazzo', 'puttana', 'stronzo', 'figa', 'porco', 'diocane', 'vaffanculo'],
    # Portuguese
    'pt': ['merda', 'porra', 'caralho', 'puto', 'puta', 'foder', 'buceta', 'pau', 'cu', 'viado'],
    # Russian (transliterated)
    'ru': ['blyad', 'suka', 'pizdec', 'hui', 'pizda', 'mudak', 'debil', 'durak']
}

def censor_text(text: str) -> str:
    """Censor offensive words in multiple languages"""
    if not text:
        return text
    
    censored_text = text.lower()
    
    for lang, words in PROFANITY_WORDS.items():
        for word in words:
            # Replace with asterisks, keeping first and last character
            if len(word) > 2:
                replacement = word[0] + '*' * (len(word) - 2) + word[-1]
            else:
                replacement = '*' * len(word)
            
            # Case insensitive replacement
            pattern = re.compile(re.escape(word), re.IGNORECASE)
            censored_text = pattern.sub(replacement, censored_text)
    
    return censored_text

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    username: Optional[str] = None
    picture: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True
    preferences: Optional[dict] = Field(default_factory=dict)

class UserUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    picture: Optional[str] = None

class UserRegister(BaseModel):
    email: str
    name: str
    username: str
    password: str
    
class UserLogin(BaseModel):
    email: str
    password: str
    remember_me: bool = False

class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    remember_me: bool = False
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

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    game_id: str
    content: str
    parent_id: Optional[str] = None  # For replies
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    is_hidden: bool = False

# Helper functions
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
    
    # Update last login
    await db.users.update_one(
        {"id": user_data["id"]}, 
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    
    return User(**user_data)

async def create_session(user_id: str, session_token: str, remember_me: bool = False):
    """Create a new session with appropriate expiry"""
    if remember_me:
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)  # 30 days if remember me
    else:
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)   # 7 days default
    
    session = Session(
        user_id=user_id,
        session_token=session_token,
        expires_at=expires_at,
        remember_me=remember_me
    )
    
    await db.sessions.insert_one(session.dict())
    return session

# Auth Routes
@api_router.get("/auth/session")
async def get_session_data(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@api_router.post("/auth/register")
async def register_user(user_data: UserRegister):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username is taken
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Censor name and username
    clean_name = censor_text(user_data.name)
    clean_username = censor_text(user_data.username)
    
    # Create new user (in real app, hash the password)
    new_user = User(
        email=user_data.email,
        name=clean_name,
        username=clean_username
    )
    
    await db.users.insert_one(new_user.dict())
    
    # Create session token
    session_token = str(uuid.uuid4())
    session = await create_session(new_user.id, session_token, False)
    
    return {
        "user": new_user,
        "session_token": session_token,
        "message": "User registered successfully"
    }

@api_router.post("/auth/login")
async def login_user(login_data: UserLogin, response: Response):
    # Find user by email
    user_data = await db.users.find_one({"email": login_data.email})
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # In real app, verify password hash here
    user = User(**user_data)
    
    # Create session token
    session_token = str(uuid.uuid4())
    session = await create_session(user.id, session_token, login_data.remember_me)
    
    # Set cookie with appropriate max age
    max_age = 30 * 24 * 60 * 60 if login_data.remember_me else 7 * 24 * 60 * 60
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=max_age,
        httponly=True,
        secure=True,
        samesite="none",
        path="/"
    )
    
    return {
        "user": user,
        "session_token": session_token,
        "message": "Login successful"
    }

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

# User Management Routes
@api_router.get("/user/profile")
async def get_user_profile(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@api_router.put("/user/profile")
async def update_user_profile(user_update: UserUpdate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    update_data = {}
    if user_update.name:
        update_data["name"] = censor_text(user_update.name)
    if user_update.username:
        # Check if username is taken by another user
        existing = await db.users.find_one({
            "username": user_update.username, 
            "id": {"$ne": user.id}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        update_data["username"] = censor_text(user_update.username)
    if user_update.bio:
        update_data["bio"] = censor_text(user_update.bio)
    if user_update.location:
        update_data["location"] = censor_text(user_update.location)
    if user_update.website:
        update_data["website"] = user_update.website
    if user_update.picture:
        update_data["picture"] = user_update.picture
    
    if update_data:
        await db.users.update_one({"id": user.id}, {"$set": update_data})
    
    # Return updated user
    updated_user_data = await db.users.find_one({"id": user.id})
    return User(**updated_user_data)

@api_router.post("/user/upload-avatar")
async def upload_avatar(file: UploadFile = File(...), request: Request = None):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read and encode file as base64
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="File too large. Max 5MB")
    
    # Convert to base64
    base64_image = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{base64_image}"
    
    # Update user profile
    await db.users.update_one(
        {"id": user.id}, 
        {"$set": {"picture": data_url}}
    )
    
    return {"message": "Avatar updated successfully", "picture_url": data_url}

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
    
    # Censor review text
    review = rating_data.get("review", "")
    if review:
        review = censor_text(review)
    
    # Remove existing rating if any
    await db.ratings.delete_one({
        "user_id": user.id, 
        "game_id": rating_data["game_id"]
    })
    
    rating = GameRating(
        user_id=user.id,
        game_id=rating_data["game_id"],
        rating=rating_data["rating"],
        review=review
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

# Comments system
@api_router.post("/comments")
async def create_comment(comment_data: dict, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Censor comment content
    content = censor_text(comment_data["content"])
    
    comment = Comment(
        user_id=user.id,
        game_id=comment_data["game_id"],
        content=content,
        parent_id=comment_data.get("parent_id")
    )
    
    await db.comments.insert_one(comment.dict())
    return comment

@api_router.get("/comments/{game_id}")
async def get_game_comments(game_id: str):
    comments = await db.comments.find({
        "game_id": game_id, 
        "is_hidden": False
    }).sort("created_at", -1).to_list(100)
    
    return [Comment(**comment) for comment in comments]

# Basic routes
@api_router.get("/")
async def root():
    return {"message": "GamesfullZ API v2.0"}

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