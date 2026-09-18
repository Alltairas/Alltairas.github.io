# Powder Diffraction Rings

Pick a powder and the X-ray tube you want to light it with. The Debye–Scherrer rings, the detector image and
the θ–2θ scan below are all computed in your browser from Bragg's law — no server, no plotting library, nothing
pre-rendered. It's a port of
[DiffractionRingsSimulation](https://github.com/Alltairas){: target="_blank" }, a set of notebooks that fix one
anode per file and sweep six powders; this page inverts that and lets you change either side.

<div id="xrd-demo">

  <div class="xrd-controls">
    <div class="xrd-field">
      <label for="xrd-sample">Powder sample</label>
      <select id="xrd-sample"></select>
    </div>
    <div class="xrd-field">
      <label for="xrd-target">X-ray tube target</label>
      <select id="xrd-target"></select>
    </div>
    <div class="xrd-field">
      <label for="xrd-filter">β-filter</label>
      <label class="xrd-toggle"><input type="checkbox" id="xrd-filter" checked> filter in the beam</label>
      <div class="xrd-note" id="xrd-filter-note"></div>
    </div>
  </div>

  <div class="xrd-banner" id="xrd-fluorescence"></div>

  <div id="xrd-source"></div>

  <div class="xrd-views">
    <div class="xrd-figure">
      <canvas id="xrd-rings"></canvas>
      <div class="xrd-caption"><strong>Debye–Scherrer rings.</strong> Radius follows 2θ, thickness and colour
      follow intensity. Dashed red rings are Kβ contamination, drawn when the filter is out.
      <span id="xrd-ringcount"></span></div>
    </div>
    <div class="xrd-figure">
      <canvas id="xrd-detector"></canvas>
      <div class="xrd-caption"><strong>Simulated area detector.</strong> The same reflections as a 2D detector
      records them — each broadened into a Gaussian ridge in 2θ, log intensity.</div>
    </div>
  </div>

  <div class="xrd-figure">
    <canvas id="xrd-pattern"></canvas>
    <div class="xrd-caption"><strong>θ–2θ scan.</strong> A radial cut through the rings, which is what a
    point-detector diffractometer records. Blue is Kα, dashed red is the Kβ ghost.</div>
  </div>

</div>

## Reading it

A powder holds crystallites in every orientation, so a reflection isn't a spot — it sweeps a cone of half-angle
2θ around the beam and lands as a full circle. Ring radius therefore encodes 2θ, which encodes the d-spacing,
which encodes the lattice parameter.

**Which rings exist** is the structure's fingerprint. BCC extinguishes everything with h+k+l odd, so α-Fe and W
open on (110); FCC needs h, k, l all odd or all even, so Cu, Ni, Al and Ag open on (111). The gaps carry as much
information as the rings.

**Switching the tube** changes what's reachable, because a plane can only diffract if d ≥ λ/2. Cr Kα at 2.2910 Å
leaves α-Fe just three rings, flung out towards back-reflection. Mo Kα at 0.7107 Å finds thirty-six and packs
them into the middle of the detector. Same crystal, same planes — only how many are reachable changes.

**The fluorescence banner** is not part of the diffraction; it doesn't move a ring. It's a warning about whether
the pattern is measurable at all. If the incident photon clears the sample's K absorption edge, the sample
re-emits its own characteristic X-rays in every direction and the detector drowns in background. Cu Kα
(8.042 keV) sits just above the Fe K edge (7.112 keV), which is why α-Fe on a copper tube is flagged red — and
why a metallurgy lab buys a cobalt tube, whose 6.926 keV falls just below that edge. Aluminium clears its own
edge under every tube here but fluoresces at 1.487 keV, too soft to survive the air path, so it grades as
negligible rather than as a problem.

**The filter switch** takes the β-filter out of the beam. Kβ is shorter than Kα, so every ghost ring sits at a
slightly smaller angle than its parent — enough to be misread as a second phase. The filter is never a free
choice: it's the element with Z−1 or Z−2 relative to the target, picked so its K absorption edge falls between
Kβ and Kα, absorbing one and passing the other.

<!--
Notes on this port, kept out of the rendered page.

The notebooks are the reference implementation; this is a straight translation of their
engine — reflection families reduced by cubic symmetry, multiplicity, Cromer-Mann f0(sin(theta)/lambda),
Debye-Waller, Lorentz-polarisation — into JavaScript. Values were checked against the
executed notebooks: alpha-Fe(110) at 44.71 deg under Cu Ka, Cu(111) at 43.35, Al(111) at
38.50, all matching the published powder values to within the Ka-mean vs Ka1 offset.

Ring radius uses the curved-detector convention, R = D * 2theta (arc length), not the flat
plate's D * tan(2theta). The flat form diverges at 90 deg and records nothing beyond it,
which would silently delete most of a Cr pattern — exactly the case the page exists to show.
Scale is fixed at 180 deg = canvas edge rather than auto-fitted per selection, so switching
tubes moves the rings instead of rescaling the axes underneath them.

No charting library. The three views are hand-drawn on canvas, so unlike the ISS and weather
demos this page adds no CDN dependency and makes no network request at all. The detector
image builds a 1D radial lookup and splats it by pixel radius, one pass over the pixels
rather than one per peak, which keeps a 36-ring Mo pattern instant.

Not modelled: sample absorption, preferred orientation, instrumental aberrations, air
scatter, the Ka1/Ka2 doublet, and the fluorescence background itself (graded, not simulated).
Peak widths are a single fixed FWHM rather than a Caglioti curve. Cubic cells only.
-->
