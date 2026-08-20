from __future__ import annotations

from flask import Blueprint, jsonify, render_template

from app.config import (
    APP_FOLDER_NAME,
    WORKBOOK_PATH,
    get_port,
)
from app.database import database_has_items
from app.network_service import (
    generate_qr_code_data_url,
    get_local_ip,
)


main_blueprint = Blueprint(
    "main",
    __name__,
)


@main_blueprint.route("/")
def index():
    workbook_loaded = (
        WORKBOOK_PATH.exists()
        and database_has_items()
    )

    local_ip = get_local_ip()

    network_url = (
        f"http://{local_ip}:{get_port()}"
    )

    qr_code = generate_qr_code_data_url(
        network_url
    )

    return render_template(
        "index.html",
        workbook_loaded=workbook_loaded,
        network_url=network_url,
        qr_code=qr_code,
    )


@main_blueprint.route("/api/ping")
def ping():
    """
    Used at startup to tell an already-running copy of this app
    apart from an unrelated program holding the same port.
    """
    return jsonify(
        {
            "app": APP_FOLDER_NAME,
        }
    )
