from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from db.session import get_db
from models.user import User
from utils.auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

# --- Pydantic schemas ---
# WHY Pydantic? It validates incoming request data automatically.
# If email is missing or malformed, FastAPI returns a 422 error before your code even runs.

class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Reserved slugs — usernames that would clash with app routes
RESERVED_USERNAMES = {"login", "register", "admin", "dashboard", "api", "static"}

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    # Block reserved slugs
    if payload.username.lower() in RESERVED_USERNAMES:
        raise HTTPException(status_code=400, detail="Username is reserved")

    # Check duplicates
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        email=payload.email,
        username=payload.username.lower(),
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    # WHY check both in one condition?
    # Prevents "user enumeration" — attacker can't tell if email exists or password is wrong
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)