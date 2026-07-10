from datetime import datetime, timezone

from .extensions import db


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


BigInt = db.BigInteger().with_variant(db.Integer, "sqlite")


class User(db.Model):
    __tablename__ = "Users"

    id = db.Column("Id", BigInt, primary_key=True)
    username = db.Column("username", db.String(50), nullable=False, unique=True, index=True)
    name = db.Column("name", db.String(150), nullable=False)
    email = db.Column("email", db.String(150), nullable=False, unique=True, index=True)
    phone = db.Column("phone", db.String(20))
    password_hash = db.Column("passwordHash", db.Text, nullable=False)
    status = db.Column("status", db.String(20), nullable=False, default="active")
    role = db.Column("role", db.String(20), nullable=False, default="client")
    created_at = db.Column("createdAt", db.DateTime, nullable=False, default=utcnow)
    refresh_token = db.Column("RefreshToken", db.String(200))
    refresh_token_expiry_time = db.Column("RefreshTokenExpiryTime", db.DateTime)

    courts = db.relationship("Court", back_populates="user", lazy="select")
    bookings = db.relationship("Booking", back_populates="user", lazy="select")
    team_memberships = db.relationship("TeamMember", back_populates="user", lazy="select")


class Court(db.Model):
    __tablename__ = "Courts"

    id = db.Column("Id", BigInt, primary_key=True)
    user_id = db.Column("userId", BigInt, db.ForeignKey("Users.Id"), nullable=False)
    number = db.Column("number", db.Integer, nullable=False)
    name = db.Column("name", db.String(120), nullable=False)
    description = db.Column("description", db.String(500))
    surface_type = db.Column("surfaceType", db.String(100))
    player_capacity = db.Column("playerCapacity", db.Integer, nullable=False)
    status = db.Column("status", db.Boolean, nullable=False, default=True)
    photo_url = db.Column("photoUrl", db.String(500))
    gps = db.Column("gps", db.String(100))
    address = db.Column("address", db.String(300))
    stars = db.Column("stars", db.Float, nullable=False, default=0)
    comments = db.Column("comments", db.Text)
    created_at = db.Column("createdAt", db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column("updatedAt", db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    user = db.relationship("User", back_populates="courts", lazy="select")
    schedules = db.relationship(
        "CourtSchedule",
        back_populates="court",
        cascade="all, delete-orphan",
        lazy="select",
    )


class CourtSchedule(db.Model):
    __tablename__ = "CourtSchedules"
    __table_args__ = (
        db.Index("ix_schedule_court_day_start_end", "CourtId", "DayOfWeek", "StartTime", "EndTime"),
    )

    id = db.Column("Id", BigInt, primary_key=True)
    court_id = db.Column("CourtId", BigInt, db.ForeignKey("Courts.Id"), nullable=False)
    day_of_week = db.Column("DayOfWeek", db.Integer, nullable=False)
    start_time = db.Column("StartTime", db.Time, nullable=False)
    end_time = db.Column("EndTime", db.Time, nullable=False)
    available = db.Column("Available", db.Boolean, nullable=False, default=True)
    cost_per_hour = db.Column("CostPerHour", db.Numeric(10, 2), nullable=False)
    created_at = db.Column("CreatedAt", db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column("UpdatedAt", db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    court = db.relationship("Court", back_populates="schedules", lazy="select")
    bookings = db.relationship("Booking", back_populates="court_schedule", lazy="select")
    team_challenges = db.relationship("TeamChallenge", back_populates="court_schedule", lazy="select")


class Booking(db.Model):
    __tablename__ = "Bookings"

    id = db.Column("Id", BigInt, primary_key=True)
    user_id = db.Column("userId", BigInt, db.ForeignKey("Users.Id"), nullable=False)
    court_schedule_id = db.Column("courtScheduleId", BigInt, db.ForeignKey("CourtSchedules.Id"), nullable=False)
    cancellation_date = db.Column("cancellationDate", db.DateTime)
    booking_date = db.Column("bookingDate", db.DateTime, nullable=False)
    advance = db.Column("advance", db.Numeric(10, 2), nullable=False)
    total_amount = db.Column("totalAmount", db.Numeric(10, 2), nullable=False)
    status = db.Column("status", db.String(30), nullable=False, default="pending")
    booking_code = db.Column("bookingCode", db.String(50), nullable=False, unique=True, index=True)
    lost_advance = db.Column("lostAdvance", db.Boolean, nullable=False, default=False)
    created_at = db.Column("createdAt", db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column("updatedAt", db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    user = db.relationship("User", back_populates="bookings", lazy="select")
    court_schedule = db.relationship("CourtSchedule", back_populates="bookings", lazy="select")
    payments = db.relationship(
        "Payment",
        back_populates="booking",
        cascade="all, delete-orphan",
        lazy="select",
    )
    history = db.relationship(
        "BookingHistory",
        back_populates="booking",
        cascade="all, delete-orphan",
        lazy="select",
    )
    team_challenges = db.relationship("TeamChallenge", back_populates="booking", lazy="select")


class PaymentMethod(db.Model):
    __tablename__ = "PaymentMethods"

    id = db.Column("Id", BigInt, primary_key=True)
    company_id = db.Column("companyId", BigInt, nullable=False)
    type = db.Column("type", db.String(100), nullable=False)
    account_name = db.Column("accountName", db.String(150))
    account_number = db.Column("accountNumber", db.String(100))
    holder = db.Column("holder", db.String(150))
    active = db.Column("active", db.Boolean, nullable=False, default=True)
    created_at = db.Column("createdAt", db.DateTime, nullable=False, default=utcnow)

    payments = db.relationship("Payment", back_populates="payment_method", lazy="select")


class Payment(db.Model):
    __tablename__ = "Payments"

    id = db.Column("Id", BigInt, primary_key=True)
    booking_id = db.Column("BookingId", BigInt, db.ForeignKey("Bookings.Id"), nullable=False)
    amount = db.Column("Amount", db.Numeric(10, 2), nullable=False)
    payment_method_id = db.Column("PaymentMethodId", BigInt, db.ForeignKey("PaymentMethods.Id"), nullable=False)
    transaction_code = db.Column("TransactionCode", db.String(100))
    payment_date = db.Column("PaymentDate", db.DateTime)
    voucher_url = db.Column("VoucherUrl", db.String(500))
    gateway_response = db.Column("GatewayResponse", db.Text)
    payment_status = db.Column("PaymentStatus", db.String(30), nullable=False, default="pending")
    payment_type = db.Column("PaymentType", db.String(30), nullable=False, default="advance")
    created_at = db.Column("CreatedAt", db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column("UpdatedAt", db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    booking = db.relationship("Booking", back_populates="payments", lazy="select")
    payment_method = db.relationship("PaymentMethod", back_populates="payments", lazy="select")


class BookingHistory(db.Model):
    __tablename__ = "BookingHistories"

    id = db.Column("Id", BigInt, primary_key=True)
    booking_id = db.Column("bookingId", BigInt, db.ForeignKey("Bookings.Id"), nullable=False)
    action = db.Column("action", db.String(100), nullable=False)
    previous_status = db.Column("previousStatus", db.String(50))
    new_status = db.Column("newStatus", db.String(50))
    description = db.Column("description", db.String(500))
    action_date = db.Column("actionDate", db.DateTime, nullable=False, default=utcnow)

    booking = db.relationship("Booking", back_populates="history", lazy="select")


class SoccerTeam(db.Model):
    __tablename__ = "SoccerTeams"

    id = db.Column("Id", db.Integer, primary_key=True)
    team_name = db.Column("teamName", db.String(150), nullable=False)
    status = db.Column("status", db.Boolean, nullable=False, default=True)
    created_at = db.Column("createdAt", db.DateTime, nullable=False, default=utcnow)

    members = db.relationship(
        "TeamMember",
        back_populates="soccer_team",
        cascade="all, delete-orphan",
        lazy="select",
    )
    ratings_given = db.relationship(
        "TeamRating",
        foreign_keys="TeamRating.rating_team_id",
        back_populates="rating_team",
        lazy="select",
    )
    ratings_received = db.relationship(
        "TeamRating",
        foreign_keys="TeamRating.rated_team_id",
        back_populates="rated_team",
        lazy="select",
    )
    challenges_sent = db.relationship(
        "TeamChallenge",
        foreign_keys="TeamChallenge.challenging_team_id",
        back_populates="challenging_team",
        lazy="select",
    )
    challenges_received = db.relationship(
        "TeamChallenge",
        foreign_keys="TeamChallenge.challenged_team_id",
        back_populates="challenged_team",
        lazy="select",
    )


class TeamMember(db.Model):
    __tablename__ = "TeamMembers"

    id = db.Column("Id", BigInt, primary_key=True)
    team_id = db.Column("TeamId", db.Integer, db.ForeignKey("SoccerTeams.Id"), nullable=False)
    user_id = db.Column("UserId", BigInt, db.ForeignKey("Users.Id"), nullable=True)
    external_name = db.Column("ExternalName", db.String(150))
    role = db.Column("Role", db.String(30), nullable=False, default="player")
    status = db.Column("Status", db.Boolean, nullable=False, default=True)
    joined_at = db.Column("JoinedAt", db.DateTime, nullable=False, default=utcnow)

    soccer_team = db.relationship("SoccerTeam", back_populates="members", lazy="select")
    user = db.relationship("User", back_populates="team_memberships", lazy="select")


class TeamChallenge(db.Model):
    __tablename__ = "TeamChallenges"

    id = db.Column("Id", BigInt, primary_key=True)
    challenging_team_id = db.Column("challengingTeamId", db.Integer, db.ForeignKey("SoccerTeams.Id"), nullable=False)
    challenged_team_id = db.Column("challengedTeamId", db.Integer, db.ForeignKey("SoccerTeams.Id"), nullable=False)
    proposed_date = db.Column("proposedDate", db.DateTime, nullable=False)
    status = db.Column("status", db.Boolean, nullable=False, default=False)
    message = db.Column("message", db.String(500))
    created_at = db.Column("createdAt", db.DateTime, nullable=False, default=utcnow)
    response_date = db.Column("responseDate", db.DateTime)
    booking_id = db.Column("bookingId", BigInt, db.ForeignKey("Bookings.Id"))
    court_schedule_id = db.Column("courtScheduleId", BigInt, db.ForeignKey("CourtSchedules.Id"))
    proposed_date_time = db.Column("proposedDateTime", db.DateTime)

    challenging_team = db.relationship(
        "SoccerTeam",
        foreign_keys=[challenging_team_id],
        back_populates="challenges_sent",
        lazy="select",
    )
    challenged_team = db.relationship(
        "SoccerTeam",
        foreign_keys=[challenged_team_id],
        back_populates="challenges_received",
        lazy="select",
    )
    booking = db.relationship("Booking", back_populates="team_challenges", lazy="select")
    court_schedule = db.relationship("CourtSchedule", back_populates="team_challenges", lazy="select")


class TeamRating(db.Model):
    __tablename__ = "TeamRatings"

    id = db.Column("Id", BigInt, primary_key=True)
    rating_team_id = db.Column("ratingTeamId", db.Integer, db.ForeignKey("SoccerTeams.Id"), nullable=False)
    rated_team_id = db.Column("ratedTeamId", db.Integer, db.ForeignKey("SoccerTeams.Id"), nullable=False)
    client_id = db.Column("clientId", BigInt, nullable=False)
    stars = db.Column("stars", db.Integer, nullable=False)
    comment = db.Column("comment", db.String(500))
    created_at = db.Column("createdAt", db.DateTime, nullable=False, default=utcnow)

    rating_team = db.relationship(
        "SoccerTeam",
        foreign_keys=[rating_team_id],
        back_populates="ratings_given",
        lazy="select",
    )
    rated_team = db.relationship(
        "SoccerTeam",
        foreign_keys=[rated_team_id],
        back_populates="ratings_received",
        lazy="select",
    )
