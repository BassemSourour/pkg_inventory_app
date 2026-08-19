from __future__ import annotations

import math
import re
from typing import Any


VALID_ITEM_NUMBER_PATTERN = re.compile(
    r"^(?:PKG\d{4}(?:-\d)?|FLA\d{4}(?:-\d)?|ALL\d{4})$",
    re.IGNORECASE,
)


def parse_non_negative_count(count_raw: Any) -> float:
    raw_text = str(count_raw).strip()

    if not raw_text:
        raise ValueError("Count is required.")

    try:
        count_value = float(raw_text)
    except (TypeError, ValueError):
        raise ValueError("Count must be a number.")

    if not math.isfinite(count_value):
        raise ValueError("Count must be a valid number.")

    if count_value < 0:
        raise ValueError("Count cannot be negative.")

    return count_value


def normalize_item_number(item_number: Any) -> str:
    return str(item_number or "").strip().upper()


def validate_manual_item_number(item_number: Any) -> str:
    normalized = normalize_item_number(item_number)

    if not normalized:
        raise ValueError("Item number is required.")

    if not VALID_ITEM_NUMBER_PATTERN.fullmatch(normalized):
        raise ValueError(
            "Item number must use a valid format such as "
            "PKG0628, PKG1422-2, FLA9200, or ALL8109."
        )

    return normalized