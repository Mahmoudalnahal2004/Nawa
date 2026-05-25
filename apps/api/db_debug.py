import sqlite3

conn = sqlite3.connect('nawa_qbank.db')
c = conn.cursor()
c.execute("SELECT id, name FROM categories WHERE name='Pediatrics'")
cat = c.fetchone()
print('Cat:', cat)
if cat:
    c.execute('SELECT id, status FROM questions WHERE category_id=?', (cat[0],))
    qs = c.fetchall()
    print('Questions:', qs)

c.execute("SELECT id, email FROM users WHERE email='student@nawa.com'")
u = c.fetchone()
print('User:', u)
if u:
    c.execute('SELECT * FROM user_progress WHERE user_id=?', (u[0],))
    prog = c.fetchall()
    print('Progress rows:', prog)
    
    c.execute('SELECT id, quiz_name FROM quiz_sessions WHERE user_id=?', (u[0],))
    sess = c.fetchall()
    print('Quiz sessions:', sess)
