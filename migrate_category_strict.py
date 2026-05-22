"""
Rename study_year to target_year and add university to categories table.
"""
import sqlite3, os

db_path = os.path.join("apps", "api", "nawa_qbank.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Check current columns in categories
columns = {row[1] for row in cur.execute("PRAGMA table_info(categories)")}

if "study_year" in columns and "target_year" not in columns:
    # Rename study_year to target_year
    cur.execute("ALTER TABLE categories RENAME COLUMN study_year TO target_year")
    print("Renamed categories.study_year to target_year")

if "university" not in columns:
    # Add university column
    cur.execute("ALTER TABLE categories ADD COLUMN university VARCHAR(255)")
    print("Added categories.university")

conn.commit()
conn.close()
print("Migration complete.")
