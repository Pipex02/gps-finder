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

# Inserta las coordenadas en la base de datos (ahora con ID del vehículo)
def insertar_coordenadas(lat, lon, estampa, velocidad, gasolina, vehiculo):
    conexion = conectar_bd()
    if conexion:
        try:
            with conexion.cursor() as cursor:
                # Seleccionar tabla según el vehículo
                tabla = f"coordenadas_vehiculo{vehiculo}"
                
                sql = f"""
                    INSERT INTO {tabla} (latitud, longitud, timestamp, velocidad, gasolina)
                    VALUES (%s, %s, %s, %s, %s)
                """
                cursor.execute(sql, (lat, lon, estampa, velocidad, gasolina))
                conexion.commit()
                print(f"✅ Datos insertados en {tabla}: {lat}, {lon}, {estampa}, {velocidad}, {gasolina}")
        except pymysql.MySQLError as e:
            print(f"❌ Error en la base de datos: {e}")
        finally:
            conexion.close()
    else:
        print("❌ No se pudo conectar a la base de datos.")

# Sniffer que escucha en el puerto UDP
def sniffer():
    puerto = 59595  
    servidor = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    servidor.bind(("0.0.0.0", puerto))
    servidor.settimeout(1)  

    print(f"📡 Sniffer escuchando en el puerto {puerto}... (Presiona CTRL + C para detener)")

    try:
        while True:
            try:
                datos, direccion = servidor.recvfrom(1024)  
                print(f"🔗 Paquete recibido de {direccion[0]}: {datos.decode('utf-8')}")

                try:
                    # Extraer 6 valores (nuevo campo: vehículo)
                    partes = datos.decode('utf-8').strip().split(',')
                    
                    if len(partes) != 6:
                        raise ValueError("Formato incorrecto: se requieren 6 valores")

                    lat, lon, estampa, velocidad, gasolina, vehiculo_str = partes
                    lat = float(lat)
                    lon = float(lon)
                    velocidad = float(velocidad) 
                    gasolina = float(gasolina)
                    vehiculo = int(vehiculo_str)  # Nuevo parámetro

                    # Validar vehículo (1 o 2)
                    if vehiculo not in (1, 2):
                        print(f"❌ Vehículo {vehiculo} no reconocido")
                        continue

                    # Llamar a la función con el nuevo parámetro
                    insertar_coordenadas(lat, lon, estampa, velocidad, gasolina, vehiculo)

                except Exception as e:
                    print(f"❌ Error procesando datos: {e}")

            except socket.timeout:
                continue  

    except KeyboardInterrupt:
        print("\n⏹️ Sniffer detenido por el usuario.")
        servidor.close()

if __name__ == "__main__":
    sniffer()