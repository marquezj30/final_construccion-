def test_client_can_book_available_schedule_and_pay_advance(
    client,
    auth_headers,
    register_client_user,
):
    admin_headers = auth_headers("admin@pichangeo.local", "Admin123!")
    player = register_client_user("cliente", "cliente@test.local")

    court_response = client.post(
        "/api/courts",
        headers=admin_headers,
        json={
            "Number": 1,
            "Description": "Cancha principal",
            "SurfaceType": "Sintetico",
            "PlayerCapacity": 10,
            "Address": "Av. Pichangeo 123",
        },
    )
    assert court_response.status_code == 201
    court = court_response.get_json()

    schedule_response = client.post(
        f"/api/courts/{court['id']}/schedules",
        headers=admin_headers,
        json={
            "DayOfWeek": 1,
            "StartTime": "18:00",
            "EndTime": "20:00",
            "CostPerHour": 100,
        },
    )
    assert schedule_response.status_code == 201
    schedule = schedule_response.get_json()

    available_response = client.get(
        "/api/courts/available?BookingDate=2026-07-06",
        headers=player["headers"],
    )
    assert available_response.status_code == 200
    available = available_response.get_json()
    assert [item["courtScheduleId"] for item in available] == [schedule["id"]]
    assert available[0]["totalCost"] == 200

    booking_response = client.post(
        "/api/bookings",
        headers=player["headers"],
        json={
            "CourtScheduleId": schedule["id"],
            "BookingDate": "2026-07-06",
        },
    )
    assert booking_response.status_code == 201
    booking = booking_response.get_json()
    assert booking["status"] == "pending"
    assert booking["totalAmount"] == 200
    assert booking["advance"] == 100

    unavailable_response = client.get(
        "/api/courts/available?BookingDate=2026-07-06",
        headers=player["headers"],
    )
    assert unavailable_response.status_code == 200
    assert unavailable_response.get_json() == []

    payment_response = client.post(
        "/api/payments",
        headers=player["headers"],
        json={"BookingId": booking["id"], "PaymentType": "advance"},
    )
    assert payment_response.status_code == 200
    payment = payment_response.get_json()
    assert payment["paymentStatus"] == "approved"
    assert payment["paymentType"] == "advance"
    assert payment["amount"] == 100

    duplicate_payment = client.post(
        "/api/payments",
        headers=player["headers"],
        json={"BookingId": booking["id"], "PaymentType": "advance"},
    )
    assert duplicate_payment.status_code == 409

    payments_response = client.get(
        f"/api/payments/{booking['id']}",
        headers=player["headers"],
    )
    assert payments_response.status_code == 200
    assert len(payments_response.get_json()) == 1
