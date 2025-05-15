import socket
import pymysql
import os
from dotenv import load_dotenv

load_dotenv('/home/ubuntu/gps-finder/sniffer-udp/.env')
# Configuración de conexión a la base de datos
def conectar_bd():
    try:
        conexion = pymysql.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),  
            database=os.getenv("DB_NAME")
        )
        return conexion
    except pymysql.MySQLError as e:
        print(f"❌ Error al conectar con la base de datos: {e}")
        return None

def insertar_coordenadas(lat, lon, estampa, velocidad, gasolina, VehicleID):
    conexion = conectar_bd()
    if conexion:
        try:
            with conexion.cursor() as cursor:
                # Se inserta respetando el orden de la tabla:
                # latitud, longitud, timestamp, velocidad, gasolina, VehicleID
                sql = "INSERT INTO coordenadas (latitud, longitud, timestamp, velocidad, gasolina, VehicleID) VALUES (%s, %s, %s, %s, %s, %s)"
                cursor.execute(sql, (lat, lon, estampa, velocidad, gasolina, VehicleID))
                conexion.commit()
                print(f"✅ Datos insertados: {lat}, {lon}, {estampa}, {velocidad}, {gasolina}, {VehicleID}")
        except pymysql.MySQLError as e:
            print(f"❌ Error al insertar en la base de datos: {e}")
        finally:
            conexion.close()
    else:
        print("❌ No se pudo conectar a la base de datos.")

# Sniffer que escucha en el puerto UDP
def sniffer():
    puerto = 59595  
    servidor = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    # Escucha en todas las interfaces (no solo localhost)
    servidor.bind(("0.0.0.0", puerto))
    servidor.settimeout(1)  # 🔹 Evita bloqueo indefinido

    print(f"📡 Sniffer escuchando en el puerto {puerto}... (Presiona CTRL + C para detener)")

    try:
        while True:
            try:
                datos, direccion = servidor.recvfrom(1024)
                mensaje = datos.decode('utf-8').strip()
                print(f"🔗 Paquete recibido de {direccion[0]}: {mensaje}")

                try:
                    # Extraer latitud, longitud, estampa, velocidad, gasolina, VehicleID del paquete
                    lat, lon, estampa, velocidad, gasolina, VehicleID = mensaje.split(',')
                    lat = float(lat)
                    lon = float(lon)
                    velocidad = float(velocidad)
                    gasolina = float(gasolina)
                    VehicleID = int(VehicleID)
                    
                    # Inserta los datos en la base de datos
                    insertar_coordenadas(lat, lon, estampa, velocidad, gasolina, VehicleID)
                except Exception as e:
                    print(f"❌ Error procesando datos: {e}")

            except socket.timeout:
                continue  # 🔹 Evita bloqueo indefinido

    except KeyboardInterrupt:
        print("\n⏹️ Sniffer detenido por el usuario.")
        servidor.close()

# Ejecuta el sniffer
if __name__ == "__main__":
    sniffer()
