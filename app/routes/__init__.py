from __future__ import annotations

from flask import Flask

from app.routes.count_routes import count_blueprint
from app.routes.file_routes import file_blueprint
from app.routes.item_routes import item_blueprint
from app.routes.main_routes import main_blueprint


def register_blueprints(
    application: Flask,
) -> None:
    application.register_blueprint(
        main_blueprint
    )

    application.register_blueprint(
        item_blueprint
    )

    application.register_blueprint(
        count_blueprint
    )

    application.register_blueprint(
        file_blueprint
    )