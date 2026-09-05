export const EARTH_RADIUS = 6371;
export const MU = 398600.4418;
export const periodSeconds = (altitude) => 2 * Math.PI * Math.sqrt((EARTH_RADIUS + altitude) ** 3 / MU);
export const orbitalVelocity = (altitude) => Math.sqrt(MU / (EARTH_RADIUS + altitude));
export function orbitPoint(craft, seconds, radius = 1.24 + craft.altitude / 4200) {
    const angle = craft.phase + seconds / periodSeconds(craft.altitude) * Math.PI * 2;
    const inclination = craft.inclination * Math.PI / 180;
    const raan = craft.raan * Math.PI / 180;
    const x = radius * Math.cos(angle), z = radius * Math.sin(angle) * Math.cos(inclination), y = radius * Math.sin(angle) * Math.sin(inclination);
    return { x: x * Math.cos(raan) - z * Math.sin(raan), y, z: x * Math.sin(raan) + z * Math.cos(raan) };
}
export const formatTime = (seconds) => {
    const value = Math.floor(Math.abs(seconds));
    return (seconds < 0 ? '−' : '') + [Math.floor(value / 3600), Math.floor(value / 60) % 60, value % 60].map(n => String(n).padStart(2, '0')).join(':');
};
export function makeSample(craft, time) {
    const index = Number(craft.id.slice(4)) || 1;
    const phase = time / 34 + index * .7;
    const quality = Math.min(99.5, Math.max(50, 85 + Math.sin(phase) * 5 + Math.sin(phase * 3.3) * 2 + Math.cos(phase * 8.4) * 1.3));
    return { time, quality, battery: Math.min(100, 91 + Math.cos(time / 500 + index * .35) * 5), altitude: craft.altitude, signal: -62 + (quality - 85) * .8 };
}
export function initialFleet() {
    const definitions = [
        { id: 'ORB-001', name: 'AETHER-01', purpose: 'Earth observation', altitude: 550, inclination: 53, raan: 25, phase: .6, color: '#c1f88b' },
        { id: 'ORB-002', name: 'KEPLER-02', purpose: 'Scientific research', altitude: 720, inclination: 97, raan: 110, phase: 2.2, color: '#79d7d9' },
        { id: 'ORB-003', name: 'NOVA-03', purpose: 'Communications', altitude: 850, inclination: 45, raan: 75, phase: 4.3, color: '#bdabf0' },
        { id: 'ORB-004', name: 'SENTINEL-04', purpose: 'Earth observation', altitude: 480, inclination: 72, raan: 155, phase: 1.7, color: '#e9ba7a' },
        { id: 'ORB-005', name: 'PULSAR-05', purpose: 'Navigation', altitude: 1100, inclination: 30, raan: 15, phase: 5.4, color: '#8baae9' },
        { id: 'ORB-006', name: 'VOYAGER-06', purpose: 'Scientific research', altitude: 1400, inclination: 115, raan: 200, phase: 3.1, color: '#df9db4' },
    ];
    return definitions.map(craft => { const full = { ...craft, samples: [] }; full.samples = Array.from({ length: 60 }, (_, i) => makeSample(full, i - 59)); return full; });
}
export function validateMission(name, purpose, altitude, inclination, fleet) {
    if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{1,23}$/.test(name))
        return 'Use a name with 2–24 letters, numbers, spaces, underscores, or hyphens.';
    if (!['Earth observation', 'Communications', 'Scientific research', 'Navigation'].includes(purpose))
        return 'Choose a valid mission purpose.';
    if (!Number.isFinite(altitude) || altitude < 250 || altitude > 2000)
        return 'Choose an altitude between 250 and 2,000 km.';
    if (!Number.isFinite(inclination) || inclination < 0 || inclination > 180)
        return 'Choose an inclination between 0° and 180°.';
    if (fleet.some(c => c.name.toLowerCase() === name.toLowerCase()))
        return 'That spacecraft name is already in your constellation.';
    if (fleet.length >= 24)
        return 'This simulation supports up to 24 spacecraft. Reload to start a fresh session.';
    return null;
}
