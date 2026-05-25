import asyncio
from sqlalchemy import delete
from app.db.session import async_session_factory
from app.models.bookmark import Bookmark
from app.models.note import Note

async def cleanup():
    async with async_session_factory() as db:
        # Delete all bookmarks and notes for user 3
        b_res = await db.execute(delete(Bookmark).where(Bookmark.user_id == 3))
        n_res = await db.execute(delete(Note).where(Note.user_id == 3))
        
        await db.commit()
        print("Cleared bookmarks and notes")

asyncio.run(cleanup())
