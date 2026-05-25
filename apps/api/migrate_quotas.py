import asyncio
from sqlalchemy import text
from app.db.session import engine


async def run_migration():
    print("Running Quotas Migration...")
    
    # SQLite compatible script
    queries = [
        """
        CREATE TABLE IF NOT EXISTS quotas (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            name VARCHAR NOT NULL, 
            description VARCHAR
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS quota_category (
            quota_id INTEGER REFERENCES quotas(id) ON DELETE CASCADE, 
            category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
            PRIMARY KEY (quota_id, category_id)
        );
        """
    ]

    async with engine.begin() as conn:
        for query in queries:
            await conn.execute(text(query))
            
        # Try adding the column, ignore if it already exists
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN quota_id INTEGER REFERENCES quotas(id) ON DELETE SET NULL;"))
            print("Added quota_id column to users table.")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("quota_id column already exists.")
            else:
                raise e
            
    print("Migration completed successfully.")


if __name__ == "__main__":
    asyncio.run(run_migration())
