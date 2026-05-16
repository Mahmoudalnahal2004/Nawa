import asyncio
import sys
import os

# Add the apps/api directory to sys.path so we can import app modules
sys.path.append(os.path.join(os.getcwd(), 'apps', 'api'))

from app.db.session import async_session_factory
from app.models.user import User, UserRole
from app.core.security import hash_password

async def seed_student():
    async with async_session_factory() as session:
        # Check if exists
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.email == "student@nawa.com"))
        student = result.scalar_one_or_none()
        
        if student is None:
            student = User(
                email="student@nawa.com",
                hashed_password=hash_password("Student123!"),
                full_name="Test Student",
                role=UserRole.STUDENT,
                is_active=True,
            )
            session.add(student)
            await session.commit()
            print("Student user created: student@nawa.com")
        else:
            student.is_active = True
            await session.commit()
            print("Student user already exists and activated: student@nawa.com")

if __name__ == "__main__":
    asyncio.run(seed_student())
