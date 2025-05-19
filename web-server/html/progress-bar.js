document.addEventListener('DOMContentLoaded', function() {
    // Intenta encontrar el elemento por su ID 'gasolina'
    const variableElement = document.getElementById('gasolina');
    if (!variableElement) {
        return; // Salir si el elemento no se encuentra
    }

    // Encuentra el contenedor padre con clase 'card-content'
    const cardContent = variableElement.closest('.card-content');
    if (!cardContent) {
        return; // Salir si el contenedor no se encuentra
    }

    // Limpiar el contenido existente
    cardContent.innerHTML = '';

    // --- Creación del SVG para el círculo de progreso ---
    const progressContainer = document.createElement('div');
    progressContainer.className = 'circle-progress-container';

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "120");
    svg.setAttribute("height", "120");
    svg.setAttribute("viewBox", "0 0 120 120");

    const backgroundCircle = document.createElementNS(svgNS, "circle");
    backgroundCircle.setAttribute("cx", "60");
    backgroundCircle.setAttribute("cy", "60");
    backgroundCircle.setAttribute("r", "54");
    backgroundCircle.setAttribute("fill", "none");
    backgroundCircle.setAttribute("stroke", "#e0e0e0");
    backgroundCircle.setAttribute("stroke-width", "12");
    svg.appendChild(backgroundCircle);

    const progressCircle = document.createElementNS(svgNS, "circle");
    progressCircle.setAttribute("cx", "60");
    progressCircle.setAttribute("cy", "60");
    progressCircle.setAttribute("r", "54");
    progressCircle.setAttribute("fill", "none");
    progressCircle.setAttribute("stroke", "#4CAF50");
    progressCircle.setAttribute("stroke-width", "12");
    progressCircle.setAttribute("stroke-linecap", "round");
    progressCircle.setAttribute("transform", "rotate(-90 60 60)");
    const circumference = 2 * Math.PI * 54;
    progressCircle.setAttribute("stroke-dasharray", circumference);
    progressCircle.setAttribute("stroke-dashoffset", circumference);
    svg.appendChild(progressCircle);

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
            .circle-progress-container {
                position: relative;
                width: 120px;
                height: 120px;
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
                font-size: 30px;
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

    // --- Lógica de FETCH con valor en porcentaje directo ---
    // Se tiene en cuenta el ID del vehículo seleccionado.
    const apiBase = '/api/coordenadas';
    async function fetchGasolinaLevel() {
        try {
            const vehicleSelect = document.getElementById('vehicleSelect');
            const vehicleID = vehicleSelect ? vehicleSelect.value : '';
            // Construye la URL según si hay un VehicleID o no.
            const url = vehicleID ? `${apiBase}?VehicleID=${vehicleID}` : apiBase;
            const response = await fetch(url);
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            const gasolinaValue = parseFloat(data.gasolina);
            if (typeof gasolinaValue === 'number' && !isNaN(gasolinaValue) && gasolinaValue >= 0) {
                const percentage = Math.max(0, Math.min(100, gasolinaValue));
                return percentage;
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

    // Función para obtener y actualizar el valor de gasolina, sincronizada con el vehículo seleccionado
    async function updateGasolina() {
        const level = await fetchGasolinaLevel();
        if (level !== null) {
            targetPercent = level;
            animateProgress();
        }
    }

    // 1. Obtener el valor inicial de gasolina al cargar la página
    updateGasolina();

    // 2. Configurar un intervalo para actualizar el valor cada 5 segundos
    setInterval(updateGasolina, 5000);

    // 3. Actualizar el progreso cuando se cambie el vehículo seleccionado
    const vehicleSelect = document.getElementById('vehicleSelect');
    if (vehicleSelect) {
        vehicleSelect.addEventListener('change', () => {
            // Reiniciamos la animación al cambiar de vehículo
            currentPercent = 0;
            updateGasolina();
        });
    }
});