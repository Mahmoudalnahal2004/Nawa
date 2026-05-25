import asyncio
from app.db.session import async_session_factory
from app.schemas.quota import QuotaCreate
from app.services.quota_service import create_quota

async def main():
    async with async_session_factory() as db:
        try:
            res = await create_quota(db, QuotaCreate(name='test_python', category_ids=[]))
            print("Success:", res)
            await db.commit()
        except Exception as e:
            print("Error details:", e)
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
