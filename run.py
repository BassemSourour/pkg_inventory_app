from __future__ import annotations

import threading
import webbrowser

from waitress import serve

from app import create_app
from app.config import PORT, WORKBOOK_PATH
from app.database import database_has_items, init_db
from app.excel_service import import_excel_to_db


application = create_app()


def open_browser() -> None:
    webbrowser.open(f"http://127.0.0.1:{PORT}")


def prepare_application() -> None:
    init_db()

    if WORKBOOK_PATH.exists() and not database_has_items():
        try:
            import_excel_to_db()
        except Exception as error:
            print(f"Existing workbook could not be imported: {error}")


if __name__ == "__main__":
    prepare_application()

    threading.Timer(
        1.5,
        open_browser,
    ).start()

    serve(
        application,
        host="0.0.0.0",
        port=PORT,
        threads=8,
    )