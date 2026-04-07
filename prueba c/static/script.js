const API = "http://127.0.0.1:5000";
let usuarioActual = "";

// Cargar usuarios
async function cargarUsuarios() {
    const res = await fetch(`${API}/users`);
    const data = await res.json();

    let select = document.getElementById("usuarios");
    select.innerHTML = "";

    data.forEach(u => {
        select.innerHTML += `<option value="${u}">${u}</option>`;
    });

    if (data.length > 0) {
        usuarioActual = data[0];
        cargarTareas();
    }
}

// Crear usuario
async function crearUsuario() {
    const nombre = document.getElementById("nuevoUsuario").value;

    await fetch(`${API}/users`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ nombre })
    });

    cargarUsuarios();
}

// Cambiar usuario
function cambiarUsuario() {
    usuarioActual = document.getElementById("usuarios").value;
    cargarTareas();
}

// Cargar tareas del usuario
async function cargarTareas() {
    if (!usuarioActual) return;

    const res = await fetch(`${API}/tasks/${usuarioActual}`);
    const data = await res.json();

    let tabla = document.getElementById("tabla");
    tabla.innerHTML = "";

    data.forEach(t => {
        tabla.innerHTML += `
            <tr>
                <td>${t.tarea}</td>
                <td>${t.estado}</td>
            </tr>
        `;
    });
}

// Agregar tarea
async function agregarTarea() {
    const tarea = document.getElementById("tarea").value;
    const estado = document.getElementById("estado").value;

    await fetch(`${API}/tasks/${usuarioActual}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ tarea, estado })
    });

    cargarTareas();
}

cargarUsuarios();