from __future__ import annotations

import os
import sys
from pathlib import Path


APP_NAME = "Packaging Inventory Logger"

APP_FOLDER_NAME = "PackagingInventoryLogger"

# Read by tools/build.ps1 and passed to the installer compiler,
# so this is the only place the version needs changing.
APP_VERSION = "1.0.0"

DEFAULT_PORT = 5000

UPLOAD_PASSWORD = "Bassemisthebest2026"


# The port is resolved at startup rather than fixed, because
# another program may already hold the default. Everything that
# builds a URL must read it through get_port() so the QR code
# always points at the port actually in use.
_runtime_port = DEFAULT_PORT


def get_port() -> int:
    return _runtime_port


def set_port(port: int) -> None:
    global _runtime_port

    _runtime_port = int(port)


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
    """
    Counts and the workbook must live somewhere the operator can
    always write to. An installed copy sits under Program Files or
    LocalAppData, so the data folder is kept in the user profile
    rather than next to the executable. Running from source keeps
    using the project folder so development data stays visible.
    """
    if getattr(sys, "frozen", False):
        local_app_data = os.environ.get(
            "LOCALAPPDATA"
        )

        if local_app_data:
            base_directory = Path(local_app_data)
        else:
            base_directory = Path.home()

        directory = (
            base_directory
            / APP_FOLDER_NAME
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