import re

from flask import Blueprint, jsonify, request

from ..auth import current_user_id, jwt_required
from ..extensions import db
from ..models import SoccerTeam, TeamChallenge, TeamMember, TeamRating, utcnow
from ..utils import as_iso, error, field, required_field


bp = Blueprint("ratings", __name__)
BANNED_WORDS = [
    "idiota",
    "estupido",
    "imbecil",
    "maldito",
    "basura",
    "inutil",
    "mierda",
    "pendejo",
    "imbécil",
    "estúpido",
]


def contains_inappropriate_content(comment: str) -> bool:
    lower = comment.lower()
    return any(word in lower for word in BANNED_WORDS)


def sanitize_comment(comment: str) -> str:
    result = comment
    for word in BANNED_WORDS:
        result = re.sub(word, "*" * len(word), result, flags=re.IGNORECASE)
    return result


def get_my_leader_member(user_id: int) -> TeamMember | None:
    return TeamMember.query.filter_by(
        user_id=user_id,
        role="leader",
        status=True,
    ).first()


def rating_response(rating: TeamRating) -> dict:
    return {
        "ratingId": rating.id,
        "ratingTeamName": rating.rating_team.team_name if rating.rating_team else "",
        "ratedTeamName": rating.rated_team.team_name if rating.rated_team else "",
        "stars": rating.stars,
        "comment": rating.comment,
        "createdAt": as_iso(rating.created_at),
    }


@bp.post("/api/rating")
@bp.post("/api/ratings")
@jwt_required(roles=["client"])
def create_rating():
    data = request.get_json(silent=True) or {}
    user_id = current_user_id()
    my_leader = get_my_leader_member(user_id)
    if my_leader is None:
        return error("No autorizado.", 403)

    try:
        rated_team_id = int(required_field(data, "ratedTeamId", "RatedTeamId", "rated_team_id"))
        stars = int(required_field(data, "stars", "Stars"))
    except ValueError as exc:
        return error(str(exc), 400)

    if stars < 1 or stars > 5:
        return error("Las estrellas deben estar entre 1 y 5.", 400)
    if my_leader.team_id == rated_team_id:
        return error("No puedes calificar a tu propio equipo.", 400)

    challenge_exists = TeamChallenge.query.filter(
        TeamChallenge.status == True,
        (
            (TeamChallenge.challenging_team_id == my_leader.team_id)
            & (TeamChallenge.challenged_team_id == rated_team_id)
        )
        | (
            (TeamChallenge.challenging_team_id == rated_team_id)
            & (TeamChallenge.challenged_team_id == my_leader.team_id)
        ),
    ).first()
    if challenge_exists is None:
        return error("Solo puedes calificar a un equipo con el que hayas tenido un reto aceptado.", 400)

    already_rated = TeamRating.query.filter_by(
        rating_team_id=my_leader.team_id,
        rated_team_id=rated_team_id,
    ).first()
    if already_rated:
        return error("Tu equipo ya calificó a este equipo.", 409)

    final_comment = field(data, "comment", "Comment")
    if final_comment is not None:
        final_comment = str(final_comment).strip()
        if contains_inappropriate_content(final_comment):
            return error("El comentario contiene lenguaje inapropiado.", 400)

    rating = TeamRating(
        rating_team_id=my_leader.team_id,
        rated_team_id=rated_team_id,
        client_id=user_id,
        stars=stars,
        comment=final_comment,
        created_at=utcnow(),
    )
    db.session.add(rating)
    db.session.commit()
    return jsonify(rating_response(rating)), 201


@bp.get("/api/teams/<int:team_id>/ratings")
@jwt_required(roles=["client", "admin"])
def get_team_ratings(team_id: int):
    if db.session.get(SoccerTeam, team_id) is None:
        return error("Equipo no encontrado.", 404)

    ratings = (
        TeamRating.query.filter_by(rated_team_id=team_id)
        .order_by(TeamRating.created_at.desc())
        .all()
    )
    return jsonify([rating_response(rating) for rating in ratings])


@bp.delete("/api/rating/<int:rating_id>")
@bp.delete("/api/ratings/<int:rating_id>")
@jwt_required(roles=["admin"])
def delete_rating(rating_id: int):
    rating = db.session.get(TeamRating, rating_id)
    if rating is None:
        return error("Calificación no encontrada.", 404)
    db.session.delete(rating)
    db.session.commit()
    return "", 204
