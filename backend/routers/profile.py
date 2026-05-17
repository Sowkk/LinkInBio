from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
import json
from db.session import get_db
from db.redis import get_redis
from models.user import User, Profile
from models.link import Link
from utils.auth import get_current_user

router = APIRouter(tags=["profile"])

# How long to cache a public profile (in seconds)
# WHY 5 minutes? Balance between freshness and performance
# If user updates their profile, old version shows for max 5 mins — acceptable
CACHE_TTL = 300  # 5 minutes

# --- Schemas ---

class LinkPublic(BaseModel):
    id:    UUID
    title: str
    url:   str
    order: int
    model_config = {"from_attributes": True}

class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio:          Optional[str] = None
    avatar_url:   Optional[str] = None
    theme:        Optional[str] = None

class ProfileResponse(BaseModel):
    username:     str
    display_name: Optional[str]
    bio:          Optional[str]
    avatar_url:   Optional[str]
    theme:        str

    # WHY Config + from_attributes?
    # Pydantic v2 needs this to read data from SQLAlchemy objects (ORM models)
    # Without it, Pydantic doesn't know how to read object.attribute style data
    model_config = {"from_attributes": True}

class PublicProfileResponse(BaseModel):
    username:     str
    display_name: Optional[str]
    bio:          Optional[str]
    avatar_url:   Optional[str]
    theme:        str
    links:        List[LinkPublic] = []  # public page shows active links too
    model_config = {"from_attributes": True}


# --- Private route — only logged in user can see their own profile ---

@router.get("/profile/me", response_model=ProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Depends(get_current_user) automatically:
    # 1. Reads the Bearer token from the request header
    # 2. Decodes it
    # 3. Fetches the user from DB
    # 4. Passes it here as current_user
    # If token is missing or invalid → 401 automatically, your code never runs
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return ProfileResponse(
        username=current_user.username,
        display_name=profile.display_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        theme=profile.theme or "default",
    )


# --- Private route — update your own profile ---

@router.put("/profile/me", response_model=ProfileResponse)
def update_my_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Only update fields that were actually sent
    # WHY? If user sends only bio, we shouldn't wipe display_name
    # exclude_unset=True means "only give me fields the user actually included"
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)

    # WHY invalidate cache here?
    # User just updated their profile — old cached version is now stale
    # Delete it so next visit fetches fresh data from PostgreSQL
    r = get_redis()
    r.delete(f"profile:{current_user.username}")

    return ProfileResponse(
        username=current_user.username,
        display_name=profile.display_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        theme=profile.theme or "default",
    )


# --- Public route — anyone can visit this, no login needed ---

@router.get("/{username}", response_model=PublicProfileResponse)
def get_public_profile(username: str, db: Session = Depends(get_db)):
    # WHY no Depends(get_current_user) here?
    # This is the PUBLIC page — anyone with the link can view it
    # No token required
    r = get_redis()
    cache_key = f"profile:{username.lower()}"

    # Step 1 — Check Redis first
    # WHY check cache before DB? Avoid DB hit if we already have the data
    cached = r.get(cache_key)
    if cached:
        # Cache hit! Return immediately without touching PostgreSQL
        return json.loads(cached)

    # Step 2 — Cache miss — fetch from PostgreSQL
    user = db.query(User).filter(User.username == username.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Only return active links, sorted by order
    # WHY filter is_active? User can hide a link without deleting it
    links = (
        db.query(Link)
        .filter(Link.user_id == user.id, Link.is_active.is_(True))
        .order_by(Link.order)
        .all()
    )

    result = PublicProfileResponse(
        username=user.username,
        display_name=profile.display_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        theme=profile.theme or "default",
        links=[
            LinkPublic(
                id=l.id,
                title=l.title,
                url=l.url,
                order=l.order
            ) for l in links
        ],
    )

    # Step 3 — Store in Redis for next time
    # model_dump() converts Pydantic object to dict, json.dumps makes it a string
    # WHY store as string? Redis only stores strings — we serialize to JSON
    r.setex(
        cache_key,          # key  → "profile:test4"
        CACHE_TTL,          # TTL  → expires after 5 minutes automatically
        json.dumps(result.model_dump(mode="json"))  # value → JSON string
    )

    return result
 