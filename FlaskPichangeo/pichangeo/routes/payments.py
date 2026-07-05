import json
from decimal import Decimal
from uuid import uuid4

from flask import Blueprint, jsonify, request

from ..auth import current_role, current_user_id, jwt_required
from ..extensions import db
from ..models import Booking, BookingHistory, Payment, PaymentMethod, utcnow
from ..utils import as_iso, as_number, as_time, error, field, required_field


bp = Blueprint("payments", __name__)
VALID_PAYMENT_TYPES = ["advance", "full", "balance"]


def payment_response(payment: Payment) -> dict:
    booking = payment.booking
    schedule = booking.court_schedule
    court = schedule.court
    return {
        "paymentId": payment.id,
        "transactionCode": payment.transaction_code,
        "courtNumber": court.number,
        "adminName": court.user.name if court.user else "",
        "bookingDate": as_iso(booking.booking_date),
        "startTime": as_time(schedule.start_time),
        "endTime": as_time(schedule.end_time),
        "clientId": booking.user_id,
        "clientName": booking.user.name if booking.user else "",
        "amount": as_number(payment.amount),
        "paymentType": payment.payment_type,
        "paymentStatus": payment.payment_status,
        "paymentDate": as_iso(payment.payment_date),
        "gatewayResponse": payment.gateway_response,
    }


def get_or_create_simulated_payment_method(admin_id: int) -> PaymentMethod:
    payment_method = PaymentMethod.query.filter_by(
        type="simulated_gateway",
        company_id=admin_id,
        active=True,
    ).first()
    if payment_method:
        return payment_method

    payment_method = PaymentMethod(
        company_id=admin_id,
        type="simulated_gateway",
        account_name="Pasarela simulada",
        holder="Sistema Pichangeo",
        active=True,
        created_at=utcnow(),
    )
    db.session.add(payment_method)
    db.session.flush()
    return payment_method


def calculate_payment_amount(booking: Booking, payment_type: str) -> Decimal:
    if payment_type == "advance":
        return booking.advance
    if payment_type == "full":
        return booking.total_amount
    if payment_type == "balance":
        paid = sum(
            (payment.amount for payment in booking.payments if payment.payment_status == "approved"),
            Decimal("0"),
        )
        return booking.total_amount - paid
    return Decimal("0")


@bp.post("/api/payments")
@jwt_required(roles=["client"])
def simulate_payment():
    data = request.get_json(silent=True) or {}
    try:
        booking_id = int(required_field(data, "BookingId", "bookingId", "booking_id"))
        payment_type = str(required_field(data, "PaymentType", "paymentType", "payment_type")).strip().lower()
    except ValueError as exc:
        return error(str(exc), 400)

    if payment_type not in VALID_PAYMENT_TYPES:
        return error("PaymentType debe ser advance, full o balance.", 400)

    booking = db.session.get(Booking, booking_id)
    if booking is None:
        return error("Reserva no encontrada.", 404)
    if booking.user_id != current_user_id():
        return error("No autorizado.", 403)
    if booking.status == "cancelled":
        return error("No se puede pagar una reserva cancelada.", 409)

    already_paid = any(
        payment.payment_type == payment_type and payment.payment_status == "approved"
        for payment in booking.payments
    )
    if already_paid:
        return error(f"Ya existe un pago aprobado de tipo {payment_type} para esta reserva.", 409)

    amount = calculate_payment_amount(booking, payment_type)
    if amount <= 0:
        return error("No hay monto pendiente para pagar con ese tipo de pago.", 409)

    now = utcnow()
    fake_response = {
        "status": "approved",
        "authCode": f"SIM-{uuid4().hex[:6].upper()}",
        "message": "Transacción simulada exitosa",
        "processedAt": as_iso(now),
    }
    previous_status = booking.status
    payment_method = get_or_create_simulated_payment_method(booking.court_schedule.court.user_id)
    payment = Payment(
        booking_id=booking.id,
        amount=amount,
        payment_method_id=payment_method.id,
        gateway_response=json.dumps(fake_response, ensure_ascii=False),
        transaction_code=f"TXN-{str(int(now.timestamp() * 1000000))[:10]}",
        payment_status="approved",
        payment_type=payment_type,
        payment_date=now,
        created_at=now,
        updated_at=now,
    )

    booking.status = "approved"
    booking.updated_at = now
    db.session.add(payment)
    db.session.add(
        BookingHistory(
            booking_id=booking.id,
            action="PAYMENT_APPROVED",
            previous_status=previous_status,
            new_status="approved",
            description=f"Pago simulado aprobado. Tipo: {payment_type}.",
            action_date=now,
        )
    )
    db.session.commit()
    return jsonify(payment_response(payment))


@bp.get("/api/payments/<int:booking_id>")
@jwt_required(roles=["client", "admin"])
def get_payments_by_booking(booking_id: int):
    booking = db.session.get(Booking, booking_id)
    if booking is None:
        return error("Reserva no encontrada.", 404)
    if current_role() == "client" and booking.user_id != current_user_id():
        return error("No autorizado.", 403)

    payments = (
        Payment.query.filter_by(booking_id=booking_id)
        .order_by(Payment.payment_date.desc())
        .all()
    )
    if not payments:
        return error("La reserva no tiene pagos registrados.", 404)
    return jsonify([payment_response(payment) for payment in payments])


@bp.get("/api/payments")
@jwt_required(roles=["admin"])
def get_payments():
    payments = Payment.query.order_by(Payment.payment_date.desc()).all()
    return jsonify([payment_response(payment) for payment in payments])
