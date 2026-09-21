# Alltairas.github.io

Personal site with my CV, projects, interactive demos and occasional blog posts. Built with
[MkDocs](https://www.mkdocs.org/) and the [Material](https://squidfunk.github.io/mkdocs-material/) theme,
and deployed to GitHub Pages with GitHub Actions.

**Live:** https://alltairas.github.io/

## Interactive demos

| Demo | Based on |
|------|----------|
| Weather map of France | [`APIs/weather_map`](https://github.com/Alltairas/APIs) |
| Strasbourg cinema showtimes (terminal-style) | [`APIs/movie_seanses`](https://github.com/Alltairas/APIs) |
| Live ISS tracker | [`APIs/iss_tracker_API`](https://github.com/Alltairas/APIs) |
| X-ray diffraction rings | [`Physics-simulations-and-graphs`](https://github.com/Alltairas/Physics-simulations-and-graphs) |

## Local development

```bash
pip install -r requirements.txt
mkdocs serve
```

Then open http://127.0.0.1:8000/.

## Structure

```
mkdocs.yml                     Site config, theme, navigation
docs/                          Page content (Markdown)
├── demos/                     One page per interactive demo
├── blog/
└── assets/                    CSS, JS for the demos, images, CV (PDF), GeoJSON data
.github/workflows/deploy.yml   Build + deploy on every push to main
```

## Deployment

Every push to `main` triggers the GitHub Action, which runs `mkdocs gh-deploy` and publishes the built site
to the `gh-pages` branch. GitHub Pages serves the site from that branch (Settings → Pages).
