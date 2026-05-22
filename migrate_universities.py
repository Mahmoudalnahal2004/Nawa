"""
Create universities table.
"""
import sqlite3, os

db_path = os.path.join("apps", "api", "nawa_qbank.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS universities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE
)
""")
cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_universities_name ON universities (name)")

conn.commit()
conn.close()
print("Migration complete: created universities table.")
