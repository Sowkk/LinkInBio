from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from uuid import UUID
from db.session import get_db
from db.redis import get_redis
from models.user import User
from models.link import Link
from utils.auth import get_current_user

router = APIRouter(prefix="/links", tags=["links"])

# --- Schemas ---

class LinkCreate(BaseModel):
    title: str
    url:   str   # We use str here, frontend will validate URL format

class LinkUpdate(BaseModel):
    title:     Optional[str]  = None
    url:       Optional[str]  = None
    is_active: Optional[bool] = None

class LinkResponse(BaseModel):
    id:        UUID
    title:     str
    url:       str
    is_active: bool
    order:     int

    model_config = {"from_attributes": True}

class ReorderRequest(BaseModel):
    # List of link IDs in the NEW order the user wants
    # e.g. ["id3", "id1", "id2"] means id3 should be first now
    link_ids: List[UUID]

def invalidate_profile_cache(username: str):
    # Helper to clear cache whenever profile content changes
    # WHY separate function? We call this from add, update, delete, reorder
    r = get_redis()
    r.delete(f"profile:{username.lower()}")

# --- Add a new link ---

@router.post("", response_model=LinkResponse, status_code=status.HTTP_201_CREATED)
def add_link(
    payload: LinkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # Ensure URL always has a scheme
    # WHY? Without https://, redirect treats it as relative path on our server
    url = payload.url
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    # Count existing links to set order for the new one
    # WHY? New link always goes to the bottom of the list
    existing_count = db.query(Link).filter(Link.user_id == current_user.id).count()

    link = Link(
        user_id=current_user.id,
        title=payload.title,
        url=payload.url,
        order=existing_count   # 0-indexed, so 3rd link gets order=2
    )
    db.add(link)
    db.commit()
    db.refresh(link)

    invalidate_profile_cache(current_user.username)
    return link


# --- Get all my links ---

@router.get("", response_model=List[LinkResponse])
def get_my_links(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    links = (
        db.query(Link)
        .filter(Link.user_id == current_user.id)
        .order_by(Link.order)   # always return in correct order
        .all()
    )
    return links


@router.put("/reorder", response_model=List[LinkResponse])
def reorder_links(
    payload: ReorderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    links = db.query(Link).filter(Link.user_id == current_user.id).all()
    link_map = {link.id: link for link in links}

    for new_order, link_id in enumerate(payload.link_ids):
        if link_id in link_map:
            link_map[link_id].order = new_order

    db.commit()
    invalidate_profile_cache(current_user.username)
    return sorted(links, key=lambda l: l.order)


@router.put("/{link_id}", response_model=LinkResponse)
def update_link(
    link_id: UUID,
    payload: LinkUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    link = db.query(Link).filter(Link.id == link_id).first()

    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    # WHY this ownership check?
    # Without it, user A could edit user B's links just by knowing the link ID
    # Always verify the resource belongs to the person making the request
    if link.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your link")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(link, field, value)

    db.commit()
    db.refresh(link)
    invalidate_profile_cache(current_user.username)
    return link


# --- Delete a link ---

@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(
    link_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    link = db.query(Link).filter(Link.id == link_id).first()

    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    if link.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your link")

    db.delete(link)
    db.commit()
    invalidate_profile_cache(current_user.username)

    # WHY return nothing (204)?
    # 204 = "No Content" — standard HTTP response for successful delete
    # There's nothing to return since the resource no longer exists


# --- Reorder links ---

@router.put("/reorder", response_model=List[LinkResponse])
def reorder_links(
    payload: ReorderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch all links belonging to this user
    links = db.query(Link).filter(Link.user_id == current_user.id).all()
    link_map = {link.id: link for link in links}

    # WHY build a dict (link_map)?
    # So we can look up any link by ID in O(1) instead of looping every time
    for new_order, link_id in enumerate(payload.link_ids):
        if link_id in link_map:
            link_map[link_id].order = new_order

    db.commit()
    invalidate_profile_cache(current_user.username)
    return sorted(links, key=lambda l: l.order)