import asyncio
from app.db.session import async_session_factory
from app.services.user_service import list_all_users
from app.schemas.user import UserListResponse

async def test_users():
    async with async_session_factory() as db:
        users = await list_all_users(db)
        print(f"Found {len(users)} users.")
        for u in users:
            try:
                UserListResponse.model_validate(u)
            except Exception as e:
                print(f"Validation error for user {u.id}: {e}")

asyncio.run(test_users())
