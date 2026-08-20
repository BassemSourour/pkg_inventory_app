from __future__ import annotations

import ctypes
import json
import os
import socket
import sys
import threading
import traceback
import urllib.error
import urllib.request
from datetime import datetime

from waitress import serve

from app import create_app
from app.config import (
    APP_FOLDER_NAME,
    APP_NAME,
    DATA_DIR,
    DEFAULT_PORT,
    WORKBOOK_PATH,
    get_port,
    set_port,
)
from app.database import database_has_items, init_db
from app.excel_service import import_excel_to_db


LOG_PATH = DATA_DIR / "startup.log"

PORT_SCAN_LIMIT = 20

SERVER_START_TIMEOUT_SECONDS = 30

# The installer checks for this mutex so it can offer to close a
# running copy instead of failing on a locked file. Keep the name
# in step with AppMutex in installer/PackagingInventoryLogger.iss.
SINGLE_INSTANCE_MUTEX_NAME = "PackagingInventoryLoggerMutex"

_mutex_handle = None


def claim_single_instance_mutex() -> None:
    global _mutex_handle

    try:
        _mutex_handle = (
            ctypes.windll.kernel32.CreateMutexW(
                None,
                False,
                SINGLE_INSTANCE_MUTEX_NAME,
            )
        )

    except Exception as error:
        log_message(
            f"Could not create instance mutex: {error}"
        )


def log_message(message: str) -> None:
    """
    A windowed build has no console, so anything worth reading
    after the fact has to go to a file next to the data.
    """
    stamp = datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    )

    try:
        with LOG_PATH.open(
            "a",
            encoding="utf-8",
        ) as log_file:
            log_file.write(
                f"[{stamp}] {message}\n"
            )

    except OSError:
        pass


def show_message(
    message: str,
    title: str = APP_NAME,
) -> None:
    try:
        ctypes.windll.user32.MessageBoxW(
            None,
            message,
            title,
            0x40,
        )

    except Exception:
        log_message(
            f"Could not show message box: {message}"
        )


def ping_port(port: int) -> bool:
    """
    True when the port is held by another copy of this app,
    rather than by an unrelated program.
    """
    try:
        with urllib.request.urlopen(
            f"http://127.0.0.1:{port}/api/ping",
            timeout=1.5,
        ) as response:
            payload = json.loads(
                response.read().decode("utf-8")
            )

        return payload.get("app") == APP_FOLDER_NAME

    except (
        urllib.error.URLError,
        OSError,
        ValueError,
    ):
        return False


def port_is_free(port: int) -> bool:
    """
    SO_REUSEADDR is deliberately not set. On Windows it allows a
    bind to a port another process is actively listening on, which
    would make every port look free.
    """
    with socket.socket(
        socket.AF_INET,
        socket.SOCK_STREAM,
    ) as test_socket:
        try:
            test_socket.bind(
                ("0.0.0.0", port)
            )

            return True

        except OSError:
            return False


def resolve_port() -> int | None:
    """
    Returns the port to serve on, or None when this app is
    already running and the existing window should be used.
    """
    for offset in range(PORT_SCAN_LIMIT):
        port = DEFAULT_PORT + offset

        # Ask who is there before testing the bind, so an already
        # running copy is recognised regardless of socket quirks.
        if ping_port(port):
            return None

        if port_is_free(port):
            return port

    raise RuntimeError(
        "No free port was available between "
        f"{DEFAULT_PORT} and "
        f"{DEFAULT_PORT + PORT_SCAN_LIMIT - 1}."
    )


def prepare_application() -> None:
    init_db()

    if (
        WORKBOOK_PATH.exists()
        and not database_has_items()
    ):
        try:
            import_excel_to_db()

        except Exception as error:
            log_message(
                "Existing workbook could not be "
                f"imported: {error}"
            )


def start_server(port: int) -> None:
    application = create_app()

    def run_server() -> None:
        try:
            serve(
                application,
                host="0.0.0.0",
                port=port,
                threads=8,
            )

        except Exception as error:
            log_message(
                f"Server stopped: {error}"
            )

    server_thread = threading.Thread(
        target=run_server,
        daemon=True,
    )

    server_thread.start()


def wait_for_server(port: int) -> bool:
    waiter = threading.Event()

    attempts = SERVER_START_TIMEOUT_SECONDS * 4

    for _ in range(attempts):
        if ping_port(port):
            return True

        waiter.wait(0.25)

    return False


def open_window(port: int) -> None:
    import webview

    webview.create_window(
        APP_NAME,
        f"http://127.0.0.1:{port}",
        width=1180,
        height=860,
        min_size=(900, 640),
        confirm_close=True,
    )

    webview.start()


def main() -> int:
    port = resolve_port()

    if port is None:
        show_message(
            f"{APP_NAME} is already running.\n\n"
            "Use the window that is already open."
        )

        return 0

    set_port(port)

    claim_single_instance_mutex()

    prepare_application()

    start_server(port)

    if not wait_for_server(port):
        show_message(
            "The application could not start its "
            "server.\n\nDetails were written to:\n"
            f"{LOG_PATH}"
        )

        return 1

    log_message(
        f"Started on port {get_port()}"
    )

    if "--no-window" in sys.argv:
        # Headless mode for testing: serve until interrupted.
        threading.Event().wait()

        return 0

    open_window(port)

    return 0


if __name__ == "__main__":
    try:
        exit_code = main()

    except Exception:
        log_message(
            "Fatal startup error:\n"
            + traceback.format_exc()
        )

        show_message(
            f"{APP_NAME} could not start.\n\n"
            "Details were written to:\n"
            f"{LOG_PATH}"
        )

        exit_code = 1

    # The server runs on a daemon thread, so leave immediately
    # rather than waiting on it once the window has closed.
    os._exit(exit_code)
