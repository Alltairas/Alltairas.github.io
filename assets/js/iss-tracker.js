// Client-side ISS position tracker.
// Rewrite of the trace_manager.py / iss_logic.py logic from the iss_tracker_API Flask app,
// running entirely in the browser against https://wheretheiss.at instead of a Python backend.
(function () {
  const mapEl = document.getElementById('iss-map');
  if (!mapEl || typeof L === 'undefined') return;

  const map = L.map(mapEl).setView([0, 0], 2);
  // CARTO's basemaps now watermark every tile with "API KEY REQUIRED", so serve
  // straight from OpenStreetMap instead — no key, no sign-up. Single host rather
  // than the old {s} subdomain rotation, and no {r} since OSM has no @2x tiles.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  // Absolute path: this script runs in the context of /demos/iss-tracker/, so a
  // relative URL would resolve against that page rather than the asset root.
  // Safe here because the site is a GitHub user page served from the domain root.
  const issIcon = L.icon({
    iconUrl: '/assets/img/iss.svg',
    iconSize: [60, 38],
    iconAnchor: [30, 19], // centre the station on its actual coordinates
    className: 'iss-marker-icon',
  });

  const marker = L.marker([0, 0], { icon: issIcon }).addTo(map);
  const trace = L.polyline([], { color: '#2ecc71', weight: 2 }).addTo(map);

  let tracePoints = [];
  let firstFix = true;

  const infoEl = document.getElementById('iss-info');
  const resetBtn = document.getElementById('iss-reset');

  function addPoint(lat, lon) {
    const last = tracePoints[tracePoints.length - 1];
    if (!last || last[0] !== lat || last[1] !== lon) {
      tracePoints.push([lat, lon]);
      trace.setLatLngs(tracePoints);
    }
  }

  async function tick() {
    try {
      const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      const latlng = [data.latitude, data.longitude];

      marker.setLatLng(latlng);
      addPoint(data.latitude, data.longitude);

      if (firstFix) {
        map.setView(latlng, 3);
        firstFix = false;
      }

      if (infoEl) {
        infoEl.innerHTML =
          'Latitude: ' + data.latitude.toFixed(2) + '&deg;<br>' +
          'Longitude: ' + data.longitude.toFixed(2) + '&deg;<br>' +
          'Altitude: ' + data.altitude.toFixed(1) + ' km<br>' +
          'Velocity: ' + data.velocity.toFixed(0) + ' km/h<br>' +
          'Visibility: ' + data.visibility;
      }
    } catch (e) {
      if (infoEl) infoEl.textContent = 'Could not reach the ISS position feed right now.';
    }
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', function (e) {
      e.preventDefault();
      tracePoints = [];
      trace.setLatLngs([]);
    });
  }

  tick();
  setInterval(tick, 5000);
})();
