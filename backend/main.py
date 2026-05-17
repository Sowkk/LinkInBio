from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.session import engine, Base
from routers import auth, profile, links, analytics

# Create all DB tables on startup
# WHY here? Convenient for now — Phase 5 we'll switch to Alembic migrations
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Link in Bio API", version="0.2.0")

# CORS — allows our React frontend (running on a different port) to call this API
# WHY needed? Browsers block cross-origin requests by default — this whitelists our frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(links.router)
app.include_router(analytics.router)  # click + analytics before wildcard
app.include_router(profile.router)  # wildcard /{username} always goes last!

@app.get("/health")
def health():
    return {"status": "ok"}