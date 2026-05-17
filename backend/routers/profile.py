from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from db.session import get_db
from models.user import User, Profile
from utils.auth import get_current_user

router = APIRouter(tags=["profile"])

# --- Schemas ---

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

    return ProfileResponse(
        username=current_user.username,
        display_name=profile.display_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        theme=profile.theme or "default",
    )


# --- Public route — anyone can visit this, no login needed ---

@router.get("/{username}", response_model=ProfileResponse)
def get_public_profile(username: str, db: Session = Depends(get_db)):
    # WHY no Depends(get_current_user) here?
    # This is the PUBLIC page — anyone with the link can view it
    # No token required
    user = db.query(User).filter(User.username == username.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return ProfileResponse(
        username=user.username,
        display_name=profile.display_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        theme=profile.theme or "default",
    )