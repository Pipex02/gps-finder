require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Ruta para servir el HTML con el título dinámico
app.get('/', (req, res) => {
    // Leer el archivo HTML
    fs.readFile('index.html', 'utf8', (err, data) => {
      if (err) {
        return res.status(500).send('Error al leer el HTML');
      }
  
      // Reemplazar el título con la variable de entorno
      const modifiedHTML = data.replace(
        /<title>.*?<\/title>/,
        `<title>${process.env.APP_TITLE}</title>`  // se debe crear una nueva variable de este nombre
      );
  
      res.send(modifiedHTML);
    });
});

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

// Ruta para obtener la última coordenada a traves de la API REST
app.get("/coordenadas", (req, res) => {
    const query = "SELECT latitud, longitud, timestamp FROM coordenadas ORDER BY id DESC LIMIT 1";

    db.query(query, (err, results) => {
        if (err) {
            console.error("❌ Error al obtener datos:", err);
            res.status(500).json({ error: "Error al obtener datos" });
        } else {
            if (results.length > 0) {
                const data = results[0];
                res.json({
                    latitud: parseFloat(data.latitud).toFixed(5),
                    longitud: parseFloat(data.longitud).toFixed(5),
                    timestamp: data.timestamp
                });
            } else {
                res.json({});
            }
        }
    });
});

// Nueva ruta para obtener datos históricos entre dos fechas
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


// Nueva ruta para verificar ubicación con radio y fechas del histórico
app.get("/api/check-location-with-historic-time", (req, res) => {
    const latStr = req.query.lat;
    const lngStr = req.query.lng;
    const radiusStr = req.query.radius;
    const inicio = req.query.inicio;
    const fin = req.query.fin;

    // Convertir a números
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    const radius = parseFloat(radiusStr);

    // Validar que los parámetros sean numéricos
    if (isNaN(lat) || isNaN(lng) || isNaN(radius) || !inicio || !fin) {
        return res.status(400).json({ error: "Parámetros inválidos" });
    }

    // Convertir fechas a formato MySQL
    const inicioDate = new Date(inicio);
    const finDate = new Date(fin);
    const inicioFormatted = inicioDate.toISOString().slice(0, 19).replace('T', ' ');
    const finFormatted = finDate.toISOString().slice(0, 19).replace('T', ' ');

  


    const query = `
        SELECT latitud, longitud, timestamp 
        FROM coordenadas 
        WHERE 
            latitud BETWEEN ? AND ?
            AND longitud BETWEEN ? AND ?
            AND timestamp BETWEEN ? AND ?
    `;

    const values = [
            latMin, latMax,
            lngMin, lngMax,
            inicioFormatted,
            finFormatted
    ];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error("Error en la consulta:", err);
            return res.status(500).json({ error: "Error interno" });
        }

        // Respuesta con datos y estado
        const hasVisited = results.length > 0;
        res.json({
            visited: hasVisited,
            visits: results,
            message: hasVisited 
                ? `Hubo ${results.length} visitas dentro del radio y período especificado.` 
                : "No hubo visitas en ese rango."
        });
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

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
