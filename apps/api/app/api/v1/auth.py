from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, get_current_active_user
from app.core.security import decode_token, create_access_token, verify_verification_token
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse, RefreshRequest
from app.services.auth_service import authenticate_user, create_user, get_user_by_email, generate_tokens

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

