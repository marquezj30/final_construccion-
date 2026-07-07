from decimal import Decimal
from uuid import uuid4

from flask import Blueprint, jsonify, request

from ..auth import current_role, current_user_id, jwt_required
from ..extensions import db
from ..models import Booking, BookingHistory, CourtSchedule, utcnow
from ..utils import (
    as_iso,
    as_number,
    as_time,
    dotnet_day_of_week,
    error,
    parse_date_datetime,
    required_field,
    time_hours,
)


bp = Blueprint("bookings", __name__)
ACTIVE_BOOKING_STATUSES = ["pending", "approved"]


def calculate_schedule_total(schedule: CourtSchedule) -> Decimal:
    return schedule.cost_per_hour * time_hours(schedule.start_time, schedule.end_time)


def booking_response(booking: Booking) -> dict:
    schedule = booking.court_schedule
    court = schedule.court
    return {
        "id": booking.id,
        "bookingCode": booking.booking_code,
        "courtNumber": court.number,
        "adminName": court.user.name if court.user else "",
        "scheduleDay": schedule.day_of_week,
        "startTime": as_time(schedule.start_time),
        "endTime": as_time(schedule.end_time),
        "totalAmount": as_number(booking.total_amount),
        "advance": as_number(booking.advance),
        "status": booking.status,
        "lostAdvance": booking.lost_advance,
        "bookingDate": as_iso(booking.booking_date),
        "createdAt": as_iso(booking.created_at),
    }


def has_active_booking(court_schedule_id: int, booking_date) -> bool:
    return Booking.query.filter(
        Booking.court_schedule_id == court_schedule_id,
        Booking.booking_date == booking_date,
        Booking.status.in_(ACTIVE_BOOKING_STATUSES),
    ).first() is not None


@bp.post("/api/bookings")
@jwt_required(roles=["client"])
def create_booking():
    data = request.get_json(silent=True) or {}
    try:
        schedule_id = int(required_field(data, "CourtScheduleId", "courtScheduleId", "court_schedule_id"))
        booking_date = parse_date_datetime(required_field(data, "BookingDate", "bookingDate", "booking_date"))
    except ValueError as exc:
        return error(str(exc), 400)

    schedule = db.session.get(CourtSchedule, schedule_id)
    if schedule is None:
        return error("Horario no encontrado.", 404)
    if not schedule.available or not schedule.court.status:
        return error("El horario no está disponible.", 409)
    if dotnet_day_of_week(booking_date) != schedule.day_of_week:
        return error("La fecha de reserva no corresponde al día del horario seleccionado.", 400)
    if has_active_booking(schedule.id, booking_date):
        return error("El horario ya está ocupado para esa fecha.", 409)

    total_amount = calculate_schedule_total(schedule)
    now = utcnow()
    booking = Booking(
        user_id=current_user_id(),
        court_schedule_id=schedule.id,
        booking_date=booking_date,
        total_amount=total_amount,
        advance=total_amount * Decimal("0.50"),
        status="pending",
        booking_code=f"RES-{uuid4().hex[:8].upper()}",
        lost_advance=False,
        created_at=now,
        updated_at=now,
    )
    db.session.add(booking)
    db.session.flush()
    db.session.add(
        BookingHistory(
            booking_id=booking.id,
            action="BOOKING_CREATED",
            previous_status=None,
            new_status="pending",
            description="Reserva creada por el cliente.",
            action_date=now,
        )
    )
    db.session.commit()
    return jsonify(booking_response(booking)), 201


@bp.get("/api/bookings/my")
@jwt_required(roles=["client"])
def get_my_bookings():
    bookings = (
        Booking.query.filter_by(user_id=current_user_id())
        .order_by(Booking.created_at.desc())
        .all()
    )
    return jsonify([booking_response(booking) for booking in bookings])


@bp.get("/api/bookings/<int:booking_id>")
@jwt_required(roles=["client", "admin"])
def get_booking_by_id(booking_id: int):
    booking = db.session.get(Booking, booking_id)
    if booking is None:
        return error("Reserva no encontrada.", 404)
    if current_role() == "client" and booking.user_id != current_user_id():
        return error("No autorizado.", 403)
    return jsonify(booking_response(booking))


@bp.get("/api/bookings")
@jwt_required(roles=["admin"])
def get_bookings():
    bookings = Booking.query.order_by(Booking.created_at.desc()).all()
    return jsonify([booking_response(booking) for booking in bookings])


@bp.put("/api/bookings/<int:booking_id>/cancel")
@jwt_required(roles=["client"])
def cancel_booking(booking_id: int):
    booking = db.session.get(Booking, booking_id)
    if booking is None:
        return error("Reserva no encontrada.", 404)
    if booking.user_id != current_user_id():
        return error("No autorizado.", 403)
    if booking.status == "cancelled":
        return error("La reserva ya está cancelada.", 409)

    previous_status = booking.status
    reservation_start = booking.booking_date.replace(
        hour=booking.court_schedule.start_time.hour,
        minute=booking.court_schedule.start_time.minute,
        second=booking.court_schedule.start_time.second,
        microsecond=0,
    )
    lost_advance = (reservation_start - utcnow()).total_seconds() / 3600 < 4

    booking.status = "cancelled"
    booking.lost_advance = lost_advance
    booking.cancellation_date = utcnow()
    booking.updated_at = utcnow()
    booking.court_schedule.available = True
    booking.court_schedule.updated_at = utcnow()

    db.session.add(
        BookingHistory(
            booking_id=booking.id,
            action="BOOKING_CANCELLED",
            previous_status=previous_status,
            new_status="cancelled",
            description=(
                "Reserva cancelada con menos de 4 horas de anticipación. "
                "El cliente pierde el adelanto."
                if lost_advance
                else "Reserva cancelada con 4 horas o más de anticipación. "
                "Corresponde devolver el adelanto."
            ),
            action_date=utcnow(),
        )
    )
    db.session.commit()
    return jsonify(booking_response(booking))
