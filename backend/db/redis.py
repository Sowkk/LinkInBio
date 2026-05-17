import redis
from config import settings

# Create one Redis connection that the whole app shares
# WHY one connection? Creating a new connection per request is expensive
# This is the same reason we use SessionLocal for PostgreSQL
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=0,
    decode_responses=True,   # WHY? Returns strings instead of bytes
                             # Without this every value comes back as b"data" instead of "data"
)

def get_redis():
    return redis_client