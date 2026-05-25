import sqlite3

def migrate():
    print("Running migration to add time_per_question to quiz_sessions...")
    conn = sqlite3.connect('nawa_qbank.db')
    cursor = conn.cursor()
    
    try:
        # SQLite doesn't directly support IF NOT EXISTS for columns in ALTER TABLE, 
        # so we catch the OperationalError if it already exists.
        cursor.execute("ALTER TABLE quiz_sessions ADD COLUMN time_per_question INTEGER DEFAULT 60;")
        print("Column 'time_per_question' added successfully.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column 'time_per_question' already exists. Skipping.")
        else:
            print(f"An error occurred: {e}")
            raise
    
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
