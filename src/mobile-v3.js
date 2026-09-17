import {
  SAVE_KEY, GENERATORS, CONTRACTS, ZONES, normalizeState,
  milestoneMultiplier, prestigeGain, contractProgress, relicCost,
  dailyStatus
} from './game.js';

const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => [...root.querySelectorAll(q)];
const MILESTONES = [10, 25, 50, 100];

function readState() {
  try { return normalizeState(JSON.parse(localStorage.getItem(SAVE_KEY))); }
  catch { return null; }
}

function fmt(n) {
  if (!Number.isFinite(n)) return '∞';
  if (n < 1000) return n < 10 ? n.toFixed(1).replace('.0', '') : Math.floor(n).toLocaleString();
  const units = ['K','M','B','T','Qa','Qi','Sx','Sp','Oc'];
  let i = -1;
  while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
  return `${n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : n.toFixed(0)}${units[i]}`;
}

function nextMilestone(owned) { return MILESTONES.find(v => owned < v) || null; }

function pickGoal(state) {
  const gain = prestigeGain(state);
  if (gain > 0) return { label: `REIGNITE READY · +${gain} ✧`, progress: 1 };
  const candidates = [];
  GENERATORS.forEach((g, index) => {
    const owned = state.generators[g.id] || 0;
    if (owned === 0) {
      const progress = Math.min(1, (state.lumens || 0) / g.baseCost);
      candidates.push({ label: `DISCOVER ${g.name.toUpperCase()} · ${fmt(g.baseCost)} ✦`, progress, score: progress - index * .02 });
    } else {
      const target = nextMilestone(owned);
      if (target) {
        const progress = Math.min(1, owned / target);
        candidates.push({ label: `${g.name.toUpperCase()} LV${target} · LINE BOOST`, progress, score: progress + .04 });
      }
    }
  });
  const nextZone = ZONES.find(z => z.threshold > (state.lifetimeLumens || 0));
  if (nextZone) {
    const progress = Math.min(1, (state.lifetimeLumens || 0) / nextZone.threshold);
    candidates.push({ label: `NEW SKY · ${nextZone.name.toUpperCase()}`, progress, score: progress + .015 });
  }
  const p = Math.min(1, (state.lifetimeLumens || 0) / 500000);
  candidates.push({ label: `REIGNITE · ${fmt(Math.max(0, 500000 - (state.lifetimeLumens || 0)))} ✦ TO STARDUST`, progress: p, score: p + .01 });
  return candidates.sort((a, b) => b.score - a.score)[0];
}

function enhanceGoal(state) {
  const goal = pickGoal(state);
  const label = $('#goal-label');
  const fill = $('#goal-fill');
  if (!goal || !label || !fill) return;
  label.textContent = `NEXT · ${goal.label}`;
  fill.style.width = `${Math.max(3, goal.progress * 100)}%`;
}

function enhanceGeneratorCards(state) {
  for (const g of GENERATORS) {
    const card = $(`.generator-card[data-id="${g.id}"]`);
    if (!card) continue;
    const small = $('.generator-copy small', card);
    if (!small) continue;
    const owned = state.generators[g.id] || 0;
    const target = nextMilestone(owned);
    const rate = owned * g.baseRate * milestoneMultiplier(owned);
    small.textContent = target
      ? `${fmt(rate)}/s line · Lv ${target} boost · ${target - owned} to go`
      : `${fmt(rate)}/s line · all milestones online`;
  }
}

function enhanceNav(state) {
  const contractBtn = $('.nav-btn[data-tab="contracts"]');
  const relicBtn = $('.nav-btn[data-tab="relics"]');
  const readyContracts = CONTRACTS.filter(c => !state.claimedContracts.includes(c.id) && contractProgress(state, c) >= c.target).length;
  const dailyReady = dailyStatus(state).canClaim ? 1 : 0;
  const contractBadge = readyContracts + dailyReady;
  if (contractBtn) {
    if (contractBadge > 0) contractBtn.dataset.badge = String(contractBadge);
    else delete contractBtn.dataset.badge;
  }
  const relicAffordable = Object.keys(state.relics || {}).some(id => state.stardust >= relicCost(state, id));
  if (relicBtn) {
    if (prestigeGain(state) > 0 || relicAffordable) relicBtn.dataset.badge = '•';
    else delete relicBtn.dataset.badge;
  }
}

function enhancePrestigeCopy(state) {
  const copy = $('#ascend-copy');
  if (!copy) return;
  const gain = prestigeGain(state);
  copy.textContent = gain > 0
    ? `Reset this pocket for +${gain} Stardust. Each lifetime Stardust adds +35% power; every Reignite also starts with legacy Lumens, Pulse ready, and an early comet.`
    : `Reach 500K run Lumens to Reignite. Every lifetime Stardust adds +35% permanent power, and later runs start with momentum instead of repeating the slow opening.`;
}

function enhanceOrbiters(state) {
  const host = $('#orbiters');
  if (!host) return;
  const purchased = GENERATORS.filter(g => (state.generators[g.id] || 0) > 0);
  const nodes = $$('i', host);
  nodes.forEach((node, i) => {
    const g = purchased[i % Math.max(1, purchased.length)];
    if (!g) return;
    node.classList.add('orbiter-machine');
    node.textContent = g.icon;
    node.title = `${g.name} Lv ${state.generators[g.id] || 0}`;
  });
}

function enhanceBuyModesVisibility() {
  const active = $('.nav-btn.active')?.dataset.tab || 'forge';
  $('.buy-modes')?.classList.toggle('hidden', active !== 'forge');
}

function enhance() {
  const state = readState();
  if (!state) return;
  enhanceGoal(state);
  enhanceGeneratorCards(state);
  enhanceNav(state);
  enhancePrestigeCopy(state);
  enhanceOrbiters(state);
  enhanceBuyModesVisibility();
}

setTimeout(enhance, 80);
setInterval(enhance, 650);
document.addEventListener('click', () => setTimeout(enhance, 40), { passive: true });
new MutationObserver(() => enhanceOrbiters(readState() || normalizeState({}))).observe($('#orbiters') || document.body, { childList: true, subtree: true });
