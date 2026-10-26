// Browser port of the DiffractionRingsSimulation notebooks
// (github.com/Alltairas — powder diffraction, one notebook per X-ray tube target).
//
// The notebooks fix one anode per file and sweep six powders; this page inverts that:
// pick the powder and the tube, and the rings, the detector image and the 1D scan are
// recomputed from scratch in the browser. Everything here is arithmetic — Bragg's law,
// Cromer-Mann scattering factors, Lorentz-polarisation — so unlike the ISS and weather
// demos there is no feed to call and nothing to fail. No plotting library either: the
// three views are hand-drawn on canvas, so this demo adds no CDN dependency.
(function () {
  const root = document.getElementById('xrd-demo');
  if (!root) return;

  const HC = 12.39842; // keV*A  ->  E(keV) = HC / lambda(A)

  // ---- source data -------------------------------------------------------
  // Ka is the intensity-weighted Ka1/Ka2 mean, the value quoted on tube labels.
  // Filter thickness and Ka transmission are Cullity's Table 1-1: the thickness
  // that brings residual I(Kb)/I(Ka) down to about 1/500.
  const TARGETS = {
    Cr: { Z: 24, ka: 2.2910, kb: 2.08487, filter: 'V' },
    Fe: { Z: 26, ka: 1.9373, kb: 1.75661, filter: 'Mn' },
    Co: { Z: 27, ka: 1.7902, kb: 1.62079, filter: 'Fe' },
    Cu: { Z: 29, ka: 1.5418, kb: 1.39222, filter: 'Ni' },
    Mo: { Z: 42, ka: 0.7107, kb: 0.63229, filter: 'Zr' },
  };
  const TARGET_ORDER = ['Cu', 'Co', 'Fe', 'Mo', 'Cr'];

  const FILTERS = {
    V:  { Z: 23, edge: 2.2691, t: 0.016, kaTrans: 0.48 },
    Mn: { Z: 25, edge: 1.8964, t: 0.016, kaTrans: 0.46 },
    Fe: { Z: 26, edge: 1.7433, t: 0.018, kaTrans: 0.46 },
    Ni: { Z: 28, edge: 1.4881, t: 0.021, kaTrans: 0.42 },
    Zr: { Z: 40, edge: 0.6888, t: 0.108, kaTrans: 0.29 },
  };

  const KB_RATIO_RAW = 0.20;        // straight out of the tube, ~1/5
  const KB_RATIO_FILTERED = 1 / 500;

  // ---- sample data -------------------------------------------------------
  // a: room-temperature lattice parameter. B: isotropic Debye-Waller, approximate
  // 293 K. edge/emit: K absorption edge and the Ka the sample would fluoresce —
  // two separate bars the fluorescence check has to clear.
  const METALS = {
    'alpha-Fe': { el: 'Fe', structure: 'BCC', a: 2.8665, B: 0.35, edge: 7.112, emit: 6.404 },
    Ni:         { el: 'Ni', structure: 'FCC', a: 3.5240, B: 0.35, edge: 8.333, emit: 7.478 },
    Cu:         { el: 'Cu', structure: 'FCC', a: 3.6149, B: 0.55, edge: 8.979, emit: 8.048 },
    Al:         { el: 'Al', structure: 'FCC', a: 4.0495, B: 0.85, edge: 1.560, emit: 1.487 },
    W:          { el: 'W',  structure: 'BCC', a: 3.1652, B: 0.20, edge: 69.525, emit: 59.318 },
    Ag:         { el: 'Ag', structure: 'FCC', a: 4.0857, B: 0.65, edge: 25.514, emit: 22.163 },
  };
  const SAMPLE_ORDER = ['alpha-Fe', 'Ni', 'Cu', 'Al', 'W', 'Ag'];

  // Cromer-Mann coefficients (a1,b1,a2,b2,a3,b3,a4,b4,c), International Tables Vol. C.
  const CROMER_MANN = {
    Al: [6.4202, 3.0387, 1.9002, 0.7426, 1.5936, 31.5472, 1.9646, 85.0886, 1.1151],
    Fe: [11.7695, 4.7611, 7.3573, 0.3072, 3.5222, 15.3535, 2.3045, 76.8805, 1.0369],
    Ni: [12.8376, 3.8785, 7.2920, 0.2565, 4.4438, 12.1763, 2.3800, 66.3421, 1.0341],
    Cu: [13.3380, 3.5828, 7.1676, 0.2470, 5.6158, 11.3966, 1.6735, 64.8126, 1.1910],
    Ag: [19.2808, 0.6446, 16.6885, 7.4726, 4.8045, 24.6605, 1.0463, 99.8156, 5.1790],
    W:  [29.0818, 1.7203, 15.4300, 9.2259, 14.4327, 0.3217, 5.1198, 57.0560, 9.8875],
  };

  const MAX_INDEX = 8;
  const I_MIN = 0.1;     // drop anything under 0.1% of the strongest line
  const FWHM_DEG = 0.45; // instrumental + sample broadening
  const SOFT_LINE_keV = 3.0;
  const MAX_RINGS = 20;
  const LABEL_TOP = 10;

  // ---- physics -----------------------------------------------------------

  function reflectionFamilies(maxIndex) {
    const out = [];
    for (let h = maxIndex; h >= 1; h--) {
      for (let k = h; k >= 0; k--) {
        for (let l = k; l >= 0; l--) out.push([h, k, l]);
      }
    }
    const n2 = (t) => t[0] * t[0] + t[1] * t[1] + t[2] * t[2];
    out.sort((p, q) => n2(p) - n2(q) || p[0] - q[0] || p[1] - q[1] || p[2] - q[2]);
    return out;
  }
  const FAMILIES = reflectionFamilies(MAX_INDEX);

  // Equivalent planes in a cubic family {hkl}.
  function multiplicity(h, k, l) {
    const v = [h, k, l].sort((a, b) => b - a);
    const nz = v.filter((x) => x > 0).length;
    if (nz === 1) return 6;                        // {h00}
    if (nz === 2) return v[0] === v[1] ? 12 : 24;  // {hh0} / {hk0}
    if (v[0] === v[1] && v[1] === v[2]) return 8;  // {hhh}
    if (v[0] === v[1] || v[1] === v[2]) return 24; // {hhl}
    return 48;                                     // {hkl}
  }

  // Systematic absences for a monatomic lattice.
  function isAllowed(h, k, l, structure) {
    if (structure === 'BCC') return (h + k + l) % 2 === 0;
    return h % 2 === k % 2 && k % 2 === l % 2; // FCC: all even or all odd
  }

  const cellFactor = (structure) => (structure === 'BCC' ? 2 : 4);

  // Atomic scattering factor at s = sin(theta)/lambda [1/A].
  function f0(element, s) {
    const c = CROMER_MANN[element];
    const s2 = s * s;
    return c[0] * Math.exp(-c[1] * s2) + c[2] * Math.exp(-c[3] * s2)
         + c[4] * Math.exp(-c[5] * s2) + c[6] * Math.exp(-c[7] * s2) + c[8];
  }

  function lorentzPolarization(theta) {
    const c2 = Math.cos(2 * theta);
    return (1 + c2 * c2) / (Math.sin(theta) * Math.sin(theta) * Math.cos(theta));
  }

  // Full peak list for one cubic metal at one wavelength. Reflections with
  // lambda/2d >= 1 lie outside the limiting sphere and simply do not exist —
  // that is what leaves Cr with three rings on alpha-Fe where Mo has thirty-six.
  function powderPattern(sampleKey, lambda) {
    const m = METALS[sampleKey];
    const nF = cellFactor(m.structure);
    const rows = [];
    let maxI = 0;

    for (const [h, k, l] of FAMILIES) {
      if (!isAllowed(h, k, l, m.structure)) continue;
      const n2 = h * h + k * k + l * l;
      const d = m.a / Math.sqrt(n2);
      const sinTheta = lambda / (2 * d);
      if (sinTheta >= 1) continue;

      const theta = Math.asin(sinTheta);
      const s = sinTheta / lambda;
      const f = f0(m.el, s);
      const dw = Math.exp(-2 * m.B * s * s);
      const F = nF * f * dw;
      const I = multiplicity(h, k, l) * F * F * lorentzPolarization(theta);
      if (I > maxI) maxI = I;
      rows.push({ h, k, l, d, twoTheta: theta * 2 * 180 / Math.PI, F, I });
    }

    const out = [];
    for (const r of rows) {
      r.Irel = maxI > 0 ? (100 * r.I) / maxI : 0;
      if (r.Irel >= I_MIN) out.push(r);
    }
    return out;
  }

  // A fluorescent line has to clear two bars before it ruins a pattern: the source
  // must be able to eject a K electron, and the emitted line must be hard enough to
  // reach the detector. Severity then follows how far above the edge the source sits,
  // because the photoelectric cross-section falls off roughly as E^-3.
  function fluorescence(sampleKey, energy) {
    const m = METALS[sampleKey];
    if (energy <= m.edge) {
      return { level: 'none', text: `${energy.toFixed(3)} keV is below the ${m.edge.toFixed(3)} keV K edge of ${m.el} — no K fluorescence.` };
    }
    if (m.emit < SOFT_LINE_keV) {
      return { level: 'negligible', text: `The K edge is cleared, but ${m.el} fluoresces at only ${m.emit.toFixed(3)} keV — that line is absorbed in the air path long before the detector.` };
    }
    const ratio = energy / m.edge;
    const level = ratio < 1.5 ? 'strong' : ratio < 3 ? 'moderate' : 'weak';
    return {
      level,
      text: `${energy.toFixed(3)} keV sits above the ${m.edge.toFixed(3)} keV K edge of ${m.el} (E/E<sub>edge</sub> = ${ratio.toFixed(2)}), so the sample re-emits its own K&alpha; at ${m.emit.toFixed(3)} keV in every direction.`,
    };
  }

  // ---- colour ------------------------------------------------------------
  // Data colours are deliberately not themed: a ring's colour encodes intensity,
  // and recolouring it by scheme would break its agreement with the scale.
  function ramp(stops) {
    return function (t) {
      const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
      const i = Math.min(Math.floor(x), stops.length - 2);
      const u = x - i;
      const a = stops[i], b = stops[i + 1];
      return [
        Math.round(a[0] + u * (b[0] - a[0])),
        Math.round(a[1] + u * (b[1] - a[1])),
        Math.round(a[2] + u * (b[2] - a[2])),
      ];
    };
  }

  const turbo = ramp([
    [48, 18, 59], [70, 107, 203], [62, 155, 228], [47, 201, 190], [91, 233, 124],
    [163, 247, 64], [223, 220, 49], [250, 152, 35], [231, 71, 14], [165, 18, 7],
  ]);

  const inferno = ramp([
    [0, 0, 4], [14, 7, 42], [40, 11, 84], [74, 12, 107], [105, 22, 110],
    [136, 34, 106], [168, 46, 95], [198, 59, 81], [224, 79, 58], [243, 107, 34],
    [251, 155, 6], [252, 212, 46], [252, 255, 164],
  ]);

  const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

  // ---- canvas plumbing ---------------------------------------------------

  function prepare(canvas, cssHeight) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || canvas.parentNode.clientWidth;
    const h = cssHeight || w;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  // Material's own properties, so both schemes follow the palette toggle.
  function themeColors() {
    const cs = getComputedStyle(document.body);
    return {
      fg: cs.getPropertyValue('--md-typeset-color').trim() || '#000',
      bg: cs.getPropertyValue('--md-default-bg-color').trim() || '#fff',
      muted: cs.getPropertyValue('--md-default-fg-color--light').trim() || '#888',
    };
  }

  // Ring radius: arc length on a detector at constant distance, R = D * 2theta.
  // A flat plate would give D*tan(2theta), which diverges at 90 deg and records
  // nothing beyond it — useless for Cr, whose lines sit in back-reflection.
  // Normalised so 180 deg reaches the canvas edge, which keeps the scale fixed
  // across sources: a Mo pattern really is smaller than a Cr one.
  const radiusFrac = (twoTheta) => twoTheta / 180;

  // ---- view 1: labelled rings -------------------------------------------

  function drawRings(canvas, peaks, ghosts, showGhosts) {
    const { ctx, w, h } = prepare(canvas);
    const t = themeColors();
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) / 2 - 10;

    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, w, h);

    // beam centre
    ctx.strokeStyle = t.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy); ctx.lineTo(cx + 5, cy);
    ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 5);
    ctx.stroke();

    if (!peaks.length) {
      ctx.fillStyle = t.fg;
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('no reflection satisfies Bragg’s law', cx, cy - 8);
      ctx.fillText('at this wavelength', cx, cy + 10);
      return;
    }

    // Kb ghosts first, underneath, so the analytical pattern stays on top.
    if (showGhosts) {
      ctx.setLineDash([5, 4]);
      const ghostRings = ghosts.slice().sort((a, b) => b.Irel - a.Irel).slice(0, MAX_RINGS);
      for (const g of ghostRings) {
        const r = radiusFrac(g.twoTheta) * R;
        if (r > R) continue;
        ctx.strokeStyle = `rgba(193,39,45,${Math.min(0.15 + 0.85 * g.Irel / 100, 1).toFixed(3)})`;
        ctx.lineWidth = 0.6 + 1.6 * (g.Irel / 100);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    const byIntensity = peaks.slice().sort((a, b) => b.Irel - a.Irel);
    const drawn = byIntensity.slice(0, MAX_RINGS);
    const labelled = new Set(drawn.slice(0, LABEL_TOP));

    // Draw weakest first so strong rings are never overdrawn.
    drawn.slice().sort((a, b) => a.Irel - b.Irel).forEach((p) => {
      const r = radiusFrac(p.twoTheta) * R;
      if (r > R) return;
      ctx.strokeStyle = rgb(turbo(p.Irel / 100));
      ctx.lineWidth = 0.7 + 3.0 * (p.Irel / 100);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.stroke();
    });

    // Labels on the strongest rings, spread by the golden angle so they don't collide.
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    drawn.forEach((p, i) => {
      if (!labelled.has(p)) return;
      const r = radiusFrac(p.twoTheta) * R;
      if (r > R) return;
      const phi = ((i * 137.5) % 360) * Math.PI / 180;
      const x = cx + r * Math.cos(phi);
      const y = cy - r * Math.sin(phi);
      const label = `(${p.h}${p.k}${p.l})`;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = t.bg;
      ctx.globalAlpha = 0.82;
      ctx.fillRect(x - tw / 2 - 3, y - 7, tw + 6, 14);
      ctx.globalAlpha = 1;
      ctx.fillStyle = t.fg;
      ctx.fillText(label, x, y);
    });
  }

  // ---- view 2: simulated detector image ---------------------------------
  // Each reflection is a Gaussian ridge in 2theta swept into a ring. Built as a 1D
  // radial lookup first, then splatted by radius — one pass over the pixels instead
  // of one pass per peak.
  function drawDetector(canvas, peaks, ghosts, ghostScale) {
    const { ctx, w, h } = prepare(canvas);
    const size = Math.min(w, h);
    const R = size / 2 - 10;
    const cx = w / 2, cy = h / 2;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    if (!peaks.length) return;

    // Fine enough that the Gaussian ridge spans several bins: at FWHM 0.45 deg out
    // of 180, a coarse LUT puts barely two samples across a peak and the rings break
    // up into speckle as neighbouring pixels jump bins.
    const NBINS = 4000;
    const lut = new Float32Array(NBINS);
    const sigmaDeg = FWHM_DEG / 2.3548;

    const add = (list, scale) => {
      for (const p of list) {
        const r0 = radiusFrac(p.twoTheta) * NBINS;
        const dr = radiusFrac(sigmaDeg) * NBINS;
        if (dr <= 0) continue;
        const lo = Math.max(0, Math.floor(r0 - 5 * dr));
        const hi = Math.min(NBINS - 1, Math.ceil(r0 + 5 * dr));
        const amp = p.Irel * scale;
        for (let i = lo; i <= hi; i++) {
          const z = (i - r0) / dr;
          lut[i] += amp * Math.exp(-0.5 * z * z);
        }
      }
    };
    add(peaks, 1);
    if (ghostScale > 0) add(ghosts, ghostScale);

    // log stretch, with the brightest ring slightly saturated so weak rings survive
    let vmax = 0;
    for (let i = 0; i < NBINS; i++) {
      const v = Math.log1p(lut[i]);
      if (v > vmax) vmax = v;
    }
    vmax = Math.max(vmax * 0.6, 1e-9);

    // Two lookups instead of one: the radial profile is normalised to 0..1 here, then
    // interpolated between bins per pixel and only then turned into a colour. Mapping
    // straight from bin to colour would quantise the ramp and band the rings.
    const norm = new Float32Array(NBINS);
    for (let i = 0; i < NBINS; i++) norm[i] = Math.min(Math.log1p(lut[i]) / vmax, 1);

    const cmap = new Uint8Array(256 * 3);
    for (let i = 0; i < 256; i++) {
      const c = inferno(i / 255);
      cmap[i * 3] = c[0]; cmap[i * 3 + 1] = c[1]; cmap[i * 3 + 2] = c[2];
    }

    const dpr = window.devicePixelRatio || 1;
    const img = ctx.createImageData(Math.round(size * dpr), Math.round(size * dpr));
    const px = img.data;
    const n = Math.round(size * dpr);
    const c0 = n / 2;
    const rPix = (R / (size / 2)) * c0;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const dx = x - c0, dy = y - c0;
        const rr = Math.sqrt(dx * dx + dy * dy) / rPix; // 0..1 of plotted radius
        const o = (y * n + x) * 4;
        px[o + 3] = 255;
        if (rr > 1) continue;
        const rf = rr * (NBINS - 1);
        const i0 = Math.floor(rf);
        const i1 = Math.min(NBINS - 1, i0 + 1);
        const u = rf - i0;
        const t = norm[i0] + u * (norm[i1] - norm[i0]);
        const ci = (t * 255) | 0;
        px[o] = cmap[ci * 3];
        px[o + 1] = cmap[ci * 3 + 1];
        px[o + 2] = cmap[ci * 3 + 2];
      }
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.putImageData(img, Math.round((cx - size / 2) * dpr), Math.round((cy - size / 2) * dpr));
    ctx.restore();
  }

  // ---- view 3: the 1D scan ----------------------------------------------

  function drawPattern(canvas, peaks, ghosts, ghostScale, lambdaKa) {
    const { ctx, w, h } = prepare(canvas, 260);
    const t = themeColors();
    const padL = 42, padR = 12, padT = 14, padB = 30;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, w, h);

    const xOf = (deg) => padL + (deg / 180) * plotW;
    const yOf = (v) => padT + plotH - (v / 115) * plotH;

    // axes
    ctx.strokeStyle = t.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();

    ctx.fillStyle = t.muted;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let deg = 0; deg <= 180; deg += 30) {
      const x = xOf(deg);
      ctx.beginPath();
      ctx.moveTo(x, padT + plotH); ctx.lineTo(x, padT + plotH + 4);
      ctx.stroke();
      ctx.fillText(String(deg), x, padT + plotH + 6);
    }
    ctx.save();
    ctx.translate(12, padT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('intensity (a.u.)', 0, 0);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('2θ (degrees)', padL + plotW / 2, h - 13);

    if (!peaks.length) return;

    const sigma = FWHM_DEG / 2.3548;
    const N = Math.max(600, Math.round(plotW * 2));
    const curve = (list, scale) => {
      const ys = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        const deg = (i / (N - 1)) * 180;
        let v = 0;
        for (const p of list) {
          const z = (deg - p.twoTheta) / sigma;
          if (z > -6 && z < 6) v += p.Irel * scale * Math.exp(-0.5 * z * z);
        }
        ys[i] = v;
      }
      return ys;
    };

    const stroke = (ys, color, width, dash) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = padL + (i / (N - 1)) * plotW;
        const y = yOf(Math.min(ys[i], 115));
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    if (ghostScale > 0) stroke(curve(ghosts, ghostScale), 'rgba(193,39,45,0.95)', 1.1, [4, 3]);
    stroke(curve(peaks, 1), '#3f6fd8', 1.3);

    // index the strongest lines
    ctx.font = '600 9px system-ui, sans-serif';
    ctx.fillStyle = t.fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    peaks.slice().sort((a, b) => b.Irel - a.Irel).slice(0, 8).forEach((p) => {
      ctx.fillText(`(${p.h}${p.k}${p.l})`, xOf(p.twoTheta), yOf(Math.min(p.Irel, 108)) - 3);
    });
  }

  // ---- wiring ------------------------------------------------------------

  const els = {
    sample: document.getElementById('xrd-sample'),
    target: document.getElementById('xrd-target'),
    filter: document.getElementById('xrd-filter'),
    filterNote: document.getElementById('xrd-filter-note'),
    banner: document.getElementById('xrd-fluorescence'),
    source: document.getElementById('xrd-source'),
    rings: document.getElementById('xrd-rings'),
    detector: document.getElementById('xrd-detector'),
    pattern: document.getElementById('xrd-pattern'),
    ringCount: document.getElementById('xrd-ringcount'),
  };

  SAMPLE_ORDER.forEach((k) => {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = `${k} — ${METALS[k].structure}, a = ${METALS[k].a.toFixed(4)} Å`;
    els.sample.appendChild(o);
  });
  TARGET_ORDER.forEach((k) => {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = `${k} Kα — ${TARGETS[k].ka.toFixed(4)} Å (${(HC / TARGETS[k].ka).toFixed(3)} keV)`;
    els.target.appendChild(o);
  });
  els.sample.value = 'alpha-Fe';
  els.target.value = 'Cu';

  let state = null;

  function compute() {
    const sampleKey = els.sample.value;
    const targetKey = els.target.value;
    const src = TARGETS[targetKey];
    const flt = FILTERS[src.filter];
    const filterOn = els.filter.checked;
    const energy = HC / src.ka;

    state = {
      sampleKey, targetKey, src, flt, filterOn,
      peaks: powderPattern(sampleKey, src.ka),
      ghosts: powderPattern(sampleKey, src.kb),
      ghostScale: filterOn ? KB_RATIO_FILTERED : KB_RATIO_RAW,
      fluo: fluorescence(sampleKey, energy),
      energy,
    };

    // The filter only works because its K edge falls between Kb and Ka: Kb is just
    // short of the edge and is absorbed hard, Ka just long of it and passes.
    els.filterNote.innerHTML =
      `<strong>${src.filter}</strong> (Z&nbsp;=&nbsp;${flt.Z}), ${flt.t.toFixed(3)}&nbsp;mm &mdash; `
      + `K edge ${flt.edge.toFixed(4)}&nbsp;Å sits between Kβ ${src.kb.toFixed(4)} and Kα ${src.ka.toFixed(4)}Å. `
      + (filterOn
        ? `Kβ cut to ${(KB_RATIO_FILTERED * 100).toFixed(1)}% of Kα; Kα itself down to ${Math.round(flt.kaTrans * 100)}%.`
        : `Without it Kβ carries ${Math.round(KB_RATIO_RAW * 100)}% of Kα — the dashed rings below.`);

    const fl = state.fluo;
    els.banner.className = 'xrd-banner xrd-fluo-' + fl.level;
    els.banner.innerHTML = `<strong>Fluorescence: ${fl.level}</strong> &mdash; ${fl.text}`;

    els.source.innerHTML =
      `${METALS[sampleKey].structure} powder, a = ${METALS[sampleKey].a.toFixed(4)}&nbsp;Å &middot; `
      + `${targetKey} Kα = ${src.ka.toFixed(4)}&nbsp;Å (${energy.toFixed(3)}&nbsp;keV)`;

    els.ringCount.textContent = state.peaks.length
      ? `${state.peaks.length} reflection${state.peaks.length === 1 ? '' : 's'} satisfy Bragg’s law; `
        + `the ${Math.min(MAX_RINGS, state.peaks.length)} strongest are drawn, the ${Math.min(LABEL_TOP, state.peaks.length)} strongest labelled.`
      : 'No reflection satisfies Bragg’s law at this wavelength.';

    render();
  }

  function render() {
    if (!state) return;
    const showGhosts = !state.filterOn;
    drawRings(els.rings, state.peaks, state.ghosts, showGhosts);
    drawDetector(els.detector, state.peaks, state.ghosts, state.ghostScale);
    drawPattern(els.pattern, state.peaks, state.ghosts, state.ghostScale, state.src.ka);
  }

  els.sample.addEventListener('change', compute);
  els.target.addEventListener('change', compute);
  els.filter.addEventListener('change', compute);

  window.addEventListener('load', render);

  let resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 150);
  });

  // Material writes the scheme onto <body>; redraw so canvas text and backgrounds
  // follow the palette toggle the way the CSS-driven demos do for free.
  new MutationObserver(render).observe(document.body, {
    attributes: true, attributeFilter: ['data-md-color-scheme'],
  });

  compute();
})();
