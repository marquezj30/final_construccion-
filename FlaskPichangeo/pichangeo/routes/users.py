from flask import Blueprint, jsonify

from ..auth import jwt_required
from ..models import User


bp = Blueprint("users", __name__)


@bp.get("/api/users")
@bp.get("/api/Users")
@jwt_required(roles=["admin"])
def get_all_users():
    users = User.query.order_by(User.id).all()
    return jsonify(
        [
            {
                "Id": user.id,
                "username": user.username,
                "name": user.name,
                "email": user.email,
                "role": user.role,
            }
            for user in users
        ]
    )


@bp.get("/api/ControladorPrueba")
def controlador_prueba():
    users = User.query.order_by(User.id).all()
    return jsonify(
        [
            {
                "Id": user.id,
                "username": user.username,
                "name": user.name,
                "email": user.email,
                "phone": user.phone,
                "status": user.status,
                "role": user.role,
            }
            for user in users
        ]
    )
