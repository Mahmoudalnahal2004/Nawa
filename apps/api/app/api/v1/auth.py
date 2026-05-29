import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, get_current_active_user, oauth2_scheme, verify_supabase_jwt
from app.core.security import decode_token, create_access_token, verify_verification_token
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse, RefreshRequest, SyncProfileRequest
from app.services.auth_service import authenticate_user, create_user, get_user_by_email, generate_tokens

logger = logging.getLogger("app.auth")

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, data)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not activated. Contact an administrator.")
    
    # --- Streak calculation ---
    from datetime import date, timedelta
    today = date.today()
    if user.last_login_date is None:
        user.current_streak = 1
    elif user.last_login_date == today:
        pass  # Already logged in today, streak unchanged
    elif user.last_login_date == today - timedelta(days=1):
        user.current_streak += 1  # Consecutive day
    else:
        user.current_streak = 1  # Streak broken, reset
    user.last_login_date = today
    await db.commit()
    await db.refresh(user)
    
    return generate_tokens(user)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = await create_user(
        db, 
        email=data.email, 
        password=data.password, 
        full_name=data.full_name,
        university=data.university,
        study_year=data.study_year
    )
    return UserResponse.model_validate(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return generate_tokens(user)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    from datetime import date, timedelta
    today = date.today()
    if current_user.last_login_date != today:
        if current_user.last_login_date is None:
            current_user.current_streak = 1
        elif current_user.last_login_date == today - timedelta(days=1):
            current_user.current_streak += 1
        else:
            current_user.current_streak = 1
        current_user.last_login_date = today
        await db.commit()
        await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.get("/verify", response_model=TokenResponse)
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    email = verify_verification_token(token)
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")
    
    user = await get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if not user.is_active:
        user.is_active = True
        await db.commit()
        await db.refresh(user)
    
    return generate_tokens(user)


@router.post("/sync-profile", response_model=UserResponse)
async def sync_profile(
    data: SyncProfileRequest,
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Verify Supabase Token
    supabase_payload = verify_supabase_jwt(token)
    if supabase_payload is None:
        logger.warning("Sync profile failed: invalid or expired Supabase JWT token")
        raise credentials_exception
        
    supabase_user_id = supabase_payload.get("sub")
    email = supabase_payload.get("email")
    if not supabase_user_id or not email:
        logger.warning("Sync profile failed: token missing sub (%s) or email (%s)", supabase_user_id, email)
        raise credentials_exception
        
    try:
        # Check if user already exists by supabase_user_id
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.supabase_user_id == supabase_user_id))
        user = result.scalar_one_or_none()
        
        if user is None:
            # Fallback to check by email if the user existed before but wasn't linked yet
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            if user is not None:
                user.supabase_user_id = supabase_user_id
                logger.info("Sync profile: mapping legacy user %s to supabase_user_id %s", email, supabase_user_id)
                
        if user is not None:
            # Update details if provided
            user.full_name = data.full_name
            if data.university is not None:
                user.university = data.university
            if data.study_year is not None:
                user.study_year = data.study_year
            await db.commit()
            await db.refresh(user)
            logger.info("Successfully synced existing user profile: %s (%s)", email, supabase_user_id)
        else:
            # Provision new user in database
            role = "student"
            from app.core.config import settings
            if email == getattr(settings, "SUPER_ADMIN_EMAIL", None):
                role = "admin"
                
            # Get default quota for student
            from app.models.quota import Quota
            quota_id = None
            if role == "student":
                res_quota = await db.execute(select(Quota).where(Quota.is_default == True))
                default_quota = res_quota.scalar_one_or_none()
                if default_quota:
                    quota_id = default_quota.id
                    
            user = User(
                email=email,
                hashed_password="", # password is managed by Supabase (empty string to avoid SQLite NOT NULL constraint failures)
                supabase_user_id=supabase_user_id,
                full_name=data.full_name,
                role=role,
                is_active=True,
                university=data.university,
                study_year=data.study_year,
                quota_id=quota_id
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            logger.info("Successfully provisioned new local database user: %s (role: %s, university: %s)", email, role, data.university)
            
        return UserResponse.model_validate(user)
    except Exception as e:
        logger.error("Database error during sync profile for %s: %s", email, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal database error during profile synchronization"
        )



