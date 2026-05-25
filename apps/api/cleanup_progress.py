import asyncio
from sqlalchemy import select, delete
from app.db.session import async_session_factory
from app.models.user_progress import UserProgress
from app.models.quiz_session import QuizSession

async def cleanup():
    async with async_session_factory() as db:
        # Get all progress
        prog_res = await db.execute(select(UserProgress))
        progresses = prog_res.scalars().all()
        
        # Get all sessions
        sess_res = await db.execute(select(QuizSession))
        sessions = sess_res.scalars().all()
        
        # Build set of (user_id, question_id) from sessions
        valid_pairs = set()
        for sess in sessions:
            for q in sess.questions:
                valid_pairs.add((sess.user_id, q["id"]))
                
        # Delete orphaned
        orphaned = 0
        for p in progresses:
            if (p.user_id, p.question_id) not in valid_pairs:
                await db.execute(delete(UserProgress).where(UserProgress.id == p.id))
                orphaned += 1
                
        await db.commit()
        print(f"Cleaned up {orphaned} orphaned progress records.")

asyncio.run(cleanup())
