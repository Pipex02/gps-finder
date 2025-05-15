import socket
import random
import time
from datetime import datetime

# Configuración del destino (la IP del sniffer y el puerto)
IP_SNIFER = "18.220.249.87"  # Reemplaza con la IP de tu instancia EC2
PUERTO = 59595



# Crear socket UDP
cliente = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

try:
    while True:
        # Generar datos aleatorios para la ruta
        lat = round(random.uniform(-90.0, 90.0), 6)
        lon = round(random.uniform(-180.0, 180.0), 6)
        estampa = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        velocidad = round(random.uniform(0, 120), 2)  # Velocidad en km/h, por ejemplo
        gasolina = round(random.uniform(0, 100), 2)    # Gasolina entre 0 y 100
        VehicleID = 1  # Fijado para el vehículo 1

        # Armar el mensaje, incluyendo tu IP
        valores = [lat, lon, estampa, velocidad, gasolina, VehicleID]
        mensaje = ",".join(map(str, valores))
        
        # Enviar paquete al sniffer
        cliente.sendto(mensaje.encode('utf-8'), (IP_SNIFER, PUERTO))
        print(f"📤 Enviado: {mensaje}")

        time.sleep(5)  # Esperar 5 segundos antes del siguiente envío

except KeyboardInterrupt:
    print("\n🛑 Transmisión detenida por el usuario.")

finally:
    cliente.close()