import sqlite3

conn = sqlite3.connect("civicai.db")
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(submissions)")
columns = [row[1] for row in cursor.fetchall()]

if "status" in columns:
    print("Status column already exists.")
else:
    cursor.execute(
        "ALTER TABLE submissions "
        "ADD COLUMN status TEXT NOT NULL DEFAULT 'Submitted'"
    )

    conn.commit()
    print("Status column added successfully.")

conn.close()