require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000; // Use environment variable for port, default to 3000

// Configuración de CORS para permitir peticiones desde el frontend
app.use(cors());

// Configuración de conexión a MySQL en RDS
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Conectar a la base de datos
db.connect((err) => {
    if (err) {
        console.error("❌ Error al conectar a MySQL:", err);
        return;
    }
    console.log("✅ Conectado a MySQL en RDS");
});

// Ruta para obtener la última coordenada a través de la API REST
app.get("/coordenadas", (req, res) => {
    // Leer el parámetro VehicleID de la consulta (query parameter)
    const vehicleID = req.query.VehicleID;
    let query = "";
    let queryParams = [];

    if(vehicleID) {
        // Filtra por VehicleID si se ha especificado
        query = "SELECT latitud, longitud, timestamp, velocidad, gasolina FROM coordenadas WHERE VehicleID = ? ORDER BY id DESC LIMIT 1";
        queryParams = [vehicleID];
    } else {
        // Sin filtro, retorna la última coordenada registrada
        query = "SELECT latitud, longitud, timestamp, velocidad, gasolina FROM coordenadas ORDER BY id DESC LIMIT 1";
    }
    
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error("❌ Error al obtener datos:", err);
            res.status(500).json({ error: "Error al obtener datos" });
        } else {
            if (results.length > 0) {
                const data = results[0];
                res.json({
                    latitud: parseFloat(data.latitud).toFixed(5),
                    longitud: parseFloat(data.longitud).toFixed(5),
                    timestamp: data.timestamp,
                    velocidad: parseFloat(data.velocidad),
                    gasolina: parseFloat(data.gasolina)
                });
            } else {
                res.json({});
            }
        }
    });
});

// Ruta para obtener datos históricos entre dos fechas
app.get("/historicos", (req, res) => {
    const { inicio, fin } = req.query;
    
    if (!inicio || !fin) {
        return res.status(400).json({ error: "Debe proporcionar fechas de inicio y fin." });
    }

    const query = `
        SELECT latitud, longitud, timestamp 
        FROM coordenadas 
        WHERE timestamp BETWEEN ? AND ? 
        ORDER BY timestamp ASC
    `;

    db.query(query, [inicio, fin], (err, results) => {
        if (err) {
            console.error("❌ Error al obtener datos históricos:", err);
            res.status(500).json({ error: "Error al obtener datos históricos" });
        } else {
            res.json(results.map(row => ({
                latitud: parseFloat(row.latitud).toFixed(5),
                longitud: parseFloat(row.longitud).toFixed(5),
                timestamp: row.timestamp
            })));
        }
    });
});

// Ruta para obtener configuración de la API
app.get("/config", (req, res) => {
    const config = {
        geoapifyApiKey: process.env.GEOAPIFY_KEY || "",
        pageTitle: process.env.APP_TITLE || "Consulta de Históricos"
    };

    if (!config.geoapifyApiKey) {
        console.warn("⚠️ ADVERTENCIA: La clave de la API Geoapify no está configurada");
    }

    res.json(config);
});

// NUEVA RUTA: Obtener coordenadas dentro de un radio y en un rango de fechas
app.get("/lugar", (req, res) => {
    const { latitud, longitud, radio, inicio, fin } = req.query;

    if (!latitud || !longitud || !radio || !inicio || !fin) {
        return res.status(400).json({ error: "Faltan parámetros requeridos (latitud, longitud, radio, inicio, fin)." });
    }

    const query = `
        SELECT latitud, longitud, timestamp,
               (6371000 * ACOS(
                   COS(RADIANS(?)) * COS(RADIANS(latitud)) * 
                   COS(RADIANS(longitud) - RADIANS(?)) + 
                   SIN(RADIANS(?)) * SIN(RADIANS(latitud))
               )) AS distancia
        FROM coordenadas
        WHERE timestamp BETWEEN ? AND ?
        HAVING distancia <= ?
        ORDER BY timestamp ASC
    `;

    db.query(query, [latitud, longitud, latitud, inicio, fin, radio], (err, results) => {
        if (err) {
            console.error("❌ Error al obtener datos de la ubicación:", err);
            res.status(500).json({ error: "Error al obtener datos de la ubicación" });
        } else {
            res.json(results.map(row => ({
                latitud: parseFloat(row.latitud).toFixed(5),
                longitud: parseFloat(row.longitud).toFixed(5),
                timestamp: row.timestamp
            })));
        }
    });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});