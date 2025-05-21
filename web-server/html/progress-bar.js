// Function to create and update a progress bar component
function createProgressBar(containerElement, initialPercent = 0) {
    // Clear the container
    containerElement.innerHTML = '';

    // --- Creation of the SVG for the progress circle ---
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
    containerElement.appendChild(progressContainer);

    // --- Add CSS styles dynamically (if they don't exist) ---
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

    let currentPercent = 0;
    let targetPercent = initialPercent;

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

    // --- Function to update the visual appearance of the circle ---
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

    // Initial animation
    animateProgress();

    // Return an update function
    return {
        update: function(percent) {
            targetPercent = percent;
            animateProgress();
        }
    };
}
