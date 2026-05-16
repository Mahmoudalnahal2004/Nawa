import sqlite3
import os

db_path = os.path.join('apps', 'api', 'nawa_qbank.db')
conn = sqlite3.connect(db_path)
conn.execute("INSERT INTO categories (name, description, icon, created_at) VALUES ('Empty Category', 'No questions here', '👻', datetime('now'))")
conn.commit()
conn.close()
print("Empty category inserted.")
