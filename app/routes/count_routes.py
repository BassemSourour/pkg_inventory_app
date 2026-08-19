from __future__ import annotations

import sqlite3
import time

from flask import Blueprint, jsonify, request

from app.database import (
    db_connect,
    find_item_by_number,
    get_item_count_summary,
)
from app.validators import (
    normalize_item_number,
    parse_non_negative_count,
)


count_blueprint = Blueprint(
    "counts",
    __name__,
)


@count_blueprint.route(
    "/api/save-count",
    methods=["POST"],
)
def api_save_count():
    data = request.get_json(force=True)

    item_number = normalize_item_number(
        data.get("item_number")
    )

    source = str(
        data.get("source", "manual")
    ).strip()

    if not item_number:
        return jsonify(
            {
                "ok": False,
                "error": "Item number is required.",
            }
        ), 400

    try:
        count_value = parse_non_negative_count(
            data.get("count")
        )

    except ValueError as error:
        return jsonify(
            {
                "ok": False,
                "error": str(error),
            }
        ), 400

    if find_item_by_number(item_number) is None:
        return jsonify(
            {
                "ok": False,
                "error": (
                    f"{item_number} was not found."
                ),
            }
        ), 404

    timestamp = time.strftime(
        "%Y-%m-%d %H:%M:%S"
    )

    try:
        with db_connect() as connection:
            cursor = connection.execute(
                """
                INSERT INTO count_entries (
                    timestamp,
                    item_number,
                    count,
                    source
                )
                VALUES (?, ?, ?, ?)
                """,
                (
                    timestamp,
                    item_number,
                    count_value,
                    source,
                ),
            )

            entry_id = cursor.lastrowid

    except sqlite3.DatabaseError as error:
        return jsonify(
            {
                "ok": False,
                "error": (
                    f"Database save failed: {error}"
                ),
            }
        ), 500

    total, _ = get_item_count_summary(
        item_number
    )

    return jsonify(
        {
            "ok": True,
            "entry": {
                "id": entry_id,
                "timestamp": timestamp,
                "item_number": item_number,
                "count": count_value,
                "source": source,
            },
            "item_number": item_number,
            "item_total": total,
        }
    )


@count_blueprint.route("/api/entries")
def api_entries():
    item_number = normalize_item_number(
        request.args.get(
            "item_number",
            "",
        )
    )

    if not item_number:
        return jsonify({"entries": []})

    with db_connect() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM count_entries
            WHERE UPPER(item_number) = UPPER(?)
            ORDER BY id DESC
            """,
            (item_number,),
        ).fetchall()

    return jsonify(
        {
            "entries": [
                dict(row)
                for row in rows
            ]
        }
    )


@count_blueprint.route(
    "/api/delete-entry",
    methods=["POST"],
)
def api_delete_entry():
    data = request.get_json(force=True)

    entry_id = data.get("id")

    if entry_id is None:
        return jsonify(
            {
                "ok": False,
                "error": "Entry ID is required.",
            }
        ), 400

    with db_connect() as connection:
        target = connection.execute(
            """
            SELECT *
            FROM count_entries
            WHERE id = ?
            """,
            (entry_id,),
        ).fetchone()

        if target is None:
            return jsonify(
                {
                    "ok": False,
                    "error": "Entry not found.",
                }
            ), 404

        item_number = target["item_number"]

        connection.execute(
            """
            DELETE FROM count_entries
            WHERE id = ?
            """,
            (entry_id,),
        )

    total, _ = get_item_count_summary(
        item_number
    )

    return jsonify(
        {
            "ok": True,
            "item_number": item_number,
            "item_total": total,
        }
    )


@count_blueprint.route(
    "/api/update-entry",
    methods=["POST"],
)
def api_update_entry():
    data = request.get_json(force=True)

    entry_id = data.get("id")

    if entry_id is None:
        return jsonify(
            {
                "ok": False,
                "error": "Entry ID is required.",
            }
        ), 400

    try:
        new_count = parse_non_negative_count(
            data.get("count")
        )

    except ValueError as error:
        return jsonify(
            {
                "ok": False,
                "error": str(error),
            }
        ), 400

    with db_connect() as connection:
        target = connection.execute(
            """
            SELECT *
            FROM count_entries
            WHERE id = ?
            """,
            (entry_id,),
        ).fetchone()

        if target is None:
            return jsonify(
                {
                    "ok": False,
                    "error": "Entry not found.",
                }
            ), 404

        item_number = target["item_number"]

        connection.execute(
            """
            UPDATE count_entries
            SET count = ?
            WHERE id = ?
            """,
            (
                new_count,
                entry_id,
            ),
        )

    total, _ = get_item_count_summary(
        item_number
    )

    return jsonify(
        {
            "ok": True,
            "item_number": item_number,
            "item_total": total,
        }
    )