# DUALFORCE Motors — original site plus interactive engine

This review branch preserves the full upstream ten-slide homepage deck, its nested slide navigation and source assets, plus the complete existing `models.html`, `3d-engine.html`, and `engine.html` pages. The homepage appends a single small-to-large engine scroll reveal after the deck; existing content, claims, and legacy page interactions remain in place. A shared restrained automotive theme restyles the pages without deleting their information.

## Appended viewer controls

The embedded provisional inline-twin model includes four camera presets and reset, drag/orbit, wheel-zoom mode, pinch and button zoom, Auto-orbit, a 400–7,200 RPM reference slider, Play/Pause and 10% slow inspection, continuous explode and lengthwise case-opening sliders with end-state and reset buttons, Solid/Transparent case, longitudinal section, annotations and three label modes, projected clickable labels with component details, all eight visibility groups, and the proposed coil-activity layer. Secondary groups start collapsed to keep the model visible; all controls remain available.

The RPM slider is a visual reference, not a claim of physical shaft speed. At 2,800 RPM it renders a comfortable 0.56 visible revolutions per second; the separate 10% inspection mode is slower. The geometry and electromagnetic layer remain provisional visualizations, not manufacturing CAD or experimentally verified performance.

## Build and verify

- `pnpm install --frozen-lockfile` — restore pinned build dependencies.
- `pnpm typecheck` — check the React integration and engine modules.
- `pnpm test:engine` — validate the provisional slider-crank, housing, sectioning, activity lights, and visual RPM mapping.
- `pnpm build` — regenerate the checked-in `assets/dualforce-engine.js` bundle served by GitHub Pages.
- `python3 -m http.server 4173` — preview the static root locally.

The homepage mount is in `index.html`; its scroll stage is styled by `assets/engine-integration.css`, while `assets/dualforce-premium-theme.css` contains shared site overrides. Edit `src/engine/StandaloneViewer.tsx`, `src/engine/EngineScene.tsx`, or `src/engine/model.ts`, then rebuild and run the checks. The provisional crankshaft assembly omits the gear pair; the shaft, crank webs, bearings and flywheel remain.
