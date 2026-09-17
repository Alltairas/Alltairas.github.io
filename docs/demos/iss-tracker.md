# ISS Tracker

A live position tracker for the International Space Station, running entirely in your browser: no server behind
this page. It's a client-side rewrite of a Flask app I built earlier, [iss_tracker_API](https://github.com/Alltairas/APIs/tree/main/iss_tracker_API){: target="_blank" }
on GitHub, which polled the same kind of feed from a Python backend and served a Folium map. Here the polling,
the map, and the ground-track accumulation all happen in JavaScript instead.

<div id="iss-map" style="height: 500px; border-radius: 4px;"></div>

<p id="iss-info" style="margin-top: 1rem;">Loading current position…</p>

<a href="#" id="iss-reset" class="md-button">:material-restart: Reset trace</a>

Position, altitude, and velocity come from [wheretheiss.at](https://wheretheiss.at/){: target="_blank" }, polled
every 5 seconds. The green ground track is accumulated locally in your browser and resets on reload or with the
button above.
