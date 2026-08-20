"""
Build assets/icon.ico from the Reunion logo.

The logo is a wide image on a near-white background, so it is
trimmed to its content and centred on a square canvas. Windows
scales icons badly from a single large bitmap, so every size the
shell asks for is written into the file explicitly.

Run from the project root:

    .venv\\Scripts\\python.exe tools\\make_icon.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops


PROJECT_ROOT = Path(__file__).resolve().parent.parent

SOURCE_LOGO = (
    PROJECT_ROOT
    / "app"
    / "static"
    / "images"
    / "reunion_logo.png"
)

OUTPUT_ICON = (
    PROJECT_ROOT
    / "assets"
    / "icon.ico"
)

ICON_SIZES = [
    16,
    24,
    32,
    48,
    64,
    128,
    256,
]

# Below this size the "Coffee Roasters" line turns to mush, so the
# small icons are cropped to the mountain and wordmark instead.
COMPACT_SIZE_LIMIT = 48

# Fraction of the trimmed logo height kept for the compact crop.
COMPACT_HEIGHT_RATIO = 0.62

BACKGROUND = (255, 255, 255, 255)

PADDING_RATIO = 0.08


def trim_background(image: Image.Image) -> Image.Image:
    """
    Crop the flat border around the logo so the artwork fills the
    icon instead of floating in a field of white.
    """
    corner_colour = image.getpixel((0, 0))

    background = Image.new(
        image.mode,
        image.size,
        corner_colour,
    )

    difference = ImageChops.difference(
        image,
        background,
    ).convert("L")

    bounding_box = difference.getbbox()

    if bounding_box is None:
        return image

    return image.crop(bounding_box)


def square_on_canvas(
    logo: Image.Image,
) -> Image.Image:
    longest_edge = max(logo.size)

    canvas_size = int(
        longest_edge
        * (1 + PADDING_RATIO * 2)
    )

    canvas = Image.new(
        "RGBA",
        (canvas_size, canvas_size),
        BACKGROUND,
    )

    canvas.paste(
        logo,
        (
            (canvas_size - logo.width) // 2,
            (canvas_size - logo.height) // 2,
        ),
        logo,
    )

    return canvas


def build_variants() -> tuple[
    Image.Image,
    Image.Image,
]:
    logo = Image.open(SOURCE_LOGO).convert("RGBA")

    logo = trim_background(logo)

    compact_logo = logo.crop(
        (
            0,
            0,
            logo.width,
            int(
                logo.height
                * COMPACT_HEIGHT_RATIO
            ),
        )
    )

    return (
        square_on_canvas(logo),
        square_on_canvas(compact_logo),
    )


def main() -> None:
    OUTPUT_ICON.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    full_icon, compact_icon = build_variants()

    frames = [
        (
            compact_icon
            if size <= COMPACT_SIZE_LIMIT
            else full_icon
        ).resize(
            (size, size),
            Image.LANCZOS,
        )
        for size in ICON_SIZES
    ]

    # Pillow skips any requested size larger than the image it is
    # saving from, so the largest frame has to lead.
    frames.sort(
        key=lambda frame: frame.size[0],
        reverse=True,
    )

    frames[0].save(
        OUTPUT_ICON,
        format="ICO",
        sizes=[
            frame.size
            for frame in frames
        ],
        append_images=frames[1:],
    )

    compact_sizes = [
        size
        for size in ICON_SIZES
        if size <= COMPACT_SIZE_LIMIT
    ]

    print(
        f"Wrote {OUTPUT_ICON} "
        f"({len(ICON_SIZES)} sizes; "
        f"{compact_sizes} use the compact crop)"
    )


if __name__ == "__main__":
    main()
