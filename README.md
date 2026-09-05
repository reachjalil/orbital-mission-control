# Orbital — Mission Control

An interactive jQuery orbital sandbox with a native WebGL Earth visualization, fictional spacecraft, simulated telemetry, and an orbital mission planner.

## Run

```sh
npm install
npm run dev
```

Use the URL printed by the development server. `npm run build` creates the production build.

## Explore

- Drag Earth or use arrow keys when the globe is focused. Scroll or use + / − to zoom.
- Select spacecraft in the constellation list or click a visible satellite marker.
- Pause with Space, or change the simulation speed from 1× to 300×.
- Press N to plan a mission; ⌘K / Ctrl+K opens quick actions.
- Create up to 24 spacecraft with configurable altitude and inclination.
- Inspect telemetry and export the latest 180 samples as CSV.
- Star spacecraft and toggle orbit paths or the coordinate grid.

All spacecraft are fictional. Circular orbits use Earth's gravitational parameter and radius. Displayed orbit heights are expanded for legibility. Telemetry is illustrative, with 60 synthetic warm-up samples for the initial constellation. Simulation time stops while the page is hidden. Missions remain in the current page session; starred spacecraft and layer preferences use device-local browser storage. Reduced-motion preferences start the simulation paused.

jQuery 4 is the only runtime dependency. The entire application uses plain JavaScript, jQuery, CSS, Canvas 2D, and native WebGL. Vite is used only for local development and bundling. There is no React, JSX, component framework, Three.js, or server runtime.

An optional, feature-detected WebMCP interface exposes read state, spacecraft selection, playback configuration, and simulated spacecraft creation through the same functions as the interface.

## Earth image credit

NASA Goddard Space Flight Center / Reto Stöckli; enhancements by Robert Simmon.

- [Blue Marble source record](https://visibleearth.nasa.gov/view.php?id=57752)
- [Original 2048 × 1024 texture](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57752/land_shallow_topo_2048.jpg)
- [NASA Earth imagery reuse guidance](https://science.nasa.gov/earth/faq/)

NASA imagery does not imply NASA endorsement.

## Public site

[Open Orbital](https://reachjalil.github.io/orbital-mission-control/) · [Watch the 29-second demo](https://reachjalil.github.io/orbital-mission-control/orbital-demo.mp4)

GitHub Pages serves the committed `docs/` output from `main`. To publish an update:

```sh
npm ci
npm run build:pages
npm run check
# Commit the source and regenerated docs/ output, then push main.
```

To preview the exact static build locally, run `npm run preview:pages` and open the printed URL with `/orbital-mission-control/` appended.

Fonts are Geist and Geist Mono, distributed under the SIL Open Font License included in `public/fonts/`.
