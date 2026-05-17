from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from db.session import Base
import uuid

class Link(Base):
    __tablename__ = "links"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Which user owns this link
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    title      = Column(String(100), nullable=False)   # "My GitHub"
    url        = Column(String, nullable=False)         # "https://github.com/..."
    is_active  = Column(Boolean, default=True)          # hide a link without deleting it

    # WHY store order as a number?
    # When user drags link 3 to position 1, we just update these numbers
    # Then we always fetch links sorted by this field
    order      = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())