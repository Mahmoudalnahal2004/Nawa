from typing import AsyncGenerator, List

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.session import async_session_factory
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


import time
import urllib.request
import json
import logging
from jose import jwt, JWTError
from app.core.config import settings

logger = logging.getLogger("app.auth")

_jwks_cache = None
_jwks_cache_expiry = 0

def fetch_jwks(supabase_url: str):
    global _jwks_cache, _jwks_cache_expiry
    now = time.time()
    if _jwks_cache is not None and now < _jwks_cache_expiry:
        return _jwks_cache
        
    try:
        url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                _jwks_cache = json.loads(response.read().decode())
                _jwks_cache_expiry = now + 3600  # Cache for 1 hour
                return _jwks_cache
    except Exception as e:
        logger.error("Error fetching JWKS from Supabase: %s", str(e))
        if _jwks_cache is not None:
            return _jwks_cache
    return None

def verify_supabase_jwt(token: str) -> dict | None:
    supabase_url = getattr(settings, "SUPABASE_URL", None)
    if not supabase_url:
        logger.error("Supabase configuration missing: SUPABASE_URL not configured")
        return None
        
    jwks = fetch_jwks(supabase_url)
    if not jwks:
        logger.error("Failed to retrieve Supabase JWKS signing keys")
        return None
        
    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            logger.warning("Supabase JWT validation failed: missing 'kid' header")
            return None
            
        key = None
        for k in jwks.get("keys", []):
            if k.get("kid") == kid:
                key = k
                break
                
        if not key:
            logger.warning("Supabase JWT validation failed: no matching public key found for kid %s", kid)
            return None
            
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256", "ES256"],
            audience="authenticated",
        )
        return payload
    except Exception as e:
        logger.warning("Supabase JWT verification failed: %s", str(e))
        return None

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate the current user from the JWT token (supports Supabase & fallback local JWT)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Try Supabase JWT verification first (primary path)
    supabase_payload = verify_supabase_jwt(token)
    if supabase_payload is not None:
        supabase_user_id = supabase_payload.get("sub")
        email = supabase_payload.get("email")
        if supabase_user_id:
            # Query by supabase_user_id
            result = await db.execute(select(User).where(User.supabase_user_id == supabase_user_id))
            user = result.scalar_one_or_none()
            if user is not None:
                return user
                
            # Fallback to query by email if user existed but supabase_user_id is not yet set
            if email:
                result = await db.execute(select(User).where(User.email == email))
                user = result.scalar_one_or_none()
                if user is not None:
                    # Link user dynamically
                    user.supabase_user_id = supabase_user_id
                    await db.commit()
                    await db.refresh(user)
                    logger.info("Successfully linked existing user email %s to supabase_user_id %s", email, supabase_user_id)
                    return user
            
            # User does not exist locally yet. They must hit the `/auth/sync-profile` route first.
            logger.warning("Unauthorized access attempt: Supabase authenticated user %s (%s) not synced to local database", email or "unknown", supabase_user_id)
            raise credentials_exception

    # 2. Fallback to custom local JWT verification (temporary migration path)
    payload = decode_token(token)
    if payload is not None:
        token_type = payload.get("type")
        if token_type == "access":
            user_id = payload.get("sub")
            if user_id is not None:
                try:
                    result = await db.execute(select(User).where(User.id == int(user_id)))
                    user = result.scalar_one_or_none()
                    if user is not None:
                        logger.info("Authenticated user %s using legacy local JWT fallback", user.email)
                        return user
                except ValueError:
                    pass

    logger.warning("Unauthorized access attempt: invalid, expired, or missing authentication token")
    raise credentials_exception


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure the current user account is active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not activated. Please contact an administrator.",
        )
    return current_user


class RoleChecker:
    """Dependency class for role-based access control.

    Usage:
        @router.get("/admin-only", dependencies=[Depends(RoleChecker(["admin"]))])
    """

    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in self.allowed_roles and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource.",
            )
        return current_user
