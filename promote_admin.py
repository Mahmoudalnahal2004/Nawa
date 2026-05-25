import sqlite3
import sys
import os

def promote_admin(email):
    db_path = os.path.join('apps', 'api', 'nawa_qbank.db')
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check if user exists
    cursor.execute("SELECT id, role, is_active FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()

    if not user:
        print(f"User with email '{email}' not found.")
        conn.close()
        return

    # Update user role to 'admin' and activate them if not already active
    cursor.execute("UPDATE users SET role = 'admin', is_active = 1 WHERE email = ?", (email,))
    conn.commit()
    conn.close()

    print(f"Successfully promoted '{email}' to admin!")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python promote_admin.py <user_email>")
    else:
        promote_admin(sys.argv[1])
