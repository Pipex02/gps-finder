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

// Inicializar el mapa (Declaración movida dentro de DOMContentLoaded)
let map;
let locationCircle;
let startMarker, endMarker; // Variables para los marcadores personalizados
let polyline; // Declaración movida dentro de DOMContentLoaded
let segmentLayers = [];

// Configuración inicial de fechas
const startDateTime = document.getElementById("startDateTime");
const endDateTime = document.getElementById("endDateTime");
const consultButton = document.getElementById("consult-button");

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
});

endDateTime.addEventListener("change", () => {
  const startValue = new Date(startDateTime.value);
  const endValue = new Date(endDateTime.value);
  if (endValue <= startValue) {
    let adjustedEnd = new Date(startValue);
    adjustedEnd.setMinutes(adjustedEnd.getMinutes() + 1);
    endDateTime.value = toLocalISOString(adjustedEnd);
  }
});

// Funciones de control del botón
const inhabilitarBoton = () => (consultButton.disabled = true);
const habilitarBoton = () => (consultButton.disabled = false);

// Actualizar restricciones de fechas
function actualizarRestricciones() {
  const startValue = startDateTime.value;
  if (startValue) {
    endDateTime.min = startValue;
    if (endDateTime.value && endDateTime.value < startValue) {
      endDateTime.value = startValue;
    }
  }
  inhabilitarBoton();
}

// Consultar la API de históricos
function consultar() {
  document.getElementById("location-filter").style.display = "none";

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

  fetch(`/api/historicos?inicio=${encodeURIComponent(startFormatted)}&fin=${encodeURIComponent(endFormatted)}`)
    .then((response) => {
      if (!response.ok) throw new Error("Error en la respuesta de la API");
      return response.json();
    })
    .then((data) => {
      if (!data || data.length === 0) {
        alert("No hay datos en este rango de tiempo.");
        inhabilitarBoton();
        return;
      }

      const route = data.map((coord) => [parseFloat(coord.latitud), parseFloat(coord.longitud)]);
      polyline.setLatLngs(route);
      if (!map.hasLayer(polyline)) polyline.addTo(map);

      if (startMarker) map.removeLayer(startMarker);
      if (endMarker) map.removeLayer(endMarker);
      if (locationCircle) map.removeLayer(locationCircle);

      // Añadir marcadores personalizados A y B
      if (route.length > 1) {
        startMarker = L.marker(route[0], {
          icon: L.divIcon({
            className: "custom-marker",
            html: '<div style="color: black; font-weight: bold; background: #28A745; padding: 8px; border-radius: 50%; text-align: center;">A</div>',
            iconSize: [35, 35],
          }),
        })
          .bindPopup(`Inicio: ${data[0].timestamp}`)
          .addTo(map);

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

      map.fitBounds(polyline.getBounds());
      habilitarBoton();
      document.getElementById("location-filter").style.display = "block";
    })
    .catch((error) => {
      console.error("Error al obtener datos históricos:", error);
      inhabilitarBoton();
      alert("Error al consultar la API. Intenta de nuevo.");
    });
}

// Funciones de Geoapify
async function getConfig() {
  const response = await fetch("/api/config");
  if (!response.ok) throw new Error("Error al obtener la configuración");
  const config = await response.json();
  return config;
}

async function fetchAutocomplete(query, city, apiKey) {
  const response = await fetch(
    `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&city=${encodeURIComponent(city)}&limit=4&apiKey=${apiKey}`
  );
  const data = await response.json();
  return data.features.map((feature) => ({
    label: feature.properties.formatted,
    lat: feature.properties.lat,
    lon: feature.properties.lon,
  }));
}

async function fetchCoordinates(address, city, apiKey) {
  const response = await fetch(
    `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&city=${encodeURIComponent(city)}&limit=1&apiKey=${apiKey}`
  );
  const data = await response.json();
  if (data.features.length > 0) {
    return {
      lat: data.features[0].properties.lat,
      lon: data.features[0].properties.lon,
    };
  }
  return null;
}

// Consultar ubicaciones dentro del radio
async function consultarUbicacionEspecifica() {
  const address = document.getElementById("location-input").value;
  const city = document.getElementById("city-select").value;
  const radius = document.getElementById("radius-input").value;
  const config = await getConfig();
  const apiKey = config.geoapifyApiKey;

  if (!address || !radius) {
    alert("Por favor, ingrese una ubicación y un radio.");
    return;
  }

  const coords = await fetchCoordinates(address, city, apiKey);
  if (!coords) {
    alert("Ubicación no encontrada.");
    return;
  }

  const { lat, lon } = coords;
  const startInput = startDateTime.value;
  const endInput = endDateTime.value;

  if (!startInput || !endInput) {
    alert("Selecciona ambas fechas y horas.");
    return;
  }

  const startFormatted = `${startInput.replace("T", " ")}:00`;
  const endFormatted = `${endInput.replace("T", " ")}:00`;

  fetch(`/api/lugar?latitud=${lat}&longitud=${lon}&radio=${radius}&inicio=${encodeURIComponent(startFormatted)}&fin=${encodeURIComponent(endFormatted)}`)
    .then((response) => {
      if (!response.ok) throw new Error("Error en la respuesta de la API");
      return response.json();
    })
    .then((data) => {
      if (!data || data.length === 0) {
        alert("No hay datos en este rango de tiempo dentro del radio seleccionado.");
        return;
      }

      const route = data.map((coord) => [parseFloat(coord.latitud), parseFloat(coord.longitud)]);
      if (locationCircle) map.removeLayer(locationCircle);

      locationCircle = L.circle([lat, lon], {
        color: "#32CD32",
        weight: 2,
        fill: false,
        radius: parseFloat(radius),
      }).addTo(map);

      map.fitBounds(route);
      mostrarSegmentosRuta(data);
    })
    .catch((error) => {
      console.error("Error al obtener datos de ubicación:", error);
      alert("Error al consultar la API. Intenta de nuevo.");
    });
}

// Segmentación de rutas por tiempo
function mostrarSegmentosRuta(data, color = "#32CD32") {
  segmentLayers.forEach((layer) => map.removeLayer(layer));
  segmentLayers = [];

  const segmentSelect = document.getElementById("segment-select");
  segmentSelect.innerHTML = '<option value="">Seleccione una ruta</option>';

  let currentSegment = [];
  let currentTimestamps = [];
  const maxTimeDiff = 15 * 60 * 1000;

  for (let i = 0; i < data.length; i++) {
    const coord = data[i];
    const latLng = [parseFloat(coord.latitud), parseFloat(coord.longitud)];
    const timestamp = coord.timestamp;

    if (i === 0) {
      currentSegment.push(latLng);
      currentTimestamps.push(timestamp);
    } else {
      const prevTime = new Date(data[i - 1].timestamp);
      const currTime = new Date(timestamp);
      const timeDiff = currTime - prevTime;

      if (timeDiff > maxTimeDiff) {
        agregarSegmento(currentSegment, currentTimestamps, color, segmentLayers.length + 1);
        currentSegment = [latLng];
        currentTimestamps = [timestamp];
      } else {
        currentSegment.push(latLng);
        currentTimestamps.push(timestamp);
      }
    }
  }

  if (currentSegment.length > 0) {
    agregarSegmento(currentSegment, currentTimestamps, color, segmentLayers.length + 1);
  }

  segmentSelect.disabled = false;
  segmentLayers.forEach((_, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Ruta ${i + 1}`;
    segmentSelect.appendChild(opt);
  });

  segmentSelect.addEventListener("change", () => {
    const selected = parseInt(segmentSelect.value);
    segmentLayers.forEach((layerGroup, idx) => {
      layerGroup.eachLayer((layer) => {
        // Quitar tooltips de todas las rutas
        if (layer.getTooltip()) {
          layer.unbindTooltip();
        }

        if (idx === selected) {
          layer.setStyle({ color: "#32CD32", weight: 6 });
          layer.bringToFront();

          // Agregar tooltips solo a la ruta seleccionada usando los timestamps almacenados
          const timestampIdx = layerGroup.getLayers().indexOf(layer);
          const timestamp = layerGroup.timestamps[timestampIdx];
          if (timestamp) {
            const date = new Date(timestamp);
            date.setHours(date.getHours() + 5); // Ajustar a UTC-5
            const formattedTime = date.toLocaleString("es-ES", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            layer.bindTooltip(formattedTime, {
              permanent: false,
              direction: "top",
              className: "timestamp-tooltip",
            });
          }
        } else {
          layer.setStyle({ color: "#999999", weight: 3 });
        }
      });
    });
  });
}

function agregarSegmento(segment, timestamps, color, numero) {
  const group = L.layerGroup();
  for (let i = 0; i < segment.length - 1; i++) {
    const point1 = segment[i];
    const point2 = segment[i + 1];
    const tramo = L.polyline([point1, point2], {
      color,
      weight: 4,
      opacity: 0.9,
    });
    group.addLayer(tramo);
  }

  // Almacenar los timestamps en el layerGroup
  group.timestamps = timestamps.slice(0, segment.length - 1);
  group.addTo(map);
  segmentLayers.push(group);
}

// Manejo de Popups
document.querySelectorAll('.info-icon').forEach(icon => {
    icon.addEventListener('click', () => {
        const popupId = icon.getAttribute('data-popup');
        document.getElementById(popupId).style.display = 'block';
    });
});

document.querySelectorAll('.popup-close').forEach(close => {
    close.addEventListener('click', () => {
        close.closest('.popup').style.display = 'none';
    });
});

// Cerrar popup si se hace clic fuera del contenido
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
    // Inicializar el mapa dentro del DOMContentLoaded
    map = L.map("map").setView([10.99385, -74.79261], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    polyline = L.polyline([], { color: "#004e92", weight: 6 }).addTo(map);


    const config = await getConfig();
    const apiKey = config.geoapifyApiKey;

    if (config.pageTitle) {
      document.getElementById("page-title").textContent = config.pageTitle || "Consulta de Históricos";
    }

    const locationInput = document.getElementById("location-input");
    const suggestionsBox = document.getElementById("suggestions-box");
    const citySelect = document.getElementById("city-select");
    const radiusInput = document.getElementById("radius-input");

    // Comentado temporalmente el autocompletado de Geoapify
    /*
    locationInput.addEventListener("input", async () => {
      const query = locationInput.value;
      const city = citySelect.value;
      if (query.length < 7) {
        suggestionsBox.style.display = "none";
        return;
      }

      const suggestions = await fetchAutocomplete(query, city, apiKey);
      suggestionsBox.innerHTML = "";
      suggestions.forEach((suggestion, index) => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.textContent = suggestion.label;
        div.dataset.index = index;
        div.addEventListener("click", () => {
          locationInput.value = suggestion.label;
          suggestionsBox.style.display = "none";
        });
        suggestionsBox.appendChild(div);
      });
      suggestionsBox.style.display = suggestions.length > 0 ? "block" : "none";
    });
    */

    locationInput.addEventListener("blur", () => {
      setTimeout(() => (suggestionsBox.style.display = "none"), 200);
    });

    consultButton.addEventListener("click", consultarUbicacionEspecifica);

    generarElementosDecorativos();
    startDateTime.addEventListener("input", actualizarRestricciones);
    endDateTime.addEventListener("input", actualizarRestricciones);
    inhabilitarBoton();
  } catch (error) {
    console.error("Error al cargar la configuración:", error);
  }
});
