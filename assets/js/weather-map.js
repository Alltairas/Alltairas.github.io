// Browser port of HeatMap_France.ipynb from github.com/Alltairas/APIs (weather_map).
//
// The notebook fanned out one OpenWeatherMap request per département, authenticated
// with a personal key read off disk (c:\Users\aras\codes\api_key.txt). That key is
// what kept it off this site. Open-Meteo needs no key and no sign-up, sends
// access-control-allow-origin: *, and accepts comma-separated coordinate lists — so
// all 96 départements arrive in ONE request, with results in the order the
// coordinates went out. It reports °C directly, which retires the notebook's
// temp_conversion_from_K entirely.
//
// Rendered with Leaflet rather than the notebook's Plotly/Folium, because Leaflet is
// already loaded site-wide for the ISS tracker — this demo adds no new CDN dependency.
(function () {
  const root = document.getElementById('weather-map');
  if (!root || typeof L === 'undefined') return;

  // Absolute path: this script runs at /demos/weather/, so a relative URL would
  // resolve against the page rather than the asset root. Same reasoning as
  // iss-tracker.js and its marker icon.
  const GEOJSON_URL = '/assets/data/france-departements.geojson';

  // The notebook's departments_coords dict, lifted and repaired. Three fixes:
  //   1. it held only 91 départements — Corse-du-Sud, Hauts-de-Seine,
  //      Seine-Saint-Denis, Val-d'Oise and Val-de-Marne were missing outright,
  //      so five polygons had no temperature to colour with;
  //   2. "Doubs" appeared twice in the literal (92 entries, 91 unique);
  //   3. five entries carried coordinates that land in a *neighbouring*
  //      département, so they reported somebody else's weather — Haute-Corse
  //      sampled Corse-du-Sud, Haute-Marne sampled Meuse, Mayenne sampled Orne,
  //      Orne sampled Calvados, and Morbihan sat in the Atlantic. All five now
  //      use their préfecture.
  // Every point is asserted to fall inside its own polygon in the shipped,
  // simplified geometry. The dict's per-entry "timezone" is dropped: all 96 read
  // Europe/Paris, and the request takes one timezone parameter for the whole batch.
  // Order is the join key — Open-Meteo answers in the order it is asked.
  const DEPARTEMENTS = [
    ["Ain", 46.2332, 5.2928],
    ["Aisne", 49.6026, 3.3008],
    ["Allier", 46.3667, 3.4167],
    ["Alpes-de-Haute-Provence", 44.0, 6.2],
    ["Alpes-Maritimes", 43.7102, 7.262],
    ["Ardennes", 49.75, 4.9],
    ["Ardèche", 44.7311, 4.5888],
    ["Ariège", 42.8833, 1.6167],
    ["Aube", 48.3508, 4.072],
    ["Aude", 43.18, 2.7],
    ["Aveyron", 44.0833, 2.5833],
    ["Bas-Rhin", 48.6343, 7.51],
    ["Bouches-du-Rhône", 43.2965, 5.3698],
    ["Calvados", 49.1812, -0.3572],
    ["Cantal", 44.9231, 2.5364],
    ["Charente", 45.6492, 0.223],
    ["Charente-Maritime", 46.1667, -1.1667],
    ["Cher", 47.0851, 2.18],
    ["Corrèze", 45.1333, 1.8333],
    ["Corse-du-Sud", 41.926, 8.78],
    ["Creuse", 46.122, 1.9535],
    ["Côte-d'Or", 47.3071, 4.9132],
    ["Côtes-d'Armor", 48.563, -2.9264],
    ["Deux-Sèvres", 46.582, -0.3356],
    ["Dordogne", 44.882, 0.8165],
    ["Doubs", 47.0523, 6.0367],
    ["Drôme", 44.5, 5.0],
    ["Essonne", 48.6071, 2.2648],
    ["Eure", 49.0268, 1.1506],
    ["Eure-et-Loir", 48.4466, 1.5057],
    ["Finistère", 48.3685, -4.2028],
    ["Gard", 43.9443, 4.4642],
    ["Gers", 43.6276, 0.5853],
    ["Gironde", 44.8378, -0.5792],
    ["Haut-Rhin", 47.8505, 7.4856],
    ["Haute-Corse", 42.7028, 9.45],
    ["Haute-Garonne", 43.6047, 1.4442],
    ["Haute-Loire", 45.1304, 3.7661],
    ["Haute-Marne", 48.1119, 5.14],
    ["Haute-Savoie", 46.1167, 6.5833],
    ["Haute-Saône", 47.6699, 6.1566],
    ["Haute-Vienne", 45.8354, 1.262],
    ["Hautes-Alpes", 44.5, 6.1],
    ["Hautes-Pyrénées", 43.0678, 0.083],
    ["Hauts-de-Seine", 48.8924, 2.2069],
    ["Hérault", 43.6111, 3.8833],
    ["Ille-et-Vilaine", 48.1134, -1.67],
    ["Indre", 46.94, 1.68],
    ["Indre-et-Loire", 47.3667, 0.5833],
    ["Isère", 45.3376, 5.73],
    ["Jura", 46.7, 5.5],
    ["Landes", 44.0833, -1.0833],
    ["Loir-et-Cher", 47.5642, 1.267],
    ["Loire", 45.4353, 4.1022],
    ["Loire-Atlantique", 47.2181, -1.552],
    ["Loiret", 47.9167, 1.9],
    ["Lot", 44.5167, 1.4667],
    ["Lot-et-Garonne", 44.5, 0.4],
    ["Lozère", 44.5205, 3.499],
    ["Maine-et-Loire", 47.3795, -0.5632],
    ["Manche", 49.1167, -1.0667],
    ["Marne", 48.9616, 4.1443],
    ["Mayenne", 48.07, -0.77],
    ["Meurthe-et-Moselle", 48.6833, 6.1667],
    ["Meuse", 49.15, 5.4667],
    ["Morbihan", 47.6559, -2.7603],
    ["Moselle", 49.0833, 6.1167],
    ["Nièvre", 46.9956, 3.5731],
    ["Nord", 50.44, 3.112],
    ["Oise", 49.5, 2.1667],
    ["Orne", 48.432, 0.091],
    ["Paris", 48.8566, 2.3522],
    ["Pas-de-Calais", 50.5034, 2.8755],
    ["Puy-de-Dôme", 45.7775, 3.0822],
    ["Pyrénées-Atlantiques", 43.4333, -0.0833],
    ["Pyrénées-Orientales", 42.5, 2.8],
    ["Rhône", 45.7485, 4.8467],
    ["Sarthe", 47.9156, 0.191],
    ["Savoie", 45.65, 6.1167],
    ["Saône-et-Loire", 46.7702, 4.5376],
    ["Seine-et-Marne", 48.609, 2.9365],
    ["Seine-Maritime", 49.7204, 0.5205],
    ["Seine-Saint-Denis", 48.9106, 2.4397],
    ["Somme", 49.895, 2.3],
    ["Tarn", 43.6053, 2.2075],
    ["Tarn-et-Garonne", 44.0703, 1.39],
    ["Territoire de Belfort", 47.6167, 6.8667],
    ["Val-d'Oise", 49.0505, 2.1],
    ["Val-de-Marne", 48.7904, 2.4556],
    ["Var", 43.406, 6.0333],
    ["Vaucluse", 44.1064, 5.0292],
    ["Vendée", 46.6775, -1.2333],
    ["Vienne", 46.58, 0.3667],
    ["Vosges", 48.0833, 6.4],
    ["Yonne", 47.7333, 3.2],
    ["Yvelines", 48.8128, 1.9336],
  ];

  // Diverging ramp: cold blue -> neutral grey at 15 C -> warm red, on the notebook's
  // own -5/+35 C anchors, so a colour means the same thing from one day to the next.
  //
  // Two departures from the obvious build. It diverges in *chroma* rather than
  // lightness, because a conventional near-white midpoint washes out to ~1.4:1
  // against OpenStreetMap's beige — exactly where most of France sits for much of
  // the year. Every stop below clears 2:1 on land, forest and water tiles, and each
  // arm is monotone in OKLCH lightness (dL = 0.06 per step).
  //
  // And it interpolates rather than bucketing, which is what the notebook's
  // matplotlib Normalize did too. Discrete 5 C bins put ~70 of 96 departements in a
  // single bin on a typical day, flattening the north-south gradient that is the
  // whole point of the map.
  const STOPS = [
    [-5, '#004d8f'], [0, '#2365a8'], [5, '#4a7db5'], [10, '#7595b9'], [15, '#a5a59c'],
    [20, '#b98371'], [25, '#b2604a'], [30, '#a63a2d'], [35, '#901e1c'],
  ];
  const T_MIN = STOPS[0][0];
  const T_MAX = STOPS[STOPS.length - 1][0];
  const NO_DATA = '#9aa0a6';

  // Mixing is done in OKLab, not sRGB: a straight sRGB blend between the blue and
  // red arms drifts through a muddy purple instead of the neutral the stops define.
  const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const linearToSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

  function hexToOklab(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => srgbToLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
      0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
    ];
  }

  function oklabToHex(L, A, B) {
    const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
    const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
    const s = Math.pow(L - 0.0894841775 * A - 1.2914855480 * B, 3);
    return '#' + [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    ].map((v) => Math.round(Math.min(1, Math.max(0, linearToSrgb(v))) * 255)
      .toString(16).padStart(2, '0')).join('');
  }

  const LAB_STOPS = STOPS.map(([t, hex]) => [t, hexToOklab(hex)]);

  // The single source of colour for this demo: both the polygon fills and the
  // legend gradient are sampled from here, so the two cannot disagree.
  function colourAt(t) {
    const v = Math.min(T_MAX, Math.max(T_MIN, t));
    let i = 0;
    while (i < LAB_STOPS.length - 2 && v > LAB_STOPS[i + 1][0]) i++;
    const [t0, c0] = LAB_STOPS[i];
    const [t1, c1] = LAB_STOPS[i + 1];
    const k = t1 === t0 ? 0 : (v - t0) / (t1 - t0);
    return oklabToHex(
      c0[0] + (c1[0] - c0[0]) * k,
      c0[1] + (c1[1] - c0[1]) * k,
      c0[2] + (c1[2] - c0[2]) * k
    );
  }

  // WMO code table — Open-Meteo's weather_code. OpenWeatherMap sent a prose
  // description instead, so this is the one thing the port has to supply itself.
  const WMO = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    66: 'Light freezing rain', 67: 'Heavy freezing rain',
    71: 'Slight snowfall', 73: 'Moderate snowfall', 75: 'Heavy snowfall',
    77: 'Snow grains',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    85: 'Slight snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
  };

  const statusEl = document.getElementById('weather-status');
  const weather = {};   // nom -> { temp, feels, code }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function colourFor(nom) {
    const w = weather[nom];
    if (!w || typeof w.temp !== 'number') return NO_DATA;
    return colourAt(w.temp);
  }

  const map = L.map(root, { scrollWheelZoom: false }).setView([46.6034, 2.2], 6);

  // OpenStreetMap rather than CARTO: CARTO's basemaps now stamp "API KEY REQUIRED"
  // across every tile. Single host, no {s} rotation, no {r} retina suffix.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
      '&middot; weather <a href="https://open-meteo.com/">Open-Meteo</a>',
    maxZoom: 19,
  }).addTo(map);

  function tooltipHtml(feature) {
    const nom = feature.properties.nom;
    const code = feature.properties.code;
    const w = weather[nom];
    const head = '<strong>' + esc(nom) + '</strong> <span class="wx-code">' + esc(code) + '</span>';
    if (!w || typeof w.temp !== 'number') {
      return head + '<br><span class="wx-nodata">no reading</span>';
    }
    const sky = WMO[w.code] || 'Unknown conditions';
    return head +
      '<br><span class="wx-temp">' + w.temp.toFixed(1) + ' &deg;C</span>' +
      '<span class="wx-feels"> (feels ' + w.feels.toFixed(1) + ' &deg;C)</span>' +
      '<br><span class="wx-sky">' + esc(sky) + '</span>';
  }

  function style(feature) {
    return {
      fillColor: colourFor(feature.properties.nom),
      // Opaque fills. Anything translucent drags the mid-ramp steps below 2:1
      // against forest and water tiles; the basemap earns its place as context
      // *around* France instead of showing through the data.
      fillOpacity: 1,
      color: '#ffffff',
      weight: 0.7,
      opacity: 0.9,
    };
  }

  let layer = null;

  function onEachFeature(feature, lyr) {
    lyr.bindTooltip(tooltipHtml(feature), { sticky: true, className: 'wx-tooltip' });
    lyr.on({
      mouseover: (e) => {
        e.target.setStyle({ weight: 2.5, color: '#1b1b1b', opacity: 1 });
        e.target.bringToFront();
      },
      mouseout: (e) => layer.resetStyle(e.target),
    });
  }

  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'wx-legend');
    // Sampled every 1 °C straight out of colourAt — the same function that fills the
    // polygons — so the bar is the map's own scale rather than a hand-kept copy of it.
    const stops = [];
    for (let t = T_MIN; t <= T_MAX; t += 1) {
      stops.push(colourAt(t) + ' ' + (((t - T_MIN) / (T_MAX - T_MIN)) * 100).toFixed(2) + '%');
    }
    const ticks = [35, 25, 15, 5, -5];
    div.innerHTML =
      '<div class="wx-legend-title">Temperature (&deg;C)</div>' +
      '<div class="wx-legend-scale">' +
        '<div class="wx-legend-bar" style="background:linear-gradient(to top,' + stops.join(',') + ')"></div>' +
        '<div class="wx-legend-ticks">' +
          ticks.map((t) => '<span>' + (t > 0 ? '+' : '') + t + '</span>').join('') +
        '</div>' +
      '</div>';
    return div;
  };

  function fmtTime(iso) {
    return iso ? iso.slice(11, 16) : '—';
  }

  function setStatus(html) {
    if (statusEl) statusEl.innerHTML = html;
  }

  async function load() {
    setStatus('Loading départements and current conditions…');

    const url = 'https://api.open-meteo.com/v1/forecast' +
      '?latitude=' + DEPARTEMENTS.map((d) => d[1]).join(',') +
      '&longitude=' + DEPARTEMENTS.map((d) => d[2]).join(',') +
      '&current=temperature_2m,apparent_temperature,weather_code' +
      '&daily=sunrise,sunset' +
      '&timezone=' + encodeURIComponent('Europe/Paris');

    try {
      const [geo, wx] = await Promise.all([
        fetch(GEOJSON_URL).then((r) => {
          if (!r.ok) throw new Error('geometry HTTP ' + r.status);
          return r.json();
        }),
        fetch(url).then((r) => {
          if (!r.ok) throw new Error('Open-Meteo HTTP ' + r.status);
          return r.json();
        }),
      ]);

      // One coordinate returns a bare object, many return an array.
      const rows = Array.isArray(wx) ? wx : [wx];
      if (rows.length !== DEPARTEMENTS.length) {
        throw new Error('expected ' + DEPARTEMENTS.length + ' locations, got ' + rows.length);
      }

      // The join is positional — Open-Meteo answers in the order asked. It also
      // echoes location_id, so prefer that and fall back to the index (it omits
      // the field on the first entry).
      let observed = null;
      let sunrise = null;
      let sunset = null;
      rows.forEach((r, i) => {
        const idx = typeof r.location_id === 'number' ? r.location_id : i;
        const dep = DEPARTEMENTS[idx];
        if (!dep || !r.current) return;
        weather[dep[0]] = {
          temp: r.current.temperature_2m,
          feels: r.current.apparent_temperature,
          code: r.current.weather_code,
        };
        observed = observed || r.current.time;
        // Sunrise and sunset run ~50 min apart between Alsace and Brittany, so
        // report the spread rather than pretending France has one of each.
        const sr = r.daily && r.daily.sunrise && r.daily.sunrise[0];
        const ss = r.daily && r.daily.sunset && r.daily.sunset[0];
        if (sr && (!sunrise || sr < sunrise)) sunrise = sr;
        if (ss && (!sunset || ss > sunset)) sunset = ss;
      });

      layer = L.geoJSON(geo, { style: style, onEachFeature: onEachFeature }).addTo(map);
      map.fitBounds(layer.getBounds(), { padding: [10, 10] });
      legend.addTo(map);

      const filled = geo.features.filter(
        (f) => colourFor(f.properties.nom) !== NO_DATA
      ).length;

      setStatus(
        '<strong>' + filled + ' of ' + geo.features.length + '</strong> départements reporting, ' +
        'observed ' + esc(fmtTime(observed)) + ' Paris time, in a single keyless request. ' +
        'Earliest sunrise ' + esc(fmtTime(sunrise)) + ', latest sunset ' + esc(fmtTime(sunset)) + '.'
      );
    } catch (e) {
      setStatus(
        '<span class="wx-error">Could not load the map (' + esc(e.message) + '). ' +
        'Open-Meteo may be rate-limiting, or the geometry failed to fetch.</span>'
      );
    }
  }

  load();
})();
