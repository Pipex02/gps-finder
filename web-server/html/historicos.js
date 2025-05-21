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
const gasolinaContainer = document.getElementById('gasolina-container');
const velocidadContainer = document.getElementById('velocidad-container');

// Variable component instances
let gasolinaProgressBar;
let velocidadSpeedometer;

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

  let url = `/api/historicos?inicio=${encodeURIComponent(startFormatted)}&fin=${encodeURIComponent(endFormatted)}`;
  if (vehicleID !== "ambos") {
    url += `&VehicleID=${vehicleID}`;
  }

  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error("Error en la respuesta de la API");
      return response.json();
    })
    .then((data) => {
      // Clear existing markers and polylines
      if (startMarker) map.removeLayer(startMarker);
      if (endMarker) map.removeLayer(endMarker);
      startMarker = null;
      endMarker = null;
      if (polyline) polyline.setLatLngs([]);
      // Remove all existing vehicle polylines if any
      map.eachLayer(layer => {
          if (layer instanceof L.Polyline && layer !== polyline) {
              map.removeLayer(layer);
          }
          // Also remove vehicle start/end markers
          if (layer instanceof L.Marker && layer.options.icon && layer.options.icon.options.className === "custom-marker") {
              map.removeLayer(layer);
          }
      });


      if (!data || data.length === 0) {
        alert("No hay datos en este rango de tiempo.");
        // Hide variable cards and slider if no data
        document.querySelector('.cards-container').style.display = 'none';
        if (routeSliderContainer) routeSliderContainer.style.display = 'none';
        if (sliderMarker) {
            map.removeLayer(sliderMarker);
            sliderMarker = null;
        }
        currentSegmentPointsForSlider = [];
        return;
      }

      // Show variable cards container
      document.querySelector('.cards-container').style.display = 'flex';

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

        // Store data for both vehicles for slider and variable updates
        window.vehicleData = vehiculos;

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
        });

        // Fit bounds to include all polylines
        const allPoints = data.map(c => [parseFloat(c.latitud), parseFloat(c.longitud)]);
        if (allPoints.length > 0) {
             map.fitBounds(L.polyline(allPoints).getBounds());
        }


        // Initialize and update variable components for Vehicle 1 (as per plan)
        const vehicle1Data = vehiculos["1"] || [];
        if (vehicle1Data.length > 0) {
            const latestData = vehicle1Data[vehicle1Data.length - 1];
            if (gasolinaProgressBar) {
                gasolinaProgressBar.update(latestData.gasolina);
            } else {
                if (gasolinaContainer) {
                    gasolinaProgressBar = createProgressBar(gasolinaContainer, latestData.gasolina);
                }
            }
             if (velocidadSpeedometer) {
                velocidadSpeedometer.update(latestData.velocidad);
            } else {
                 if (velocidadContainer) {
                    velocidadSpeedometer = createSpeedometer(velocidadContainer, latestData.velocidad);
                }
            }
        } else {
             if (gasolinaProgressBar) gasolinaProgressBar.update(0);
             if (velocidadSpeedometer) velocidadSpeedometer.update(0);
        }


        // Prepare data for the single slider (using Vehicle 1 data as the primary reference)
        currentSegmentPointsForSlider = vehicle1Data.map(coord => ({
             latlng: L.latLng(parseFloat(coord.latitud), parseFloat(coord.longitud)),
             timestamp: coord.timestamp,
             vehicle_id: coord.vehicle_id,
             velocidad: coord.velocidad,
             gasolina: coord.gasolina
        }));

        if (currentSegmentPointsForSlider.length > 0) {
            routeSlider.min = 0;
            routeSlider.max = currentSegmentPointsForSlider.length - 1;
            routeSlider.value = 0;
            if (routeSliderContainer) routeSliderContainer.style.display = 'flex';
            updateSliderMarker(0); // Update marker for the first point
        } else {
             if (routeSliderContainer) routeSliderContainer.style.display = 'none';
             if (sliderMarker) {
                map.removeLayer(sliderMarker);
                sliderMarker = null;
            }
        }


      } else { // Single vehicle selected
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
           map.fitBounds(polyline.getBounds());

           // Initialize and update variable components for the selected vehicle
            if (filteredData.length > 0) {
                const latestData = filteredData[filteredData.length - 1];
                 if (gasolinaProgressBar) {
                    gasolinaProgressBar.update(latestData.gasolina);
                } else {
                    if (gasolinaContainer) {
                        gasolinaProgressBar = createProgressBar(gasolinaContainer, latestData.gasolina);
                    }
                }
                 if (velocidadSpeedometer) {
                    velocidadSpeedometer.update(latestData.velocidad);
                } else {
                     if (velocidadContainer) {
                        velocidadSpeedometer = createSpeedometer(velocidadContainer, latestData.velocidad);
                    }
                }
            } else {
                 if (gasolinaProgressBar) gasolinaProgressBar.update(0);
                 if (velocidadSpeedometer) velocidadSpeedometer.update(0);
            }


           // Prepare data for the slider
            currentSegmentPointsForSlider = filteredData.map(coord => ({
                 latlng: L.latLng(parseFloat(coord.latitud), parseFloat(coord.longitud)),
                 timestamp: coord.timestamp,
                 vehicle_id: coord.vehicle_id,
                 velocidad: coord.velocidad,
                 gasolina: coord.gasolina
            }));

            if (currentSegmentPointsForSlider.length > 0) {
                routeSlider.min = 0;
                routeSlider.max = currentSegmentPointsForSlider.length - 1;
                routeSlider.value = 0;
                if (routeSliderContainer) routeSliderContainer.style.display = 'flex';
                updateSliderMarker(0); // Update marker for the first point
            } else {
                 if (routeSliderContainer) routeSliderContainer.style.display = 'none';
                 if (sliderMarker) {
                    map.removeLayer(sliderMarker);
                    sliderMarker = null;
                }
            }

        } else {
             map.fitBounds(polyline.getBounds());
             // Hide variable cards and slider if no data
            document.querySelector('.cards-container').style.display = 'none';
            if (routeSliderContainer) routeSliderContainer.style.display = 'none';
             if (sliderMarker) {
                map.removeLayer(sliderMarker);
                sliderMarker = null;
            }
            currentSegmentPointsForSlider = [];
        }
      }

      if (locationFilterDiv) locationFilterDiv.style.display = "block";
    })
    .catch((error) => {
      console.error("Error al obtener datos históricos:", error);
      alert("Error al consultar la API. Intenta de nuevo.");
      // Clear map elements on error
      if (polyline) polyline.setLatLngs([]);
      if (startMarker) map.removeLayer(startMarker);
      if (endMarker) map.removeLayer(endMarker);
      startMarker = null;
      endMarker = null;
       map.eachLayer(layer => {
          if (layer instanceof L.Polyline && layer !== polyline) {
              map.removeLayer(layer);
          }
           if (layer instanceof L.Marker && layer.options.icon && layer.options.icon.options.className === "custom-marker") {
              map.removeLayer(layer);
          }
      });
      // Hide variable cards and slider on error
      document.querySelector('.cards-container').style.display = 'none';
      if (routeSliderContainer) routeSliderContainer.style.display = 'none';
       if (sliderMarker) {
            map.removeLayer(sliderMarker);
            sliderMarker = null;
        }
        currentSegmentPointsForSlider = [];
    });
}

// Keep track of vehicle markers for the slider
let vehicleMarkers = {};

function updateSliderMarker(index) {
  if (!currentSegmentPointsForSlider || currentSegmentPointsForSlider.length === 0 || index < 0 || index >= currentSegmentPointsForSlider.length) {
    if (sliderTimestampSpan) sliderTimestampSpan.textContent = '';
    // Remove vehicle markers if no data
    Object.values(vehicleMarkers).forEach(marker => {
        if (map.hasLayer(marker)) {
            map.removeLayer(marker);
        }
    });
    vehicleMarkers = {};
    return;
  }

  const selectedVehicleID = document.getElementById("vehicleSelect").value;

  if (selectedVehicleID !== "ambos") {
      // Logic for single vehicle slider (existing logic)
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
          const adjustedDate = new Date(originalDate.getTime() + (5 * 60 * 60 * 1000)); // Adjusting for UTC-5
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

      // Hide other vehicle markers if they exist
       Object.entries(vehicleMarkers).forEach(([id, marker]) => {
           if (id !== selectedVehicleID && map.hasLayer(marker)) {
               map.removeLayer(marker);
           }
       });


  } else { // "ambos" selected
      // Logic for single slider controlling both vehicles
      const referencePoint = currentSegmentPointsForSlider[index]; // Use Vehicle 1 data as reference for slider position

      Object.entries(window.vehicleData).forEach(([vehicleId, dataPoints]) => {
          // Find the closest data point for this vehicle based on the timestamp of the reference point
          // This assumes timestamps are somewhat synchronized or we can find a close match
          const closestPoint = dataPoints.reduce((prev, curr) => {
              const prevTimeDiff = Math.abs(new Date(prev.timestamp) - new Date(referencePoint.timestamp));
              const currTimeDiff = Math.abs(new Date(curr.timestamp) - new Date(referencePoint.timestamp));
              return (currTimeDiff < prevTimeDiff) ? curr : prev;
          });

          const latLng = L.latLng(parseFloat(closestPoint.latitud), parseFloat(closestPoint.longitud));

          if (!vehicleMarkers[vehicleId]) {
              // Create marker if it doesn't exist
              const markerColor = vehicleId === "1" ? "#FFD700" : "#000000"; // Match polyline colors
               vehicleMarkers[vehicleId] = L.circleMarker(latLng, {
                  radius: 8,
                  fillColor: markerColor,
                  color: "#FFFFFF",
                  weight: 2,
                  opacity: 1,
                  fillOpacity: 0.9,
                  pane: 'markerPane'
              }).addTo(map);
          } else {
              // Update marker position
              vehicleMarkers[vehicleId].setLatLng(latLng);
          }
           vehicleMarkers[vehicleId].bringToFront();
      });

      // Remove the single slider marker if it exists
      if (sliderMarker) {
          map.removeLayer(sliderMarker);
          sliderMarker = null;
      }


      if (sliderTimestampSpan) {
           if (referencePoint.timestamp) {
              const originalDate = new Date(referencePoint.timestamp);
              const adjustedDate = new Date(originalDate.getTime() + (5 * 60 * 60 * 1000)); // Adjusting for UTC-5
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

       // Update variable cards with data from the reference point (Vehicle 1)
       if (gasolinaProgressBar) gasolinaProgressBar.update(referencePoint.gasolina);
       if (velocidadSpeedometer) velocidadSpeedometer.update(referencePoint.velocidad);
  }
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

  fetch(`/api/lugar?latitud=${clickedLat}&longitud=${clickedLng}&radio=${radius}&inicio=${encodeURIComponent(startFormatted)}&fin=${encodeURIComponent(endFormatted)}`)
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

    // Initialize variable components on page load
    if (gasolinaContainer) {
        gasolinaProgressBar = createProgressBar(gasolinaContainer, 0); // Initialize with 0
    }
    if (velocidadContainer) {
        velocidadSpeedometer = createSpeedometer(velocidadContainer, 0); // Initialize with 0
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
