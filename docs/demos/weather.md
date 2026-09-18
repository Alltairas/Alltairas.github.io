# France Temperature Map

A live choropleth of current temperature across all 96 metropolitan French départements, drawn in your browser
from a single API call. It's a port of `HeatMap_France.ipynb` from [weather_map](https://github.com/Alltairas/APIs/tree/main/weather_map){: target="_blank" },
which built the same map in a notebook — one OpenWeatherMap request per département, authenticated with a
personal key read off my disk. That key is what kept it off this site.

<div id="weather-map"></div>

<p id="weather-status">Loading départements and current conditions…</p>

<!--
Background notes on this port, kept out of the rendered page.

The replacement is Open-Meteo (https://open-meteo.com/): no key, no sign-up, and permissive
CORS headers, so the page can call it directly instead of proxying through a backend. It accepts
comma-separated coordinate lists, which collapses the notebook's 91 sequential requests into ONE
— 96 départements in roughly a fifth of a second. It also reports °C directly, retiring the
notebook's temp_conversion_from_K.

Hover any département for its current temperature, apparent temperature, and sky conditions.
Colours run on fixed −5 °C to +35 °C anchors rather than rescaling to the day's range, so a shade
means the same thing every time you load the page — a grey map is a mild day, not a missing
signal. The scale is continuous rather than bucketed, like the notebook's own colormap: on a
typical day two thirds of France falls inside a single 5 °C bin, which would flatten the
north–south gradient the map exists to show.

Porting surfaced three bugs in the notebook's departments_coords table, all fixed here. It covered
only 91 départements, so Corse-du-Sud, Hauts-de-Seine, Seine-Saint-Denis, Val-d'Oise and
Val-de-Marne had no temperature to colour with. Doubs was listed twice. And five entries carried
coordinates that land in a neighbouring département, quietly reporting somebody else's weather —
Haute-Corse sampled Corse-du-Sud, Mayenne sampled Orne, Orne sampled Calvados, Haute-Marne sampled
Meuse, and Morbihan sat in the Atlantic.

The geometry is the notebook's own France_deps.geojson, simplified from 1.6 MB to 100 KB with a
topology-aware pass so neighbouring départements still share their borders exactly. Rendering is
Leaflet rather than the notebook's Plotly, since the ISS Tracker already loads it — this demo adds
no new dependency.
-->

