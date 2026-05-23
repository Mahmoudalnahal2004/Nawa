import asyncio
from app.db.session import async_session_factory
from app.services.analytics_service import get_overall_progress, get_category_progress
from app.services.quiz_service import get_recent_sessions

async def main():
    async with async_session_factory() as db:
        print("Testing get_overall_progress")
        overall = await get_overall_progress(db, 1)
        print("Overall:", overall)
        
        print("Testing get_category_progress")
        cats = await get_category_progress(db, 1)
        print("Categories:", cats)
        
        print("Testing get_recent_sessions")
        sessions = await get_recent_sessions(db, 1)
        print("Sessions:", sessions)

if __name__ == "__main__":
    asyncio.run(main())
