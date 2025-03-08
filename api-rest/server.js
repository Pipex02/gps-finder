const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");


const app = express();
const PORT = 3000;

// Configuración de CORS para permitir peticiones desde el frontend
app.use(cors());

// Configuración de conexión a MySQL
const db = mysql.createConnection({
    host: "localhost",
    user: "xxxxxx",
    password: "xxxxxx",
    database: "xxxxxx"
});

// Conectar a la base de datos
db.connect((err) => {
    if (err) {
        console.error("❌ Error al conectar a MySQL:", err);
    } else {
        console.log("✅ Conectado a MySQL");
    }
});

// Ruta para obtener la última coordenada a traves de la API rest
app.get("/coordenadas", (req, res) => {
    const query = "SELECT latitud, longitud, timestamp FROM coordenadas ORDER BY id DESC LIMIT 1";

    db.query(query, (err, results) => {
        if (err) {
            console.error("❌ Error al obtener datos:", err);
            res.status(500).json({ error: "Error al obtener datos" });
        } else {
            res.json(results[0] || {}); // Devuelve el último registro o un objeto vacío
        }
    });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
