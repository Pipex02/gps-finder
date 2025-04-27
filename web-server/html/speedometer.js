document.addEventListener('DOMContentLoaded', function() {
    // Seleccionar todas las tarjetas con clase 'variable-card'
    const variableElements = document.querySelectorAll('.variable-card');

    // Continuar si hay al menos dos tarjetas
    if (variableElements.length < 2) {
        // No se muestra ninguna advertencia
    }

    // Apuntar a la segunda tarjeta (índice 1)
    const secondVariableCard = variableElements[1];
    if (!secondVariableCard) {
        return;
    }

    const cardContent = secondVariableCard.querySelector('.card-content');
    if (!cardContent) {
        return;
    }

    // Limpiar el contenido existente
    cardContent.innerHTML = '';

    // --- Creación del SVG para el velocímetro ---
    const speedometerContainer = document.createElement('div');
    speedometerContainer.className = 'speedometer-container';

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "200");
    svg.setAttribute("height", "120");
    svg.setAttribute("viewBox", "0 0 200 120");

    // Arco de fondo gris claro
    const backgroundArc = document.createElementNS(svgNS, "path");
    backgroundArc.setAttribute("d", "M 20 100 A 80 80 0 0 1 180 100");
    backgroundArc.setAttribute("stroke", "#ffffff");
    backgroundArc.setAttribute("stroke-width", "8");
    backgroundArc.setAttribute("fill", "none");
    svg.appendChild(backgroundArc);

    // Zonas de color
    const redZone = document.createElementNS(svgNS, "path");
    redZone.setAttribute("d", "M 20 100 A 80 80 0 0 1 52.98 35.28");
    redZone.setAttribute("stroke", "#FF5252");
    redZone.setAttribute("stroke-width", "8");
    redZone.setAttribute("fill", "none");
    svg.appendChild(redZone);

    const yellowZone = document.createElementNS(svgNS, "path");
    yellowZone.setAttribute("d", "M 52.98 35.28 A 80 80 0 0 1 147.02 35.28");
    yellowZone.setAttribute("stroke", "#FFC107");
    yellowZone.setAttribute("stroke-width", "8");
    yellowZone.setAttribute("fill", "none");
    svg.appendChild(yellowZone);

    const greenZone = document.createElementNS(svgNS, "path");
    greenZone.setAttribute("d", "M 147.02 35.28 A 80 80 0 0 1 180 100");
    greenZone.setAttribute("stroke", "#4CAF50");
    greenZone.setAttribute("stroke-width", "8");
    greenZone.setAttribute("fill", "none");
    svg.appendChild(greenZone);

    // Ticks y Etiquetas
    const maxSpeedometerValue = 100;
    const angleRange = 180;

    for (let i = 0; i <= 10; i++) {
        const tickAngle = angleRange - (i / 10) * angleRange;
        const radians = tickAngle * Math.PI / 180;
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

    // Aguja del velocímetro
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

    // Texto para mostrar la velocidad actual
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

    // Añadir estilos CSS dinámicamente
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

    // Función para actualizar la apariencia visual del velocímetro
    function updateSpeedometer(speedValue) {
        if (typeof speedValue !== 'number' || isNaN(speedValue)) {
            speedValue = 0;
        }
        // Para la aguja, se limita a 100 (maxSpeedometerValue), pero el texto mostrará el valor real
        const clampedSpeed = Math.max(0, Math.min(maxSpeedometerValue, speedValue));
        const angle = (clampedSpeed / maxSpeedometerValue) * angleRange;
        needle.setAttribute("transform", `rotate(${angle}, 100, 100)`);
        speedValueText.textContent = `${Math.round(speedValue)} km/h`;
    }

    // Llamada a la API en el endpoint: '/api//coordenadas'
    const apiEndpoint = '/api//coordenadas';

    async function fetchVelocidad() {
        try {
            const response = await fetch(apiEndpoint);
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            const velocidadValue = parseFloat(data.velocidad);
            if (typeof velocidadValue === 'number' && !isNaN(velocidadValue) && velocidadValue >= 0) {
                return velocidadValue;
            } else if (data && Object.keys(data).length === 0) {
                return 0;
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    }

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

    fetchVelocidad().then(speed => {
        if (speed !== null) {
            targetSpeed = speed;
            animateSpeedometer();
        } else {
            updateSpeedometer(0);
            currentSpeed = 0;
            targetSpeed = 0;
        }
    });

    setInterval(async () => {
        const speed = await fetchVelocidad();
        if (speed !== null) {
            targetSpeed = speed;
            animateSpeedometer();
        }
    }, 5000);
});