import $ from 'jquery';
import { icon } from './shell.js';
import { createGlobe } from './globe.js';
import { initialFleet, orbitalVelocity, periodSeconds, formatTime, orbitPoint, makeSample, validateMission } from './model.js';
export function mount(root) {
    const $root = $(root), fleet = initialFleet();
    let selected = fleet[0].id, seconds = 0, last = performance.now(), raf = 0, speed = 1, sampleClock = 0, uiClock = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let paused = reducedMotion, filter = 'all', expanded = false, disposed = false, cmdIndex = 0;
    const timeouts = new Set();
    let preferences = { favorites: [], orbits: true, grid: false };
    try {
        const saved = JSON.parse(localStorage.getItem('orbital.preferences') || 'null');
        if (saved && typeof saved === 'object')
            preferences = { favorites: Array.isArray(saved.favorites) ? saved.favorites.filter((id) => typeof id === 'string').slice(0, 24) : [], orbits: saved.orbits !== false, grid: saved.grid === true };
    }
    catch { /* Storage is optional. The console also works in private mode. */ }
    const selectedCraft = () => fleet.find(craft => craft.id === selected);
    const $label = $root.find('#satellite-label');
    const $globe = $root.find('#globe');
    let globe;
    const later = (fn, ms) => { const timer = setTimeout(() => { timeouts.delete(timer); if (!disposed)
        fn(); }, ms); timeouts.add(timer); };
    const savePreferences = () => { try {
        localStorage.setItem('orbital.preferences', JSON.stringify(preferences));
    }
    catch { /* Device storage is not required. */ } };
    function toast(message) {
        const $toast = $('<div>', { class: 'toast' }).append($(icon('check', 17)), $('<span>').text(message));
        $root.find('#toast-stack').append($toast);
        later(() => $toast.fadeOut(reducedMotion ? 0 : 200, () => $toast.remove()), 3600);
    }
    function event(title, description, symbol = 'check') {
        const row = $('<div>', { class: 'event-row' }).append($('<i>', { class: 'event-icon' }).html(icon(symbol, 14)), $('<div>').append($('<strong>').text(title), $('<span>').text(description)), $('<time>').text(formatTime(seconds)));
        $root.find('#event-list').prepend(row).children().slice(3).remove();
    }
    function renderFleet() {
        const query = String($root.find('#fleet-search').val() || '').trim().toLowerCase();
        const visible = fleet.filter(c => (filter !== 'favorites' || preferences.favorites.includes(c.id)) && `${c.name} ${c.purpose}`.toLowerCase().includes(query));
        const list = $root.find('#fleet-list').empty();
        for (const craft of visible) {
            $('<button>', { type: 'button', class: `fleet-item ${craft.id === selected ? 'selected' : ''}`, 'data-craft': craft.id, 'aria-pressed': String(craft.id === selected) })
                .append($('<i>', { class: 'craft-mark', style: `--craft:${craft.color}` }).html(icon('orbit')), $('<div>').append($('<strong>').text(craft.name), $('<span>').text(craft.purpose)), $('<span>', { class: 'dot green' })).appendTo(list);
        }
        if (!visible.length)
            $('<p>', { class: 'empty-state' }).text(query ? 'No spacecraft match your search.' : 'No starred spacecraft yet. Star one in its details panel.').appendTo(list);
        $root.find('#fleet-count').text(String(fleet.length).padStart(2, '0'));
        $root.find('#fleet-badge,#footer-fleet').text(fleet.length);
        $root.find('[data-filter]').each(function () { const active = $(this).data('filter') === filter; $(this).toggleClass('active', active).attr('aria-pressed', String(active)); });
    }
    function select(id) {
        const craft = fleet.find(c => c.id === id);
        if (!craft)
            throw new Error('Spacecraft not found.');
        selected = id;
        renderFleet();
        $root.find('#detail-name,#chart-craft,#telemetry-title').text(craft.name);
        $root.find('#detail-type').text(craft.purpose);
        $root.find('#detail-id').text(craft.id);
        $root.find('#detail-alt').html(`${craft.altitude.toFixed(1)} <small>km</small>`);
        $root.find('#detail-inclination').html(`${craft.inclination.toFixed(1)}<small>°</small>`);
        $root.find('#detail-period').html(`${(periodSeconds(craft.altitude) / 60).toFixed(1)} <small>min</small>`);
        $root.find('#detail-velocity').html(`${orbitalVelocity(craft.altitude).toFixed(2)} <small>km/s</small>`);
        $label.find('strong').text(craft.name);
        $root.find('#label-alt').text(`${craft.altitude} km`);
        $root.find('#favorite').text(preferences.favorites.includes(id) ? '★' : '☆').attr('aria-pressed', String(preferences.favorites.includes(id))).attr('aria-label', `${preferences.favorites.includes(id) ? 'Unstar' : 'Star'} ${craft.name}`);
        globe?.select();
        updateTelemetry();
    }
    function setSimulation(nextPaused, nextSpeed) {
        if (typeof nextPaused !== 'boolean' || ![1, 10, 60, 300].includes(nextSpeed))
            throw new Error('Use a supported speed: 1, 10, 60, or 300.');
        paused = nextPaused;
        speed = nextSpeed;
        $root.find('#pause').html(icon(paused ? 'play' : 'pause', 15)).attr('aria-label', paused ? 'Resume simulation' : 'Pause simulation');
        $root.find('#sim-speed').val(String(speed));
        $root.find('#sim-state').text(paused ? 'Simulation paused' : `Running at ${speed}×`);
        $root.find('#live-label').text(paused ? 'PAUSED' : 'LIVE SIM');
        $root.find('#update-age').text(paused ? 'paused' : 'updating');
    }
    function showDialog(id) {
        const dialog = $root.find(`#${id}`)[0];
        if (dialog.open)
            return;
        $root.find('dialog[open]').each(function () { this.close(); });
        dialog.showModal();
    }
    function showPlanner() { $root.find('#form-error').empty(); showDialog('mission-dialog'); }
    function previewMission() {
        const altitude = Number($root.find('#mission-alt').val());
        $root.find('#alt-output').text(`${altitude.toLocaleString()} km`);
        $root.find('#inc-output').text(`${$root.find('#mission-inclination').val()}°`);
        $root.find('#preview-period').text(`${(periodSeconds(altitude) / 60).toFixed(1)} min`);
        $root.find('#preview-speed').text(`${orbitalVelocity(altitude).toFixed(2)} km/s`);
    }
    function createMission(name, purpose, altitude, inclination) {
        const cleanName = name.trim().toUpperCase();
        const error = validateMission(cleanName, purpose, altitude, inclination, fleet);
        if (error)
            throw new Error(error);
        const index = fleet.length + 1;
        const craft = { id: `ORB-${String(index).padStart(3, '0')}`, name: cleanName, purpose, altitude, inclination, raan: (index * 47) % 360, phase: .4 + index * .55, color: '#c1f88b', samples: [] };
        craft.samples.push(makeSample(craft, seconds));
        fleet.push(craft);
        filter = 'all';
        $root.find('#fleet-search').val('');
        globe?.sync();
        select(craft.id);
        event(`${craft.name} is in orbit`, `${altitude.toLocaleString()} km altitude · ${inclination}° inclination`, 'rocket');
        toast(`${craft.name} joined your constellation.`);
        return { id: craft.id, name: craft.name, altitude, inclination };
    }
    function renderTelemetryTable() {
        const craft = selectedCraft();
        $root.find('#telemetry-title').text(craft.name);
        const body = $root.find('#telemetry-rows').empty();
        for (const sample of [...craft.samples].slice(-30).reverse())
            $('<tr>').append(...[formatTime(sample.time), `${sample.signal.toFixed(1)} dBm`, `${sample.battery.toFixed(1)}%`, `${sample.altitude.toFixed(1)} km`].map(value => $('<td>').text(value))).appendTo(body);
    }
    function updateTelemetry() {
        const craft = selectedCraft(), sample = craft.samples.at(-1);
        $root.find('#battery-value').text(`${Math.round(sample.battery)}%`);
        $root.find('#battery-bar').css('width', `${sample.battery}%`);
        $root.find('#signal-value').text(`${sample.signal.toFixed(0).replace('-', '−')} dBm`);
        $root.find('#signal-bars i').each(function (index) { $(this).toggleClass('dim', index / 28 > sample.quality / 100); });
        const throughput = fleet.reduce((total, c) => total + 8.7 + c.samples.at(-1).quality * .148, 0);
        const baseline = fleet.reduce((total, c) => total + 8.7 + makeSample(c, 0).quality * .148, 0);
        const change = (throughput / baseline - 1) * 100;
        $root.find('#throughput').text(throughput.toFixed(1));
        $root.find('.mini-trend').text(`${change >= 0 ? '↗' : '↘'} ${Math.abs(change).toFixed(1)}%`);
        const p = orbitPoint(craft, seconds, 1);
        const latitude = Math.asin(p.y) * 180 / Math.PI;
        let longitude = Math.atan2(-p.z, p.x) * 180 / Math.PI - (seconds / 86164 * 360 + .3 * 180 / Math.PI);
        longitude = ((longitude + 540) % 360) - 180;
        $root.find('#coordinates').text(`${Math.abs(latitude).toFixed(2)}° ${latitude >= 0 ? 'N' : 'S'}  ${Math.abs(longitude).toFixed(2)}° ${longitude >= 0 ? 'E' : 'W'}`);
        drawChart();
        if ($root.find('#telemetry-dialog')[0].open)
            renderTelemetryTable();
    }
    const chart = $root.find('#telemetry-chart')[0];
    function drawChart() {
        const ctx = chart.getContext('2d');
        if (!ctx)
            return;
        const width = chart.clientWidth, height = chart.clientHeight;
        if (!width || !height)
            return;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        if (chart.width !== Math.floor(width * ratio) || chart.height !== Math.floor(height * ratio)) {
            chart.width = Math.floor(width * ratio);
            chart.height = Math.floor(height * ratio);
        }
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = '#263240';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        for (const y of [4, height / 2, height - 4]) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        const samples = selectedCraft().samples.slice(-60);
        const points = samples.map((sample, index) => ({ x: Math.max(0, (60 - samples.length + index) / 59 * (width - 8)), y: 4 + (100 - sample.quality) / 50 * (height - 12) }));
        if (!points.length)
            return;
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#a5d77530');
        gradient.addColorStop(1, '#a5d77500');
        ctx.beginPath();
        ctx.moveTo(points[0].x, height);
        for (const p of points)
            ctx.lineTo(p.x, p.y);
        ctx.lineTo(points.at(-1).x, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.beginPath();
        points.forEach((p, index) => index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
        ctx.strokeStyle = '#b9ed89';
        ctx.lineWidth = 1.7;
        ctx.lineJoin = 'round';
        ctx.stroke();
        const latest = points.at(-1);
        ctx.beginPath();
        ctx.arc(latest.x, latest.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#d6ffaa';
        ctx.shadowColor = '#c1f88b';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
        chart.setAttribute('aria-label', `${selectedCraft().name}: ${samples.length} simulated signal samples. Latest quality ${samples.at(-1).quality.toFixed(1)} percent.`);
    }
    const chartObserver = new ResizeObserver(drawChart);
    chartObserver.observe(chart);
    function exportTelemetry() {
        const craft = selectedCraft();
        const header = 'spacecraft,simulation_seconds,signal_dbm,battery_percent,altitude_km,quality_percent';
        const csv = [header, ...craft.samples.map(s => [craft.name, s.time.toFixed(2), s.signal.toFixed(2), s.battery.toFixed(2), s.altitude.toFixed(2), s.quality.toFixed(2)].join(','))].join('\r\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${craft.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}-telemetry.csv`;
        a.click();
        later(() => URL.revokeObjectURL(url), 1000);
        toast(`Telemetry exported for ${craft.name}.`);
    }
    const commands = [
        { label: 'Create a new mission', icon: 'rocket', hint: 'N', run: showPlanner },
        { label: 'Pause or resume simulation', icon: 'play', hint: 'SPACE', run: () => setSimulation(!paused, speed) },
        { label: 'View spacecraft telemetry', icon: 'signal', hint: '', run: () => { renderTelemetryTable(); showDialog('telemetry-dialog'); } },
        { label: 'Export telemetry as CSV', icon: 'download', hint: '', run: exportTelemetry },
        { label: 'Reset orbital camera', icon: 'crosshair', hint: '', run: () => globe?.reset() },
        { label: 'How to use Orbital', icon: 'info', hint: '', run: () => showDialog('help-dialog') },
    ];
    function commandOptions() {
        const query = String($root.find('#command-search').val() || '').toLowerCase();
        return [...commands, ...fleet.map(c => ({ label: `Track ${c.name}`, icon: 'orbit', hint: `${c.altitude} km`, run: () => select(c.id) }))].filter(c => c.label.toLowerCase().includes(query));
    }
    function renderCommands() {
        const matches = commandOptions();
        cmdIndex = Math.min(cmdIndex, Math.max(0, matches.length - 1));
        const list = $root.find('#command-results').empty();
        matches.forEach((command, index) => $('<button>', { class: `command-result ${index === cmdIndex ? 'active' : ''}`, 'data-command': index, 'aria-label': command.label }).append($(icon(command.icon, 17)), document.createTextNode(command.label), $('<span>').text(command.hint)).appendTo(list));
        if (!matches.length)
            $('<div>', { class: 'empty-state' }).text('No matching actions.').appendTo(list);
    }
    function showCommands() { $root.find('#command-search').val(''); cmdIndex = 0; renderCommands(); showDialog('command-dialog'); }
    function runCommand(index) { const command = commandOptions()[index]; if (!command)
        return; $root.find('#command-dialog')[0].close(); command.run(); }
    function action(name) {
        switch (name) {
            case 'planner':
                showPlanner();
                break;
            case 'telemetry':
                renderTelemetryTable();
                showDialog('telemetry-dialog');
                break;
            case 'help':
                showDialog('help-dialog');
                break;
            case 'command':
                showCommands();
                break;
            case 'export':
                exportTelemetry();
                break;
            case 'reset-view':
                globe?.reset();
                toast('Camera centered on Earth.');
                break;
            case 'orbits':
                preferences.orbits = !preferences.orbits;
                globe?.setOrbits(preferences.orbits);
                $root.find('[data-action=orbits]').toggleClass('active', preferences.orbits).attr('aria-pressed', String(preferences.orbits));
                savePreferences();
                break;
            case 'grid':
                preferences.grid = !preferences.grid;
                globe?.setGrid(preferences.grid);
                $root.find('[data-action=grid]').toggleClass('active', preferences.grid).attr('aria-pressed', String(preferences.grid));
                savePreferences();
                break;
            case 'expand':
                expanded = !expanded;
                $root.toggleClass('expanded', expanded);
                $root.find('[data-action=expand]').attr('aria-label', expanded ? 'Restore orbital view' : 'Expand orbital view').attr('aria-pressed', String(expanded));
                break;
        }
    }
    $root.on('click.orbital', '[data-action]', function () { action(String($(this).data('action'))); });
    $root.on('click.orbital', '[data-view=overview]', () => { $root.find('dialog[open]').each(function () { this.close(); }); if (expanded)
        action('expand'); document.getElementById('main')?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth' }); });
    $root.on('click.orbital', '[data-craft]', function () { select(String($(this).data('craft'))); });
    $root.on('input.orbital', '#fleet-search', renderFleet);
    $root.on('click.orbital', '[data-filter]', function () { filter = String($(this).data('filter')); renderFleet(); });
    $root.on('click.orbital', '#favorite', () => { const favorite = preferences.favorites.includes(selected); preferences.favorites = favorite ? preferences.favorites.filter(id => id !== selected) : [...preferences.favorites, selected]; savePreferences(); select(selected); toast(favorite ? 'Spacecraft removed from starred.' : 'Spacecraft added to starred.'); });
    $root.on('click.orbital', '#pause', () => setSimulation(!paused, speed));
    $root.on('change.orbital', '#sim-speed', () => setSimulation(paused, Number($root.find('#sim-speed').val())));
    $root.on('click.orbital', '[data-close]', function () { $(this).closest('dialog')[0].close(); });
    $root.on('click.orbital', 'dialog', function (e) { if (e.target !== this)
        return; const rect = this.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)
        this.close(); });
    $root.on('input.orbital', '#mission-alt,#mission-inclination', previewMission);
    $root.on('submit.orbital', '#mission-form', function (e) {
        e.preventDefault();
        const form = new FormData(this);
        try {
            createMission(String(form.get('name') || ''), String(form.get('purpose') || ''), Number(form.get('altitude')), Number(form.get('inclination')));
            $root.find('#mission-dialog')[0].close();
            this.reset();
            previewMission();
        }
        catch (error) {
            $root.find('#form-error').text(error instanceof Error ? error.message : 'The mission could not be created.');
        }
    });
    $root.on('input.orbital', '#command-search', () => { cmdIndex = 0; renderCommands(); });
    $root.on('click.orbital', '[data-command]', function () { runCommand(Number($(this).data('command'))); });
    $root.on('keydown.orbital', '#command-search', e => { const count = commandOptions().length; if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        cmdIndex = count ? (cmdIndex + (e.key === 'ArrowDown' ? 1 : -1) + count) % count : 0;
        renderCommands();
        $root.find('.command-result.active')[0]?.scrollIntoView({ block: 'nearest' });
    } if (e.key === 'Enter') {
        e.preventDefault();
        runCommand(cmdIndex);
    } });
    $(document).on('keydown.orbital', e => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            showCommands();
            return;
        }
        if (e.key === 'Escape' && expanded && !$root.find('dialog[open]').length) {
            action('expand');
            return;
        }
        if ($(e.target).is('input,textarea,select,button,[contenteditable=true]') || $root.find('dialog[open]').length || e.metaKey || e.ctrlKey || e.altKey)
            return;
        if (e.code === 'Space') {
            e.preventDefault();
            setSimulation(!paused, speed);
        }
        if (e.key.toLowerCase() === 'n')
            showPlanner();
    });
    const assetError = () => toast('Earth texture unavailable. Showing the untextured orbital model.');
    root.addEventListener('asseterror', assetError);
    try {
        globe = createGlobe($globe[0], () => fleet, () => selected, select, (x, y, visible) => {
            $label.css({ display: visible ? 'flex' : 'none', left: Math.max(8, Math.min(x + 12, $globe.width() - $label.outerWidth() - 8)), top: Math.max(80, Math.min(y - 13, $globe.height() - 110)) });
        });
        globe.setGrid(preferences.grid);
        globe.setOrbits(preferences.orbits);
    }
    catch {
        $globe.html('<div class="fallback-globe"><div><strong>3D view unavailable</strong><p>Enable hardware acceleration or try another browser. You can still create missions and explore spacecraft telemetry.</p></div></div>');
        $root.find('.view-tools,.map-coordinates,.globe-legend').hide();
    }
    $root.find('[data-action=orbits]').toggleClass('active', preferences.orbits).attr('aria-pressed', String(preferences.orbits));
    $root.find('[data-action=grid]').toggleClass('active', preferences.grid).attr('aria-pressed', String(preferences.grid));
    select(selected);
    previewMission();
    setSimulation(paused, speed);
    $root.find('#boot-status').text('Constellation connected');
    function frame(now) {
        const delta = document.hidden ? 0 : Math.min((now - last) / 1000, .15);
        last = now;
        if (!paused) {
            seconds += delta * speed;
            sampleClock += delta;
        }
        if (sampleClock >= 1) {
            sampleClock %= 1;
            for (const craft of fleet) {
                craft.samples.push(makeSample(craft, seconds));
                if (craft.samples.length > 180)
                    craft.samples.shift();
            }
            updateTelemetry();
        }
        uiClock += delta;
        if (uiClock > .1) {
            uiClock = 0;
            $root.find('#elapsed').text(formatTime(seconds));
            $root.find('#utc-clock').text(`${new Date().toISOString().slice(11, 19)} UTC`);
        }
        if (!document.hidden)
            globe?.render(seconds);
        raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    // Optional WebMCP uses exactly the same actions as the visible controls.
    const lifecycle = new AbortController();
    const context = document.modelContext;
    const objectInput = (value) => { if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('Expected an object.'); return value; };
    const readState = () => ({ simulated: true, seconds: Math.round(seconds), paused, speed, selected, spacecraft: fleet.map(({ samples, color, phase, raan, ...craft }) => ({ ...craft, telemetry: samples.at(-1) })) });
    const tools = [
        { name: 'read_orbital_state', title: 'Read orbital simulation', description: 'Read the fictional constellation, selected spacecraft, simulation settings, and latest simulated telemetry.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: input => { if (Object.keys(objectInput(input)).length)
                throw new Error('This tool takes no arguments.'); return readState(); } },
        { name: 'select_spacecraft', title: 'Track a spacecraft', description: 'Select an existing spacecraft and update its highlighted orbit and visible telemetry.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: input => { const v = objectInput(input); if (typeof v.id !== 'string' || Object.keys(v).some(k => k !== 'id'))
                throw new Error('Provide a spacecraft id.'); select(v.id); return { selected }; } },
        { name: 'configure_orbital_simulation', title: 'Set simulation playback', description: 'Pause or resume the simulation and set its speed multiplier.', inputSchema: { type: 'object', properties: { paused: { type: 'boolean' }, speed: { type: 'number', enum: [1, 10, 60, 300] } }, required: ['paused', 'speed'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { const v = objectInput(input); if (typeof v.paused !== 'boolean' || typeof v.speed !== 'number' || Object.keys(v).some(k => !['paused', 'speed'].includes(k)))
                throw new Error('Provide a boolean paused value and a supported numeric speed.'); setSimulation(v.paused, v.speed); return { paused, speed }; } },
        { name: 'create_simulated_spacecraft', title: 'Create a simulated spacecraft', description: 'Create a fictional spacecraft in this page session, add its orbital path, and select it. No real launch, remote write, or spending occurs.', inputSchema: { type: 'object', properties: { name: { type: 'string', minLength: 2, maxLength: 24 }, purpose: { type: 'string', enum: ['Earth observation', 'Communications', 'Scientific research', 'Navigation'] }, altitude: { type: 'number', minimum: 250, maximum: 2000 }, inclination: { type: 'number', minimum: 0, maximum: 180 } }, required: ['name', 'purpose', 'altitude', 'inclination'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: input => { const v = objectInput(input); if (typeof v.name !== 'string' || typeof v.purpose !== 'string' || typeof v.altitude !== 'number' || typeof v.inclination !== 'number' || Object.keys(v).some(k => !['name', 'purpose', 'altitude', 'inclination'].includes(k)))
                throw new Error('Provide a name, purpose, altitude, and inclination.'); return createMission(v.name, v.purpose, v.altitude, v.inclination); } },
    ];
    if (context?.registerTool)
        for (const tool of tools) {
            try {
                void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => { });
            }
            catch { /* Unsupported experimental implementation. */ }
        }
    return () => { disposed = true; cancelAnimationFrame(raf); timeouts.forEach(clearTimeout); lifecycle.abort(); chartObserver.disconnect(); globe?.dispose(); root.removeEventListener('asseterror', assetError); $root.off('.orbital'); $(document).off('.orbital'); $root.find('dialog[open]').each(function () { this.close(); }); $root.removeClass('expanded'); };
}
