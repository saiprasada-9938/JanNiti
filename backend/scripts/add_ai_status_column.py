"""Add AI processing status to existing CivicAI SQLite databases safely."""

import sqlite3


with sqlite3.connect("civicai.db") as connection:
    columns = {row[1] for row in connection.execute("PRAGMA table_info(submissions)")}
    if "ai_status" not in columns:
        connection.execute(
            "ALTER TABLE submissions ADD COLUMN ai_status VARCHAR(30) NOT NULL DEFAULT 'Complete'"
        )
        connection.commit()
        print("Added ai_status; existing records are marked Complete.")
    else:
        print("ai_status already exists; no change made.")
