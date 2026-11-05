# DUALFORCE Motors — original site plus embedded engine model

This fork preserves the full upstream presentation deck and its existing `models.html`, `3d-engine.html`, and `engine.html` pages. The homepage adds one interactive engine-model scroll reveal after the original deck; the original deck's slide script and page content remain intact.

## Build and verify

- `pnpm install --frozen-lockfile` — restore pinned build dependencies.
- `pnpm typecheck` — check the React integration and engine modules.
- `pnpm test:engine` — validate the provisional slider-crank, housing, sectioning, activity lights, and visual RPM mapping.
- `pnpm build` — regenerate the checked-in `assets/dualforce-engine.js` bundle served by GitHub Pages.
- `python3 -m http.server 4173` — preview the static root locally.

The homepage-only integration is mounted by `index.html` and styled by `assets/engine-integration.css`. Edit `src/engine/StandaloneViewer.tsx`, `src/engine/EngineScene.tsx`, or `src/engine/model.ts`, then rebuild and run the checks before committing. The brass-colored large gear is rendered in a satin silver finish; its shape and motion remain unchanged.
