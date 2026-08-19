from __future__ import annotations

import sqlite3
import time

from flask import Blueprint, jsonify, request

from app.database import (
    database_has_items,
    db_connect,
    find_item_by_number,
    item_row_to_dict,
)
from app.validators import (
    parse_non_negative_count,
    validate_manual_item_number,
)


item_blueprint = Blueprint(
    "items",
    __name__,
)


@item_blueprint.route("/api/items")
def api_items():
    if not database_has_items():
        return jsonify(
            {
                "error": "No inventory database is loaded.",
                "items": [],
            }
        ), 400

    query = request.args.get(
        "q",
        "",
    ).strip().lower()

    if not query:
        return jsonify({"items": []})

    with db_connect() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM items
            WHERE LOWER(item_number) LIKE ?
               OR LOWER(product_name) LIKE ?
            ORDER BY
                CASE
                    WHEN LOWER(item_number) = ? THEN 0
                    WHEN LOWER(item_number) LIKE ? THEN 1
                    ELSE 2
                END,
                item_number
            LIMIT 30
            """,
            (
                f"%{query}%",
                f"%{query}%",
                query,
                f"{query}%",
            ),
        ).fetchall()

    return jsonify(
        {
            "items": [
                item_row_to_dict(row)
                for row in rows
            ]
        }
    )

@item_blueprint.route("/api/item")
def api_item():
    """
    Look up one item so the operator can reopen the
    packaging material that was just counted.
    """
    item_number = request.args.get(
        "item_number",
        "",
    ).strip()

    if not item_number:
        return jsonify(
            {
                "error": "Item number is required.",
            }
        ), 400

    item = find_item_by_number(item_number)

    if item is None:
        return jsonify(
            {
                "error": (
                    f"{item_number} could not be found."
                ),
            }
        ), 404

    return jsonify({"item": item})


@item_blueprint.route("/api/items/zero-count")
def api_zero_count_items():
    if not database_has_items():
        return jsonify(
            {
                "error": "No inventory database is loaded.",
                "items": [],
            }
        ), 400

    with db_connect() as connection:
        rows = connection.execute(
            """
            SELECT
                items.*,
                COALESCE(
                    SUM(count_entries.count),
                    0
                ) AS counted
            FROM items
            LEFT JOIN count_entries
                ON count_entries.item_number =
                   items.item_number
            GROUP BY
                items.item_number
            HAVING
                COALESCE(
                    SUM(count_entries.count),
                    0
                ) = 0
            ORDER BY
                items.item_number
            """
        ).fetchall()

    return jsonify(
        {
            "items": [
                item_row_to_dict(row)
                for row in rows
            ]
        }
    )

@item_blueprint.route(
    "/api/add-manual-item",
    methods=["POST"],
)
def api_add_manual_item():
    data = request.get_json(force=True)

    try:
        item_number = validate_manual_item_number(
            data.get("item_number")
        )

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

    product_name = str(
        data.get("product_name", "")
    ).strip()

    if find_item_by_number(item_number):
        return jsonify(
            {
                "ok": False,
                "error": (
                    f"{item_number} already exists."
                ),
            }
        ), 400

    timestamp = time.strftime(
        "%Y-%m-%d %H:%M:%S"
    )

    try:
        with db_connect() as connection:
            connection.execute(
                """
                INSERT INTO items (
                    item_number,
                    product_name,
                    physical_inventory,
                    row_number,
                    added_manually
                )
                VALUES (?, ?, '', NULL, 'Yes')
                """,
                (
                    item_number,
                    product_name,
                ),
            )

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
                    "manual_added_item",
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

    return jsonify(
        {
            "ok": True,
            "item": {
                "item_number": item_number,
                "product_name": product_name,
                "counted": count_value,
                "added_manually": "Yes",
            },
            "entry": {
                "id": entry_id,
                "timestamp": timestamp,
                "item_number": item_number,
                "count": count_value,
                "source": "manual_added_item",
            },
        }
    )