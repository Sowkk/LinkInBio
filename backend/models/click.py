from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from db.session import Base
import uuid

class ClickEvent(Base):
    __tablename__ = "click_events"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Which link was clicked
    link_id    = Column(UUID(as_uuid=True), ForeignKey("links.id"), nullable=False, index=True)

    # Which user owns that link — stored separately so analytics queries are faster
    # WHY store user_id here too? 
    # Without it, every analytics query needs a JOIN with links table
    # With it, we can do "all clicks for user X" in one simple query
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Request metadata — where did the click come from?
    country    = Column(String, nullable=True)   # parsed from IP
    device     = Column(String, nullable=True)   # "mobile", "desktop", "tablet"
    referer    = Column(String, nullable=True)   # which site sent them here

    clicked_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)