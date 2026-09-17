# Alltairas.github.io

Personal site — CV, projects, and occasional blog posts — built with [MkDocs](https://www.mkdocs.org/) and the
[Material](https://squidfunk.github.io/mkdocs-material/) theme, deployed to GitHub Pages via GitHub Actions.

Live at **https://alltairas.github.io/**

## Local development

```bash
pip install -r requirements.txt
mkdocs serve
```

Then open http://127.0.0.1:8000/.

## Structure

- `mkdocs.yml` — site config, theme, nav
- `docs/` — page content (Markdown)
- `.github/workflows/deploy.yml` — builds and pushes to `gh-pages` on every push to `main`

## Deployment

Pushing to `main` triggers the GitHub Action, which runs `mkdocs gh-deploy` and publishes the built site to the
`gh-pages` branch. GitHub Pages is configured (Settings → Pages) to serve from that branch.
