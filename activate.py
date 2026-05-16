import sqlite3
import sys
import os

db_path = os.path.join('apps', 'api', 'nawa_qbank.db')
conn = sqlite3.connect(db_path)
conn.execute("UPDATE users SET is_active = 1 WHERE email = 'student@nawa.com'")
conn.commit()
conn.close()
print("Activated student@nawa.com")
