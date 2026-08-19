from __future__ import annotations

import sys
from pathlib import Path


PORT = 5000

UPLOAD_PASSWORD = "Bassemisthebest2026"


HEADER_ALIASES = {
    "item_number": [
        "item number",
        "item #",
        "item no",
        "item no.",
        "number",
    ],
    "product_name": [
        "product name",
        "description",
        "product",
    ],
    "physical_inventory": [
        "physical inventory",
        "inventory",
        "physical",
    ],
    "counted": [
        "counted",
        "count",
        "count qty",
        "counted qty",
    ],
    "diff": [
        "diff",
        "difference",
    ],
}


def resource_path(relative_path: str) -> Path:
    if getattr(sys, "frozen", False):
        base_path = Path(sys._MEIPASS)
    else:
        base_path = (
            Path(__file__)
            .resolve()
            .parent
            .parent
        )

    return base_path / relative_path


def get_data_directory() -> Path:
    if getattr(sys, "frozen", False):
        directory = (
            Path(sys.executable)
            .resolve()
            .parent
            / "data"
        )
    else:
        directory = (
            Path(__file__)
            .resolve()
            .parent
            .parent
            / "data"
        )

    directory.mkdir(
        parents=True,
        exist_ok=True,
    )

    return directory


DATA_DIR = get_data_directory()

WORKBOOK_PATH = (
    DATA_DIR
    / "source_inventory.xlsx"
)

PENDING_WORKBOOK_PATH = (
    DATA_DIR
    / "pending_inventory.xlsx"
)

DB_PATH = (
    DATA_DIR
    / "inventory_counts.sqlite3"
)