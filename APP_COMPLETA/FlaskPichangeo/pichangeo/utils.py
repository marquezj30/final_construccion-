from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from typing import Any

from flask import jsonify


def error(message: str, status: int):
    return jsonify({"message": message}), status


def field(data: dict[str, Any], *names: str, default: Any = None) -> Any:
    for name in names:
        if name in data:
            return data[name]

    lowered = {str(key).lower(): value for key, value in data.items()}
    for name in names:
        key = name.lower()
        if key in lowered:
            return lowered[key]

    return default


def required_field(data: dict[str, Any], *names: str) -> Any:
    value = field(data, *names)
    if value is None:
        raise ValueError(f"Campo obligatorio: {names[0]}")
    return value


def parse_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value.replace(tzinfo=None)
    if isinstance(value, date):
        return datetime.combine(value, time.min)
    if not isinstance(value, str):
        raise ValueError("Fecha inválida.")

    text = value.strip()
    if not text:
        raise ValueError("Fecha inválida.")
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"

    parsed = datetime.fromisoformat(text)
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone().replace(tzinfo=None)
    return parsed


def parse_date_datetime(value: Any) -> datetime:
    parsed = parse_datetime(value)
    return datetime.combine(parsed.date(), time.min)


def parse_time(value: Any) -> time:
    if isinstance(value, time):
        return value
    if not isinstance(value, str):
        raise ValueError("Hora inválida.")

    text = value.strip()
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(text, fmt).time()
        except ValueError:
            pass
    raise ValueError("Hora inválida. Usa HH:mm o HH:mm:ss.")


def dotnet_day_of_week(value: datetime | date) -> int:
    return (value.weekday() + 1) % 7


def time_hours(start: time, end: time) -> Decimal:
    start_seconds = start.hour * 3600 + start.minute * 60 + start.second
    end_seconds = end.hour * 3600 + end.minute * 60 + end.second
    return Decimal(end_seconds - start_seconds) / Decimal(3600)


def as_iso(value: datetime | None):
    if value is None:
        return None
    return value.isoformat() + "Z"


def as_time(value: time | None):
    if value is None:
        return None
    return value.strftime("%H:%M")


def as_number(value: Any):
    if isinstance(value, Decimal):
        return float(value)
    return value
