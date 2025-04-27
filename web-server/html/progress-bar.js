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
        // Esto evita duplicar estilos si tienes varios scripts de gráficos
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
            // Asegurarse de que el valor sea un número antes de usarlo
            if (typeof percent !== 'number' || isNaN(percent)) {
                console.error("updateProgress received a non-numeric value:", percent);
                percent = 0; // Usar 0 si el valor no es válido
            }
    
            const clampedPercent = Math.max(0, Math.min(100, percent));
            const circumference = 2 * Math.PI * 54;
            // Calcular el offset para el porcentaje
            const offset = circumference - (clampedPercent / 100) * circumference;
            progressCircle.setAttribute("stroke-dashoffset", offset);
    
            // Actualizar el texto del porcentaje mostrado
            percentText.innerText = `${Math.round(clampedPercent)}%`;
    
            // Cambiar color basado en el porcentaje
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
    
        // --- Lógica de FETCH con CONVERSIÓN a Porcentaje ---
    
        // ¡IMPORTANTE! Define la capacidad máxima del tanque de gasolina.
        // DEBES CAMBIAR '100' por la capacidad real en la misma unidad que tu base de datos.
        // Por ejemplo, si tu DB almacena litros y el tanque es de 50 litros, pon 50.
        // Si tu DB almacena un valor directo de 0 a 100 que ya es el porcentaje, pon 100 aquí.
        const maxGasolinaCapacity = 100; // <-- ¡CONFIGURA ESTE VALOR!
    
        // API Endpoint - Debe ser la URL completa de tu API
        const apiEndpoint = 'http://localhost:3000/coordenadas'; // <-- ¡VERIFICA ESTA LÍNEA!
    
        async function fetchGasolinaLevel() {
            try {
                const response = await fetch(apiEndpoint);
    
                if (!response.ok) {
                    console.error(`Error HTTP al obtener datos de gasolina del API: ${response.status} - ${response.statusText}`);
                    // Podrías mostrar un indicador visual de error
                    return null; // Indica que hubo un error
                }
    
                const data = await response.json();
    
                // --- ¡CORRECCIÓN PRINCIPAL AQUÍ! ---
                // Convertir explícitamente el valor a número ANTES de validarlo.
                const gasolinaValue = parseFloat(data.gasolina); // <-- Convertir a número
                // -----------------------------------
    
                // Verificar si el valor convertido es un número válido y no negativo
                if (typeof gasolinaValue === 'number' && !isNaN(gasolinaValue) && gasolinaValue >= 0) {
                    console.log("Valor absoluto de gasolina obtenido y validado:", gasolinaValue);
    
                    // --- Lógica de Conversión a Porcentaje ---
                    if (maxGasolinaCapacity <= 0) {
                        console.error("Error: La capacidad máxima de gasolina (maxGasolinaCapacity) debe ser un número positivo para calcular el porcentaje.");
                        // Puedes decidir qué hacer si la capacidad es inválida (ej. mostrar 0% o error)
                        return null; // No se puede calcular sin una capacidad máxima válida
                    }
                    // Calcular el porcentaje: (valor_actual / valor_maximo) * 100
                    let percentage = (gasolinaValue / maxGasolinaCapacity) * 100;
    
                    // Asegurarse de que el porcentaje resultante esté entre 0 y 100
                    percentage = Math.max(0, Math.min(100, percentage));
                    // --- Fin de Lógica de Conversión ---
    
                    console.log("Porcentaje de gasolina convertido:", percentage);
                    return percentage; // Retornar el porcentaje calculado (0-100)
    
                } else if (data && Object.keys(data).length === 0) {
                     console.warn("API returned empty data object (table might be empty). Defaulting to 0%.");
                     return 0; // Devolver 0% si no hay datos en la BD
                }
                else {
                    console.error("Formato de datos inválido del API o valor de 'gasolina' no es un número no negativo (después de parseFloat):", data, "Tipo:", typeof gasolinaValue, "Es NaN:", isNaN(gasolinaValue));
                    // Podrías mostrar "---" o "Error" en el texto del círculo visualmente aquí
                    return null; // Indica que los datos no son usables
                }
    
            } catch (error) {
                // Captura errores de red, JSON parsing, etc.
                console.error("Error en la petición fetch para obtener la gasolina:", error);
                // Podrías mostrar "Error" en el texto del círculo visualmente aquí
                return null; // Indica que hubo un error
            }
        }
    
        // --- Lógica de Animación y Actualización Periódica ---
    
        let currentPercent = 0; // Porcentaje actual que muestra el círculo (numérico)
        let targetPercent = 0; // Porcentaje objetivo obtenido del API (numérico)
    
        // Función para animar suavemente el círculo de progreso
        function animateProgress() {
             const diff = targetPercent - currentPercent;
    
             // Si la diferencia es muy pequeña, salta al objetivo y detiene la animación para este target
             if (Math.abs(diff) < 0.1) { // Usamos un umbral pequeño
                 currentPercent = targetPercent;
                 updateProgress(currentPercent);
                 return; // Detiene la animación hasta que targetPercent cambie de nuevo
             }
    
             // Calcula un paso para mover currentPercent hacia targetPercent
             const step = diff * 0.1; // Ajusta este valor (ej. 0.05 a 0.2) para cambiar la velocidad de la animación
    
             // Actualiza currentPercent
             currentPercent += step;
    
             // Llama a la función de actualización visual del círculo con el porcentaje de animación
             updateProgress(currentPercent);
    
             // Solicita el siguiente frame de animación
             requestAnimationFrame(animateProgress);
         }
    
    
        // 1. Obtener el valor inicial de gasolina del API al cargar la página
        fetchGasolinaLevel().then(level => {
            if (level !== null) {
                // Si se obtuvo un valor válido, establecerlo como el target inicial
                targetPercent = level;
                // Iniciar la animación para ir de 0% al valor inicial del API
                animateProgress();
                } else {
                 console.warn("Could not fetch initial gasoline level. Displaying 0%.");
                // Si falló el fetch inicial, nos aseguramos de que el círculo esté en 0%
                updateProgress(0);
                currentPercent = 0;
                targetPercent = 0; // Asegurar que el target también sea 0
                }
            });
    
    
        // 2. Configurar un intervalo para obtener el nuevo valor del API periódicamente
        // Ajusta el intervalo si es necesario, debe ser al menos tan frecuente como el sniffer (5 segundos)
        const fetchInterval = setInterval(async () => {
            console.log("Fetching new gasoline level...");
            const level = await fetchGasolinaLevel();
            if (level !== null) {
                // Si se obtiene un nuevo valor válido, actualizar el targetPercent
                targetPercent = level;
                console.log("New target percentage obtained from API:", targetPercent);
                // animateProgress() ya se llama al cambiar targetPercent si es necesario
                animateProgress(); // Iniciar/Continuar la animación hacia el nuevo target
            } else {
                // Si el fetch periódico falla, targetPercent no cambia,
                // y el círculo permanece en la última posición válida.
                console.warn("Failed to fetch new gasoline level from API. Retaining last percentage value.");
            }
        }, 5000); // Obtener datos cada 5 segundos (ajusta si es necesario)
    
    
        // --- Limpieza (Opcional pero recomendado) ---
        // Si el card se va a eliminar del DOM, limpia los intervalos para evitar memory leaks.
        /*
        function cleanupGasolineMeter() { // Cambiado nombre para distinguir
            clearInterval(fetchInterval);
            // Si usas requestAnimationFrame, podrías necesitar almacenar su ID para cancelarlo
            // cancelAnimationFrame(animationFrameId);
            console.log("Interval cleared for gasoline progress card.");
        }
        // Puedes añadir un listener si tienes un mecanismo para detectar la remoción del elemento
        // variableElement.closest('.card').addEventListener('removedFromDOM', cleanupGasolineMeter); // Evento ficticio
        */
    
    }); // Fin de DOMContentLoaded