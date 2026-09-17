import {
  SAVE_KEY, GENERATORS, RELICS, CONTRACTS, createDefaultState, normalizeState,
  costForAmount, affordableAmount, buyGenerator, passiveRate, tapValue, registerTap,
  tick, claimContract, contractProgress, totalOwned, prestigeGain, ascend, relicCost,
  buyRelic, activatePulse, cometReward, applyOfflineReward, dailyStatus, claimDaily, currentZone, updateAchievements,
  rewardedAdStatus, grantRewardedBoost, canShowInterstitial, markInterstitialShown
} from './game.js';
import { sfx } from './audio.js';
import { showRewarded, showInterstitial, adProviderStatus } from './monetization.js';
import { initTelemetry, setAnalyticsConsent, track, telemetrySummary, exportTelemetry, clearTelemetry } from './telemetry.js';

const $ = (q, el = document) => el.querySelector(q);
const $$ = (q, el = document) => [...el.querySelectorAll(q)];

function load() {
  try { return normalizeState(JSON.parse(localStorage.getItem(SAVE_KEY))); }
  catch { return createDefaultState(); }
}
let state = load();
let lastFrame = performance.now();
let saveTimer = 0;
let activeTab = 'forge';
let offlineShown = false;
let adPaused = false;
let rewardedBusy = false;

const initialOffline = applyOfflineReward(state);
state = initialOffline.state;
if (initialOffline.reward > 1) offlineShown = true;
initTelemetry(state.settings.analytics);
track('game_loaded', { version: state.version, offlineReward: Math.round(initialOffline.reward) });

function save() {
  state.lastSeenAt = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function fmt(n) {
  if (!Number.isFinite(n)) return '∞';
  if (n < 1000) return n < 10 ? n.toFixed(1).replace('.0','') : Math.floor(n).toLocaleString();
  const units = ['K','M','B','T','Qa','Qi','Sx','Sp','Oc'];
  let i = -1;
  while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
  return `${n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : n.toFixed(0)}${units[i]}`;
}

function haptic(ms = 8) {
  if (state.settings.haptics && navigator.vibrate) navigator.vibrate(ms);
}

function toast(text, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = text;
  $('#toasts').append(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); }, 1600);
}

function burst(x, y, count = 7) {
  if (!state.settings.motion) return;
  const root = $('#fx-layer');
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'spark';
    p.style.left = `${x}px`; p.style.top = `${y}px`;
    p.style.setProperty('--dx', `${(Math.random() - .5) * 100}px`);
    p.style.setProperty('--dy', `${-30 - Math.random() * 90}px`);
    root.append(p);
    setTimeout(() => p.remove(), 700);
  }
}

function floatNumber(x, y, value) {
  const el = document.createElement('div');
  el.className = 'float-number';
  el.textContent = `+${fmt(value)}`;
  el.style.left = `${x}px`; el.style.top = `${y}px`;
  $('#fx-layer').append(el);
  setTimeout(() => el.remove(), 850);
}

function buyCost(g) {
  const owned = state.generators[g.id] || 0;
  if (state.buyMode === 'max') return affordableAmount(g, owned, state.lumens);
  const amount = Number(state.buyMode);
  return { amount, cost: costForAmount(g, owned, amount) };
}

function renderGenerators() {
  const host = $('#generator-list');
  host.innerHTML = GENERATORS.map(g => {
    const owned = state.generators[g.id] || 0;
    const quote = buyCost(g);
    const rate = owned * g.baseRate;
    const locked = owned === 0 && state.lifetimeLumens < g.baseCost * 0.35 && g.id !== 'sparkDrone';
    return `<article class="generator-card ${locked ? 'locked' : ''}" data-id="${g.id}">
      <div class="generator-icon">${g.icon}</div>
      <div class="generator-copy"><div class="generator-title"><strong>${g.name}</strong><span>Lv ${owned}</span></div>
      <p>${g.blurb}</p><small>base ${fmt(rate)}/s · milestone boosts at 10/25/50/100</small></div>
      <button class="buy-btn" ${quote.amount < 1 || quote.cost > state.lumens ? 'disabled' : ''} data-buy="${g.id}">
        <span>BUY ${state.buyMode === 'max' ? `MAX (${quote.amount})` : `×${state.buyMode}`}</span><b>${fmt(quote.cost)} ✦</b>
      </button>
    </article>`;
  }).join('');
}

function renderMonetization(now = Date.now()) {
  const status = rewardedAdStatus(state, now);
  const provider = adProviderStatus();
  const activeSeconds = Math.ceil(status.boostMs / 1000);
  const cooldownSeconds = Math.ceil(status.cooldownMs / 1000);
  const btn = $('#rewarded-ad-btn');
  if (!btn) return;
  const unavailable = provider.provider === 'disabled' || !provider.configured;
  btn.disabled = rewardedBusy || unavailable || !status.canWatch;
  if (rewardedBusy) btn.textContent = 'LOADING…';
  else if (unavailable) btn.textContent = 'ADS NOT CONFIGURED';
  else if (status.remaining <= 0) btn.textContent = 'DAILY LIMIT REACHED';
  else if (cooldownSeconds > 0) btn.textContent = `READY IN ${cooldownSeconds}s`;
  else btn.textContent = provider.isMock ? 'TEST REWARDED AD' : 'WATCH AD';
  $('#rewarded-title').textContent = activeSeconds > 0 ? `Sponsor boost active · ×2 for ${activeSeconds}s` : 'Watch an ad · ×2 Lumen output';
  $('#rewarded-status').textContent = `${status.remaining}/${status.dailyLimit} rewards left today · 5 min each${provider.isMock ? ' · MOCK MODE' : ''}`;
  const supportUrl = globalThis.LUMEN_CONFIG?.support?.url || '';
  const support = $('#support-btn');
  support.disabled = !supportUrl;
  support.textContent = supportUrl ? 'SUPPORT' : 'NOT CONFIGURED';
}

function renderContracts() {
  const daily = dailyStatus(state);
  $('#daily-reward').innerHTML = `<div><small>DAILY SPARK</small><strong>${daily.canClaim ? `Day ${daily.nextStreak} cache is ready` : `Day ${state.dailyStreak} claimed`}</strong><span>${daily.canClaim ? `Return bonus: ${fmt(daily.reward)} ✦` : 'Come back tomorrow to extend the streak.'}</span></div><button id="daily-claim" ${daily.canClaim ? '' : 'disabled'}>${daily.canClaim ? 'CLAIM CACHE' : 'CLAIMED'}</button>`;
  const achievementMeta = [
    ['firstTap','First Light','Tap the core once'],['combo5','Hot Hands','Reach ×5 combo'],['rate1k','Machine Heart','Reach 1K/s'],['fleet100','Busy Orbit','Own 100 machines'],['ascend','Born Again','Reignite once']
  ];
  $('#achievement-list').innerHTML = achievementMeta.map(([id,name,desc]) => `<div class="achievement ${state.achievements.includes(id) ? 'unlocked' : ''}"><span>${state.achievements.includes(id) ? '★' : '☆'}</span><div><b>${name}</b><small>${desc}</small></div></div>`).join('');
  $('#contract-list').innerHTML = CONTRACTS.map(c => {
    const p = contractProgress(state, c);
    const ratio = Math.min(1, p / c.target);
    const claimed = state.claimedContracts.includes(c.id);
    const ready = ratio >= 1 && !claimed;
    return `<article class="contract-card ${claimed ? 'claimed' : ''}">
      <div><small>CONTRACT</small><strong>${c.title}</strong><span>${fmt(Math.min(p,c.target))} / ${fmt(c.target)}</span></div>
      <div class="progress"><i style="width:${ratio*100}%"></i></div>
      <button data-claim="${c.id}" ${ready ? '' : 'disabled'}>${claimed ? 'CLAIMED' : `CLAIM +${fmt(c.reward)} ✦`}</button>
    </article>`;
  }).join('');
}

function renderRelics() {
  $('#relic-list').innerHTML = RELICS.map(r => {
    const level = state.relics[r.id] || 0;
    const cost = relicCost(state, r.id);
    return `<article class="relic-card"><div class="relic-icon">${r.icon}</div><div><strong>${r.name}</strong><p>${r.bonus}</p><small>Level ${level}</small></div>
    <button data-relic="${r.id}" ${state.stardust < cost ? 'disabled' : ''}>UPGRADE<br><b>${cost} ✊</b></button></article>`;
  }).join('');
  const gain = prestigeGain(state);
  $('#ascend-btn').disabled = gain <= 0;
  $('#ascend-btn').innerHTML = gain > 0 ? `REIGNITE <b>+${gain} ✪</b>` : `REIGNITE <b>needs 500K lifetime ✦</b>`;
  $('#ascend-copy').textContent = `Reset this run to gain Stardust. Total Stardust permanently boosts all production by +20% each. Current possible gain: ${gain}.`;
}

function renderOrbit() {
  const count = Math.min(12, totalOwned(state));
  const orbit = $('#orbiters');
  orbit.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('i');
    dot.style.setProperty('--i', i); dot.style.setProperty('--n', Math.max(1, count));
    orbit.append(dot);
  }
}

function renderComet(now) {
  const comet = $('#comet');
  if (now >= state.cometReadyAt) comet.classList.add('visible');
  else comet.classList.remove('visible');
}

function renderHUD(now = Date.now()) {
  const rate = passiveRate(state, now);
  $('#lumen-count').textContent = fmt(state.lumens);
  $('#rate-count').textContent = `${fmt(rate)}/s`;
  $('#stardust-count').textContent = fmt(state.stardust);
  $('#tap-value').textContent = `+${fmt(tapValue(state, now))} per tap`;
  $('#combo-label').textContent = `×${state.combo.toFixed(0)}`;
  $('#combo-fill').style.width = `${state.comboHeat}%`;
  $('#owned-count').textContent = totalOwned(state);
  const zone = currentZone(state);
  $('#zone-name').textContent = zone.name;
  document.body.className = zone.className;
  const cooldown = Math.max(0, state.pulseReadyAt - now);
  const active = state.pulseUntil > now;
  $('#pulse-btn').disabled = cooldown > 0 && !active;
  $('#pulse-btn').innerHTML = active ? `PULSE ACTIVE <b>${Math.ceil((state.pulseUntil-now)/1000)}s</b>` : cooldown > 0 ? `PULSE <b>${Math.ceil(cooldown/1000)}s</b>` : 'PULSE <b>×4 / 10s</b>';
  renderComet(now);
}

function renderAll() {
  renderHUD(); renderGenerators(); renderContracts(); renderRelics(); renderOrbit(); renderMonetization();
  $$('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === activeTab));
  $('.buy-modes').classList.toggle('hidden', activeTab !== 'forge');
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
}

function bindDelegates() {
  document.addEventListener('click', (e) => {
    const buy = e.target.closest('[data-buy]');
    if (buy) {
      const result = buyGenerator(state, buy.dataset.buy, state.buyMode);
      if (result.bought) { state = result.state; track('generator_purchase', { generator: buy.dataset.buy, amount: result.bought, spent: Math.round(result.spent) }); sfx('buy', state.settings.sound); haptic(); toast(`Built ×${result.bought}`); renderAll(); save(); }
    }
    const claim = e.target.closest('[data-claim]');
    if (claim) {
      const result = claimContract(state, claim.dataset.claim);
      if (result.reward) { state = result.state; track('contract_claim', { contract: claim.dataset.claim, reward: Math.round(result.reward) }); sfx('claim', state.settings.sound); toast(`Contract +${fmt(result.reward)} ✦`, 'good'); renderAll(); save(); }
    }
    const relic = e.target.closest('[data-relic]');
    if (relic) {
      const result = buyRelic(state, relic.dataset.relic);
      if (result.bought) { state = result.state; track('relic_upgrade', { relic: relic.dataset.relic, cost: result.cost }); sfx('buy', state.settings.sound); toast('Relic upgraded', 'good'); renderAll(); save(); }
    }
    const daily = e.target.closest('#daily-claim');
    if (daily) {
      const result = claimDaily(state);
      if (result.reward) { state = result.state; track('daily_claim', { streak: result.streak, reward: Math.round(result.reward) }); sfx('claim', state.settings.sound); toast(`Daily ×${result.streak} +${fmt(result.reward)} ✦`, 'good'); renderAll(); save(); }
    }
    const nav = e.target.closest('[data-tab]');
    if (nav) { activeTab = nav.dataset.tab; renderAll(); }
    const mode = e.target.closest('[data-mode]');
    if (mode) {
      state.buyMode = mode.dataset.mode === 'max' ? 'max' : Number(mode.dataset.mode);
      $$('.mode-btn').forEach(b => b.classList.toggle('active', b === mode)); renderGenerators();
    }
  });
}

$('#core-button').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const r = e.currentTarget.getBoundingClientRect();
  const x = e.clientX || r.left + r.width/2;
  const y = e.clientY || r.top + r.height/2;
  const result = registerTap(state);
  state = result.state;
  if ([1,100,1000,10000].includes(state.taps)) track('tap_milestone', { taps: state.taps, bestCombo: state.bestCombo });
  sfx('tap', state.settings.sound); haptic(5); burst(x, y); floatNumber(x, y, result.value);
  e.currentTarget.classList.remove('pop'); void e.currentTarget.offsetWidth; e.currentTarget.classList.add('pop');
  renderHUD();
});

$('#pulse-btn').addEventListener('click', () => {
  const result = activatePulse(state);
  if (result.activated) { state = result.state; track('pulse_activate'); sfx('pulse', state.settings.sound); haptic(18); toast('Production ×4!', 'good'); renderAll(); save(); }
});

$('#comet').addEventListener('click', () => {
  const result = cometReward(state); state = result.state; track('comet_claim', { reward: Math.round(result.reward) }); sfx('comet', state.settings.sound); haptic([12,35,12]); toast(`Comet cache +${fmt(result.reward)} ✦`, 'good'); renderAll(); save();
});

$('#ascend-btn').addEventListener('click', async () => {
  const gain = prestigeGain(state);
  if (!gain) return;
  if (!confirm(`Reignite this pocket star? This run resets and grants ${gain} Stardust.`)) return;
  const result = ascend(state); state = result.state; track('prestige', { gain, ascensions: state.ascensions }); sfx('ascend', state.settings.sound); haptic(30); toast(`Reignited +${gain} ✧`, 'good'); activeTab='forge'; renderAll(); save();
  if (canShowInterstitial(state)) {
    const ad = await showInterstitial({ placement: 'after_reignite', beforeAd: () => { adPaused = true; }, afterAd: () => { adPaused = false; lastFrame = performance.now(); } });
    if (ad.shown) { state = markInterstitialShown(state); save(); }
  }
});

$('#rewarded-ad-btn').addEventListener('click', async () => {
  if (rewardedBusy) return;
  const status = rewardedAdStatus(state);
  if (!status.canWatch) return;
  rewardedBusy = true; renderMonetization(); track('rewarded_offer_accept', { remaining: status.remaining });
  const ad = await showRewarded({ placement: 'production_boost', beforeAd: () => { adPaused = true; }, afterAd: () => { adPaused = false; lastFrame = performance.now(); } });
  rewardedBusy = false;
  if (ad.granted) {
    const reward = grantRewardedBoost(state);
    if (reward.granted) { state = reward.state; track('rewarded_boost_granted', { seconds: Math.round(reward.boostAddedMs / 1000) }); toast('Sponsor boost ×2 for 5 minutes!', 'good'); save(); }
  } else toast(ad.reason === 'dismissed' ? 'Ad closed — no boost granted.' : 'No ad available right now.');
  renderAll(); refreshTelemetrySummary();
});

$('#support-btn').addEventListener('click', () => {
  const url = globalThis.LUMEN_CONFIG?.support?.url;
  if (!url) return;
  track('support_link_open'); window.open(url, '_blank', 'noopener,noreferrer');
});

$('#settings-btn').addEventListener('click', () => $('#settings').showModal());
$('#settings-close').addEventListener('click', () => $('#settings').close());
['sound','motion','haptics'].forEach(key => {
  const input = $(`#setting-${key}`); input.checked = state.settings[key];
  input.addEventListener('change', () => { state.settings[key] = input.checked; save(); });
});
const analyticsInput = $('#setting-analytics'); analyticsInput.checked = Boolean(state.settings.analytics);
analyticsInput.addEventListener('change', () => { state.settings.analytics = analyticsInput.checked; setAnalyticsConsent(analyticsInput.checked); save(); refreshTelemetrySummary(); });
function refreshTelemetrySummary() { const sum = telemetrySummary(); $('#telemetry-summary').textContent = `${sum.events} activity events stored locally`; }
function downloadSave() { const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], {type:'application/json'})); const a=document.createElement('a'); a.href=url; a.download=`lumen-loop-save-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
$('#export-events-json').addEventListener('click', () => exportTelemetry('json'));
$('#export-events-csv').addEventListener('click', () => exportTelemetry('csv'));
$('#export-save').addEventListener('click', downloadSave);
$('#clear-events').addEventListener('click', () => { clearTelemetry(); track('activity_log_cleared'); refreshTelemetrySummary(); });
refreshTelemetrySummary();
$('#reset-save').addEventListener('click', () => {
  if (confirm('Erase this local save and start from zero?')) { localStorage.removeItem(SAVE_KEY); location.reload(); }
});

bindDelegates();
renderAll();

if (offlineShown) setTimeout(() => toast(`Welcome back! +${fmt(initialOffline.reward)} ✦ offline`, 'good'), 350);

function frame(nowPerf) {
  if (adPaused) { lastFrame = nowPerf; requestAnimationFrame(frame); return; }
  const dt = Math.min(0.25, (nowPerf - lastFrame) / 1000);
  lastFrame = nowPerf;
  const result = tick(state, dt); state = updateAchievements(result.state);
  saveTimer += dt;
  if (saveTimer > 5) { save(); saveTimer = 0; }
  renderHUD(Date.now());
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

setInterval(() => { renderGenerators(); renderContracts(); renderRelics(); renderOrbit(); renderMonetization(); refreshTelemetrySummary(); }, 1000);
window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { save(); return; }
  const resumed = applyOfflineReward(state);
  state = resumed.state;
  if (resumed.reward > 1) { toast(`Welcome back! +${fmt(resumed.reward)} ✦`, 'good'); track('offline_reward', { reward: Math.round(resumed.reward) }); }
  renderAll();
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(() => {});
