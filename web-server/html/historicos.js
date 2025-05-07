// Generar estrellas y meteoros
function generarElementosDecorativos() {
  for (let i = 0; i < 100; i++) {
    const star = document.createElement("div");
    star.className = "star";
    star.style.top = `${Math.random() * 100}%`;
    star.style.left = `${Math.random() * 100}%`;
    document.body.appendChild(star);
  }
  for (let i = 0; i < 30; i++) {
    const meteor = document.createElement("div");
    meteor.className = "meteor";
    meteor.style.top = `${Math.random() * 100}%`;
    meteor.style.left = `${Math.random() * 100}%`;
    meteor.style.animationDelay = `${Math.random() * 5}s`;
    document.body.appendChild(meteor);
  }
}

// Mapa y variables globales relacionadas con el mapa y la selección
let map;
let locationCircle; // Círculo para el radio de búsqueda por proximidad
let startMarker, endMarker; // Marcadores para inicio y fin de la ruta principal
let polyline; // Polilínea para la ruta principal
let segmentLayers = []; // Capas para los segmentos de ruta (de la búsqueda por proximidad)

let clickedLat = null; // Latitud del punto clickeado en el mapa
let clickedLng = null; // Longitud del punto clickeado en el mapa
let clickedMarker = null; // Marcador para el punto clickeado en el mapa

// Elementos del DOM
const startDateTime = document.getElementById("startDateTime");
const endDateTime = document.getElementById("endDateTime");
const consultButton = document.getElementById("consult-button"); // Botón "Consultar Ubicación Específica"
const radiusInput = document.getElementById("radius-input");
const segmentSelect = document.getElementById("segment-select");
const locationFilterDiv = document.getElementById("location-filter");

// Configuración inicial de fechas
const minDate = new Date("2025-03-25T00:00:00");
const today = new Date();
today.setHours(0, 0, 0, 0);
const endOfDay = new Date();
endOfDay.setHours(23, 59, 0, 0);

const toLocalISOString = (date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

startDateTime.min = toLocalISOString(minDate);
startDateTime.max = toLocalISOString(today);
startDateTime.value = toLocalISOString(today);
endDateTime.min = startDateTime.value;
endDateTime.max = toLocalISOString(endOfDay);
endDateTime.value = toLocalISOString(endOfDay);

startDateTime.addEventListener("change", () => {
  const startValue = new Date(startDateTime.value);
  endDateTime.min = toLocalISOString(startValue);
  if (new Date(endDateTime.value) <= startValue) {
    let adjustedEnd = new Date(startValue);
    adjustedEnd.setMinutes(adjustedEnd.getMinutes() + 1);
    endDateTime.value = toLocalISOString(adjustedEnd);
  }
  actualizarRestricciones();
});

endDateTime.addEventListener("change", () => {
  const startValue = new Date(startDateTime.value);
  const endValue = new Date(endDateTime.value);
  if (endValue <= startValue) {
    let adjustedEnd = new Date(startValue);
    adjustedEnd.setMinutes(adjustedEnd.getMinutes() + 1);
    endDateTime.value = toLocalISOString(adjustedEnd);
  }
  actualizarRestricciones();
});

// Funciones de control del botón "Consultar Ubicación Específica"
const inhabilitarBotonConsultarEspecifica = () => {
    if (consultButton) consultButton.disabled = true;
};
const habilitarBotonConsultarEspecifica = () => {
    if (consultButton) consultButton.disabled = false;
};

// Actualizar restricciones y estado de botones
function actualizarRestricciones() {
  const startValue = startDateTime.value;
  if (startValue) {
    endDateTime.min = startValue;
    if (endDateTime.value && endDateTime.value < startValue) {
      endDateTime.value = startValue;
    }
  }
  inhabilitarBotonConsultarEspecifica(); // Deshabilitar al cambiar fechas
}

// Consultar la API de históricos (ruta principal)
function consultar() {
  if (locationFilterDiv) locationFilterDiv.style.display = "none"; // Ocultar inicialmente

  const startInput = startDateTime.value;
  const endInput = endDateTime.value;

  if (!startInput || !endInput) {
    alert("Selecciona ambas fechas y horas.");
    return;
  }

  const startDate = new Date(startInput);
  const endDate = new Date(endInput);
  if (endDate <= startDate) {
    alert("La fecha y hora de fin deben ser posteriores a la de inicio.");
    return;
  }

  const startFormatted = `${startInput.replace("T", " ")}:00`;
  const endFormatted = `${endInput.replace("T", " ")}:00`;

  // Limpiar estado de selección por click y resultados anteriores de proximidad
  if (clickedMarker) {
    map.removeLayer(clickedMarker);
    clickedMarker = null;
  }
  clickedLat = null;
  clickedLng = null;

  if (locationCircle) {
    map.removeLayer(locationCircle);
    locationCircle = null;
  }
  segmentLayers.forEach((layer) => map.removeLayer(layer));
  segmentLayers = [];
  if (segmentSelect) {
    segmentSelect.innerHTML = '<option value="">Seleccione una ruta</option>';
    segmentSelect.disabled = true;
  }
  if (radiusInput) {
    radiusInput.value = "";
  }
  inhabilitarBotonConsultarEspecifica();


  fetch(`https://geofind-fe.ddns.net/api/historicos?inicio=${encodeURIComponent(startFormatted)}&fin=${encodeURIComponent(endFormatted)}`)
    .then((response) => {
      if (!response.ok) throw new Error("Error en la respuesta de la API");
      return response.json();
    })
    .then((data) => {
      if (startMarker) map.removeLayer(startMarker);
      if (endMarker) map.removeLayer(endMarker);
      startMarker = null;
      endMarker = null;

      if (!data || data.length === 0) {
        alert("No hay datos en este rango de tiempo.");
        if (polyline) polyline.setLatLngs([]);
        return;
      }

      const route = data.map((coord) => [parseFloat(coord.latitud), parseFloat(coord.longitud)]);
      polyline.setLatLngs(route);
      if (!map.hasLayer(polyline)) polyline.addTo(map);

      if (route.length > 0) {
        startMarker = L.marker(route[0], {
          icon: L.divIcon({
            className: "custom-marker",
            html: '<div style="color: black; font-weight: bold; background: #28A745; padding: 8px; border-radius: 50%; text-align: center;">A</div>',
            iconSize: [35, 35],
          }),
        })
          .bindPopup(`Inicio: ${data[0].timestamp}`)
          .addTo(map);

        if (route.length > 1) {
            endMarker = L.marker(route[route.length - 1], {
            icon: L.divIcon({
                className: "custom-marker",
                html: '<div style="color: white; font-weight: bold; background: #DC3545; padding: 8px; border-radius: 50%; text-align: center;">B</div>',
                iconSize: [35, 35],
            }),
            })
            .bindPopup(`Fin: ${data[data.length - 1].timestamp}`)
            .addTo(map);
        }
      }

      map.fitBounds(polyline.getBounds());
      if (locationFilterDiv) locationFilterDiv.style.display = "block";
    })
    .catch((error) => {
      console.error("Error al obtener datos históricos:", error);
      alert("Error al consultar la API. Intenta de nuevo.");
      if (polyline) polyline.setLatLngs([]);
      if (startMarker) map.removeLayer(startMarker);
      if (endMarker) map.removeLayer(endMarker);
      startMarker = null;
      endMarker = null;
    });
}

async function getConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) {
        console.warn(`Error al obtener la configuración: ${response.statusText}`);
        return {}; // Devuelve un objeto vacío o configuración por defecto si falla
    }
    return await response.json();
  } catch (error) {
    console.warn("Excepción al obtener la configuración:", error);
    return {}; // Devuelve un objeto vacío en caso de excepción de red, etc.
  }
}


// Consultar ubicaciones dentro del radio usando coordenadas del click
async function consultarUbicacionEspecifica() {
  if (clickedLat === null || clickedLng === null) {
    alert("Por favor, seleccione una ubicación en el mapa haciendo clic.");
    return;
  }

  const radiusValue = radiusInput.value;
  if (!radiusValue || isNaN(parseFloat(radiusValue)) || parseFloat(radiusValue) < 10 || parseFloat(radiusValue) > 5000) {
    alert("Por favor, ingrese un radio válido entre 10 y 5000 metros.");
    if (radiusInput) radiusInput.focus();
    return;
  }
  const radius = parseFloat(radiusValue);

  const startInput = startDateTime.value;
  const endInput = endDateTime.value;

  if (!startInput || !endInput) {
    alert("Selecciona ambas fechas y horas para la consulta por proximidad.");
    return;
  }

  const startFormatted = `${startInput.replace("T", " ")}:00`;
  const endFormatted = `${endInput.replace("T", " ")}:00`;

  if (locationCircle) {
    map.removeLayer(locationCircle);
    locationCircle = null;
  }

  fetch(`https://geofind-fe.ddns.net/api/lugar?latitud=${clickedLat}&longitud=${clickedLng}&radio=${radius}&inicio=${encodeURIComponent(startFormatted)}&fin=${encodeURIComponent(endFormatted)}`)
    .then((response) => {
      if (!response.ok) {
        response.json().then(err => {
            alert(`Error en la API de proximidad: ${err.message || response.statusText}`);
        }).catch(() => {
            alert(`Error en la API de proximidad: ${response.statusText}`);
        });
        throw new Error("Error en API de proximidad");
      }
      return response.json();
    })
    .then((data) => {
      if (!data || data.length === 0) {
        alert("No hay datos en este rango de tiempo dentro del radio seleccionado para la ubicación clickeada.");
        mostrarSegmentosRuta([]); // Limpia segmentos
        return;
      }

      locationCircle = L.circle([clickedLat, clickedLng], {
        color: "#FFD700", 
        weight: 2,
        fillColor: "#FFD700",
        fillOpacity: 0.2,
        radius: radius,
      }).addTo(map);

      mostrarSegmentosRuta(data);
    })
    .catch((error) => {
      console.error("Error al obtener datos de ubicación específica:", error.message);
      // El alert ya se maneja en la parte de !response.ok
    });
}

// Segmentación de rutas por tiempo
function mostrarSegmentosRuta(data, defaultColor = "#32CD32") {
  segmentLayers.forEach((layer) => map.removeLayer(layer));
  segmentLayers = [];

  if (segmentSelect) {
    segmentSelect.innerHTML = '<option value="">Seleccione una ruta</option>';
  }

  if (!data || data.length === 0) {
    if (segmentSelect) segmentSelect.disabled = true;
    return;
  }

  let currentSegmentPoints = [];
  let currentSegmentTimestamps = [];
  const maxTimeDiff = 15 * 60 * 1000; 

  for (let i = 0; i < data.length; i++) {
    const coord = data[i];
    const latLng = [parseFloat(coord.latitud), parseFloat(coord.longitud)];
    const timestamp = coord.timestamp;

    if (i === 0) {
      currentSegmentPoints.push(latLng);
      currentSegmentTimestamps.push(timestamp);
    } else {
      const prevTime = new Date(data[i - 1].timestamp);
      const currTime = new Date(timestamp);
      const timeDiff = currTime - prevTime;

      if (timeDiff > maxTimeDiff) {
        if (currentSegmentPoints.length > 1) {
            agregarSegmento(currentSegmentPoints, currentSegmentTimestamps, defaultColor);
        }
        currentSegmentPoints = [latLng]; 
        currentSegmentTimestamps = [timestamp];
      } else {
        currentSegmentPoints.push(latLng);
        currentSegmentTimestamps.push(timestamp);
      }
    }
  }

  if (currentSegmentPoints.length > 1) {
    agregarSegmento(currentSegmentPoints, currentSegmentTimestamps, defaultColor);
  }

  if (segmentSelect) {
    if (segmentLayers.length > 0) {
        segmentSelect.disabled = false;
        segmentLayers.forEach((_, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = `Segmento ${i + 1}`;
        segmentSelect.appendChild(opt);
        });
    } else {
        segmentSelect.disabled = true;
    }
  }
}


function agregarSegmento(segmentPoints, timestamps, color) {
  const group = L.layerGroup();
  
  const segmentPolyline = L.polyline(segmentPoints, {
    color: color, 
    weight: 5,    
    opacity: 0.8,
  });
  group.addLayer(segmentPolyline);
  
  segmentPoints.forEach((point, index) => {
    const marker = L.circleMarker(point, {
        radius: 3,
        fillColor: color,
        color: color,
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    });
    if (timestamps[index]) {
        const date = new Date(timestamps[index]);
        const formattedTime = date.toLocaleString("es-CO", { 
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
        marker.bindTooltip(formattedTime, {
            permanent: false,
            direction: "top",
            className: "timestamp-tooltip",
        });
    }
    group.addLayer(marker);
  });

  group.addTo(map);
  segmentLayers.push(group);
}


// Manejo de Popups
document.querySelectorAll('.info-icon').forEach(icon => {
    icon.addEventListener('click', () => {
        const popupId = icon.getAttribute('data-popup');
        const popupElement = document.getElementById(popupId);
        if (popupElement) popupElement.style.display = 'block';
    });
});

document.querySelectorAll('.popup-close').forEach(close => {
    close.addEventListener('click', () => {
        const popup = close.closest('.popup');
        if (popup) popup.style.display = 'none';
    });
});

window.addEventListener('click', (e) => {
    document.querySelectorAll('.popup').forEach(popup => {
        if (e.target === popup) {
            popup.style.display = 'none';
        }
    });
});


// Inicialización
document.addEventListener("DOMContentLoaded", async () => {
  try {
    map = L.map("map").setView([10.99385, -74.79261], 12); 
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    polyline = L.polyline([], { color: "#004e92", weight: 6 }).addTo(map);

    map.on('click', function(e) {
        clickedLat = e.latlng.lat;
        clickedLng = e.latlng.lng;

        if (clickedMarker) {
            map.removeLayer(clickedMarker);
        }
        clickedMarker = L.marker([clickedLat, clickedLng], {
            icon: L.divIcon({
                className: 'clicked-location-marker',
                html: '<i class="fa-solid fa-location-dot fa-2x" style="color: #FF0000;"></i>', // FontAwesome icon, larger
                iconSize: [32, 32], // Adjusted size
                iconAnchor: [16, 32] 
            })
        }).addTo(map)
            .bindPopup(`Ubicación seleccionada:<br>Lat: ${clickedLat.toFixed(5)}<br>Lng: ${clickedLng.toFixed(5)}`)
            .openPopup();

        habilitarBotonConsultarEspecifica(); 
        
        if (locationCircle) {
            map.removeLayer(locationCircle);
            locationCircle = null;
        }
        segmentLayers.forEach((layer) => map.removeLayer(layer));
        segmentLayers = [];
        if (segmentSelect) {
            segmentSelect.innerHTML = '<option value="">Seleccione una ruta</option>';
            segmentSelect.disabled = true;
        }
    });

    const config = await getConfig();
    if (config && config.pageTitle) {
      const pageTitleElement = document.getElementById("page-title");
      if (pageTitleElement) pageTitleElement.textContent = config.pageTitle;
    }
    
    if (consultButton) {
        consultButton.addEventListener("click", consultarUbicacionEspecifica);
    }

    if (segmentSelect) {
        segmentSelect.addEventListener("change", () => {
            const selectedIndex = parseInt(segmentSelect.value);
            segmentLayers.forEach((layerGroup, idx) => {
                layerGroup.eachLayer(subLayer => { 
                    if (subLayer instanceof L.Polyline) { 
                        if (idx === selectedIndex) {
                            subLayer.setStyle({ color: "#00FF00", weight: 7, opacity: 1 }); 
                            subLayer.bringToFront();
                        } else {
                            subLayer.setStyle({ color: "#32CD32", weight: 5, opacity: 0.8 }); 
                        }
                    }
                });
            });
        });
    }

    generarElementosDecorativos();
    startDateTime.addEventListener("input", actualizarRestricciones);
    endDateTime.addEventListener("input", actualizarRestricciones);
    inhabilitarBotonConsultarEspecifica(); 
  } catch (error) {
    console.error("Error durante la inicialización:", error);
    alert("Ocurrió un error al inicializar la página. Por favor, recargue.");
  }
});