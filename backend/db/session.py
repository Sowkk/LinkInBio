from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import settings

# SQLAlchemy engine — the actual connection to PostgreSQL
engine = create_engine(settings.DATABASE_URL)

# SessionLocal is a factory — every request gets its own session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class — all our models will inherit from this
class Base(DeclarativeBase):
    pass

# Dependency — FastAPI injects this into every route that needs DB access
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()