from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from db.session import Base
import uuid

class User(Base):
    __tablename__ = "users"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email      = Column(String, unique=True, nullable=False, index=True)
    username   = Column(String, unique=True, nullable=False, index=True)  # becomes the slug
    hashed_password = Column(String, nullable=False)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # relationship — lets us do user.profile instead of querying manually
    # WHY? Cleaner code — SQLAlchemy handles the JOIN for us
    profile         = relationship("Profile", back_populates="user", uselist=False)


class Profile(Base):
    __tablename__ = "profiles"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # ForeignKey links this profile to exactly one user
    # WHY ForeignKey? Enforces data integrity — a profile can't exist without a user
    user_id      = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)

    display_name = Column(String, nullable=True)
    bio          = Column(String(300), nullable=True)   # 300 char limit like Twitter
    avatar_url   = Column(String, nullable=True)
    theme        = Column(String, default="default")    # e.g. "default", "dark", "sunset"
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())

    user         = relationship("User", back_populates="profile")