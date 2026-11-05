# DUALFORCE 350 — Powertrain Study

A static GitHub Pages site with a reference-inspired Three.js inline-twin engine model. It presents preliminary concept specifications and explicitly separates proposed electromagnetic behavior from validated performance.

## Develop and verify

- `pnpm install --frozen-lockfile` — restore pinned dependencies.
- `pnpm typecheck` — check the React integration and copied engine modules.
- `pnpm test:engine` — validate slider-crank geometry, housing, sectioning, activity lights, and RPM mapping.
- `pnpm build` — regenerate the checked-in `assets/dualforce-engine.js` bundle served by GitHub Pages.
- `python3 -m http.server 4173` — preview the static root locally.

Edit `src/engine/StandaloneViewer.tsx`, `src/engine/EngineScene.tsx`, and `assets/site.css`; rebuild the bundle before committing. Legacy `models.html`, `3d-engine.html`, and `engine.html` routes redirect to the consolidated home page.
