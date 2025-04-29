document.addEventListener('DOMContentLoaded', function() {
    // Se asume que en la tarjeta correspondiente se ha usado id="variable-card"
    const cardContent = document.getElementById('gasolina-container');
    if (!cardContent) {
        return; // Salir si el contenedor no se encuentra
    }

    // Limpiar el contenido existente de la tarjeta
    cardContent.innerHTML = '';

    // --- Creación del contenedor para el progress-bar ---
    const progressContainer = document.createElement('div');
    progressContainer.className = 'circle-progress-container';

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    // Se fijan las dimensiones del SVG a 100px por 100px
    svg.setAttribute("width", "100");
    svg.setAttribute("height", "100");
    // El viewBox permite que se escale proporcionalmente
    svg.setAttribute("viewBox", "0 0 80 80");

    // --- Círculo de fondo ---
    const backgroundCircle = document.createElementNS(svgNS, "circle");
    backgroundCircle.setAttribute("cx", "40");
    backgroundCircle.setAttribute("cy", "40");
    backgroundCircle.setAttribute("r", "32");
    backgroundCircle.setAttribute("fill", "none");
    backgroundCircle.setAttribute("stroke", "#e0e0e0");
    backgroundCircle.setAttribute("stroke-width", "6");
    svg.appendChild(backgroundCircle);

    // --- Círculo de progreso ---
    const progressCircle = document.createElementNS(svgNS, "circle");
    progressCircle.setAttribute("cx", "40");
    progressCircle.setAttribute("cy", "40");
    progressCircle.setAttribute("r", "32");
    progressCircle.setAttribute("fill", "none");
    progressCircle.setAttribute("stroke", "#4CAF50");
    progressCircle.setAttribute("stroke-width", "6");
    progressCircle.setAttribute("stroke-linecap", "round");
    // Se rota 90 grados para empezar desde arriba
    progressCircle.setAttribute("transform", "rotate(-90 40 40)");
    const circumference = 2 * Math.PI * 32;
    progressCircle.setAttribute("stroke-dasharray", circumference);
    progressCircle.setAttribute("stroke-dashoffset", circumference);
    svg.appendChild(progressCircle);

    // --- Texto porcentual en el centro ---
    const percentText = document.createElement('div');
    percentText.className = 'progress-percent';
    percentText.innerText = '0%';

    progressContainer.appendChild(svg);
    progressContainer.appendChild(percentText);
    cardContent.appendChild(progressContainer);

    // --- Añadir estilos CSS dinámicamente (si no existen) ---
    if (!document.querySelector('style[data-circle-progress-styles]')) {
        const styles = document.createElement('style');
        styles.setAttribute('data-circle-progress-styles', '');
        styles.innerHTML = `
            /* Contenedor centrado dentro de la tarjeta sin desplazamientos extra */
            .circle-progress-container {
                position: relative;
                width: 100px;
                height: 100px;
                margin: 0 auto;
                top:-15px;
            }
            .circle-progress-container svg {
                display: block;
            }
            .progress-percent {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-family: 'Press Start 2P', cursive;
                font-size: 24px;
                font-weight: bold;
                color: #ffffff;
            }
        `;
        document.head.appendChild(styles);
    }

    // --- Función para actualizar la apariencia visual del círculo ---
    function updateProgress(percent) {
        if (typeof percent !== 'number' || isNaN(percent)) {
            percent = 0;
        }
        const clampedPercent = Math.max(0, Math.min(100, percent));
        const offset = circumference - (clampedPercent / 100) * circumference;
        progressCircle.setAttribute("stroke-dashoffset", offset);
        percentText.innerText = `${Math.round(clampedPercent)}%`;
        let color;
        if (clampedPercent < 30) {
            color = "#FF5252";
        } else if (clampedPercent < 70) {
            color = "#FFC107";
        } else {
            color = "#4CAF50";
        }
        progressCircle.setAttribute("stroke", color);
    }

    // --- Lógica para obtener el porcentaje de gasolina desde la API ---
    const apiEndpoint = '/api/coordenadas';
    async function fetchGasolinaLevel() {
        try {
            const response = await fetch(apiEndpoint);
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            const gasolinaValue = parseFloat(data.gasolina);
            if (typeof gasolinaValue === 'number' && !isNaN(gasolinaValue) && gasolinaValue >= 0) {
                return Math.max(0, Math.min(100, gasolinaValue));
            } else if (data && Object.keys(data).length === 0) {
                return 0;
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    }

    // --- Lógica de Animación y Actualización Periódica ---
    let currentPercent = 0;
    let targetPercent = 0;

    function animateProgress() {
        const diff = targetPercent - currentPercent;
        if (Math.abs(diff) < 0.1) {
            currentPercent = targetPercent;
            updateProgress(currentPercent);
            return;
        }
        const step = diff * 0.1;
        currentPercent += step;
        updateProgress(currentPercent);
        requestAnimationFrame(animateProgress);
    }

    // Obtener el valor inicial de gasolina al cargar la página
    fetchGasolinaLevel().then(level => {
        if (level !== null) {
            targetPercent = level;
            animateProgress();
        } else {
            updateProgress(0);
            currentPercent = 0;
            targetPercent = 0;
        }
    });

    // Actualizar periódicamente cada 5 segundos
    setInterval(async () => {
        const level = await fetchGasolinaLevel();
        if (level !== null) {
            targetPercent = level;
            animateProgress();
        }
    }, 5000);
});