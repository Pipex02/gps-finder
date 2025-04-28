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

# Inserta las coordenadas en la base de datos (sin IP)
def insertar_coordenadas(lat, lon, estampa, velocidad, gasolina):
    conexion = conectar_bd()
    if conexion:
        try:
            with conexion.cursor() as cursor:
                sql = "INSERT INTO coordenadas (latitud, longitud, timestamp, velocidad, gasolina) VALUES (%s, %s, %s, %s, %s)"
                cursor.execute(sql, (lat, lon, estampa, velocidad, gasolina))
                conexion.commit()
                print(f"✅ Datos insertados: {lat}, {lon}, {estampa}, {velocidad},{gasolina}")
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
                print(f"🔗 Paquete recibido de {direccion[0]}: {datos.decode('utf-8')}")

                try:
                    # Extraer lat, lon, estampa,velocidad, gasolina del paquete
                    lat, lon, estampa, velocidad, gasolina = datos.decode('utf-8').strip().split(',')
                    lat = float(lat)
                    lon = float(lon)
                    velocidad = float(velocidad) 
                    gasolina = float(gasolina) # Convertir a float

                    # Inserta los datos en la base de datos
                    insertar_coordenadas(lat, lon, estampa, velocidad, gasolina)
                except Exception as e:
                    print(f"❌ Error procesando datos: {e}")

            except socket.timeout:
                continue  # 🔹 Evita que el programa se bloquee indefinidamente

    except KeyboardInterrupt:
        print("\n⏹️ Sniffer detenido por el usuario.")
        servidor.close()

# Ejecuta el sniffer
if __name__ == "__main__":
    sniffer()
