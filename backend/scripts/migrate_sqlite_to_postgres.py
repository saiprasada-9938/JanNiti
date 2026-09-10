import os
import sys
import sqlite3
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

from app.database.database import Base
from app.models.submission import Submission


load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing from backend/.env")


if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgres://",
        "postgresql+psycopg://",
        1
    )
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+psycopg://",
        1
    )


print("Connecting to PostgreSQL...")

pg_engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)


# Create PostgreSQL tables from the current application model.
print("Creating PostgreSQL tables if needed...")
Base.metadata.create_all(pg_engine)


# ---------------------------------------------------------
# READ OLD SQLITE DATABASE
# ---------------------------------------------------------

sqlite_connection = sqlite3.connect("civicai.db")
sqlite_connection.row_factory = sqlite3.Row

rows = sqlite_connection.execute(
    "SELECT * FROM submissions ORDER BY id"
).fetchall()

sqlite_connection.close()

print(f"SQLite records found: {len(rows)}")


# ---------------------------------------------------------
# CHECK POSTGRESQL
# ---------------------------------------------------------

with pg_engine.connect() as connection:
    existing_count = connection.execute(
        text("SELECT COUNT(*) FROM submissions")
    ).scalar()

print(f"Existing PostgreSQL records: {existing_count}")


if existing_count != 0:
    raise RuntimeError(
        "PostgreSQL already contains records. "
        "Migration stopped to protect existing data."
    )


# ---------------------------------------------------------
# PREPARE RECORDS
# ---------------------------------------------------------

model_columns = {
    column.name
    for column in Submission.__table__.columns
}

# These columns are NOT NULL in the current JanNiti model.
required_text_fields = [
    "name",
    "phone",
    "village",
    "district",
    "language",
]


records = []

for row in rows:

    old_data = dict(row)

    record = {
        column: old_data.get(column)
        for column in model_columns
        if column in old_data
    }

    # Old database contains NULL values for some required fields.
    # Preserve all other original data and use "Unknown"
    # only where the old value is missing.
    for field in required_text_fields:
        if record.get(field) is None or record.get(field) == "":
            record[field] = "Unknown"

    # Safety defaults for required application fields.
    if not record.get("ai_status"):
        record["ai_status"] = "Pending"

    if not record.get("status"):
        record["status"] = "Submitted"

    records.append(record)


print("Prepared records for PostgreSQL migration.")


# ---------------------------------------------------------
# INSERT
# ---------------------------------------------------------

with pg_engine.begin() as connection:

    connection.execute(
        Submission.__table__.insert(),
        records
    )

    # Make PostgreSQL continue IDs after the imported records.
    connection.execute(
        text("""
            SELECT setval(
                pg_get_serial_sequence('submissions', 'id'),
                COALESCE((SELECT MAX(id) FROM submissions), 1),
                true
            )
        """)
    )


# ---------------------------------------------------------
# VERIFY
# ---------------------------------------------------------

with pg_engine.connect() as connection:

    final_count = connection.execute(
        text("SELECT COUNT(*) FROM submissions")
    ).scalar()

print()
print("====================================")
print("MIGRATION COMPLETED")
print("====================================")
print(f"SQLite records      : {len(rows)}")
print(f"PostgreSQL records  : {final_count}")

if final_count == len(rows):
    print("SUCCESS: All records were migrated.")
else:
    print("WARNING: Record counts do not match.")