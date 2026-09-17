import { DEFAULT_LIVEOPS, mergeLiveOps } from './liveops.js';

const CONFIG_CACHE_KEY = 'lumen-loop-liveops-cache-v1';
const PROFILE_KEY = 'lumen-loop-service-profile-v1';

function cfg() { return globalThis.LUMEN_CONFIG || {}; }
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function writeJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
function randomId() {
  const bytes = new Uint8Array(8);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes); else for (let i=0;i<bytes.length;i++) bytes[i]=Math.floor(Math.random()*256);
  return `pilot_${[...bytes].map(v=>v.toString(16).padStart(2,'0')).join('')}`;
}

export function serviceProfile() {
  let profile = readJson(PROFILE_KEY, null);
  if (!profile) { profile = { pilotId: randomId(), createdAt: Date.now(), cloudStatus: 'local' }; writeJson(PROFILE_KEY, profile); }
  return profile;
}

export async function fetchLiveOps() {
  const url = cfg().liveOps?.configUrl || './liveops.json';
  const cached = readJson(CONFIG_CACHE_KEY, null);
  try {
    const response = await fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`liveops ${response.status}`);
    const json = await response.json();
    const merged = mergeLiveOps(json);
    writeJson(CONFIG_CACHE_KEY, { ts: Date.now(), config: merged });
    return { config: merged, source: 'remote', syncedAt: Date.now() };
  } catch {
    if (cached?.config) return { config: mergeLiveOps(cached.config), source: 'cache', syncedAt: cached.ts || 0 };
    return { config: DEFAULT_LIVEOPS, source: 'default', syncedAt: 0 };
  }
}

function serviceApiBase() { return String(cfg().service?.apiBase || '').replace(/\/$/,''); }

export function cloudCapability() {
  const base = serviceApiBase();
  return { configured: Boolean(base), mode: base ? 'server' : 'local', base };
}

export async function syncCloudSave(state) {
  const base = serviceApiBase();
  if (!base) return { ok: false, reason: 'not_configured' };
  const profile = serviceProfile();
  try {
    const response = await fetch(`${base}/v1/save`, {
      method: 'PUT', credentials: 'include', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pilotId: profile.pilotId, clientVersion: state.version, save: state })
    });
    if (!response.ok) return { ok: false, reason: `http_${response.status}` };
    profile.cloudStatus = 'synced'; profile.lastSyncAt = Date.now(); writeJson(PROFILE_KEY, profile);
    return { ok: true, data: await response.json().catch(()=>({})) };
  } catch { return { ok: false, reason: 'network' }; }
}

export async function fetchCloudSave() {
  const base = serviceApiBase(); if (!base) return { ok:false, reason:'not_configured' };
  const profile = serviceProfile();
  try {
    const response = await fetch(`${base}/v1/save?pilotId=${encodeURIComponent(profile.pilotId)}`, { credentials:'include', headers:{accept:'application/json'} });
    if (!response.ok) return { ok:false, reason:`http_${response.status}` };
    return { ok:true, data:await response.json() };
  } catch { return { ok:false, reason:'network' }; }
}

export async function fetchLeaderboard(board='weekly_lumens') {
  const base = serviceApiBase(); if (!base) return { ok:false, reason:'not_configured', entries:[] };
  try {
    const response = await fetch(`${base}/v1/leaderboard/${encodeURIComponent(board)}`, { credentials:'include', headers:{accept:'application/json'} });
    if (!response.ok) return { ok:false, reason:`http_${response.status}`, entries:[] };
    const data = await response.json(); return { ok:true, entries:Array.isArray(data.entries)?data.entries:[] };
  } catch { return { ok:false, reason:'network', entries:[] }; }
}
