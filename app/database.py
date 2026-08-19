from __future__ import annotations

import sqlite3
from typing import Any

from app.config import DB_PATH


def db_connect() -> sqlite3.Connection:
    connection = sqlite3.connect(
        DB_PATH,
        timeout=30,
    )

    connection.row_factory = sqlite3.Row

    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 30000")

    return connection


def create_database_tables() -> None:
    with db_connect() as connection:
        connection.execute("PRAGMA journal_mode = WAL")

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS items (
                item_number TEXT PRIMARY KEY,
                product_name TEXT NOT NULL DEFAULT '',
                physical_inventory TEXT NOT NULL DEFAULT '',
                row_number INTEGER,
                added_manually TEXT NOT NULL DEFAULT ''
            )
            """
        )

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS count_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                item_number TEXT NOT NULL,
                count REAL NOT NULL CHECK(count >= 0),
                source TEXT NOT NULL,
                FOREIGN KEY(item_number)
                    REFERENCES items(item_number)
                    ON DELETE CASCADE
            )
            """
        )


def init_db() -> None:
    try:
        create_database_tables()

    except sqlite3.DatabaseError:
        if DB_PATH.exists():
            DB_PATH.unlink()

        create_database_tables()


def reset_db() -> None:
    if DB_PATH.exists():
        DB_PATH.unlink()

    init_db()


def database_has_items() -> bool:
    if not DB_PATH.exists():
        return False

    try:
        with db_connect() as connection:
            row = connection.execute(
                """
                SELECT COUNT(*) AS item_count
                FROM items
                """
            ).fetchone()

        return int(row["item_count"] or 0) > 0

    except sqlite3.DatabaseError:
        return False


def get_item_count_summary(
    item_number: str,
) -> tuple[float, int]:
    with db_connect() as connection:
        row = connection.execute(
            """
            SELECT
                COALESCE(SUM(count), 0) AS total,
                COUNT(*) AS entry_count
            FROM count_entries
            WHERE UPPER(item_number) = UPPER(?)
            """,
            (item_number,),
        ).fetchone()

    return (
        float(row["total"] or 0),
        int(row["entry_count"] or 0),
    )


def item_row_to_dict(
    row: sqlite3.Row,
) -> dict[str, Any]:
    total, entry_count = get_item_count_summary(
        row["item_number"]
    )

    return {
        "row": row["row_number"],
        "item_number": row["item_number"],
        "product_name": row["product_name"] or "",
        "physical_inventory": row["physical_inventory"] or "",
        "counted": total if entry_count > 0 else None,
        "diff": None,
        "added_manually": row["added_manually"] or "",
    }


def find_item_by_number(
    item_number: str,
) -> dict[str, Any] | None:
    with db_connect() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM items
            WHERE UPPER(item_number) = UPPER(?)
            """,
            (item_number.strip(),),
        ).fetchone()

    if row is None:
        return None

    return item_row_to_dict(row)