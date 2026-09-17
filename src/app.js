import {
  SAVE_KEY, GENERATORS, RELICS, CONTRACTS, createDefaultState, normalizeState,
  costForAmount, affordableAmount, buyGenerator, passiveRate, tapValue, registerTap,
  tick, claimContract, contractProgress, totalOwned, prestigeGain, ascend, relicCost,
  buyRelic, activatePulse, cometReward, applyOfflineReward, dailyStatus, claimDaily, currentZone, updateAchievements,
  rewardedAdStatus, grantRewardedBoost, canShowInterstitial, markInterstitialShown, milestoneMultiplier, ZONES
} from './game.js';
import { sfx } from './audio.js';
import { showRewarded, showInterstitial, adProviderStatus } from './monetization.js';
import { initTelemetry, setAnalyticsConsent, track, telemetrySummary, exportTelemetry, clearTelemetry } from './telemetry.js';
import { DEFAULT_LIVEOPS, CORE_SKINS, ensureServiceState, dailyMissions, claimServiceMission, seasonStatus, claimSeasonRewards, eventStatus, claimEventRewards, addEventPoints, unlockSkin, equipSkin, atlasSummary, timeRemaining } from './liveops.js';
import { fetchLiveOps, serviceProfile, cloudCapability, syncCloudSave } from './service-client.js';
import { ensureHooksState, prepareReturn, launchStatus, claimLaunchReward, addMomentum, breakthroughStatus, claimBreakthrough, comebackStatus, claimComeback, rhythmStatus, claimRhythm, capsuleStatus, openSignalCapsule, signalCollection, doctrineStatus, chooseDoctrine, storyLog, hookStripModel, readyHookCount, experimentVariant, dueSessionMilestones, markSessionMilestone } from './engagement.js';

const $ = (q, el = document) => el.querySelector(q);
const $$ = (q, el = document) => [...el.querySelectorAll(q)];

function load() {
  try { return normalizeState(JSON.parse(localStorage.getItem(SAVE_KEY))); }
  catch { return createDefaultState(); }
}
let liveOpsConfig = DEFAULT_LIVEOPS;
let liveOpsSource = 'default';
let state = ensureHooksState(ensureServiceState(load(), liveOpsConfig), Date.now(), serviceProfile().pilotId);
const initialAwayMs = Math.max(0, Date.now() - (state.lastSeenAt || Date.now()));
state = prepareReturn(state, initialAwayMs, Date.now(), serviceProfile().pilotId);
state.stats = { ...state.stats, sessions: (state.stats?.sessions || 0) + 1 };
let lastFrame = performance.now();
let saveTimer = 0;
let activeTab = 'forge';
let offlineShown = false;
let adPaused = false;
let rewardedBusy = false;
let lastHudRender = 0;
let lastBodyClass = '';
let lastPulseMarkup = '';
const hookExposureSeen = new Set();

const initialOffline = applyOfflineReward(state);
state = initialOffline.state;
if (initialOffline.reward > 1) offlineShown = true;
initTelemetry(state.settings.analytics);
track('game_loaded', { version: state.version, offlineReward: Math.round(initialOffline.reward) });
track('hook_variant_assigned', { variant: experimentVariant(state) });

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

function showEngagementReveal(card, duplicate = false) {
  const root = $('#engagement-reveal');
  if (!root || !card) return;
  root.innerHTML = `<div class="big">${card.symbol || '✦'}</div><b>${duplicate ? 'Signal Echo' : card.name}</b><span>${duplicate ? 'Duplicate converted to 1 ★ Star Token' : `${String(card.rarity || '').toUpperCase()} · ${card.bonus || ''}`}</span>`;
  root.classList.add('show');
  setTimeout(() => root.classList.remove('show'), 2200);
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

const MILESTONES = [10, 25, 50, 100];
function nextMilestone(owned) { return MILESTONES.find(target => owned < target) || null; }

function goalForState() {
  const gain = prestigeGain(state);
  if (gain > 0) return { label: `REIGNITE READY · +${gain} ✧`, progress: 1 };
  const candidates = [];
  GENERATORS.forEach((g, index) => {
    const owned = state.generators[g.id] || 0;
    if (owned === 0) {
      const progress = Math.min(1, (state.lifetimeLumens || 0) / g.baseCost);
      candidates.push({
        label: `DISCOVER ${g.name.toUpperCase()} · ${fmt(g.baseCost)} ✦`,
        progress, score: progress - index * 0.015
      });
      return;
    }
    const target = nextMilestone(owned);
    if (target) {
      const progress = Math.min(1, owned / target);
      candidates.push({
        label: `${g.name.toUpperCase()} LV${target} · ×${milestoneMultiplier(target)} LINE`,
        progress, score: progress + 0.04
      });
    }
  });
  const nextZone = ZONES.find(zone => zone.threshold > (state.lifetimeLumens || 0));
  if (nextZone) {
    const progress = Math.min(1, (state.lifetimeLumens || 0) / nextZone.threshold);
    candidates.push({ label: `NEW SKY · ${nextZone.name.toUpperCase()}`, progress, score: progress + 0.015 });
  }
  const prestigeProgress = Math.min(1, (state.lifetimeLumens || 0) / 500000);
  candidates.push({
    label: `REIGNITE · ${fmt(Math.max(0, 500000 - (state.lifetimeLumens || 0)))} ✦ TO STARDUST`,
    progress: prestigeProgress, score: prestigeProgress + 0.01
  });
  return candidates.sort((a, b) => b.score - a.score)[0];
}

function renderGoal() {
  const goal = goalForState();
  const label = $('#goal-label');
  const fill = $('#goal-fill');
  if (!label || !fill || !goal) return;
  label.textContent = `NEXT · ${goal.label}`;
  fill.style.width = `${Math.max(3, goal.progress * 100)}%`;
}

function renderGenerators() {
  const host = $('#generator-list');
  host.innerHTML = GENERATORS.map(g => {
    const owned = state.generators[g.id] || 0;
    const quote = buyCost(g);
    const lineRate = owned * g.baseRate * milestoneMultiplier(owned);
    const target = nextMilestone(owned);
    const milestoneText = target ? `next Lv ${target} → ×${milestoneMultiplier(target)} · ${target - owned} to go` : 'all line milestones online';
    const locked = owned === 0 && state.lifetimeLumens < g.baseCost * 0.35 && g.id !== 'sparkDrone';
    return `<article class="generator-card ${locked ? 'locked' : ''}" data-id="${g.id}">
      <div class="generator-icon">${g.icon}</div>
      <div class="generator-copy"><div class="generator-title"><strong>${g.name}</strong><span>Lv ${owned}</span></div>
      <p>${g.blurb}</p><small>${fmt(lineRate)}/s line · ${milestoneText}</small></div>
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
    <button data-relic="${r.id}" ${state.stardust < cost ? 'disabled' : ''}>UPGRADE<br><b>${cost} ✧</b></button></article>`;
  }).join('');
  const gain = prestigeGain(state);
  $('#ascend-btn').disabled = gain <= 0;
  $('#ascend-btn').innerHTML = gain > 0 ? `REIGNITE <b>+${gain} ✧</b>` : `REIGNITE <b>needs 500K lifetime ✦</b>`;
  $('#ascend-copy').textContent = `Reset this run to gain Stardust. Each total Stardust permanently adds +35% global production. Your next run starts with ${Math.min(150, (state.ascensions + 1) * 15)} ✦, Pulse ready, and an early comet. Current gain: ${gain}.`;
}

function renderLive(now = Date.now()) {
  state = ensureServiceState(state, liveOpsConfig, now);
  const atlas = atlasSummary(state);
  const missions = dailyMissions(state, liveOpsConfig, now);
  const season = seasonStatus(state, liveOpsConfig, now);
  const event = eventStatus(state, liveOpsConfig, now);
  const profile = serviceProfile();
  const capability = cloudCapability();

  $('#atlas-percent').textContent = `${atlas.percent}%`;
  $('#atlas-summary').textContent = `${atlas.unlocked} / ${atlas.total} discoveries`;
  $('#star-token-count').textContent = `${state.service.starTokens || 0} ★`;
  $('#live-purpose').textContent = `${missions.filter(m => m.claimed).length}/${missions.length} Daily Ops · Season Lv ${season.level}/${season.maxLevel}`;
  const ann = liveOpsConfig.announcement || {};
  $('#live-announcement').innerHTML = `<div><small>FROM STAR CONTROL · ${String(liveOpsSource).toUpperCase()}</small><strong>${ann.title || 'Operations online'}</strong><span>${ann.body || 'Build today. Collect forever.'}</span></div>`;

  $('#daily-mission-list').innerHTML = missions.map(m => {
    const ratio = Math.min(1, m.progress / m.target);
    const reward = Math.max(150, passiveRate(state, now) * Number(liveOpsConfig.daily?.lumenSeconds || 75));
    return `<article class="mission-card ${m.claimed ? 'claimed' : ''}"><div class="mission-icon">${m.icon}</div><div><strong>${m.title}</strong><span>${m.verb} · ${fmt(Math.min(m.progress,m.target))}/${fmt(m.target)}</span><i><b style="width:${ratio*100}%"></b></i></div><button data-service-mission="${m.id}" data-reward="${Math.round(reward)}" ${m.ready && !m.claimed ? '' : 'disabled'}>${m.claimed ? 'DONE' : `+${m.xp} XP`}</button></article>`;
  }).join('');

  $('#event-name').textContent = event.name;
  $('#event-time').textContent = timeRemaining(event.end, now);
  const nextEvent = event.milestones.find(m => !m.claimed);
  const eventTarget = nextEvent?.target || event.milestones.at(-1)?.target || 1;
  const eventRatio = Math.min(1, event.points / eventTarget);
  const eventReady = event.milestones.some(m => m.ready && !m.claimed);
  $('#event-card').innerHTML = `<div class="event-score"><b>${fmt(event.points)}</b><span>COMET SIGNAL</span></div><div class="event-progress"><strong>${nextEvent ? `Next cache · ${fmt(eventTarget)} signal` : 'All weekly caches claimed'}</strong><i><b style="width:${eventRatio*100}%"></b></i><small>${event.milestones.map(m=>`${m.claimed?'✓':m.ready?'!':'·'} ${fmt(m.target)}`).join('  ')}</small></div><button id="event-claim" ${eventReady?'':'disabled'}>${eventReady ? 'CLAIM ★' : 'IN PROGRESS'}</button>`;

  $('#season-name').textContent = season.name;
  $('#season-time').textContent = timeRemaining(season.end, now);
  const seasonUnclaimed = Array.from({length:season.level},(_,i)=>i+1).filter(level => !season.claimedLevels.includes(level));
  $('#season-card').innerHTML = `<div class="season-level"><b>LV ${season.level}</b><span>${fmt(season.xp)} XP</span></div><div class="season-progress"><strong>Constellation Track</strong><i><b style="width:${Math.min(100,season.inLevel/season.nextXp*100)}%"></b></i><small>${season.level >= season.maxLevel ? 'Season complete' : `${fmt(season.inLevel)} / ${fmt(season.nextXp)} to next level`} · Star Tokens unlock permanent Core Skins</small></div><button id="season-claim" ${seasonUnclaimed.length?'':'disabled'}>${seasonUnclaimed.length ? `CLAIM ${seasonUnclaimed.length}` : 'CLAIMED'}</button>`;

  $('#skin-list').innerHTML = CORE_SKINS.map(skin => {
    const owned = state.service.unlockedSkins.includes(skin.id);
    const equipped = state.service.equippedSkin === skin.id;
    const affordable = (state.service.starTokens || 0) >= skin.cost;
    return `<article class="skin-card ${owned?'owned':''} ${equipped?'equipped':''}"><div class="skin-orb skin-preview-${skin.id}">${skin.symbol}</div><div><strong>${skin.name}</strong><small>${skin.description}</small></div><button data-skin="${skin.id}" data-owned="${owned?1:0}" ${(!owned&&!affordable)||equipped?'disabled':''}>${equipped?'EQUIPPED':owned?'EQUIP':`${skin.cost} ★`}</button></article>`;
  }).join('');

  const groups = {};
  atlas.entries.forEach(entry => (groups[entry.group] ||= []).push(entry));
  $('#atlas-list').innerHTML = Object.entries(groups).map(([group,entries]) => `<div class="atlas-group"><small>${group}</small><div>${entries.map(entry=>`<span class="atlas-chip ${entry.unlocked?'unlocked':''}" title="${entry.name}">${entry.unlocked?'★':'☆'} ${entry.name}</span>`).join('')}</div></div>`).join('');

  $('#service-profile').innerHTML = `<div><small>PILOT PROFILE</small><strong>${profile.pilotId.slice(0,18)}</strong><span>${capability.configured ? 'Cloud adapter configured · server validation required for ranked data' : 'Local-first save · add service.apiBase for authenticated cloud sync'}</span></div><button id="sync-cloud" ${capability.configured?'':'disabled'}>${capability.configured?'SYNC':'LOCAL'}</button>`;
}

function renderEngagement(now = Date.now()) {
  state = ensureHooksState(state, now, serviceProfile().pilotId);
  const variant = experimentVariant(state);
  const model = hookStripModel(state, variant);
  const strip = $('#hook-strip');
  if (strip) {
    const progress = model.progress == null ? '' : `<div class="hook-progress"><i style="width:${Math.max(3, Math.min(100, model.progress * 100))}%"></i></div>`;
    const action = model.kind === 'launch' ? `data-hook-action="launch" data-hook-id="${model.id}"` : `data-hook-action="${model.kind}"`;
    strip.innerHTML = `<div><small>${model.eyebrow}</small><strong>${model.title}</strong><p>${model.detail}</p></div><button ${action} ${model.ready ? '' : 'disabled'}>${model.cta}</button>${progress}`;
    const key = `${variant}:${model.kind}:${model.id || ''}`;
    if (!hookExposureSeen.has(key)) {
      hookExposureSeen.add(key);
      track('hook_exposure', { hook:model.kind, variant, id:model.id || '' });
    }
  }

  const host = $('#engagement-hub');
  if (!host) return;
  const rhythm = rhythmStatus(state);
  const capsule = capsuleStatus(state);
  const doctrine = doctrineStatus(state);
  const signals = signalCollection(state);
  const stories = storyLog(state, atlasSummary(state).percent);
  const burst = breakthroughStatus(state, now);
  const rhythmDots = Array.from({ length:5 }, (_, i) => `<i class="${i < Math.min(5, rhythm.count) ? 'on' : ''}">${i < rhythm.count ? '✓' : i + 1}</i>`).join('');
  host.innerHTML = `
    <article class="engagement-card"><div class="capsule-head"><div><small>SIGNAL CAPSULES</small><h3>Curiosity without pay-to-roll</h3></div><b class="capsule-count">${capsule.capsules} ◇</b></div><p>Earn capsules through play. Duplicates become ★. Rare+ pity after repeated Commons.</p><button id="capsule-open" ${capsule.capsules ? '' : 'disabled'}>OPEN SIGNAL</button><div class="odds">ODDS · Common 65% · Rare 28% · Epic 7%</div></article>
    <article class="engagement-card"><div class="rhythm-head"><div><small>ORBIT RHYTHM</small><h3>${rhythm.count}/5 play days</h3></div><span>${rhythm.claimed ? 'CLAIMED' : 'THIS WEEK'}</span></div><p>Five days is enough. Missing a day never resets progress.</p><div class="rhythm-dots">${rhythmDots}</div><button id="rhythm-claim" ${rhythm.ready ? '' : 'disabled'}>${rhythm.claimed ? 'CLAIMED' : 'CLAIM 2 ◇ + 1 ★'}</button></article>
    <article class="engagement-card wide"><small>REIGNITE DOCTRINE</small><h3>Choose how this life feels</h3><p>${doctrine.available ? 'A new Reignite lets you choose again.' : 'Reignite once to unlock strategic run identity.'}</p><div class="doctrine-grid">${doctrine.doctrines.map(d => `<button class="doctrine ${doctrine.doctrine === d.id ? 'active' : ''}" data-doctrine="${d.id}" ${doctrine.available ? '' : 'disabled'}><b>${d.symbol} ${d.name}</b><span>${d.bonus}</span></button>`).join('')}</div></article>
    <article class="engagement-card wide"><small>SIGNAL ARCHIVE · ${capsule.owned}/${capsule.total}</small><h3>Collect the strange things the star finds</h3><div class="signal-grid">${signals.map(c => `<div class="signal-card ${c.owned ? '' : 'locked'} ${c.rarity}"><span class="symbol">${c.owned ? c.symbol : '?'}</span><b>${c.owned ? c.name : 'Unknown Signal'}</b><span>${c.owned ? c.bonus : c.rarity.toUpperCase()}</span></div>`).join('')}</div></article>
    <article class="engagement-card wide"><small>FIELD LOG</small><h3>A story appears behind the numbers</h3><div class="story-list">${stories.map(s => `<div class="story-entry ${s.unlocked ? '' : 'locked'}"><b>${s.unlocked ? s.title : 'Encrypted Log'}</b><span>${s.unlocked ? s.text : 'Keep exploring the pocket star to decrypt this entry.'}</span></div>`).join('')}</div></article>
    <article class="engagement-card wide"><small>PILOT CARD</small><h3>Share progress, not personal data</h3><p>Atlas ${atlasSummary(state).percent}% · ${state.ascensions || 0} Reignites · ${capsule.owned}/${capsule.total} Signals · ${Math.floor(burst.momentum)} Momentum</p><button class="pilot-share" id="pilot-share">SHARE PILOT CARD</button></article>`;
}

function renderNavBadges() {
  const contractReady = CONTRACTS.filter(c => !state.claimedContracts.includes(c.id) && contractProgress(state, c) >= c.target).length + (dailyStatus(state).canClaim ? 1 : 0);
  const relicReady = prestigeGain(state) > 0 || RELICS.some(r => state.stardust >= relicCost(state, r.id));
  const contractsBtn = $('.nav-btn[data-tab="contracts"]');
  const relicsBtn = $('.nav-btn[data-tab="relics"]');
  if (contractsBtn) { if (contractReady) contractsBtn.dataset.badge = String(Math.min(9, contractReady)); else delete contractsBtn.dataset.badge; }
  if (relicsBtn) { if (relicReady) relicsBtn.dataset.badge = '•'; else delete relicsBtn.dataset.badge; }
  const liveBtn = $('.nav-btn[data-tab="live"]');
  if (liveBtn) {
    const missionsReady = dailyMissions(state, liveOpsConfig).filter(m => m.ready && !m.claimed).length;
    const eventReady = eventStatus(state, liveOpsConfig).milestones.filter(m => m.ready && !m.claimed).length;
    const season = seasonStatus(state, liveOpsConfig);
    const seasonReady = Array.from({length:season.level},(_,i)=>i+1).some(level => !season.claimedLevels.includes(level)) ? 1 : 0;
    const ready = missionsReady + eventReady + seasonReady + readyHookCount(state);
    if (ready) liveBtn.dataset.badge = String(Math.min(9,ready)); else delete liveBtn.dataset.badge;
  }
}

function renderOrbit() {
  const count = Math.min(12, totalOwned(state));
  const orbit = $('#orbiters');
  orbit.innerHTML = '';
  if (!count) return;
  const active = GENERATORS.filter(g => (state.generators[g.id] || 0) > 0);
  const visuals = active.slice(0, count);
  let cursor = 0;
  while (visuals.length < count && active.length) { visuals.push(active[cursor % active.length]); cursor++; }
  visuals.forEach((g, i) => {
    const machine = document.createElement('i');
    machine.className = 'orbiter-machine';
    machine.textContent = g.icon;
    machine.title = g.name;
    machine.style.setProperty('--i', i); machine.style.setProperty('--n', Math.max(1, count));
    orbit.append(machine);
  });
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
  const bodyClass = `${zone.className} skin-${state.service?.equippedSkin || 'dawn'}`;
  if (bodyClass !== lastBodyClass) { document.body.className = bodyClass; lastBodyClass = bodyClass; }
  const cooldown = Math.max(0, state.pulseReadyAt - now);
  const active = state.pulseUntil > now;
  const pulseBtn = $('#pulse-btn');
  pulseBtn.disabled = cooldown > 0 && !active;
  const pulseMarkup = active ? `PULSE ACTIVE <b>${Math.ceil((state.pulseUntil-now)/1000)}s</b>` : cooldown > 0 ? `PULSE <b>${Math.ceil(cooldown/1000)}s</b>` : 'PULSE <b>×4 / 10s</b>';
  if (pulseMarkup !== lastPulseMarkup) { pulseBtn.innerHTML = pulseMarkup; lastPulseMarkup = pulseMarkup; }
  renderComet(now);
  renderGoal();
}

function refreshGeneratorAffordability() {
  if (activeTab !== 'forge') return;
  for (const g of GENERATORS) {
    const card = $(`.generator-card[data-id="${g.id}"]`);
    const btn = card?.querySelector('.buy-btn');
    if (!btn) continue;
    const quote = buyCost(g);
    const disabled = quote.amount < 1 || quote.cost > state.lumens;
    if (btn.disabled !== disabled) btn.disabled = disabled;
    const cost = btn.querySelector('b');
    const expected = `${fmt(quote.cost)} ✦`;
    if (cost && cost.textContent !== expected) cost.textContent = expected;
    if (state.buyMode === 'max') {
      const label = btn.querySelector('span');
      const expectedLabel = `BUY MAX (${quote.amount})`;
      if (label && label.textContent !== expectedLabel) label.textContent = expectedLabel;
    }
  }
}

function refreshLiveClocks(now = Date.now()) {
  if (activeTab !== 'live') return;
  const event = eventStatus(state, liveOpsConfig, now);
  const season = seasonStatus(state, liveOpsConfig, now);
  const eventTime = $('#event-time');
  const seasonTime = $('#season-time');
  if (eventTime) eventTime.textContent = timeRemaining(event.end, now);
  if (seasonTime) seasonTime.textContent = timeRemaining(season.end, now);
}

function renderAll() {
  state = ensureServiceState(state, liveOpsConfig);
  renderHUD(); renderGenerators(); renderContracts(); renderRelics(); renderLive(); renderEngagement(); renderOrbit(); renderMonetization(); renderNavBadges();
  $$('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === activeTab));
  $('.buy-modes').classList.toggle('hidden', activeTab !== 'forge');
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
}

function bindDelegates() {
  document.addEventListener('click', (e) => {
    const hookAction = e.target.closest('[data-hook-action]');
    if (hookAction) {
      const kind = hookAction.dataset.hookAction;
      track('hook_engage', { hook:kind, variant:experimentVariant(state) });
      if (kind === 'launch') {
        const result = claimLaunchReward(state, hookAction.dataset.hookId);
        if (result.claimed) { state=result.state; track('launch_reward_claim',{step:result.step.id,capsules:result.step.capsules||0}); track('hook_complete',{hook:'launch',id:result.step.id}); toast(`Launch Track · ${result.step.label}`, 'good'); renderAll(); save(); }
      } else if (kind === 'breakthrough') {
        const result = claimBreakthrough(state);
        if (result.claimed) { state=result.state; track('breakthrough_trigger',{boost_seconds:60}); track('hook_complete',{hook:'breakthrough'}); toast('BREAKTHROUGH · ×2 core output + Signal Capsule','good'); renderAll(); save(); }
      } else if (kind === 'comeback') {
        const result = claimComeback(state, passiveRate(state));
        if (result.claimed) { state=result.state; track('comeback_claim',{reward:Math.round(result.reward)}); track('hook_complete',{hook:'comeback'}); toast(`Welcome back · +${fmt(result.reward)} ✦`,'good'); renderAll(); save(); }
      }
    }
    const capsuleOpen = e.target.closest('#capsule-open');
    if (capsuleOpen) {
      const result = openSignalCapsule(state);
      if (result.opened) { state=result.state; track('signal_capsule_open',{rarity:result.card.rarity,duplicate:result.duplicate,pity:result.pity}); track(result.duplicate?'signal_card_duplicate':'signal_card_new',{card:result.card.id,rarity:result.card.rarity}); showEngagementReveal(result.card,result.duplicate); renderAll(); save(); }
    }
    const rhythmClaim = e.target.closest('#rhythm-claim');
    if (rhythmClaim) {
      const result = claimRhythm(state);
      if (result.claimed) { state=result.state; track('rhythm_claim',{capsules:result.capsules,star_tokens:result.starTokens}); toast('Orbit Rhythm complete · 2 ◇ + 1 ★','good'); renderAll(); save(); }
    }
    const doctrine = e.target.closest('[data-doctrine]');
    if (doctrine) {
      const result = chooseDoctrine(state, doctrine.dataset.doctrine);
      if (result.chosen) { state=result.state; track('doctrine_select',{doctrine:result.doctrine.id}); toast(`${result.doctrine.name} doctrine online`,'good'); renderAll(); save(); }
    }
    const share = e.target.closest('#pilot-share');
    if (share) {
      const cap=capsuleStatus(state); const atlas=atlasSummary(state); const text=`LUMEN LOOP Pilot · Atlas ${atlas.percent}% · ${state.ascensions||0} Reignites · ${cap.owned}/${cap.total} Signals`;
      const done=()=>{ track('pilot_card_share',{atlas:atlas.percent,signals:cap.owned,reignites:state.ascensions||0}); toast('Pilot Card shared','good'); };
      if (navigator.share) navigator.share({title:'Lumen Loop Pilot Card',text,url:location.href}).then(done).catch(()=>{}); else navigator.clipboard?.writeText(`${text} ${location.href}`).then(done).catch(()=>{});
    }
    const buy = e.target.closest('[data-buy]');
    if (buy) {
      const result = buyGenerator(state, buy.dataset.buy, state.buyMode);
      if (result.bought) { state = addMomentum(result.state, Math.min(20, result.bought * 2)); state = addEventPoints(state, Math.min(10, result.bought) * Number(liveOpsConfig.tuning?.eventGeneratorPoint || 1), liveOpsConfig); track('generator_purchase', { generator: buy.dataset.buy, amount: result.bought, spent: Math.round(result.spent) }); track('spend_virtual_currency', { virtual_currency_name: 'Lumen', value: Math.round(result.spent), item_name: buy.dataset.buy }); sfx('buy', state.settings.sound); haptic(); toast(`Built ×${result.bought}`); renderAll(); save(); }
    }
    const claim = e.target.closest('[data-claim]');
    if (claim) {
      const result = claimContract(state, claim.dataset.claim);
      if (result.reward) { state = addMomentum(result.state, 15); state = addEventPoints(state, Number(liveOpsConfig.tuning?.eventContractPoints || 12), liveOpsConfig); track('contract_claim', { contract: claim.dataset.claim, reward: Math.round(result.reward) }); track('earn_virtual_currency', { virtual_currency_name: 'Lumen', value: Math.round(result.reward), source: 'contract' }); sfx('claim', state.settings.sound); toast(`Contract +${fmt(result.reward)} ✦`, 'good'); renderAll(); save(); }
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
    const serviceMission = e.target.closest('[data-service-mission]');
    if (serviceMission) {
      const result = claimServiceMission(state, serviceMission.dataset.serviceMission, Number(serviceMission.dataset.reward || 0), liveOpsConfig);
      if (result.claimed) { state = addEventPoints(result.state, Number(liveOpsConfig.tuning?.eventMissionPoints || 15), liveOpsConfig); track('daily_op_claim', { mission: result.mission.id, xp: result.xp, reward: Math.round(result.reward) }); track('earn_virtual_currency', { virtual_currency_name:'Lumen', value:Math.round(result.reward), source:'daily_op' }); sfx('claim', state.settings.sound); toast(`Daily Op +${result.xp} XP`, 'good'); renderAll(); save(); }
    }
    const eventClaim = e.target.closest('#event-claim');
    if (eventClaim) {
      const result = claimEventRewards(state, liveOpsConfig);
      if (result.claimed) { state = result.state; track('live_event_reward', { milestones: result.targets.length, star_tokens: result.tokens }); sfx('claim', state.settings.sound); toast(`Comet Surge +${result.tokens} ★`, 'good'); renderAll(); save(); }
    }
    const seasonClaim = e.target.closest('#season-claim');
    if (seasonClaim) {
      const before = seasonStatus(state, liveOpsConfig).level;
      const result = claimSeasonRewards(state, liveOpsConfig);
      if (result.claimed) { state = result.state; track('season_reward_claim', { levels: result.levels.length, star_tokens: result.tokens }); track('level_up', { level: before, character:'constellation_season' }); sfx('claim', state.settings.sound); toast(`Season track +${result.tokens} ★`, 'good'); renderAll(); save(); }
    }
    const skin = e.target.closest('[data-skin]');
    if (skin) {
      const id = skin.dataset.skin;
      if (skin.dataset.owned === '1') {
        const result = equipSkin(state, id); if (result.equipped) { state = result.state; track('skin_equip', { skin:id }); toast('Core skin equipped', 'good'); renderAll(); save(); }
      } else {
        const result = unlockSkin(state, id); if (result.unlocked) { state = result.state; track('skin_unlock', { skin:id, cost:result.skin.cost }); track('unlock_achievement', { achievement_id:`core_skin_${id}` }); toast(`${result.skin.name} unlocked`, 'good'); renderAll(); save(); }
      }
    }
    const cloud = e.target.closest('#sync-cloud');
    if (cloud) { cloud.disabled = true; cloud.textContent = 'SYNCING'; syncCloudSave(state).then(result => { track('cloud_sync', { ok:result.ok, reason:result.reason || 'ok' }); toast(result.ok ? 'Cloud save synced' : 'Cloud sync unavailable', result.ok?'good':''); renderAll(); }); }
    const nav = e.target.closest('[data-tab]');
    if (nav) { activeTab = nav.dataset.tab; if (activeTab === 'live') track('live_hub_open'); renderAll(); }
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
  if ((state.stats?.tapsAllTime || 0) % 5 === 0) state = addMomentum(state, 5);
  const tapEvery = Number(liveOpsConfig.tuning?.eventTapEvery || 25);
  if (tapEvery > 0 && (state.stats?.tapsAllTime || 0) % tapEvery === 0) state = addEventPoints(state, Number(liveOpsConfig.tuning?.eventTapPoints || 2), liveOpsConfig);
  if ([1,100,1000,10000].includes(state.taps)) track('tap_milestone', { taps: state.taps, bestCombo: state.bestCombo });
  sfx('tap', state.settings.sound); haptic(5); burst(x, y); floatNumber(x, y, result.value);
  e.currentTarget.classList.remove('pop'); void e.currentTarget.offsetWidth; e.currentTarget.classList.add('pop');
  renderHUD();
});

$('#pulse-btn').addEventListener('click', () => {
  const result = activatePulse(state);
  if (result.activated) { state = addMomentum(result.state, 12); state = addEventPoints(state, Number(liveOpsConfig.tuning?.eventPulsePoints || 5), liveOpsConfig); track('pulse_activate'); sfx('pulse', state.settings.sound); haptic(18); toast('Production ×4!', 'good'); renderAll(); save(); }
});

$('#comet').addEventListener('click', () => {
  const result = cometReward(state); state = addMomentum(result.state, 25); state = addEventPoints(state, Number(liveOpsConfig.tuning?.eventCometPoints || 25), liveOpsConfig); track('comet_claim', { reward: Math.round(result.reward) }); sfx('comet', state.settings.sound); haptic([12,35,12]); toast(`Comet cache +${fmt(result.reward)} ✦`, 'good'); renderAll(); save();
});

$('#ascend-btn').addEventListener('click', async () => {
  const gain = prestigeGain(state);
  if (!gain) return;
  if (!confirm(`Reignite this pocket star? This run resets and grants ${gain} Stardust.`)) return;
  const result = ascend(state); state = result.state; track('prestige', { gain, ascensions: state.ascensions }); sfx('ascend', state.settings.sound); haptic(30); toast(`Reignited +${gain} ✧ · momentum online`, 'good'); activeTab='forge'; renderAll(); save();
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

const ONBOARDING_KEY = 'lumen-loop-onboarding-v1';
const onboarding = $('#onboarding');
if (!localStorage.getItem(ONBOARDING_KEY)) { setTimeout(() => { onboarding?.showModal(); track('tutorial_begin'); }, 250); }
$('#onboarding-start')?.addEventListener('click', () => { localStorage.setItem(ONBOARDING_KEY, '1'); onboarding.close(); track('tutorial_complete'); });

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
  // Simulation may run at display rate, but DOM work is capped at 10 Hz.
  if (nowPerf - lastHudRender >= 100) { renderHUD(Date.now()); lastHudRender = nowPerf; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Passive income only changes affordability and clocks. Never rebuild scrollable panels on a timer.
setInterval(() => {
  state = ensureServiceState(state, liveOpsConfig);
  refreshGeneratorAffordability();
  refreshLiveClocks();
  if (activeTab === 'contracts') renderMonetization();
  renderNavBadges();
  for (const seconds of dueSessionMilestones(state)) { track('active_time_milestone', { seconds, variant:experimentVariant(state) }); state = markSessionMilestone(state, seconds); }
  refreshTelemetrySummary();
}, 1000);
window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { save(); return; }
  const awayMs = Math.max(0, Date.now() - (state.lastSeenAt || Date.now()));
  const resumed = applyOfflineReward(state);
  state = prepareReturn(resumed.state, awayMs, Date.now(), serviceProfile().pilotId);
  if (resumed.reward > 1) { toast(`Welcome back! +${fmt(resumed.reward)} ✦`, 'good'); track('offline_reward', { reward: Math.round(resumed.reward) }); }
  renderAll();
});
fetchLiveOps().then(result => { liveOpsConfig = result.config; liveOpsSource = result.source; state = ensureServiceState(state, liveOpsConfig); state.service.lastConfigSyncAt = result.syncedAt || Date.now(); track('liveops_sync', { source: result.source }); renderAll(); save(); });
setInterval(() => { if (cloudCapability().configured) syncCloudSave(state).then(result => track('cloud_sync_auto', { ok: result.ok })); }, 120_000);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(() => {});
