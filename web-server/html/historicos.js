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
let locationCircle;
let startMarker, endMarker;
let polyline;
let segmentLayers = [];
let currentSegmentPointsForSlider = [];
let sliderMarker = null;

let clickedLat = null;
let clickedLng = null;
let clickedMarker = null;

// Elementos del DOM
const startDateTime = document.getElementById("startDateTime");
const endDateTime = document.getElementById("endDateTime");
const consultButton = document.getElementById("consult-button");
const radiusInput = document.getElementById("radius-input");
const segmentSelect = document.getElementById("segment-select");
const locationFilterDiv = document.getElementById("location-filter");
const routeSliderContainer = document.getElementById('route-slider-container');
const routeSlider = document.getElementById('route-slider');
const sliderTimestampSpan = document.getElementById('slider-timestamp');

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

const inhabilitarBotonConsultarEspecifica = () => {
  if (consultButton) consultButton.disabled = true;
};
const habilitarBotonConsultarEspecifica = () => {
  if (consultButton) consultButton.disabled = false;
};

function actualizarRestricciones() {
  const startValue = startDateTime.value;
  if (startValue) {
    endDateTime.min = startValue;
    if (endDateTime.value && endDateTime.value < startValue) {
      endDateTime.value = startValue;
    }
  }
  inhabilitarBotonConsultarEspecifica();
}

// Consultar la API de históricos (ruta principal)
function consultar() {
  if (locationFilterDiv) locationFilterDiv.style.display = "none";
  if (routeSliderContainer) routeSliderContainer.style.display = 'none';
  if (sliderMarker) {
    map.removeLayer(sliderMarker);
    sliderMarker = null;
  }
  currentSegmentPointsForSlider = [];

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

  segmentLayers.forEach(segmentData => {
    if (segmentData.layer && map.hasLayer(segmentData.layer)) {
      map.removeLayer(segmentData.layer);
    }
  });
  segmentLayers = [];

  if (segmentSelect) {
    segmentSelect.innerHTML = '<option value="">Seleccione una ruta</option>';
    segmentSelect.disabled = true;
  }
  if (radiusInput) {
    radiusInput.value = "";
  }
  inhabilitarBotonConsultarEspecifica();

  const vehicleSelect = document.getElementById("vehicleSelect");
  const vehicleID = vehicleSelect ? vehicleSelect.value : "1";

  let url = `https://geofind-fe.ddns.net/api/historicos?inicio=${encodeURIComponent(startFormatted)}&fin=${encodeURIComponent(endFormatted)}`;
  if (vehicleID !== "ambos") {
    url += `&VehicleID=${vehicleID}`;
  }

  fetch(url)
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

      if (vehicleID === "ambos") {
        const vehiculos = {};
        data.forEach(coord => {
          if (!vehiculos[coord.vehicle_id]) vehiculos[coord.vehicle_id] = [];
          vehiculos[coord.vehicle_id].push(coord);
        });

        const colores = {
          "1": "#FFD700", // Amarillo
          "2": "#000000"  // Negro
        };

        Object.entries(vehiculos).forEach(([id, coords]) => {
          const route = coords.map(c => [parseFloat(c.latitud), parseFloat(c.longitud)]);
          const color = colores[id] || "#FF00FF";
          const vehiclePolyline = L.polyline(route, { color, weight: 6 }).addTo(map);

          if (route.length > 0) {
            const start = L.marker(route[0], {
              icon: L.divIcon({
                className: "custom-marker",
                html: `<div style="color: black; font-weight: bold; background: ${color}; padding: 8px; border-radius: 50%; text-align: center;">${id}A</div>`,
                iconSize: [35, 35],
              }),
            }).bindPopup(`Inicio Vehículo ${id}: ${coords[0].timestamp}`).addTo(map);

            if (route.length > 1) {
              const end = L.marker(route[route.length - 1], {
                icon: L.divIcon({
                  className: "custom-marker",
                  html: `<div style="color: white; font-weight: bold; background: ${color}; padding: 8px; border-radius: 50%; text-align: center;">${id}B</div>`,
                  iconSize: [35, 35],
                }),
              }).bindPopup(`Fin Vehículo ${id}: ${coords[coords.length - 1].timestamp}`).addTo(map);
            }
          }

          map.fitBounds(vehiclePolyline.getBounds());
        });

      } else {
        const filteredData = data.filter(coord => coord.vehicle_id == vehicleID);
        const route = filteredData.map((coord) => [parseFloat(coord.latitud), parseFloat(coord.longitud)]);
        polyline.setLatLngs(route);
        if (!map.hasLayer(polyline)) polyline.addTo(map);

        if (route.length > 0) {
          startMarker = L.marker(route[0], {
            icon: L.divIcon({
              className: "custom-marker",
              html: '<div style="color: black; font-weight: bold; background: #28A745; padding: 8px; border-radius: 50%; text-align: center;">A</div>',
              iconSize: [35, 35],
            }),
          }).bindPopup(`Inicio: ${filteredData[0].timestamp}`).addTo(map);

          if (route.length > 1) {
            endMarker = L.marker(route[route.length - 1], {
              icon: L.divIcon({
                className: "custom-marker",
                html: '<div style="color: white; font-weight: bold; background: #DC3545; padding: 8px; border-radius: 50%; text-align: center;">B</div>',
                iconSize: [35, 35],
              }),
            }).bindPopup(`Fin: ${filteredData[filteredData.length - 1].timestamp}`).addTo(map);
          }
        }

        map.fitBounds(polyline.getBounds());
      }

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
        return {}; 
    }
    return await response.json();
  } catch (error) {
    console.warn("Excepción al obtener la configuración:", error);
    return {}; 
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
  if (routeSliderContainer) routeSliderContainer.style.display = 'none';
  if (sliderMarker) {
    map.removeLayer(sliderMarker);
    sliderMarker = null;
  }
  currentSegmentPointsForSlider = [];

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
        mostrarSegmentosRuta([]);
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
    });
}

// Segmentación de rutas por tiempo
function mostrarSegmentosRuta(data, defaultColor = "#32CD32") {
  segmentLayers.forEach(segmentData => {
    if (segmentData.layer && map.hasLayer(segmentData.layer)) {
      map.removeLayer(segmentData.layer);
    }
  });
  segmentLayers = [];
  currentSegmentPointsForSlider = [];
  if (routeSliderContainer) routeSliderContainer.style.display = 'none';
  if (sliderMarker) {
    map.removeLayer(sliderMarker);
    sliderMarker = null;
  }

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
    const latLng = L.latLng(parseFloat(coord.latitud), parseFloat(coord.longitud));
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
      while (segmentSelect.options.length > 1) {
        segmentSelect.remove(1);
      }
      segmentLayers.forEach((_, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = `Ruta ${i + 1}`;
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

  const pointsWithTimestamps = segmentPoints.map((point, index) => ({
    latlng: point,
    timestamp: timestamps[index],
  }));

  segmentPoints.forEach((point, index) => {
    const marker = L.circleMarker(point, {
      radius: 3,
      fillColor: color,
      color: color,
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8,
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
  segmentLayers.push({ points: pointsWithTimestamps, layer: group, color: color });
}

// Popups
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

// Slider
function updateSliderMarker(index) {
  if (!currentSegmentPointsForSlider || currentSegmentPointsForSlider.length === 0 || index < 0 || index >= currentSegmentPointsForSlider.length) {
    if (sliderTimestampSpan) sliderTimestampSpan.textContent = '';
    return;
  }

  const pointData = currentSegmentPointsForSlider[index];
  const latLng = pointData.latlng;

  if (sliderMarker) {
    sliderMarker.setLatLng(latLng);
  } else {
    sliderMarker = L.circleMarker(latLng, {
      radius: 8,
      fillColor: "#FF0000",
      color: "#FFFFFF",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9,
      pane: 'markerPane'
    }).addTo(map);
  }
  sliderMarker.bringToFront();

  if (sliderTimestampSpan) {
    if (pointData.timestamp) {
      const originalDate = new Date(pointData.timestamp);
      const adjustedDate = new Date(originalDate.getTime() + (5 * 60 * 60 * 1000));
      sliderTimestampSpan.textContent = adjustedDate.toLocaleString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } else {
      sliderTimestampSpan.textContent = `Punto ${index + 1}`;
    }
  }
}

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
          html: '<i class="fa-solid fa-location-dot fa-2x" style="color: #FF0000;"></i>',
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        })
      }).addTo(map);

      habilitarBotonConsultarEspecifica();

      if (locationCircle) {
        map.removeLayer(locationCircle);
        locationCircle = null;
      }
      segmentLayers.forEach(segmentData => {
        if (segmentData.layer && map.hasLayer(segmentData.layer)) {
          map.removeLayer(segmentData.layer);
        }
      });
      segmentLayers = [];
      if (segmentSelect) {
        segmentSelect.innerHTML = '<option value="">Seleccione una ruta</option>';
        segmentSelect.disabled = true;
      }
      if (routeSliderContainer) routeSliderContainer.style.display = 'none';
      if (sliderMarker) {
        map.removeLayer(sliderMarker);
        sliderMarker = null;
      }
      currentSegmentPointsForSlider = [];
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
        segmentLayers.forEach((segmentData, idx) => {
          segmentData.layer.eachLayer(subLayer => {
            if (subLayer instanceof L.Polyline) {
              if (idx === selectedIndex) {
                subLayer.setStyle({ color: "#00FF00", weight: 7, opacity: 1 });
                subLayer.bringToFront();
              } else {
                subLayer.setStyle({ color: segmentData.color || "#32CD32", weight: 5, opacity: 0.8 });
              }
            }
          });
        });

        if (selectedIndex >= 0 && selectedIndex < segmentLayers.length) {
          currentSegmentPointsForSlider = segmentLayers[selectedIndex].points;
          if (currentSegmentPointsForSlider && currentSegmentPointsForSlider.length > 0) {
            routeSlider.min = 0;
            routeSlider.max = currentSegmentPointsForSlider.length - 1;
            routeSlider.value = 0;
            if (routeSliderContainer) routeSliderContainer.style.display = 'flex';
            updateSliderMarker(0);
          } else {
            if (routeSliderContainer) routeSliderContainer.style.display = 'none';
            if (sliderMarker) {
              map.removeLayer(sliderMarker);
              sliderMarker = null;
            }
          }
        } else {
          if (routeSliderContainer) routeSliderContainer.style.display = 'none';
          currentSegmentPointsForSlider = [];
          if (sliderMarker) {
            map.removeLayer(sliderMarker);
            sliderMarker = null;
          }
        }
      });
    }

    if (routeSlider) {
      routeSlider.addEventListener('input', function() {
        updateSliderMarker(parseInt(this.value));
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