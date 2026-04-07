from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

usuarios = {}  # { "johan": [ {tarea, estado} ] }

@app.route("/")
def home():
    return render_template("index.html")

# ================= USERS =================

@app.route("/users", methods=["POST"])
def add_user():
    data = request.json
    nombre = data["nombre"]

    if nombre not in usuarios:
        usuarios[nombre] = []

    return jsonify({"message": "Usuario creado"}), 201

@app.route("/users", methods=["GET"])
def get_users():
    return jsonify(list(usuarios.keys()))

# ================= TASKS =================

# Obtener tareas de un usuario
@app.route("/tasks/<usuario>", methods=["GET"])
def get_tasks(usuario):
    return jsonify(usuarios.get(usuario, []))

# Agregar tarea
@app.route("/tasks/<usuario>", methods=["POST"])
def add_task(usuario):
    data = request.json

    tarea = {
        "tarea": data["tarea"],
        "estado": data["estado"]
    }

    if usuario not in usuarios:
        usuarios[usuario] = []

    usuarios[usuario].append(tarea)

    return jsonify({"message": "Tarea agregada"}), 201

# ================= VER TODAS =================

@app.route("/tasks", methods=["GET"])
def get_all_tasks():
    resultado = []

    for usuario, lista in usuarios.items():
        for i, t in enumerate(lista):
            resultado.append({
                "usuario": usuario,
                "index": i,
                "tarea": t["tarea"],
                "estado": t["estado"]
            })

    return jsonify(resultado)

# ================= ACTUALIZAR =================

@app.route("/tasks/<usuario>/<int:index>", methods=["PUT"])
def update_task(usuario, index):
    data = request.json

    if usuario not in usuarios:
        return jsonify({"error": "Usuario no existe"}), 404

    if index >= len(usuarios[usuario]):
        return jsonify({"error": "Tarea no existe"}), 404

    usuarios[usuario][index]["tarea"] = data.get(
        "tarea", usuarios[usuario][index]["tarea"]
    )
    usuarios[usuario][index]["estado"] = data.get(
        "estado", usuarios[usuario][index]["estado"]
    )

    return jsonify({"message": "Tarea actualizada"})

# ================= ELIMINAR =================

@app.route("/tasks/<usuario>/<int:index>", methods=["DELETE"])
def delete_task(usuario, index):
    if usuario not in usuarios:
        return jsonify({"error": "Usuario no existe"}), 404

    if index >= len(usuarios[usuario]):
        return jsonify({"error": "Tarea no existe"}), 404

    usuarios[usuario].pop(index)

    return jsonify({"message": "Tarea eliminada"})

# ================= RUN =================

if __name__ == "__main__":
    app.run(debug=True)