from __future__ import annotations

import base64
import socket
from io import BytesIO

import qrcode


def get_local_ip() -> str:
    try:
        with socket.socket(
            socket.AF_INET,
            socket.SOCK_DGRAM,
        ) as connection:
            connection.connect(
                ("8.8.8.8", 80)
            )

            return connection.getsockname()[0]

    except OSError:
        try:
            return socket.gethostbyname(
                socket.gethostname()
            )

        except OSError:
            return "127.0.0.1"


def generate_qr_code_data_url(
    url: str,
) -> str:
    qr_image = qrcode.make(url)

    image_buffer = BytesIO()

    qr_image.save(
        image_buffer,
        format="PNG",
    )

    encoded_image = base64.b64encode(
        image_buffer.getvalue()
    ).decode("utf-8")

    return (
        "data:image/png;base64,"
        f"{encoded_image}"
    )