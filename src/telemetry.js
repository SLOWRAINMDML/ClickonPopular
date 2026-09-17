const EVENT_KEY = 'lumen-loop-events-v1';
const META_KEY = 'lumen-loop-telemetry-meta-v1';
const MAX_EVENTS = 600;
const SESSION_ID = randomId('s');
let consent = false;
let gaLoaded = false;
let flushTimer = null;

function randomId(prefix) {
  const bytes = new Uint8Array(8);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return `${prefix}_${[...bytes].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function clientId() {
  const meta = readJson(META_KEY, {});
  if (!meta.clientId) {
    meta.clientId = randomId('c');
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }
  return meta.clientId;
}

function cleanPayload(payload = {}) {
  return Object.fromEntries(Object.entries(payload)
    .filter(([, value]) => typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)))
    .slice(0, 24));
}

function config() { return globalThis.LUMEN_CONFIG || {}; }

function ensureGa() {
  const id = config().analytics?.gaMeasurementId;
  if (!consent || !id || gaLoaded || typeof document === 'undefined') return;
  gaLoaded = true;
  globalThis.dataLayer = globalThis.dataLayer || [];
  globalThis.gtag = globalThis.gtag || function(){ globalThis.dataLayer.push(arguments); };
  globalThis.gtag('js', new Date());
  globalThis.gtag('config', id, { send_page_view: true });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.append(script);
}

export function initTelemetry(remoteConsent = false) {
  consent = Boolean(remoteConsent);
  ensureGa();
  if (consent && config().analytics?.customEndpoint && !flushTimer) {
    flushTimer = setInterval(flushTelemetry, 30_000);
  }
  track('session_start', { referrer: document.referrer ? 'external' : 'direct' });
}

export function setAnalyticsConsent(value) {
  consent = Boolean(value);
  ensureGa();
  track('analytics_consent', { enabled: consent });
  if (consent && config().analytics?.customEndpoint && !flushTimer) flushTimer = setInterval(flushTelemetry, 30_000);
  if (!consent && flushTimer) { clearInterval(flushTimer); flushTimer = null; }
}

export function track(name, payload = {}) {
  if (typeof localStorage === 'undefined') return;
  const event = {
    ts: Date.now(),
    name,
    clientId: clientId(),
    sessionId: SESSION_ID,
    payload: cleanPayload(payload)
  };
  const events = readJson(EVENT_KEY, []);
  events.push(event);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  localStorage.setItem(EVENT_KEY, JSON.stringify(events));
  if (consent && globalThis.gtag) globalThis.gtag('event', name, event.payload);
  return event;
}

export function telemetrySummary() {
  const events = readJson(EVENT_KEY, []);
  const first = events[0]?.ts || null;
  return { events: events.length, first, last: events.at(-1)?.ts || null, clientId: clientId() };
}

export function clearTelemetry() { localStorage.removeItem(EVENT_KEY); }

export function exportTelemetry(format = 'json') {
  const events = readJson(EVENT_KEY, []);
  let body, type, ext;
  if (format === 'csv') {
    const rows = [['timestamp','event','session','client','payload'], ...events.map(e => [new Date(e.ts).toISOString(), e.name, e.sessionId, e.clientId, JSON.stringify(e.payload)])];
    body = rows.map(row => row.map(value => `"${String(value).replaceAll('"','""')}"`).join(',')).join('\n');
    type = 'text/csv'; ext = 'csv';
  } else {
    body = JSON.stringify(events, null, 2); type = 'application/json'; ext = 'json';
  }
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a'); a.href = url; a.download = `lumen-loop-events-${new Date().toISOString().slice(0,10)}.${ext}`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function flushTelemetry() {
  if (!consent) return false;
  const endpoint = config().analytics?.customEndpoint;
  if (!endpoint) return false;
  const events = readJson(EVENT_KEY, []).slice(-100);
  if (!events.length) return true;
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ events }), keepalive: true });
    return response.ok;
  } catch { return false; }
}
