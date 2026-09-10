import sqlite3

DB_PATH = "civicai.db"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Check existing columns
cursor.execute("PRAGMA table_info(submissions)")
columns = [row[1] for row in cursor.fetchall()]

if "photo_filename" not in columns:
    cursor.execute(
        "ALTER TABLE submissions ADD COLUMN photo_filename VARCHAR(255)"
    )
    print("Added photo_filename")

if "photo_analysis" not in columns:
    cursor.execute(
        "ALTER TABLE submissions ADD COLUMN photo_analysis VARCHAR(2000)"
    )
    print("Added photo_analysis")

conn.commit()

# Verify
cursor.execute("PRAGMA table_info(submissions)")
print("\nCurrent submissions columns:")
for row in cursor.fetchall():
    print(row[1])

conn.close()

print("\nDatabase migration completed successfully.")