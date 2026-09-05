export const icon = (name: string, size = 20) => {
  const paths: Record<string, string> = {
    orbit: '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-35 12 12)"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    signal: '<path d="M3 20v-3m6 3v-7m6 7V9m6 11V4"/>',
    rocket: '<path d="M12 14l-3-3c2-5 5-8 12-8 0 7-3 10-8 12Zm-3-3H5l-3 5 7-1m4 0 0 4-5 3 1-7M5 19l-2 2"/><circle cx="16" cy="8" r="1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    crosshair: '<circle cx="12" cy="12" r="7"/><path d="M12 1v5m0 12v5M1 12h5m12 0h5"/>',
    layers: '<path d="m12 3 10 5-10 5L2 8Zm-10 10 10 5 10-5M2 18l10 5 10-5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
    expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    play: '<path d="m8 4 13 8-13 8Z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    command: '<path d="M9 7V4a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v16a2 2 0 1 0 2-2H7a2 2 0 1 0 2 2Z"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.orbit}</svg>`;
};

export const shell = `
<a class="skip-link" href="#main">Skip to mission control</a>
<div class="app-shell">
  <aside class="rail" aria-label="Workspace tools">
    <a class="brand-symbol" href="#main" aria-label="Orbital home">${icon('orbit', 31)}</a>
    <div class="rail-group">
      <button class="rail-button active" data-view="overview" aria-label="Orbital overview" title="Orbital overview">${icon('grid')}</button>
      <button class="rail-button" data-action="planner" aria-label="Mission planner" title="Mission planner">${icon('rocket')}</button>
      <button class="rail-button" data-action="telemetry" aria-label="Telemetry history" title="Telemetry history">${icon('signal')}</button>
    </div>
    <div class="rail-bottom"><button class="rail-button" data-action="help" aria-label="How to use Orbital" title="How to use Orbital">${icon('info')}</button><div class="avatar" title="Local operator">OP</div></div>
  </aside>
  <div class="workspace">
    <header class="topbar">
      <a class="wordmark" href="#main">ORBITAL<span>MISSION CONTROL</span></a>
      <div class="topbar-right"><span class="simulation-label"><i></i> SIMULATION</span><time id="utc-clock" class="mono">00:00:00 UTC</time><button class="command-trigger" data-action="command" aria-label="Open command menu">${icon('search',16)}<span>Quick actions</span><kbd>⌘ K</kbd></button></div>
    </header>
    <main id="main">
      <div class="page-heading"><div><div class="eyebrow">YOUR WINDOW INTO ORBIT</div><h1>Mission control<span class="heading-dot">.</span></h1><p>A little perspective. A world of possibilities.</p></div><button class="button primary" data-action="planner">${icon('plus',18)} New mission</button></div>
      <section class="metrics" aria-label="Constellation summary">
        <div class="metric"><span class="metric-label">Spacecraft in orbit ${icon('orbit',16)}</span><div><strong id="fleet-count">06</strong><span class="metric-note"><i class="dot green"></i> All systems nominal</span></div><div class="metric-track"><i style="width:100%"></i></div></div>
        <div class="metric"><span class="metric-label">Ground stations ${icon('globe',16)}</span><div><strong>04<span class="metric-unit"> / 04</span></strong><span class="metric-note">Network online</span></div><div class="station-track"><i></i><i></i><i></i><i></i></div></div>
        <div class="metric"><span class="metric-label">Downlink throughput ${icon('signal',16)}</span><div><strong id="throughput">128.4</strong><span class="metric-unit">Mbps</span><span class="mini-trend">↗ 8.2%</span></div><svg class="metric-spark" viewBox="0 0 280 20" preserveAspectRatio="none" aria-hidden="true"><path d="M0 17 15 14 30 16 45 8 60 12 75 9 90 13 105 5 120 8 135 4 150 7 165 2 180 5 195 3 210 8 225 3 240 4 260 1 280 3"/></svg></div>
        <div class="metric"><span class="metric-label">Simulation elapsed ${icon('clock',16)}</span><div><strong id="elapsed">00:00:00</strong><span class="metric-note" id="sim-state">Running at 1×</span></div><span class="metric-caption">Circular orbit propagation · illustrative model</span></div>
      </section>
      <section class="mission-workspace" aria-label="Orbital operations">
        <aside class="fleet-panel panel">
          <div class="panel-heading"><h2>Constellation</h2><span class="count-badge" id="fleet-badge">6</span></div>
          <div class="fleet-search">${icon('search',16)}<input id="fleet-search" aria-label="Find spacecraft" placeholder="Find a spacecraft…" autocomplete="off"/></div>
          <div class="fleet-tabs" aria-label="Spacecraft filter"><button class="active" data-filter="all" aria-pressed="true">All spacecraft</button><button data-filter="favorites" aria-pressed="false">Starred</button></div>
          <div id="fleet-list" class="fleet-list"><div class="fleet-item selected"><i class="craft-mark" style="--craft:#b8f879">${icon('orbit')}</i><div><strong>AETHER-01</strong><span>Earth observation</span></div><span class="dot green"></span></div></div>
          <div class="fleet-bottom"><span class="dot green"></span><span id="boot-status">Initializing orbital systems</span></div>
        </aside>
        <section class="orbit-panel panel" aria-label="Interactive Earth visualization">
          <div class="orbit-heading"><div><span class="eyebrow">ORBITAL VIEW</span><h2>Earth <span>LEO constellation</span></h2></div><span class="live-badge"><i></i><span id="live-label">LIVE SIM</span></span></div>
          <div id="globe" class="globe" tabindex="0" role="img" aria-label="Interactive Earth and satellite orbits. Drag to rotate, scroll to zoom, or use arrow keys. Select spacecraft from the constellation list."></div>
          <div class="map-coordinates mono"><span id="coordinates">28.61° N &nbsp; 77.21° E</span><span>EARTH-CENTERED FRAME</span></div>
          <div class="view-tools"><button class="map-button active" data-action="orbits" aria-label="Toggle orbital paths" title="Orbital paths" aria-pressed="true">${icon('orbit',18)}</button><button class="map-button" data-action="grid" aria-label="Toggle coordinate grid" title="Coordinate grid" aria-pressed="false">${icon('globe',18)}</button><span></span><button class="map-button" data-action="reset-view" aria-label="Reset camera" title="Reset camera">${icon('crosshair',18)}</button><button class="map-button" data-action="expand" aria-label="Expand orbital view" title="Expand view">${icon('expand',18)}</button></div>
          <div class="globe-legend"><span><i class="dot lime"></i> Selected spacecraft</span><span><i class="dot cyan"></i> Constellation</span></div>
          <div id="satellite-label" class="satellite-label"><span class="dot lime"></span><strong>AETHER-01</strong><span id="label-alt">550 km</span></div>
          <div class="map-bottom"><span>${icon('orbit',15)} Drag to explore · scroll to zoom</span><div><button id="pause" class="play-button" aria-label="Pause simulation">${icon('pause',15)}</button><label class="sr-only" for="sim-speed">Simulation speed</label><select id="sim-speed"><option value="1">1× speed</option><option value="10">10× speed</option><option value="60">60× speed</option><option value="300">300× speed</option></select></div></div>
        </section>
        <aside class="details-panel panel" aria-label="Selected spacecraft">
          <div class="panel-heading"><span class="eyebrow">SPACECRAFT DETAILS</span><button id="favorite" class="icon-button" aria-label="Star selected spacecraft" aria-pressed="false">☆</button></div>
          <div class="detail-name"><div class="detail-symbol">${icon('orbit',30)}</div><div><h2 id="detail-name">AETHER-01</h2><span id="detail-type">Earth observation</span></div></div>
          <div class="status-line"><span class="status-pill"><i class="dot green"></i> Operational</span><span class="mono" id="detail-id">ORB-001</span></div>
          <div class="detail-divider"></div>
          <div class="data-pair"><span>Altitude</span><strong id="detail-alt">550.0 <small>km</small></strong></div><div class="data-pair"><span>Orbital velocity</span><strong id="detail-velocity">7.59 <small>km/s</small></strong></div><div class="data-pair"><span>Inclination</span><strong id="detail-inclination">53.0<small>°</small></strong></div><div class="data-pair"><span>Orbital period</span><strong id="detail-period">95.5 <small>min</small></strong></div>
          <div class="detail-divider"></div>
          <div class="health-heading"><span>Battery level</span><strong id="battery-value">94%</strong></div><div class="health-bar"><i id="battery-bar" style="width:94%"></i></div>
          <div class="health-heading signal-heading"><span>Signal strength</span><strong id="signal-value">−62 dBm</strong></div><div id="signal-bars" class="signal-bars">${Array.from({length:28},(_,i)=>`<i style="height:${9+i%5*2}px" class="${i>24?'dim':''}"></i>`).join('')}</div>
          <div class="detail-footer"><span class="dot green"></span> Simulated telemetry · <span id="update-age">updating</span></div>
          <button class="button secondary full" data-action="telemetry">View telemetry ${icon('arrow',16)}</button>
        </aside>
      </section>
      <section class="lower-grid">
        <div class="telemetry-panel panel"><div class="panel-heading"><div><h2>Signal telemetry <span class="subtle">/ <span id="chart-craft">AETHER-01</span></span></h2><p>Downlink quality over the last 60 samples</p></div><span class="chart-key"><i class="dot lime"></i> Signal quality</span></div><div class="chart-wrap"><div class="chart-y"><span>100%</span><span>75%</span><span>50%</span></div><canvas id="telemetry-chart" aria-label="Simulated signal quality over the last 60 samples" role="img"></canvas></div><div class="chart-x mono"><span>60 samples ago</span><span>40</span><span>20</span><span>NOW</span></div></div>
        <div class="events-panel panel"><div class="panel-heading"><h2>Mission activity</h2><span class="subtle mono">THIS SESSION</span></div><div id="event-list"><div class="event-row"><i class="event-icon">${icon('check',14)}</i><div><strong>Constellation connected</strong><span>All six spacecraft are operational</span></div><time>Now</time></div><div class="event-row"><i class="event-icon">${icon('signal',14)}</i><div><strong>Ground network acquired</strong><span>Svalbard · Alaska · Canberra · Madrid</span></div><time>Now</time></div></div></div>
      </section>
      <footer class="page-footer"><span><i class="dot green"></i> All systems nominal <span class="footer-separator">/</span> <span id="footer-fleet">6</span> spacecraft tracked</span><span>FICTIONAL MISSIONS · SIMULATED TELEMETRY <span class="footer-separator">/</span> jQuery powered</span></footer>
    </main>
  </div>
</div>
<dialog id="mission-dialog" aria-labelledby="mission-title"><form id="mission-form"><div class="dialog-heading"><div><span class="eyebrow">EXPAND YOUR CONSTELLATION</span><h2 id="mission-title">Plan a new mission.</h2></div><button type="button" class="icon-button" data-close aria-label="Close mission planner">${icon('close')}</button></div><p class="dialog-intro">Define a spacecraft and watch it join the orbital simulation.</p><label>Spacecraft name<input name="name" id="mission-name" placeholder="e.g. HORIZON-07" maxlength="24" required pattern="[A-Za-z0-9][A-Za-z0-9 _-]{1,23}" title="Use 2–24 letters, numbers, spaces, underscores or hyphens."/></label><label>Mission purpose<select name="purpose"><option>Earth observation</option><option>Communications</option><option>Scientific research</option><option>Navigation</option></select></label><div class="range-heading"><label for="mission-alt">Orbit altitude</label><output id="alt-output">650 km</output></div><input id="mission-alt" name="altitude" type="range" min="250" max="2000" step="25" value="650"/><div class="range-ends"><span>250 km · low orbit</span><span>2,000 km · high orbit</span></div><div class="range-heading"><label for="mission-inclination">Inclination</label><output id="inc-output">65°</output></div><input id="mission-inclination" name="inclination" type="range" min="0" max="180" step="1" value="65"/><div class="range-ends"><span>0° · equatorial</span><span>180° · retrograde</span></div><div class="mission-preview"><div><span>Orbital period</span><strong id="preview-period">97.6 min</strong></div><div><span>Orbital velocity</span><strong id="preview-speed">7.53 km/s</strong></div><div><span>Orbit class</span><strong>LEO</strong></div></div><p class="form-error" id="form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="button secondary" data-close>Cancel</button><button class="button primary" type="submit">${icon('rocket',18)} Launch simulation</button></div></form></dialog>
<dialog id="telemetry-dialog" aria-labelledby="telemetry-title"><div class="dialog-heading"><div><span class="eyebrow">SPACECRAFT TELEMETRY</span><h2 id="telemetry-title">AETHER-01</h2></div><button class="icon-button" data-close aria-label="Close telemetry">${icon('close')}</button></div><p class="dialog-intro">The latest simulated measurements for this spacecraft.</p><div class="telemetry-table-wrap"><table><thead><tr><th>Simulation time</th><th>Signal</th><th>Battery</th><th>Altitude</th></tr></thead><tbody id="telemetry-rows"></tbody></table></div><div class="dialog-actions"><span class="subtle">Illustrative data · this session only</span><button class="button primary" data-action="export">${icon('download',16)} Export CSV</button></div></dialog>
<dialog id="help-dialog" aria-labelledby="help-title"><div class="dialog-heading"><div><span class="eyebrow">WELCOME ABOARD</span><h2 id="help-title">A world at your fingertips.</h2></div><button class="icon-button" data-close aria-label="Close help">${icon('close')}</button></div><div class="help-content"><p>Orbital is an interactive mission control sandbox. All spacecraft are fictional; motion uses a simplified circular orbit model, and telemetry is simulated. Orbit heights are visually expanded for clarity.</p><dl><dt>Explore Earth</dt><dd>Drag the globe to rotate, scroll to zoom, or focus it and use the arrow keys.</dd><dt>Track a spacecraft</dt><dd>Select one from the constellation. Its orbit, position, and telemetry stay connected.</dd><dt>Make time fly</dt><dd>Use the speed control to advance up to 300×. Space pauses and resumes.</dd><dt>Create a mission</dt><dd>Choose an altitude and inclination, then launch your own simulated spacecraft.</dd><dt>Quick actions</dt><dd>Press ⌘K or Ctrl+K. Press N to create a mission and Escape to close a dialog.</dd></dl><p class="subtle">Mission data stays in this page session. The initial chart includes 60 simulated warm-up samples; exports retain the latest 180 samples. Favorites and view preferences are saved on this device. Earth imagery: NASA Goddard Space Flight Center / Reto Stöckli; enhancements by Robert Simmon. Interface powered by jQuery; globe rendered with Three.js.</p></div></dialog>
<dialog id="command-dialog" aria-label="Quick actions"><div class="command-input">${icon('search')}<input id="command-search" placeholder="What would you like to do?" aria-label="Search quick actions" autocomplete="off"/><kbd>ESC</kbd></div><div id="command-results"></div><div class="command-footer">↑ ↓ to navigate <span>↵ to select</span></div></dialog>
<div id="toast-stack" aria-live="polite" aria-atomic="true"></div>
`;
