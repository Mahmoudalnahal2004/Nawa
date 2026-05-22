"""Add gamification columns to users table."""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "nawa_qbank.db")

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check existing columns
    cursor.execute("PRAGMA table_info(users)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if "current_streak" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0")
        print("[MIGRATE] Added current_streak column")
    
    if "last_login_date" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN last_login_date DATE")
        print("[MIGRATE] Added last_login_date column")
    
    if "is_anonymous" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT 0")
        print("[MIGRATE] Added is_anonymous column")
    
    conn.commit()
    conn.close()
    print("[MIGRATE] Gamification migration complete!")

if __name__ == "__main__":
    migrate()
