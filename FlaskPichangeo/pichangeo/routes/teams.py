from flask import Blueprint, jsonify, request

from ..auth import current_user_id, jwt_required
from ..extensions import db
from ..models import SoccerTeam, TeamMember, User, utcnow
from ..utils import as_iso, error, field, required_field


bp = Blueprint("teams", __name__)


def get_leader_member(user_id: int, team_id: int | None = None) -> TeamMember | None:
    query = (
        TeamMember.query.join(SoccerTeam)
        .filter(
            TeamMember.user_id == user_id,
            TeamMember.role == "leader",
            TeamMember.status == True,
            SoccerTeam.status == True,
        )
    )
    if team_id is not None:
        query = query.filter(TeamMember.team_id == team_id)
    return query.first()


def member_response(member: TeamMember) -> dict:
    return {
        "memberId": member.id,
        "userId": member.user_id,
        "displayName": member.external_name if member.user_id is None else (member.user.name if member.user else "Usuario"),
        "role": member.role,
        "status": member.status,
        "isGhost": member.user_id is None,
        "joinedAt": as_iso(member.joined_at),
    }


def _team_stats(team: SoccerTeam):
    leader = next((member for member in team.members if member.role == "leader" and member.status), None)
    active_members = [member for member in team.members if member.status]
    ratings = list(team.ratings_received or [])
    average = round(sum(rating.stars for rating in ratings) / len(ratings), 1) if ratings else 0
    return leader, active_members, average


def team_response(team: SoccerTeam) -> dict:
    leader, active_members, average = _team_stats(team)
    return {
        "id": team.id,
        "teamName": team.team_name,
        "status": team.status,
        "createdAt": as_iso(team.created_at),
        "leaderName": leader.user.name if leader and leader.user else "Sin líder",
        "memberCount": len(active_members),
        "averageStars": average,
    }


def team_detail_response(team: SoccerTeam) -> dict:
    leader, active_members, average = _team_stats(team)
    return {
        "id": team.id,
        "teamName": team.team_name,
        "status": team.status,
        "createdAt": as_iso(team.created_at),
        "leaderName": leader.user.name if leader and leader.user else "Sin líder",
        "memberCount": len(active_members),
        "averageStars": average,
        "members": [member_response(member) for member in active_members],
    }


@bp.post("/api/teams")
@jwt_required(roles=["client"])
def create_team():
    data = request.get_json(silent=True) or {}
    try:
        team_name = required_field(data, "teamName", "TeamName", "team_name")
    except ValueError as exc:
        return error(str(exc), 400)

    user_id = current_user_id()
    if get_leader_member(user_id) is not None:
        return error("Ya eres líder de un equipo activo. No puedes crear otro.", 409)

    team = SoccerTeam(team_name=team_name, status=True, created_at=utcnow())
    db.session.add(team)
    db.session.flush()

    leader = TeamMember(
        team_id=team.id,
        user_id=user_id,
        role="leader",
        status=True,
        joined_at=utcnow(),
    )
    db.session.add(leader)
    db.session.commit()
    return jsonify(team_detail_response(team)), 201


@bp.get("/api/teams")
@jwt_required()
def get_all_teams():
    teams = SoccerTeam.query.filter_by(status=True).order_by(SoccerTeam.team_name).all()
    return jsonify([team_response(team) for team in teams])


@bp.get("/api/teams/all")
@jwt_required(roles=["admin"])
def get_all_teams_admin():
    teams = SoccerTeam.query.order_by(SoccerTeam.team_name).all()
    return jsonify([team_response(team) for team in teams])


@bp.get("/api/teams/my")
@jwt_required(roles=["client"])
def get_my_teams():
    teams = (
        SoccerTeam.query.join(TeamMember)
        .filter(
            TeamMember.user_id == current_user_id(),
            TeamMember.status == True,
            SoccerTeam.status == True,
        )
        .order_by(SoccerTeam.team_name)
        .all()
    )
    return jsonify([team_detail_response(team) for team in teams])


@bp.get("/api/teams/<int:team_id>")
@jwt_required()
def get_team_by_id(team_id: int):
    team = db.session.get(SoccerTeam, team_id)
    if team is None:
        return error("Equipo no encontrado.", 404)
    return jsonify(team_detail_response(team))


@bp.put("/api/teams/<int:team_id>")
@jwt_required(roles=["client"])
def update_team(team_id: int):
    leader = get_leader_member(current_user_id(), team_id)
    if leader is None:
        return error("No autorizado.", 403)

    data = request.get_json(silent=True) or {}
    try:
        leader.soccer_team.team_name = required_field(data, "teamName", "TeamName", "team_name")
    except ValueError as exc:
        return error(str(exc), 400)

    db.session.commit()
    return jsonify(team_detail_response(leader.soccer_team))


@bp.delete("/api/teams/<int:team_id>")
@jwt_required(roles=["client"])
def deactivate_team(team_id: int):
    leader = get_leader_member(current_user_id(), team_id)
    if leader is None:
        return error("No autorizado.", 403)

    leader.soccer_team.status = False
    TeamMember.query.filter_by(team_id=team_id, status=True).update({"status": False})
    db.session.commit()
    return "", 204


@bp.get("/api/teams/<int:team_id>/members")
@jwt_required()
def get_members(team_id: int):
    if db.session.get(SoccerTeam, team_id) is None:
        return error("Equipo no encontrado.", 404)
    members = TeamMember.query.filter_by(team_id=team_id, status=True).all()
    return jsonify([member_response(member) for member in members])


def _add_real_member(team_id: int, target_user: User):
    if target_user.id == current_user_id():
        return error("No puedes agregarte a ti mismo.", 400)
    if target_user.role != "client":
        return error("Solo se pueden agregar usuarios con rol cliente.", 400)

    already_member = TeamMember.query.filter_by(
        team_id=team_id,
        user_id=target_user.id,
        status=True,
    ).first()
    if already_member:
        return error("El usuario ya es miembro activo de este equipo.", 409)

    member = TeamMember(
        team_id=team_id,
        user_id=target_user.id,
        role="player",
        status=True,
        joined_at=utcnow(),
    )
    db.session.add(member)
    db.session.commit()
    return jsonify(member_response(member))


@bp.get("/api/teams/users/search")
@jwt_required(roles=["client"])
def search_users():
    query = (request.args.get("q") or request.args.get("Q") or "").strip()
    if len(query) < 2:
        return jsonify([])

    like = f"%{query}%"
    users = (
        User.query.filter(
            User.role == "client",
            db.or_(User.name.ilike(like), User.username.ilike(like)),
        )
        .order_by(User.name)
        .limit(10)
        .all()
    )
    return jsonify(
        [
            {"id": user.id, "name": user.name, "username": user.username, "email": user.email}
            for user in users
        ]
    )


@bp.post("/api/teams/<int:team_id>/members/real")
@jwt_required(roles=["client"])
def add_real_member(team_id: int):
    leader = get_leader_member(current_user_id(), team_id)
    if leader is None:
        return error("No autorizado.", 403)

    data = request.get_json(silent=True) or {}
    try:
        target_user_id = int(required_field(data, "userId", "UserId", "user_id"))
    except ValueError as exc:
        return error(str(exc), 400)

    target_user = db.session.get(User, target_user_id)
    if target_user is None:
        return error("Usuario no encontrado.", 404)

    return _add_real_member(team_id, target_user)


@bp.post("/api/teams/<int:team_id>/members/real/by-username")
@jwt_required(roles=["client"])
def add_real_member_by_username(team_id: int):
    leader = get_leader_member(current_user_id(), team_id)
    if leader is None:
        return error("No autorizado.", 403)

    data = request.get_json(silent=True) or {}
    try:
        username = str(required_field(data, "username", "Username")).strip()
    except ValueError as exc:
        return error(str(exc), 400)

    target_user = User.query.filter_by(username=username).first()
    if target_user is None:
        return error("Usuario no encontrado.", 404)

    return _add_real_member(team_id, target_user)


@bp.post("/api/teams/<int:team_id>/members/ghost")
@jwt_required(roles=["client"])
def add_ghost_member(team_id: int):
    leader = get_leader_member(current_user_id(), team_id)
    if leader is None:
        return error("No autorizado.", 403)

    data = request.get_json(silent=True) or {}
    external_name = str(field(data, "externalName", "ExternalName", "external_name", default="")).strip()
    if not external_name:
        return error("El nombre del miembro externo es obligatorio.", 400)

    member = TeamMember(
        team_id=team_id,
        user_id=None,
        external_name=external_name,
        role="player",
        status=True,
        joined_at=utcnow(),
    )
    db.session.add(member)
    db.session.commit()
    return jsonify(member_response(member))


@bp.delete("/api/teams/<int:team_id>/members/<int:member_id>")
@jwt_required(roles=["client"])
def remove_member(team_id: int, member_id: int):
    leader = get_leader_member(current_user_id(), team_id)
    if leader is None:
        return error("No autorizado.", 403)

    target = TeamMember.query.filter_by(id=member_id, team_id=team_id, status=True).first()
    if target is None:
        return error("Miembro no encontrado.", 404)
    if target.role == "leader":
        return error("No puedes expulsarte a ti mismo. Transfiere el liderazgo primero.", 400)

    target.status = False
    db.session.commit()
    return "", 204


@bp.delete("/api/teams/<int:team_id>/members/me")
@jwt_required(roles=["client"])
def leave_team(team_id: int):
    member = TeamMember.query.filter_by(
        team_id=team_id,
        user_id=current_user_id(),
        status=True,
    ).first()
    if member is None:
        return error("No eres miembro activo de este equipo.", 404)
    if member.role == "leader":
        return error("Eres el líder. Transfiere el liderazgo antes de salirte.", 400)

    member.status = False
    db.session.commit()
    return "", 204


@bp.put("/api/teams/<int:team_id>/members/<int:member_id>/promote")
@jwt_required(roles=["client"])
def promote_to_leader(team_id: int, member_id: int):
    current_leader = get_leader_member(current_user_id(), team_id)
    if current_leader is None:
        return error("No autorizado.", 403)

    target = TeamMember.query.filter_by(id=member_id, team_id=team_id, status=True).first()
    if target is None:
        return error("Miembro no encontrado.", 404)
    if target.user_id is None:
        return error("No se puede promover a un miembro fantasma como líder.", 400)
    if target.role == "leader":
        return error("Este miembro ya es líder.", 400)

    current_leader.role = "player"
    target.role = "leader"
    db.session.commit()
    return jsonify(
        {
            "message": "Liderazgo transferido correctamente.",
            "newLeaderName": target.user.name if target.user else None,
            "newLeaderId": target.user_id,
        }
    )
