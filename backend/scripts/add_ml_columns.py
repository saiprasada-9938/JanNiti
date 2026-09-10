import sqlite3

DB_PATH = "civicai.db"

connection = sqlite3.connect(DB_PATH)
cursor = connection.cursor()

# Get existing columns
cursor.execute("PRAGMA table_info(submissions)")
columns = [row[1] for row in cursor.fetchall()]

# Add ML category if missing
if "ml_category" not in columns:
    cursor.execute("""
        ALTER TABLE submissions
        ADD COLUMN ml_category VARCHAR(100)
    """)
    print("Added ml_category")
else:
    print("ml_category already exists")

# Add ML confidence if missing
if "ml_confidence" not in columns:
    cursor.execute("""
        ALTER TABLE submissions
        ADD COLUMN ml_confidence FLOAT
    """)
    print("Added ml_confidence")
else:
    print("ml_confidence already exists")

connection.commit()
connection.close()

print("ML database migration completed.")