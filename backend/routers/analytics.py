from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from pydantic import BaseModel
from typing import List
from uuid import UUID
from datetime import datetime, timedelta
from db.session import get_db
from models.link import Link
from models.click import ClickEvent
from models.user import User
from utils.auth import get_current_user

router = APIRouter(tags=["analytics"])

# --- Helper: parse device type from User-Agent header ---
# WHY parse User-Agent?
# Every browser sends a "User-Agent" header describing what it is
# e.g. "Mozilla/5.0 (iPhone; CPU iPhone OS...)" → mobile
# We don't need a library — simple string checks are enough

def parse_device(user_agent: str) -> str:
    if not user_agent:
        return "unknown"
    ua = user_agent.lower()
    if any(x in ua for x in ["iphone", "android", "mobile", "phone"]):
        return "mobile"
    if "tablet" in ua or "ipad" in ua:
        return "tablet"
    return "desktop"


# --- Background task: save click to DB ---
# WHY a separate function?
# FastAPI runs this AFTER sending the response — user never waits for this

def record_click(link_id: str, user_id: str, device: str, referer: str, db: Session):
    click = ClickEvent(
        link_id=link_id,
        user_id=user_id,
        device=device,
        referer=referer,
    )
    db.add(click)
    db.commit()


# --- Public route: redirect + track ---

@router.get("/click/{link_id}")
def click_link(
    link_id: UUID,
    request: Request,
    background_tasks: BackgroundTasks,   # FastAPI injects this automatically
    db: Session = Depends(get_db)
):
    link = db.query(Link).filter(Link.id == link_id, Link.is_active.is_(True)).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    # Parse request metadata
    user_agent = request.headers.get("user-agent", "")
    referer    = request.headers.get("referer", "")
    device     = parse_device(user_agent)

    # WHY add_task instead of calling directly?
    # add_task tells FastAPI: "run this AFTER you send the response"
    # So redirect happens first, DB write happens after — user never waits
    background_tasks.add_task(
        record_click,
        str(link.id),
        str(link.user_id),
        device,
        referer,
        db
    )

    # 302 redirect — sends user to the actual URL
    # WHY 302 and not 301?
    # 301 = permanent redirect — browsers cache it forever (bad for analytics, click might not hit our server)
    # 302 = temporary redirect — browser always hits our server first (good, we always track)
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=link.url, status_code=302)


# --- Analytics schemas ---

class LinkStats(BaseModel):
    link_id:      UUID
    title:        str
    url:          str
    total_clicks: int

class DailyClicks(BaseModel):
    date:   str
    clicks: int

class AnalyticsResponse(BaseModel):
    total_clicks:  int
    links:         List[LinkStats]
    daily_clicks:  List[DailyClicks]   # last 7 days
    top_devices:   dict


# --- Private route: get my analytics ---

@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Total clicks per link
    # WHY this query structure?
    # We JOIN links with click_events, GROUP BY link, COUNT clicks
    # This is one DB query instead of looping — much faster
    link_stats = (
        db.query(
            Link.id,
            Link.title,
            Link.url,
            func.count(ClickEvent.id).label("total_clicks")
        )
        .outerjoin(ClickEvent, ClickEvent.link_id == Link.id)
        # WHY outerjoin? So links with 0 clicks still appear in results
        .filter(Link.user_id == current_user.id)
        .group_by(Link.id, Link.title, Link.url)
        .all()
    )

    total_clicks = sum(s.total_clicks for s in link_stats)

    # Daily clicks for last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    daily = (
        db.query(
            cast(ClickEvent.clicked_at, Date).label("date"),
            func.count(ClickEvent.id).label("clicks")
        )
        .filter(
            ClickEvent.user_id == current_user.id,
            ClickEvent.clicked_at >= seven_days_ago
        )
        .group_by(cast(ClickEvent.clicked_at, Date))
        .order_by(cast(ClickEvent.clicked_at, Date))
        .all()
    )

    # Device breakdown
    device_counts = (
        db.query(
            ClickEvent.device,
            func.count(ClickEvent.id).label("count")
        )
        .filter(ClickEvent.user_id == current_user.id)
        .group_by(ClickEvent.device)
        .all()
    )

    return AnalyticsResponse(
        total_clicks=total_clicks,
        links=[
            LinkStats(
                link_id=s.id,
                title=s.title,
                url=s.url,
                total_clicks=s.total_clicks
            ) for s in link_stats
        ],
        daily_clicks=[
            DailyClicks(date=str(d.date), clicks=d.clicks)
            for d in daily
        ],
        top_devices={d.device: d.count for d in device_counts}
    )