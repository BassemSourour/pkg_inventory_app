from __future__ import annotations

import secrets

from flask import (
    Blueprint,
    jsonify,
    redirect,
    request,
    send_file,
    url_for,
)
from werkzeug.utils import secure_filename

from app.config import (
    PENDING_WORKBOOK_PATH,
    UPLOAD_PASSWORD,
    WORKBOOK_PATH,
)
from app.database import reset_db
from app.excel_service import (
    build_export_workbook,
    import_excel_to_db,
    validate_workbook_file,
)


file_blueprint = Blueprint(
    "files",
    __name__,
)


def is_valid_upload_password(
    submitted_password: str,
) -> bool:
    if not UPLOAD_PASSWORD:
        return False

    return secrets.compare_digest(
        submitted_password,
        UPLOAD_PASSWORD,
    )


@file_blueprint.route(
    "/validate-upload-password",
    methods=["POST"],
)
def validate_upload_password():
    data = request.get_json(
        silent=True,
    ) or {}

    submitted_password = str(
        data.get("password", "")
    )

    if not submitted_password:
        return jsonify(
            {
                "valid": False,
                "message": (
                    "Please enter the admin password."
                ),
            }
        ), 400

    if not is_valid_upload_password(
        submitted_password
    ):
        return jsonify(
            {
                "valid": False,
                "message": (
                    "Incorrect admin password."
                ),
            }
        ), 401

    return jsonify(
        {
            "valid": True,
        }
    )


@file_blueprint.route(
    "/upload",
    methods=["POST"],
)
def upload():
    submitted_password = request.form.get(
        "upload_password",
        "",
    )

    # The password is checked again during upload.
    # The validation endpoint improves the interface,
    # but this check provides the actual security.
    if not is_valid_upload_password(
        submitted_password
    ):
        return jsonify(
            {
                "success": False,
                "message": (
                    "Incorrect admin password."
                ),
            }
        ), 401

    uploaded_file = request.files.get(
        "file"
    )

    if (
        not uploaded_file
        or not uploaded_file.filename
    ):
        return redirect(
            url_for("main.index")
        )

    filename = secure_filename(
        uploaded_file.filename
    )

    if not filename.lower().endswith(
        ".xlsx"
    ):
        return (
            "Please upload an Excel file ending in .xlsx.",
            400,
        )

    try:
        if PENDING_WORKBOOK_PATH.exists():
            PENDING_WORKBOOK_PATH.unlink()

        uploaded_file.save(
            PENDING_WORKBOOK_PATH
        )

        validate_workbook_file(
            PENDING_WORKBOOK_PATH
        )

        try:
            if WORKBOOK_PATH.exists():
                WORKBOOK_PATH.unlink()

            PENDING_WORKBOOK_PATH.replace(
                WORKBOOK_PATH
            )

        except PermissionError:
            if PENDING_WORKBOOK_PATH.exists():
                PENDING_WORKBOOK_PATH.unlink()

            return (
                "The current inventory workbook is open or "
                "locked by another program. Close the Excel "
                "file and try again.",
                409,
            )

        reset_db()
        import_excel_to_db()

    except Exception as error:
        if PENDING_WORKBOOK_PATH.exists():
            PENDING_WORKBOOK_PATH.unlink()

        return (
            f"Could not load the Excel file: {error}",
            400,
        )

    return redirect(
        url_for("main.index")
    )


@file_blueprint.route(
    "/download",
    methods=["POST"],
)
def download():
    data = request.get_json(
        silent=True,
    ) or {}

    submitted_password = str(
        data.get("password", "")
    )

    # The password is checked again here.
    # A user cannot bypass the interface and download
    # the workbook without the correct password.
    if not submitted_password:
        return jsonify(
            {
                "success": False,
                "message": (
                    "Please enter the admin password."
                ),
            }
        ), 400

    if not is_valid_upload_password(
        submitted_password
    ):
        return jsonify(
            {
                "success": False,
                "message": (
                    "Incorrect admin password."
                ),
            }
        ), 401

    try:
        output = build_export_workbook()

    except FileNotFoundError as error:
        return jsonify(
            {
                "success": False,
                "message": str(error),
            }
        ), 400

    except Exception as error:
        return jsonify(
            {
                "success": False,
                "message": (
                    f"Could not create the Excel file: {error}"
                ),
            }
        ), 500

    return send_file(
        output,
        as_attachment=True,
        download_name=(
            "updated_inventory.xlsx"
        ),
        mimetype=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
    )