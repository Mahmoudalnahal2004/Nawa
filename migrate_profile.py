"""
Add university, study_year to users table and study_year to categories table.
SQLite does not support ADD COLUMN IF NOT EXISTS, so we check pragmas first.
"""
import sqlite3, os

db_path = os.path.join("apps", "api", "nawa_qbank.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# --- users table ---
existing_users = {row[1] for row in cur.execute("PRAGMA table_info(users)")}
if "university" not in existing_users:
    cur.execute("ALTER TABLE users ADD COLUMN university TEXT")
    print("Added users.university")
if "study_year" not in existing_users:
    cur.execute("ALTER TABLE users ADD COLUMN study_year INTEGER")
    print("Added users.study_year")

# --- categories table ---
existing_cats = {row[1] for row in cur.execute("PRAGMA table_info(categories)")}
if "study_year" not in existing_cats:
    cur.execute("ALTER TABLE categories ADD COLUMN study_year INTEGER")
    print("Added categories.study_year")

conn.commit()
conn.close()
print("Migration complete.")
