from datetime import datetime
from decimal import Decimal

from flask import Blueprint, jsonify, request
from sqlalchemy.orm import joinedload

from ..auth import current_user_id, jwt_required
from ..extensions import db
from ..models import Booking, Court, CourtSchedule, utcnow
from ..utils import (
    as_iso,
    as_number,
    as_time,
    dotnet_day_of_week,
    error,
    field,
    parse_date_datetime,
    parse_time,
    required_field,
    time_hours,
)


bp = Blueprint("courts", __name__)
ACTIVE_BOOKING_STATUSES = ["pending", "approved"]


def court_response(court: Court) -> dict:
    return {
        "id": court.id,
        "userId": court.user_id,
        "adminName": court.user.name if court.user else "",
        "number": court.number,
        "name": court.name,
        "description": court.description,
        "surfaceType": court.surface_type,
        "playerCapacity": court.player_capacity,
        "status": court.status,
        "photoUrl": court.photo_url,
        "gps": court.gps,
        "address": court.address,
        "stars": court.stars,
        "comments": court.comments,
        "createdAt": as_iso(court.created_at),
        "updatedAt": as_iso(court.updated_at),
    }


def schedule_response(schedule: CourtSchedule) -> dict:
    return {
        "id": schedule.id,
        "courtId": schedule.court_id,
        "courtNumber": schedule.court.number if schedule.court else None,
        "dayOfWeek": schedule.day_of_week,
        "startTime": as_time(schedule.start_time),
        "endTime": as_time(schedule.end_time),
        "available": schedule.available,
        "costPerHour": as_number(schedule.cost_per_hour),
        "createdAt": as_iso(schedule.created_at),
        "updatedAt": as_iso(schedule.updated_at),
    }


def available_schedule_response(schedule: CourtSchedule) -> dict:
    hours = time_hours(schedule.start_time, schedule.end_time)
    total_cost = schedule.cost_per_hour * hours
    return {
        "courtScheduleId": schedule.id,
        "courtId": schedule.court_id,
        "courtNumber": schedule.court.number,
        "adminName": schedule.court.user.name if schedule.court and schedule.court.user else "",
        "description": schedule.court.description,
        "surfaceType": schedule.court.surface_type,
        "playerCapacity": schedule.court.player_capacity,
        "address": schedule.court.address,
        "dayOfWeek": schedule.day_of_week,
        "startTime": as_time(schedule.start_time),
        "endTime": as_time(schedule.end_time),
        "costPerHour": as_number(schedule.cost_per_hour),
        "totalCost": as_number(total_cost),
    }


def validate_schedule(day_of_week: int, start_time, end_time, cost_per_hour: Decimal):
    if day_of_week < 0 or day_of_week > 6:
        return "DayOfWeek debe estar entre 0 y 6."
    if end_time <= start_time:
        return "EndTime debe ser mayor que StartTime."
    if cost_per_hour < 0:
        return "CostPerHour no puede ser negativo."
    return None


def has_overlapping_schedule(court_id: int, day_of_week: int, start_time, end_time, ignored_id=None) -> bool:
    query = CourtSchedule.query.filter(
        CourtSchedule.court_id == court_id,
        CourtSchedule.day_of_week == day_of_week,
        CourtSchedule.start_time < end_time,
        start_time < CourtSchedule.end_time,
    )
    if ignored_id is not None:
        query = query.filter(CourtSchedule.id != ignored_id)
    return query.first() is not None


def reserved_schedule_ids(schedule_ids: list[int], booking_date: datetime) -> set[int]:
    if not schedule_ids:
        return set()
    rows = (
        db.session.query(Booking.court_schedule_id)
        .filter(
            Booking.court_schedule_id.in_(schedule_ids),
            Booking.booking_date == booking_date,
            Booking.status.in_(ACTIVE_BOOKING_STATUSES),
        )
        .distinct()
        .all()
    )
    return {row[0] for row in rows}


@bp.post("/api/courts")
@jwt_required(roles=["admin"])
def create_court():
    data = request.get_json(silent=True) or {}
    try:
        number = int(required_field(data, "Number", "number"))
        name = required_field(data, "Name", "name")
        player_capacity = int(required_field(data, "PlayerCapacity", "playerCapacity", "player_capacity"))
    except ValueError as exc:
        return error(str(exc), 400)

    court = Court(
        user_id=current_user_id(),
        number=number,
        name=name,
        description=field(data, "Description", "description"),
        surface_type=field(data, "SurfaceType", "surfaceType", "surface_type"),
        player_capacity=player_capacity,
        address=field(data, "Address", "address"),
        gps=field(data, "Gps", "gps"),
        photo_url=field(data, "PhotoUrl", "photoUrl", "photo_url"),
        status=True,
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    db.session.add(court)
    db.session.commit()
    return jsonify(court_response(court)), 201


@bp.get("/api/courts")
@jwt_required(roles=["admin"])
def get_courts():
    courts = Court.query.options(joinedload(Court.user)).order_by(Court.number).all()
    return jsonify([court_response(court) for court in courts])


@bp.get("/api/courts/<int:court_id>")
@jwt_required()
def get_court_by_id(court_id: int):
    court = db.session.get(Court, court_id)
    if court is None:
        return error("Cancha no encontrada.", 404)
    return jsonify(court_response(court))


@bp.put("/api/courts/<int:court_id>")
@jwt_required(roles=["admin"])
def update_court(court_id: int):
    court = db.session.get(Court, court_id)
    if court is None:
        return error("Cancha no encontrada.", 404)

    data = request.get_json(silent=True) or {}
    try:
        court.number = int(required_field(data, "Number", "number"))
        court.name = required_field(data, "Name", "name")
        court.player_capacity = int(required_field(data, "PlayerCapacity", "playerCapacity", "player_capacity"))
    except ValueError as exc:
        return error(str(exc), 400)

    court.description = field(data, "Description", "description")
    court.surface_type = field(data, "SurfaceType", "surfaceType", "surface_type")
    court.address = field(data, "Address", "address")
    court.gps = field(data, "Gps", "gps")
    court.photo_url = field(data, "PhotoUrl", "photoUrl", "photo_url")
    court.updated_at = utcnow()
    db.session.commit()
    return jsonify(court_response(court))


@bp.delete("/api/courts/<int:court_id>")
@jwt_required(roles=["admin"])
def deactivate_court(court_id: int):
    court = db.session.get(Court, court_id)
    if court is None:
        return error("Cancha no encontrada.", 404)

    court.status = False
    court.updated_at = utcnow()
    for schedule in court.schedules:
        schedule.available = False
        schedule.updated_at = utcnow()

    db.session.commit()
    return jsonify(court_response(court))


@bp.get("/api/courts/schedules")
@jwt_required(roles=["admin"])
def get_all_schedules():
    schedules = (
        CourtSchedule.query.options(joinedload(CourtSchedule.court))
        .join(Court)
        .order_by(Court.number, CourtSchedule.day_of_week, CourtSchedule.start_time)
        .all()
    )
    return jsonify([schedule_response(schedule) for schedule in schedules])


@bp.get("/api/courts/available")
@jwt_required()
def get_available_schedules():
    return jsonify(_available_schedules())


@bp.get("/api/courts/<int:court_id>/available")
@jwt_required()
def get_available_schedules_by_court(court_id: int):
    if db.session.get(Court, court_id) is None:
        return error("Cancha no encontrada.", 404)
    return jsonify(_available_schedules(court_id))


def _available_schedules(court_id: int | None = None):
    booking_date_raw = request.args.get("bookingDate") or request.args.get("BookingDate")
    day_raw = request.args.get("dayOfWeek") or request.args.get("DayOfWeek")
    target_date = parse_date_datetime(booking_date_raw) if booking_date_raw else parse_date_datetime(datetime.utcnow())
    target_day = int(day_raw) if day_raw is not None else dotnet_day_of_week(target_date)

    query = CourtSchedule.query.options(joinedload(CourtSchedule.court).joinedload(Court.user)).join(Court).filter(
        CourtSchedule.available == True,
        Court.status == True,
        CourtSchedule.day_of_week == target_day,
    )
    if court_id is not None:
        query = query.filter(CourtSchedule.court_id == court_id)

    schedules = query.order_by(Court.number, CourtSchedule.start_time).all()
    reserved = reserved_schedule_ids([schedule.id for schedule in schedules], target_date)
    return [available_schedule_response(schedule) for schedule in schedules if schedule.id not in reserved]


@bp.post("/api/courts/<int:court_id>/schedules")
@jwt_required(roles=["admin"])
def create_schedule(court_id: int):
    court = db.session.get(Court, court_id)
    if court is None:
        return error("Cancha no encontrada.", 404)

    data = request.get_json(silent=True) or {}
    try:
        day_of_week = int(required_field(data, "DayOfWeek", "dayOfWeek", "day_of_week"))
        start_time = parse_time(required_field(data, "StartTime", "startTime", "start_time"))
        end_time = parse_time(required_field(data, "EndTime", "endTime", "end_time"))
        cost_per_hour = Decimal(str(required_field(data, "CostPerHour", "costPerHour", "cost_per_hour")))
    except ValueError as exc:
        return error(str(exc), 400)

    validation_error = validate_schedule(day_of_week, start_time, end_time, cost_per_hour)
    if validation_error:
        return error(validation_error, 400)
    if has_overlapping_schedule(court_id, day_of_week, start_time, end_time):
        return error("Ya existe un horario que se solapa para esa cancha, día y rango de horas.", 409)

    schedule = CourtSchedule(
        court_id=court_id,
        day_of_week=day_of_week,
        start_time=start_time,
        end_time=end_time,
        cost_per_hour=cost_per_hour,
        available=True,
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    db.session.add(schedule)
    db.session.commit()
    return jsonify(schedule_response(schedule)), 201


@bp.get("/api/courts/<int:court_id>/schedules")
@jwt_required(roles=["admin"])
def get_schedules(court_id: int):
    if db.session.get(Court, court_id) is None:
        return error("Cancha no encontrada.", 404)
    schedules = (
        CourtSchedule.query.options(joinedload(CourtSchedule.court))
        .filter_by(court_id=court_id)
        .order_by(CourtSchedule.day_of_week, CourtSchedule.start_time)
        .all()
    )
    return jsonify([schedule_response(schedule) for schedule in schedules])


@bp.put("/api/courts/<int:court_id>/schedules/<int:schedule_id>")
@jwt_required(roles=["admin"])
def update_schedule(court_id: int, schedule_id: int):
    schedule = CourtSchedule.query.filter_by(id=schedule_id, court_id=court_id).first()
    if schedule is None:
        return error("Horario no encontrado.", 404)

    data = request.get_json(silent=True) or {}
    try:
        day_of_week = int(required_field(data, "DayOfWeek", "dayOfWeek", "day_of_week"))
        start_time = parse_time(required_field(data, "StartTime", "startTime", "start_time"))
        end_time = parse_time(required_field(data, "EndTime", "endTime", "end_time"))
        cost_per_hour = Decimal(str(required_field(data, "CostPerHour", "costPerHour", "cost_per_hour")))
    except ValueError as exc:
        return error(str(exc), 400)

    validation_error = validate_schedule(day_of_week, start_time, end_time, cost_per_hour)
    if validation_error:
        return error(validation_error, 400)
    if has_overlapping_schedule(court_id, day_of_week, start_time, end_time, schedule_id):
        return error("Ya existe un horario que se solapa para esa cancha, día y rango de horas.", 409)

    schedule.day_of_week = day_of_week
    schedule.start_time = start_time
    schedule.end_time = end_time
    schedule.cost_per_hour = cost_per_hour
    schedule.updated_at = utcnow()
    db.session.commit()
    return jsonify(schedule_response(schedule))


@bp.delete("/api/courts/<int:court_id>/schedules/<int:schedule_id>")
@jwt_required(roles=["admin"])
def delete_schedule(court_id: int, schedule_id: int):
    schedule = CourtSchedule.query.filter_by(id=schedule_id, court_id=court_id).first()
    if schedule is None:
        return error("Horario no encontrado.", 404)

    has_active = Booking.query.filter(
        Booking.court_schedule_id == schedule_id,
        Booking.status.in_(ACTIVE_BOOKING_STATUSES),
    ).first()
    if has_active:
        return error("No se puede eliminar un horario con reservas activas.", 409)

    db.session.delete(schedule)
    db.session.commit()
    return "", 204
