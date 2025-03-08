## 🌍 **Web Server con API REST y Sniffer UDP**  

Este proyecto implementa un **servidor web con NGINX**, una **API REST con Node.js** y un **Sniffer UDP en Python** para capturar datos de ubicación y mostrarlos en una página web.  

### 📌 **Requisitos Previos**  
Antes de ejecutar el proyecto, asegúrate de tener instalados:  
✅ **MySQL** 
✅ **Node.js** y **npm**  
✅ **Python 3**  
✅ **NGINX**  

---

## 🛠 **1️⃣ Crear la Base de Datos**  
Ejecuta el siguiente comando en MySQL para crear la base de datos y la tabla necesaria:  
```sql
CREATE DATABASE gps_tracker;
USE gps_tracker;

CREATE TABLE IF NOT EXISTS coordenadas ( 
    id INT AUTO_INCREMENT PRIMARY KEY,
    latitud DECIMAL(10,6),
    longitud DECIMAL(10,6),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 **2️⃣ Iniciar el Servidor Web con NGINX**  
1. Abre una terminal y navega a la carpeta del servidor web:  
   ```sh
   cd web-server
   ```
2. Inicia NGINX:  
   ```sh
   start nginx
   ```
3. **Verifica que está corriendo:** Abre `http://localhost` en el navegador.  

---

## 📡 **3️⃣ Iniciar la API REST en Node.js**  
1. Abre otra terminal y navega a la carpeta de la API REST:  
   ```sh
   cd api-rest
   ```
2. Instala las dependencias necesarias:  
   ```sh
   npm install
   ```
3. Inicia el servidor:  
   ```sh
   node server.js
   ```
4. **Verifica que está funcionando:**  
   - Abre `http://localhost/api/coordenadas` en el navegador.  
   - Deberías ver un JSON con los últimos datos de coordenadas.  

---

## 📡 **4️⃣ Iniciar el Sniffer UDP en Python**  
1. Abre otra terminal y navega a la carpeta del sniffer UDP:  
   ```sh
   cd sniffer-udp
   ```
2. Instala las dependencias necesarias:  
   ```sh
   pip install -r requirements.txt
   ```
3. Ejecuta el sniffer para capturar datos GPS:  
   ```sh
   python sniffer_udp.py
   ```
4. **Verifica que está recibiendo datos:**  
   - Si hay dispositivos enviando datos, deberían aparecer en la terminal.  
   - Los datos deberían almacenarse en la base de datos.  

---

## 🌎 **5️⃣ Ver la Página Web con la Última Entrada GPS**  
Una vez que todos los servicios están en funcionamiento:  
1. **Abre tu navegador en `http://localhost`**.  
2. **Deberías ver la página con la última coordenada registrada en la base de datos.**

---

## 🎯 **Resumen de Comandos**
```sh
# 1️⃣ Crear la base de datos en MySQL
mysql -u usuario -p < database.sql

# 2️⃣ Iniciar NGINX
cd web-server
start nginx

# 3️⃣ Iniciar la API REST con Node.js
cd api-rest
npm install
node server.js

# 4️⃣ Iniciar el Sniffer UDP en Python
cd sniffer-udp
pip install -r requirements.txt  # (Solo si es necesario)
python sniffer_udp.py

# 5️⃣ Abrir el navegador en http://localhost
```