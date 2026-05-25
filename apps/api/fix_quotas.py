import asyncio
from app.db.session import async_session_factory
from sqlalchemy import select, update
from app.models.quota import Quota
from app.models.user import User, UserRole

async def main():
    async with async_session_factory() as db:
        # Get default quota
        result = await db.execute(select(Quota).where(Quota.is_default == True))
        default_quota = result.scalar_one_or_none()
        print(f"Default Quota: {default_quota}")
        
        if default_quota:
            # Update students without quota
            await db.execute(
                update(User)
                .where(User.quota_id == None)
                .where(User.role == UserRole.STUDENT)
                .values(quota_id=default_quota.id)
            )
            await db.commit()
            print("Updated existing users without a quota to use the default quota.")
        else:
            print("No default quota found.")

if __name__ == "__main__":
    asyncio.run(main())
