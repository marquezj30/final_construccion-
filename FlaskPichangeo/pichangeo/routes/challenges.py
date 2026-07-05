from decimal import Decimal
from uuid import uuid4

from flask import Blueprint, jsonify, request

from ..auth import current_user_id, jwt_required
from ..extensions import db
from ..models import (
    Booking,
    BookingHistory,
    CourtSchedule,
    SoccerTeam,
    TeamChallenge,
    TeamMember,
    utcnow,
)
from ..utils import (
    as_iso,
    as_time,
    dotnet_day_of_week,
    error,
    field,
    parse_date_datetime,
    parse_datetime,
    required_field,
    time_hours,
)


bp = Blueprint("challenges", __name__)


def to_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y", "on"}
    return bool(value)


def get_my_leader_member(user_id: int) -> TeamMember | None:
    return (
        TeamMember.query.join(SoccerTeam)
        .filter(
            TeamMember.user_id == user_id,
            TeamMember.role == "leader",
            TeamMember.status == True,
            SoccerTeam.status == True,
        )
        .first()
    )


def challenge_response(challenge: TeamChallenge) -> dict:
    leader_member = next(
        (
            member
            for member in challenge.challenging_team.members
            if member.role == "leader" and member.status
        ),
        None,
    )
    schedule = challenge.court_schedule
    return {
        "challengeId": challenge.id,
        "challengingTeamId": challenge.challenging_team_id,
        "challengingTeamName": challenge.challenging_team.team_name,
        "challengingLeaderName": leader_member.user.name if leader_member and leader_member.user else "-",
        "challengedTeamId": challenge.challenged_team_id,
        "challengedTeamName": challenge.challenged_team.team_name,
        "message": challenge.message,
        "proposedDateTime": as_iso(challenge.proposed_date_time),
        "status": challenge.status,
        "bookingId": challenge.booking_id,
        "courtNumber": schedule.court.number if schedule and schedule.court else None,
        "startTime": as_time(schedule.start_time) if schedule else None,
        "endTime": as_time(schedule.end_time) if schedule else None,
        "createdAt": as_iso(challenge.created_at),
        "responseDate": as_iso(challenge.response_date),
    }


def has_active_booking(court_schedule_id: int, booking_date) -> bool:
    return Booking.query.filter(
        Booking.court_schedule_id == court_schedule_id,
        Booking.booking_date == booking_date,
        Booking.status != "cancelled",
    ).first() is not None


def create_booking_for_schedule(user_id: int, schedule: CourtSchedule, booking_date, description: str) -> Booking:
    total_amount = schedule.cost_per_hour * time_hours(schedule.start_time, schedule.end_time)
    now = utcnow()
    booking = Booking(
        user_id=user_id,
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
            description=description,
            action_date=now,
        )
    )
    return booking


@bp.post("/api/challenges")
@jwt_required(roles=["client"])
def send_challenge():
    data = request.get_json(silent=True) or {}
    user_id = current_user_id()
    my_leader = get_my_leader_member(user_id)
    if my_leader is None:
        return error("No autorizado.", 403)

    try:
        challenged_team_id = int(required_field(data, "challengedTeamId", "ChallengedTeamId", "challenged_team_id"))
    except ValueError as exc:
        return error(str(exc), 400)

    if my_leader.team_id == challenged_team_id:
        return error("No puedes retar a tu propio equipo.", 400)

    challenged_team = SoccerTeam.query.filter_by(id=challenged_team_id, status=True).first()
    if challenged_team is None:
        return error("El equipo retado no existe o está inactivo.", 404)

    proposed_raw = field(data, "proposedDateTime", "ProposedDateTime", "proposed_date_time")
    proposed_date_time = parse_datetime(proposed_raw) if proposed_raw else None
    is_external = to_bool(field(data, "isExternal", "IsExternal", "is_external", default=False))
    if not is_external and proposed_date_time is None:
        return error("Un reto interno debe incluir una fecha y hora propuesta.", 400)

    schedule_id = field(data, "courtScheduleId", "CourtScheduleId", "court_schedule_id")
    if schedule_id is not None:
        schedule_id = int(schedule_id)
        schedule_exists = CourtSchedule.query.filter_by(id=schedule_id, available=True).first()
        if schedule_exists is None:
            return error("El horario propuesto no existe o no está disponible.", 404)

    challenge = TeamChallenge(
        challenging_team_id=my_leader.team_id,
        challenged_team_id=challenged_team_id,
        message=(field(data, "message", "Message") or None),
        proposed_date_time=proposed_date_time,
        proposed_date=proposed_date_time or utcnow(),
        court_schedule_id=schedule_id,
        status=False,
        created_at=utcnow(),
    )
    if challenge.message:
        challenge.message = challenge.message.strip()
    db.session.add(challenge)
    db.session.commit()
    return jsonify(challenge_response(challenge)), 201


@bp.get("/api/challenges/<int:challenge_id>")
@jwt_required(roles=["client"])
def get_challenge(challenge_id: int):
    user_id = current_user_id()
    my_leader = get_my_leader_member(user_id)
    if my_leader is None:
        return error("No autorizado.", 403)

    challenge = db.session.get(TeamChallenge, challenge_id)
    if challenge is None:
        return error("Reto no encontrado.", 404)
    if challenge.challenging_team_id != my_leader.team_id and challenge.challenged_team_id != my_leader.team_id:
        return error("No autorizado.", 403)

    return jsonify(challenge_response(challenge))


@bp.get("/api/challenges/received")
@jwt_required(roles=["client"])
def get_received_challenges():
    my_leader = get_my_leader_member(current_user_id())
    if my_leader is None:
        return error("No autorizado.", 403)
    challenges = (
        TeamChallenge.query.filter_by(challenged_team_id=my_leader.team_id)
        .order_by(TeamChallenge.created_at.desc())
        .all()
    )
    return jsonify([challenge_response(challenge) for challenge in challenges])


@bp.get("/api/challenges/sent")
@jwt_required(roles=["client"])
def get_sent_challenges():
    my_leader = get_my_leader_member(current_user_id())
    if my_leader is None:
        return error("No autorizado.", 403)
    challenges = (
        TeamChallenge.query.filter_by(challenging_team_id=my_leader.team_id)
        .order_by(TeamChallenge.created_at.desc())
        .all()
    )
    return jsonify([challenge_response(challenge) for challenge in challenges])


@bp.put("/api/challenges/<int:challenge_id>/accept")
@jwt_required(roles=["client"])
def accept_challenge(challenge_id: int):
    user_id = current_user_id()
    my_leader = get_my_leader_member(user_id)
    if my_leader is None:
        return error("No autorizado.", 403)

    challenge = db.session.get(TeamChallenge, challenge_id)
    if challenge is None:
        return error("Reto no encontrado.", 404)
    if challenge.challenged_team_id != my_leader.team_id:
        return error("No autorizado.", 403)
    if challenge.status:
        return error("El reto ya fue aceptado.", 409)

    challenge.status = True
    challenge.response_date = utcnow()
    warning_message = None

    if challenge.court_schedule_id and challenge.court_schedule:
        booking_date = parse_date_datetime(utcnow())
        schedule = challenge.court_schedule
        schedule_available = schedule.available and schedule.court.status
        if not schedule_available or has_active_booking(schedule.id, booking_date):
            warning_message = (
                "Reto aceptado, pero el horario propuesto ya no está disponible. "
                "Deben acordar otro horario."
            )
        else:
            booking = create_booking_for_schedule(
                user_id,
                schedule,
                booking_date,
                "Reserva creada automáticamente al aceptar un reto.",
            )
            challenge.booking_id = booking.id

    db.session.commit()
    result = challenge_response(challenge)
    if warning_message:
        return jsonify({"challenge": result, "warning": warning_message})
    return jsonify(result)


@bp.put("/api/challenges/<int:challenge_id>/reject")
@jwt_required(roles=["client"])
def reject_challenge(challenge_id: int):
    my_leader = get_my_leader_member(current_user_id())
    if my_leader is None:
        return error("No autorizado.", 403)

    challenge = db.session.get(TeamChallenge, challenge_id)
    if challenge is None:
        return error("Reto no encontrado.", 404)
    if challenge.challenged_team_id != my_leader.team_id:
        return error("No autorizado.", 403)
    if challenge.status:
        return error("No puedes rechazar un reto ya aceptado.", 409)

    challenge.response_date = utcnow()
    db.session.commit()
    return jsonify(challenge_response(challenge))


@bp.post("/api/challenges/<int:challenge_id>/booking")
@jwt_required(roles=["client"])
def create_challenge_booking(challenge_id: int):
    user_id = current_user_id()
    my_leader = get_my_leader_member(user_id)
    if my_leader is None:
        return error("No autorizado.", 403)

    challenge = db.session.get(TeamChallenge, challenge_id)
    if challenge is None:
        return error("Reto no encontrado.", 404)
    if challenge.challenging_team_id != my_leader.team_id and challenge.challenged_team_id != my_leader.team_id:
        return error("No autorizado.", 403)
    if not challenge.status:
        return error("El reto debe estar aceptado antes de crear una reserva.", 409)
    if challenge.booking_id is not None:
        return error("Este reto ya tiene una reserva vinculada.", 409)

    data = request.get_json(silent=True) or {}
    try:
        schedule_id = int(required_field(data, "courtScheduleId", "CourtScheduleId", "court_schedule_id"))
        booking_date = parse_date_datetime(required_field(data, "bookingDate", "BookingDate", "booking_date"))
    except ValueError as exc:
        return error(str(exc), 400)

    schedule = db.session.get(CourtSchedule, schedule_id)
    if schedule is None:
        return error("Horario no encontrado.", 404)
    if not schedule.available or not schedule.court.status:
        return error("El horario no está disponible.", 409)
    if dotnet_day_of_week(booking_date) != schedule.day_of_week:
        return error("La fecha de reserva no corresponde al día del horario.", 400)
    if has_active_booking(schedule_id, booking_date):
        return error("El horario ya está ocupado para esa fecha.", 409)

    booking = create_booking_for_schedule(
        user_id,
        schedule,
        booking_date,
        "Reserva creada manualmente desde un reto aceptado.",
    )
    challenge.booking_id = booking.id
    challenge.court_schedule_id = schedule.id
    db.session.commit()
    return jsonify(challenge_response(challenge))
