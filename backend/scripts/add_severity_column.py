"""Add the citizen-reported severity column to an existing CivicAI SQLite DB.

Run this once from the backend directory after backing up civicai.db. It is
safe to run again: it leaves the database unchanged when the column exists.
"""

import sqlite3


DATABASE_FILE = "civicai.db"


def main():
    with sqlite3.connect(DATABASE_FILE) as connection:
        columns = {
            row[1]
            for row in connection.execute("PRAGMA table_info(submissions)")
        }

        if "severity" in columns:
            print("severity column already exists; no change made.")
            return

        connection.execute(
            "ALTER TABLE submissions ADD COLUMN severity VARCHAR(20)"
        )
        connection.commit()
        print("Added severity column. Existing submissions remain unchanged.")


if __name__ == "__main__":
    main()
