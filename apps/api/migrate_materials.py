import sqlite3

def migrate():
    print("Creating study_materials table...")
    conn = sqlite3.connect('nawa_qbank.db')
    cursor = conn.cursor()
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS study_materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        file_url VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
    ''')
    
    cursor.execute('''
    CREATE INDEX IF NOT EXISTS ix_study_materials_category_id ON study_materials (category_id);
    ''')
    
    conn.commit()
    conn.close()
    print("Migration completed.")

if __name__ == "__main__":
    migrate()
