document.addEventListener('DOMContentLoaded', function() {
            // Seleccionar todas las tarjetas con clase 'variable-card'
            const variableElements = document.querySelectorAll('.variable-card');
    
            // Verificar que haya al menos dos tarjetas
            if (variableElements.length < 2) {
                 console.warn("Less than two '.variable-card' elements found. Speedometer script may not initialize correctly.");
                 // Continuamos, pero es posible que secondVariableCard sea undefined
            }
    
            // Apuntar a la segunda tarjeta (índice 1) - Asegúrate de que sea la correcta para tu HTML.
            // Tu HTML original tiene Gasolina (indice 0) y Velocidad (indice 1). Esto debería ser correcto.
            const secondVariableCard = variableElements[1];
    
            // Asegurarse de que la segunda tarjeta exista y contenga .card-content
            if (!secondVariableCard) {
                console.error("Second '.variable-card' element not found. Speedometer cannot be initialized.");
                return; // Salir si el contenedor no existe
            }
    
            const cardContent = secondVariableCard.querySelector('.card-content');
            if (!cardContent) {
                console.error("'.card-content' element not found within the second '.variable-card'. Speedometer cannot be initialized.");
                return; // Salir si el contenedor interno no existe
            }
    
            // Limpiar el contenido existente (el texto "Próximamente")
            cardContent.innerHTML = '';
    
            // --- Creación del SVG para el velocímetro ---
    
            const speedometerContainer = document.createElement('div');
            speedometerContainer.className = 'speedometer-container';
    
            const svgNS = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(svgNS, "svg");
            svg.setAttribute("width", "200"); // Ancho del SVG
            svg.setAttribute("height", "120"); // Alto del SVG (semi-círculo)
            svg.setAttribute("viewBox", "0 0 200 120"); // Área visible
    
            // Arco de fondo gris claro
            const backgroundArc = document.createElementNS(svgNS, "path");
            backgroundArc.setAttribute("d", "M 20 100 A 80 80 0 0 1 180 100"); // Arco de 180 grados
            backgroundArc.setAttribute("stroke", "#ffffff"); // Color gris claro
            backgroundArc.setAttribute("stroke-width", "8"); // Grosor de línea
            backgroundArc.setAttribute("fill", "none"); // Sin relleno
            svg.appendChild(backgroundArc);
    
            // Zonas de color (roja, amarilla, verde)
            // Las coordenadas están calculadas para que los arcos de 80 de radio empiecen y terminen en los ángulos correctos
            // Arco Rojo (0-30%) - Angulo 0 a 54 grados (aproximado)
            const redZone = document.createElementNS(svgNS, "path");
            redZone.setAttribute("d", "M 20 100 A 80 80 0 0 1 52.98 35.28"); // Ajusta según tus cálculos exactos para 54deg
            redZone.setAttribute("stroke", "#FF5252"); // Rojo
            redZone.setAttribute("stroke-width", "8");
            redZone.setAttribute("fill", "none");
            svg.appendChild(redZone);
    
            // Arco Amarillo (30-70%) - Angulo 54 a 126 grados (aproximado)
            const yellowZone = document.createElementNS(svgNS, "path");
            yellowZone.setAttribute("d", "M 52.98 35.28 A 80 80 0 0 1 147.02 35.28"); // Ajusta según tus cálculos exactos para 126deg
            yellowZone.setAttribute("stroke", "#FFC107"); // Amarillo
            yellowZone.setAttribute("stroke-width", "8");
            yellowZone.setAttribute("fill", "none");
            svg.appendChild(yellowZone);
    
            // Arco Verde (70-100%) - Angulo 126 a 180 grados (aproximado)
            const greenZone = document.createElementNS(svgNS, "path");
            greenZone.setAttribute("d", "M 147.02 35.28 A 80 80 0 0 1 180 100"); // Vuelve al punto final
            greenZone.setAttribute("stroke", "#4CAF50"); // Verde
            greenZone.setAttribute("stroke-width", "8");
            greenZone.setAttribute("fill", "none");
            svg.appendChild(greenZone);
    
            // Ticks y Etiquetas (0, 10, 20 ... 100)
            const maxSpeedometerValue = 100; // Valor máximo que muestra el velocímetro
            const angleRange = 180; // El rango angular del arco (180 grados)
    
            for (let i = 0; i <= 10; i++) {
                // Calcula el ángulo para cada tick (0 a 180 grados, de derecha a izquierda)
                const tickAngle = angleRange - (i / 10) * angleRange; // i=0 -> 180deg, i=10 -> 0deg
                const radians = tickAngle * Math.PI / 180;
    
                // Calcula las coordenadas para los ticks (líneas cortas)
                const innerRadius = 75; // Radio interior de los ticks
                const outerRadius = 85; // Radio exterior de los ticks
                const x1 = 100 + innerRadius * Math.cos(radians); // Punto interior del tick (centro 100,100)
                const y1 = 100 - innerRadius * Math.sin(radians); // Y es negativo porque el SVG va hacia arriba (0 arriba, 120 abajo)
                const x2 = 100 + outerRadius * Math.cos(radians); // Punto exterior del tick
                const y2 = 100 - outerRadius * Math.sin(radians);
    
                const tick = document.createElementNS(svgNS, "line");
                tick.setAttribute("x1", x1);
                tick.setAttribute("y1", y1);
                tick.setAttribute("x2", x2);
                tick.setAttribute("y2", y2);
                tick.setAttribute("stroke", "#ffffff"); // Color del tick
                tick.setAttribute("stroke-width", "2");
                svg.appendChild(tick);
    
                // Añadir etiquetas numéricas (0, 20, 40, etc.)
                if (i % 2 === 0) { // Solo para cada segundo tick (0, 2, 4, etc.)
                    const text = document.createElementNS(svgNS, "text");
                    // Calcula la posición para la etiqueta (radio 65)
                    const labelRadius = 65;
                    const labelX = 100 + labelRadius * Math.cos(radians);
                    const labelY = 100 - labelRadius * Math.sin(radians) - 2; // Pequeño ajuste vertical
    
                    text.setAttribute("x", labelX);
                    text.setAttribute("y", labelY);
                    text.setAttribute("text-anchor", "middle"); // Centra el texto en X
                    text.setAttribute("font-size", "10");
                    text.classList.add("speedometer-tick-label");
                    text.textContent = i * 10; // El valor de la etiqueta (0, 10, 20, ...)
                    svg.appendChild(text);
                }
            }
    
             // --- Aguja del velocímetro ---
            const needle = document.createElementNS(svgNS, "line");
            needle.setAttribute("x1", "100"); // Origen en el centro
            needle.setAttribute("y1", "100");
            needle.setAttribute("x2", "20"); // Punto final (inicialmente apuntando a la izquierda)
            needle.setAttribute("y2", "100");
            needle.setAttribute("stroke", "#D32F2F"); // Color rojo oscuro
            needle.setAttribute("stroke-width", "2");
            // Elimina la transformación inicial
            // needle.setAttribute("transform", `rotate(180, 100, 100)`);
            svg.appendChild(needle);
    
            // Círculo central para la aguja
            const needleCenter = document.createElementNS(svgNS, "circle");
            needleCenter.setAttribute("cx", "100");
            needleCenter.setAttribute("cy", "100");
            needleCenter.setAttribute("r", "5");
            needleCenter.setAttribute("fill", "#ffffff");
            svg.appendChild(needleCenter);
    
            // Texto para mostrar la velocidad actual (ej. "55 km/h")
            const speedValueText = document.createElementNS(svgNS, "text");
            speedValueText.setAttribute("x", "100");
            speedValueText.setAttribute("y", "80"); // Posición debajo del centro
            speedValueText.setAttribute("text-anchor", "middle");
            speedValueText.setAttribute("font-size", "16");
            speedValueText.setAttribute("font-weight", "bold");
            speedValueText.classList.add("speedometer-value-text");
            speedValueText.textContent = "0 km/h"; // Texto inicial
            svg.appendChild(speedValueText);
    
    
            speedometerContainer.appendChild(svg);
            cardContent.appendChild(speedometerContainer);
    
            // --- Añadir estilos CSS dinámicamente ---
            // Verifica si los estilos ya existen (para no duplicarlos si se carga más de un script similar)
             if (!document.querySelector('style[data-speedometer-styles]')) {
                    const styles = document.createElement('style');
        styles.setAttribute('data-speedometer-styles', '');
        styles.innerHTML = `
            .speedometer-container {
                position: relative;
                width: 200px;
                height: 120px; /* Altura para el semicírculo */
                margin: 0 auto;
                text-align: center;
                fill: #ffffff;
            }
            .speedometer-tick-label {
                fill: #ffffff;
                color: #ffffff;
                font-family: monospace;
                font-size: 10px;
            }
            .speedometer-value-text {
                fill: #ffffff;
                color: #ffffff;
                font-family: 'Press Start 2P', cursive;
                font-size: 13px;
                font-weight: bold;
            }
        `;
        document.head.appendChild(styles);
             }
    
    
            // --- Función para actualizar la apariencia visual del velocímetro ---
            // Esta función recibe el valor de velocidad (espera un número)
       function updateSpeedometer(speedValue) {
        if (typeof speedValue !== 'number' || isNaN(speedValue)) {
            console.error("updateSpeedometer received a non-numeric value:", speedValue);
            speedValue = 0;
        }
        const clampedSpeed = Math.max(0, Math.min(maxSpeedometerValue, speedValue));
        
        // Ahora, 0 km/h -> 0° de rotación (aguja apuntando a la izquierda) y
        // 100 km/h -> 180° (aguja apuntando a la derecha)
        const angle = (clampedSpeed / maxSpeedometerValue) * angleRange;
        needle.setAttribute("transform", `rotate(${angle}, 100, 100)`);
        
        speedValueText.textContent = `${Math.round(clampedSpeed)} km/h`;
    }
    
    
            // --- Lógica de FETCH para obtener la velocidad del API ---
    
            // El endpoint es el mismo que el de gasolina
            // ¡ASEGÚRATE DE QUE ESTA URL APUNTE A TU API REAL!
            const apiEndpoint = 'http://localhost:3000/coordenadas'; // <-- ¡VERIFICA ESTA LÍNEA!
    
            async function fetchVelocidad() {
                try {
                    const response = await fetch(apiEndpoint);
    
                    if (!response.ok) {
                        console.error(`Error HTTP al obtener datos de velocidad del API: ${response.status} - ${response.statusText}`);
                        // Podrías mostrar "Error" en el texto del velocímetro aquí si lo deseas
                        return null; // Indica que hubo un error
                    }
    
                    const data = await response.json();
    
                // --- ¡CORRECCIÓN PRINCIPAL AQUÍ! ---
                // Convertir explícitamente el valor a número ANTES de validarlo.
                const velocidadValue = parseFloat(data.velocidad); // <-- Convertir a número
                // -----------------------------------
    
    
                // Verificar si el valor convertido es un número válido y no negativo
                if (typeof velocidadValue === 'number' && !isNaN(velocidadValue) && velocidadValue >= 0) {
                    console.log("Valor de velocidad obtenido y validado:", velocidadValue);
                    return velocidadValue; // Retorna el valor numérico validado
    
                } else if (data && Object.keys(data).length === 0) {
                     console.warn("API returned empty data object (table might be empty). Defaulting speed to 0.");
                     return 0; // Devolver 0 si no hay datos en la BD
                }
                else {
                    console.error("Formato de datos inválido del API o valor de 'velocidad' no es un número no negativo (después de parseFloat):", data, "Tipo:", typeof velocidadValue, "Es NaN:", isNaN(velocidadValue));
                    // Podrías mostrar "---" o "Error" en el velocímetro visualmente aquí
                    return null; // Indica que los datos no son usables
                }
    
            } catch (error) {
                // Captura errores de red, JSON parsing, etc.
                console.error("Error en la petición fetch para obtener la velocidad:", error);
                // Podrías mostrar "Error" en el texto del velocímetro aquí
                return null; // Indica que hubo un error
            }
        }
    
        // --- Lógica de Animación y Actualización Periódica ---
    
        // Estas variables controlan la animación de la aguja
        let currentSpeed = 0; // Velocidad actual que muestra la aguja (numérico)
        let targetSpeed = 0; // Velocidad objetivo obtenida del API (numérico)
    
        // Función para animar suavemente la aguja
         function animateSpeedometer() {
             // Calcula la diferencia entre el objetivo y el actual
             const diff = targetSpeed - currentSpeed;
    
             // Si la diferencia es muy pequeña, salta al objetivo y detiene la animación para este target
             if (Math.abs(diff) < 0.1) { // Umbral más pequeño para mayor precisión al final
                 currentSpeed = targetSpeed;
                 updateSpeedometer(currentSpeed);
                 return; // Detiene la animación hasta que targetSpeed cambie de nuevo
             }
    
             // Calcula un paso para mover currentSpeed hacia targetSpeed (interpolación)
             const step = diff * 0.1; // Ajusta este valor (ej. 0.05 a 0.2) para cambiar la velocidad de la animación
    
             // Actualiza currentSpeed
             currentSpeed += step;
    
             // Llama a la función de actualización visual del velocímetro con la velocidad de animación
             updateSpeedometer(currentSpeed);
    
             // Solicita el siguiente frame de animación
             requestAnimationFrame(animateSpeedometer);
         }
    
    
        // 1. Obtener el valor inicial de velocidad del API al cargar la página
        fetchVelocidad().then(speed => {
            if (speed !== null) {
                // Si se obtuvo un valor válido, establecerlo como el target inicial
                targetSpeed = speed;
                // Iniciar la animación para ir de 0 km/h al valor inicial del API
                animateSpeedometer();
                } else {
                 console.warn("Could not fetch initial speed. Displaying 0 km/h.");
                // Si falló el fetch inicial, nos aseguramos de que la aguja esté en 0
                updateSpeedometer(0);
                currentSpeed = 0;
                targetSpeed = 0; // Asegurar que el target también sea 0
                }
            });
    
    
            // 2. Configurar un intervalo para obtener el nuevo valor del API periódicamente
            // Ajusta el intervalo si es necesario, debe ser al menos tan frecuente como el sniffer
            const fetchInterval = setInterval(async () => {
                console.log("Fetching new speed...");
                const speed = await fetchVelocidad();
                if (speed !== null) {
                    // Si se obtiene un nuevo valor válido, actualizar el targetSpeed
                    targetSpeed = speed;
                    console.log("New target speed obtained from API:", targetSpeed);
                    // animateSpeedometer() ya se llama al cambiar targetSpeed si es necesario
                    animateSpeedometer(); // Iniciar/Continuar la animación hacia el nuevo target
                } else {
                    // Si el fetch periódico falla, targetSpeed no cambia,
                    // y la aguja permanece en la última posición válida.
                    console.warn("Failed to fetch new speed from API. Retaining last speed value.");
                }
            }, 5000); // Obtener datos cada 5 segundos (ajusta si es necesario)
    
    
            // --- Limpieza (Opcional pero recomendado) ---
            // Si el card (secondVariableCard) se va a eliminar del DOM, limpia los intervalos para evitar memory leaks.
            /*
            function cleanupSpeedometer() {
                clearInterval(fetchInterval);
                // Si usas requestAnimationFrame, podrías necesitar almacenar su ID para cancelarlo
                // cancelAnimationFrame(animationFrameId);
                console.log("Interval cleared for speedometer card.");
            }
            // Puedes añadir un listener si tienes un mecanismo para detectar la remoción del elemento
            // secondVariableCard.addEventListener('removedFromDOM', cleanupSpeedometer);
            */
    
        }); // Fin de DOMContentLoaded