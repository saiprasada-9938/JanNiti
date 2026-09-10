import sqlite3

conn = sqlite3.connect("civicai.db")
cursor = conn.cursor()

columns = [
    ("ai_category", "TEXT"),
    ("ai_summary", "TEXT"),
    ("ai_department", "TEXT"),
    ("ai_keywords", "TEXT"),
]

existing_columns = [
    row[1]
    for row in cursor.execute("PRAGMA table_info(submissions)")
]

for column_name, column_type in columns:
    if column_name not in existing_columns:
        cursor.execute(
            f"ALTER TABLE submissions ADD COLUMN {column_name} {column_type}"
        )
        print(f"Added: {column_name}")
    else:
        print(f"Already exists: {column_name}")

conn.commit()
conn.close()

print("AI database columns are ready.")