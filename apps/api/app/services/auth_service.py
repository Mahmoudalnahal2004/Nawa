from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, create_verification_token
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services.email_service import send_verification_email


async def authenticate_user(db: AsyncSession, login_data: LoginRequest) -> User | None:
    """Validate email and password, return user or None."""
    result = await db.execute(select(User).where(User.email == login_data.email))
    user = result.scalar_one_or_none()
    if user is None:
        return None
    if not verify_password(login_data.password, user.hashed_password):
        return None
    return user


async def create_user(
    db: AsyncSession,
    email: str,
    password: str,
    full_name: str,
    role: UserRole = UserRole.STUDENT,
    is_active: bool = False,
    university: str | None = None,
    study_year: int | None = None,
) -> User:
    """Create a new user account."""
    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=role,
        is_active=is_active,
        university=university,
        study_year=study_year,
    )
    
    if role == UserRole.STUDENT:
        from app.models.quota import Quota
        result = await db.execute(select(Quota).where(Quota.is_default == True))
        default_quota = result.scalar_one_or_none()
        if default_quota:
            user.quota_id = default_quota.id

    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_verification_token(user.email)
    await send_verification_email(user.email, token)

    return user


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Fetch a user by email."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


def generate_tokens(user: User) -> TokenResponse:
    """Generate access and refresh tokens for a user."""
    token_data = {"sub": str(user.id), "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )
