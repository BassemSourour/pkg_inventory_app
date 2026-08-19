from __future__ import annotations

import os
import threading

from flask import Flask, jsonify, request

from app.config import resource_path
from app.routes import register_blueprints


def create_app() -> Flask:
    application = Flask(
        __name__,
        template_folder=str(
            resource_path("app/templates")
        ),
        static_folder=str(
            resource_path("app/static")
        ),
    )

    application.config[
        "MAX_CONTENT_LENGTH"
    ] = 25 * 1024 * 1024

    register_blueprints(application)

    @application.post("/shutdown")
    def shutdown_application():
        host_addresses = {
            "127.0.0.1",
            "::1",
        }

        if request.remote_addr not in host_addresses:
            return jsonify(
                {
                    "success": False,
                    "message":
                        "Only the host computer "
                        "can close the application.",
                }
            ), 403

        def stop_process() -> None:
            os._exit(0)

        threading.Timer(
            0.75,
            stop_process,
        ).start()

        return jsonify(
            {
                "success": True,
                "message":
                    "Application is shutting down.",
            }
        )

    return application