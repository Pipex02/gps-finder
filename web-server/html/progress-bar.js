document.addEventListener('DOMContentLoaded', function() {
    // Intenta encontrar el elemento por su ID 'gasolina'
    const variableElement = document.getElementById('gasolina');
    if (!variableElement) {
        console.warn("Element with ID 'gasolina' not found. The gasoline progress script will not run.");
        return; // Salir si el elemento no se encuentra
    }

    // Encuentra el contenedor padre con clase 'card-content'
    const cardContent = variableElement.closest('.card-content');
    if (!cardContent) {
        console.warn("Parent element with class 'card-content' not found for #gasolina. The gasoline progress script will not run.");
        return; // Salir si el contenedor no se encuentra
    }

    // Limpiar el contenido existente (el texto "Próximamente")
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
    // Color inicial (puede cambiar según el porcentaje en updateProgress)
    progressCircle.setAttribute("stroke", "#4CAF50"); // Color verde inicial
    progressCircle.setAttribute("stroke-width", "12");
    progressCircle.setAttribute("stroke-linecap", "round");
    progressCircle.setAttribute("transform", "rotate(-90 60 60)"); // Rotar para que empiece arriba
    const circumference = 2 * Math.PI * 54; // Circunferencia para el dashoffset
    progressCircle.setAttribute("stroke-dasharray", circumference);
    progressCircle.setAttribute("stroke-dashoffset", circumference); // Inicialmente oculto (0%)
    svg.appendChild(progressCircle);

    const percentText = document.createElement('div');
    percentText.className = 'progress-percent';
    percentText.innerText = '0%'; // Texto inicial

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
    // Esta función recibe el porcentaje (espera un número de 0 a 100)
    function updateProgress(percent) {
        if (typeof percent !== 'number' || isNaN(percent)) {
            console.error("updateProgress received a non-numeric value:", percent);
            percent = 0; // Usar 0 si el valor no es válido
        }
        const clampedPercent = Math.max(0, Math.min(100, percent));
        const circumference = 2 * Math.PI * 54;
        const offset = circumference - (clampedPercent / 100) * circumference;
        progressCircle.setAttribute("stroke-dashoffset", offset);
        percentText.innerText = `${Math.round(clampedPercent)}%`;
        let color;
        if (clampedPercent < 30) {
            color = "#FF5252"; // Rojo para nivel bajo
        } else if (clampedPercent < 70) {
            color = "#FFC107"; // Amarillo para nivel medio
        } else {
            color = "#4CAF50"; // Verde para nivel alto
        }
        progressCircle.setAttribute("stroke", color);
    }

    // --- Lógica de FETCH con valor en porcentaje directo ---
    // API Endpoint - Debe ser la URL completa de tu API
    const apiEndpoint = '/api/coordenadas';

    async function fetchGasolinaLevel() {
        try {
            const response = await fetch(apiEndpoint);
            if (!response.ok) {
                console.error(`Error HTTP al obtener datos de gasolina del API: ${response.status} - ${response.statusText}`);
                return null;
            }
            const data = await response.json();
            // Asumimos que data.gasolina ya es el porcentaje (0-100)
            const gasolinaValue = parseFloat(data.gasolina);
            if (typeof gasolinaValue === 'number' && !isNaN(gasolinaValue) && gasolinaValue >= 0) {
                console.log("Valor de gasolina obtenido y validado:", gasolinaValue);
                // Aseguramos que el porcentaje esté entre 0 y 100:
                const percentage = Math.max(0, Math.min(100, gasolinaValue));
                console.log("Porcentaje de gasolina:", percentage);
                return percentage;
            } else if (data && Object.keys(data).length === 0) {
                console.warn("API returned empty data object (table might be empty). Defaulting to 0%.");
                return 0;
            } else {
                console.error("Formato de datos inválido del API o valor de 'gasolina' no es un número no negativo:", data);
                return null;
            }
        } catch (error) {
            console.error("Error en la petición fetch para obtener la gasolina:", error);
            return null;
        }
    }

    // --- Lógica de Animación y Actualización Periódica ---
    let currentPercent = 0; // Porcentaje actual que muestra el círculo (numérico)
    let targetPercent = 0; // Porcentaje objetivo obtenido del API (numérico)

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

    // 1. Obtener el valor inicial de gasolina del API al cargar la página
    fetchGasolinaLevel().then(level => {
        if (level !== null) {
            targetPercent = level;
            animateProgress();
        } else {
            console.warn("Could not fetch initial gasoline level. Displaying 0%.");
            updateProgress(0);
            currentPercent = 0;
            targetPercent = 0;
        }
    });

    // 2. Configurar un intervalo para obtener el nuevo valor del API periódicamente
    const fetchInterval = setInterval(async () => {
        console.log("Fetching new gasoline level...");
        const level = await fetchGasolinaLevel();
        if (level !== null) {
            targetPercent = level;
            console.log("New target percentage obtained from API:", targetPercent);
            animateProgress();
        } else {
            console.warn("Failed to fetch new gasoline level from API. Retaining last percentage value.");
        }
    }, 5000);

    // --- Limpieza (Opcional) ---
    // Si el card se va a eliminar del DOM, limpiar intervalos para evitar memory leaks.
});