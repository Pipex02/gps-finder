document.addEventListener('DOMContentLoaded', function() {
    // Seleccionar todas las tarjetas con clase 'variable-card'
    const variableElements = document.querySelectorAll('.variable-card');

    // Verificar que haya al menos dos tarjetas
    if (variableElements.length < 2) {
         console.warn("Less than two '.variable-card' elements found. Speedometer script may not initialize correctly.");
         // Continuamos, pero es posible que secondVariableCard sea undefined
    }

    // Apuntar a la segunda tarjeta (índice 1) - Asegúrate de que sea la correcta para tu HTML.
    // Tu HTML original tiene Gasolina (índice 0) y Velocidad (índice 1). Esto debería ser correcto.
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
    // Arco Rojo (0-30%) - Angulo 0 a 54 grados (aproximado)
    const redZone = document.createElementNS(svgNS, "path");
    redZone.setAttribute("d", "M 20 100 A 80 80 0 0 1 52.98 35.28"); 
    redZone.setAttribute("stroke", "#FF5252"); // Rojo
    redZone.setAttribute("stroke-width", "8");
    redZone.setAttribute("fill", "none");
    svg.appendChild(redZone);

    // Arco Amarillo (30-70%) - Angulo 54 a 126 grados (aproximado)
    const yellowZone = document.createElementNS(svgNS, "path");
    yellowZone.setAttribute("d", "M 52.98 35.28 A 80 80 0 0 1 147.02 35.28"); 
    yellowZone.setAttribute("stroke", "#FFC107"); // Amarillo
    yellowZone.setAttribute("stroke-width", "8");
    yellowZone.setAttribute("fill", "none");
    svg.appendChild(yellowZone);

    // Arco Verde (70-100%) - Angulo 126 a 180 grados (aproximado)
    const greenZone = document.createElementNS(svgNS, "path");
    greenZone.setAttribute("d", "M 147.02 35.28 A 80 80 0 0 1 180 100"); 
    greenZone.setAttribute("stroke", "#4CAF50"); // Verde
    greenZone.setAttribute("stroke-width", "8");
    greenZone.setAttribute("fill", "none");
    svg.appendChild(greenZone);

    // Ticks y Etiquetas (0, 10, 20 ... 100)
    const maxSpeedometerValue = 100; // Valor máximo que muestra el velocímetro
    const angleRange = 180; // El rango angular del arco (180 grados)

    for (let i = 0; i <= 10; i++) {
        // Calcula el ángulo para cada tick (0 a 180 grados, de derecha a izquierda)
        const tickAngle = angleRange - (i / 10) * angleRange;
        const radians = tickAngle * Math.PI / 180;

        // Calcula las coordenadas para los ticks (líneas cortas)
        const innerRadius = 75;
        const outerRadius = 85;
        const x1 = 100 + innerRadius * Math.cos(radians);
        const y1 = 100 - innerRadius * Math.sin(radians);
        const x2 = 100 + outerRadius * Math.cos(radians);
        const y2 = 100 - outerRadius * Math.sin(radians);

        const tick = document.createElementNS(svgNS, "line");
        tick.setAttribute("x1", x1);
        tick.setAttribute("y1", y1);
        tick.setAttribute("x2", x2);
        tick.setAttribute("y2", y2);
        tick.setAttribute("stroke", "#ffffff");
        tick.setAttribute("stroke-width", "2");
        svg.appendChild(tick);

        // Añadir etiquetas numéricas (0, 20, 40, etc.)
        if (i % 2 === 0) {
            const text = document.createElementNS(svgNS, "text");
            const labelRadius = 65;
            const labelX = 100 + labelRadius * Math.cos(radians);
            const labelY = 100 - labelRadius * Math.sin(radians) - 2;
            text.setAttribute("x", labelX);
            text.setAttribute("y", labelY);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("font-size", "10");
            text.classList.add("speedometer-tick-label");
            text.textContent = i * 10;
            svg.appendChild(text);
        }
    }

    // --- Aguja del velocímetro ---
    const needle = document.createElementNS(svgNS, "line");
    needle.setAttribute("x1", "100");
    needle.setAttribute("y1", "100");
    needle.setAttribute("x2", "20");
    needle.setAttribute("y2", "100");
    needle.setAttribute("stroke", "#D32F2F");
    needle.setAttribute("stroke-width", "2");
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
    speedValueText.setAttribute("y", "80");
    speedValueText.setAttribute("text-anchor", "middle");
    speedValueText.setAttribute("font-size", "16");
    speedValueText.setAttribute("font-weight", "bold");
    speedValueText.classList.add("speedometer-value-text");
    speedValueText.textContent = "0 km/h";
    svg.appendChild(speedValueText);

    speedometerContainer.appendChild(svg);
    cardContent.appendChild(speedometerContainer);

    // --- Añadir estilos CSS dinámicamente ---
    if (!document.querySelector('style[data-speedometer-styles]')) {
        const styles = document.createElement('style');
        styles.setAttribute('data-speedometer-styles', '');
        styles.innerHTML = `
            .speedometer-container {
                position: relative;
                width: 200px;
                height: 120px;
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
    function updateSpeedometer(speedValue) {
        if (typeof speedValue !== 'number' || isNaN(speedValue)) {
            console.error("updateSpeedometer received a non-numeric value:", speedValue);
            speedValue = 0;
        }
        const clampedSpeed = Math.max(0, Math.min(maxSpeedometerValue, speedValue));
        const angle = (clampedSpeed / maxSpeedometerValue) * angleRange;
        needle.setAttribute("transform", `rotate(${angle}, 100, 100)`);
        speedValueText.textContent = `${Math.round(clampedSpeed)} km/h`;
    }

    // --- Lógica de FETCH para obtener la velocidad del API ---
    // Se actualiza el endpoint a: '/api//coordenadas'
    const apiEndpoint = '/api//coordenadas';

    async function fetchVelocidad() {
        try {
            const response = await fetch(apiEndpoint);
            if (!response.ok) {
                console.error(`Error HTTP al obtener datos de velocidad del API: ${response.status} - ${response.statusText}`);
                return null;
            }
            const data = await response.json();
            const velocidadValue = parseFloat(data.velocidad);
            if (typeof velocidadValue === 'number' && !isNaN(velocidadValue) && velocidadValue >= 0) {
                console.log("Valor de velocidad obtenido y validado:", velocidadValue);
                return velocidadValue;
            } else if (data && Object.keys(data).length === 0) {
                console.warn("API returned empty data object (table might be empty). Defaulting speed to 0.");
                return 0;
            } else {
                console.error("Formato de datos inválido del API o valor de 'velocidad' no es un número no negativo (después de parseFloat):", data, "Tipo:", typeof velocidadValue, "Es NaN:", isNaN(velocidadValue));
                return null;
            }
        } catch (error) {
            console.error("Error en la petición fetch para obtener la velocidad:", error);
            return null;
        }
    }

    // --- Lógica de Animación y Actualización Periódica ---
    let currentSpeed = 0;
    let targetSpeed = 0;

    function animateSpeedometer() {
        const diff = targetSpeed - currentSpeed;
        if (Math.abs(diff) < 0.1) {
            currentSpeed = targetSpeed;
            updateSpeedometer(currentSpeed);
            return;
        }
        const step = diff * 0.1;
        currentSpeed += step;
        updateSpeedometer(currentSpeed);
        requestAnimationFrame(animateSpeedometer);
    }

    // 1. Obtener el valor inicial de velocidad del API al cargar la página
    fetchVelocidad().then(speed => {
        if (speed !== null) {
            targetSpeed = speed;
            animateSpeedometer();
        } else {
            console.warn("Could not fetch initial speed. Displaying 0 km/h.");
            updateSpeedometer(0);
            currentSpeed = 0;
            targetSpeed = 0;
        }
    });

    // 2. Configurar un intervalo para obtener el nuevo valor del API periódicamente
    const fetchInterval = setInterval(async () => {
        console.log("Fetching new speed...");
        const speed = await fetchVelocidad();
        if (speed !== null) {
            targetSpeed = speed;
            console.log("New target speed obtained from API:", targetSpeed);
            animateSpeedometer();
        } else {
            console.warn("Failed to fetch new speed from API. Retaining last speed value.");
        }
    }, 5000);
});