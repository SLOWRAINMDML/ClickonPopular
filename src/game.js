export const VERSION = 3;
export const SAVE_KEY = 'lumen-loop-save-v1';
export const REWARDED_DAILY_LIMIT = 4;
export const REWARDED_COOLDOWN_MS = 60_000;
export const REWARDED_BOOST_MS = 5 * 60_000;
export const REWARDED_BOOST_MAX_MS = 15 * 60_000;
export const INTERSTITIAL_COOLDOWN_MS = 15 * 60_000;

export const GENERATORS = [
  { id: 'sparkDrone', name: 'Spark Drone', icon: '✦', baseCost: 15, baseRate: 0.5, blurb: 'Tiny drones skim loose photons from the core.' },
  { id: 'prismRig', name: 'Prism Rig', icon: '◇', baseCost: 120, baseRate: 4, blurb: 'Splits one beam into a profitable spectrum.' },
  { id: 'orbitForge', name: 'Orbit Forge', icon: '⬡', baseCost: 1200, baseRate: 28, blurb: 'Forges hot light into stable lumen ingots.' },
  { id: 'cometArray', name: 'Comet Array', icon: '☄', baseCost: 12000, baseRate: 180, blurb: 'Harvests passing tails before they fade.' },
  { id: 'nebulaGarden', name: 'Nebula Garden', icon: '❋', baseCost: 150000, baseRate: 1200, blurb: 'Grows luminous clouds in zero gravity.' },
  { id: 'starLift', name: 'Star Lift', icon: '△', baseCost: 2000000, baseRate: 8500, blurb: 'Hauls newborn stars into your pocket system.' }
];

export const RELICS = [
  { id: 'gloves', name: 'Resonant Gloves', icon: '✋', bonus: '+20% tap power / level', kind: 'tap' },
  { id: 'choir', name: 'Drone Choir', icon: '♬', bonus: '+20% passive production / level', kind: 'passive' },
  { id: 'capsule', name: 'Time Capsule', icon: '◷', bonus: '+10% offline efficiency / level', kind: 'offline' },
  { id: 'lens', name: 'Comet Lens', icon: '◉', bonus: '+25% comet rewards / level', kind: 'comet' },
  { id: 'seal', name: 'Contract Seal', icon: '◆', bonus: '+15% contract rewards / level', kind: 'contract' }
];

export const CONTRACTS = [
  { id: 'tap25', title: 'Wake the Seed', metric: 'taps', target: 25, reward: 75 },
  { id: 'own10', title: 'First Orbit', metric: 'owned', target: 10, reward: 150 },
  { id: 'earn5k', title: 'Pocket Industry', metric: 'lifetimeLumens', target: 5000, reward: 600 },
  { id: 'combo3', title: 'Find the Rhythm', metric: 'bestCombo', target: 3, reward: 120 },
  { id: 'own50', title: 'Crowded Sky', metric: 'owned', target: 50, reward: 3500 },
  { id: 'earn250k', title: 'Break the Horizon', metric: 'lifetimeLumens', target: 250000, reward: 15000 }
];

export const ZONES = [
  { threshold: 0, name: 'Dawn Pocket', className: 'zone-dawn' },
  { threshold: 10000, name: 'Violet Orbit', className: 'zone-violet' },
  { threshold: 1000000, name: 'Aurora Belt', className: 'zone-aurora' },
  { threshold: 100000000, name: 'Deep Lumen', className: 'zone-deep' }
];

export function createDefaultState(now = Date.now()) {
  return {
    version: VERSION,
    lumens: 0,
    lifetimeLumens: 0,
    totalLumensAllTime: 0,
    taps: 0,
    bestCombo: 1,
    combo: 1,
    comboHeat: 0,
    generators: Object.fromEntries(GENERATORS.map(g => [g.id, 0])),
    buyMode: 1,
    claimedContracts: [],
    stardust: 0,
    totalStardust: 0,
    ascensions: 0,
    relics: Object.fromEntries(RELICS.map(r => [r.id, 0])),
    pulseUntil: 0,
    pulseReadyAt: now + 20000,
    cometReadyAt: now + 18000,
    lastSeenAt: now,
    settings: { sound: true, motion: true, haptics: true, analytics: false },
    stats: {
      sessions: 0, activeSeconds: 0, generatorsBuilt: 0, cometsCaught: 0, pulsesUsed: 0,
      contractsClaimed: 0, dailyClaims: 0, rewardedAdsCompleted: 0
    },
    service: {
      dayKey: '', dailyBaseline: {}, dailyMissionIds: [], dailyMissionClaimed: [],
      seasonId: '', seasonXp: 0, seasonClaimedLevels: [],
      eventId: '', eventPoints: 0, eventClaimedMilestones: [],
      starTokens: 0, unlockedSkins: ['dawn'], equippedSkin: 'dawn',
      lastConfigSyncAt: 0, inboxSeen: []
    },
    monetization: {
      rewardedBoostUntil: 0,
      rewardedAdsDate: null,
      rewardedAdsToday: 0,
      lastRewardedAt: 0,
      lastInterstitialAt: now,
      interstitialsShown: 0
    },
    achievements: [],
    dailyClaimDate: null,
    dailyStreak: 0
  };
}

export function normalizeState(raw, now = Date.now()) {
  const base = createDefaultState(now);
  if (!raw || typeof raw !== 'object') return base;
  const state = { ...base, ...raw };
  state.generators = { ...base.generators, ...(raw.generators || {}) };
  state.relics = { ...base.relics, ...(raw.relics || {}) };
  state.settings = { ...base.settings, ...(raw.settings || {}) };
  state.monetization = { ...base.monetization, ...(raw.monetization || {}) };
  state.stats = { ...base.stats, ...(raw.stats || {}) };
  state.service = { ...base.service, ...(raw.service || {}) };
  state.service.dailyBaseline = { ...(raw.service?.dailyBaseline || {}) };
  state.service.dailyMissionIds = Array.isArray(raw.service?.dailyMissionIds) ? raw.service.dailyMissionIds : [];
  state.service.dailyMissionClaimed = Array.isArray(raw.service?.dailyMissionClaimed) ? raw.service.dailyMissionClaimed : [];
  state.service.seasonClaimedLevels = Array.isArray(raw.service?.seasonClaimedLevels) ? raw.service.seasonClaimedLevels : [];
  state.service.eventClaimedMilestones = Array.isArray(raw.service?.eventClaimedMilestones) ? raw.service.eventClaimedMilestones : [];
  state.service.unlockedSkins = Array.isArray(raw.service?.unlockedSkins) && raw.service.unlockedSkins.length ? raw.service.unlockedSkins : ['dawn'];
  state.service.inboxSeen = Array.isArray(raw.service?.inboxSeen) ? raw.service.inboxSeen : [];
  state.claimedContracts = Array.isArray(raw.claimedContracts) ? raw.claimedContracts : [];
  state.achievements = Array.isArray(raw.achievements) ? raw.achievements : [];
  return state;
}

export function costFor(generator, owned) {
  return Math.ceil(generator.baseCost * Math.pow(1.15, owned));
}

export function costForAmount(generator, owned, amount) {
  let total = 0;
  for (let i = 0; i < amount; i++) total += costFor(generator, owned + i);
  return total;
}

export function affordableAmount(generator, owned, lumens, cap = 10000) {
  let amount = 0;
  let spent = 0;
  while (amount < cap) {
    const next = costFor(generator, owned + amount);
    if (spent + next > lumens) break;
    spent += next;
    amount++;
  }
  return { amount, cost: spent };
}

export function milestoneMultiplier(owned) {
  let mult = 1;
  if (owned >= 10) mult *= 2;
  if (owned >= 25) mult *= 2;
  if (owned >= 50) mult *= 3;
  if (owned >= 100) mult *= 5;
  return mult;
}

export function prestigeMultiplier(state) {
  return 1 + (state.totalStardust || 0) * 0.35;
}

export function relicMultiplier(state, kind) {
  const levels = state.relics || {};
  if (kind === 'tap') return 1 + (levels.gloves || 0) * 0.2;
  if (kind === 'passive') return 1 + (levels.choir || 0) * 0.2;
  if (kind === 'offline') return Math.min(1, 0.75 + (levels.capsule || 0) * 0.1);
  if (kind === 'comet') return 1 + (levels.lens || 0) * 0.25;
  if (kind === 'contract') return 1 + (levels.seal || 0) * 0.15;
  return 1;
}

export function pulseMultiplier(state, now = Date.now()) {
  return state.pulseUntil > now ? 4 : 1;
}

export function adBoostMultiplier(state, now = Date.now()) {
  return (state.monetization?.rewardedBoostUntil || 0) > now ? 2 : 1;
}

export function passiveRate(state, now = Date.now()) {
  const base = GENERATORS.reduce((sum, g) => {
    const owned = state.generators[g.id] || 0;
    return sum + owned * g.baseRate * milestoneMultiplier(owned);
  }, 0);
  return base * prestigeMultiplier(state) * relicMultiplier(state, 'passive') * pulseMultiplier(state, now) * adBoostMultiplier(state, now);
}

export function tapValue(state, now = Date.now()) {
  const combo = Math.max(1, Math.min(5, state.combo || 1));
  return prestigeMultiplier(state) * relicMultiplier(state, 'tap') * combo * pulseMultiplier(state, now) * adBoostMultiplier(state, now);
}

export function registerTap(state, now = Date.now()) {
  const next = { ...state };
  const heat = Math.min(100, (next.comboHeat || 0) + 14);
  const combo = 1 + Math.floor(heat / 25);
  const value = tapValue({ ...next, combo }, now);
  next.comboHeat = heat;
  next.combo = Math.min(5, combo);
  next.bestCombo = Math.max(next.bestCombo || 1, next.combo);
  next.taps = (next.taps || 0) + 1;
  next.stats = { ...next.stats, tapsAllTime: (next.stats?.tapsAllTime || 0) + 1 };
  next.lumens += value;
  next.lifetimeLumens += value;
  next.totalLumensAllTime += value;
  return { state: next, value };
}

export function decayCombo(state, dt) {
  const next = { ...state };
  next.comboHeat = Math.max(0, (next.comboHeat || 0) - dt * 16);
  next.combo = Math.max(1, Math.min(5, 1 + Math.floor(next.comboHeat / 25)));
  return next;
}

export function tick(state, dt, now = Date.now()) {
  const next = decayCombo(state, dt);
  next.stats = { ...next.stats, activeSeconds: (next.stats?.activeSeconds || 0) + dt };
  const earned = passiveRate(next, now) * dt;
  next.lumens += earned;
  next.lifetimeLumens += earned;
  next.totalLumensAllTime += earned;
  return { state: next, earned };
}

export function totalOwned(state) {
  return GENERATORS.reduce((sum, g) => sum + (state.generators[g.id] || 0), 0);
}

export function buyGenerator(state, generatorId, mode = 1) {
  const g = GENERATORS.find(item => item.id === generatorId);
  if (!g) return { state, bought: 0, spent: 0 };
  const owned = state.generators[g.id] || 0;
  let amount;
  let spent;
  if (mode === 'max') {
    ({ amount, cost: spent } = affordableAmount(g, owned, state.lumens));
  } else {
    amount = Number(mode) || 1;
    spent = costForAmount(g, owned, amount);
    if (spent > state.lumens) return { state, bought: 0, spent: 0 };
  }
  if (amount <= 0) return { state, bought: 0, spent: 0 };
  const next = { ...state, generators: { ...state.generators } };
  next.lumens -= spent;
  next.generators[g.id] = owned + amount;
  next.stats = { ...next.stats, generatorsBuilt: (next.stats?.generatorsBuilt || 0) + amount };
  return { state: next, bought: amount, spent };
}

export function contractProgress(state, contract) {
  if (contract.metric === 'owned') return totalOwned(state);
  return Number(state[contract.metric] || 0);
}

export function claimContract(state, id) {
  const contract = CONTRACTS.find(c => c.id === id);
  if (!contract || state.claimedContracts.includes(id)) return { state, reward: 0 };
  if (contractProgress(state, contract) < contract.target) return { state, reward: 0 };
  const reward = contract.reward * relicMultiplier(state, 'contract');
  const next = { ...state, claimedContracts: [...state.claimedContracts, id] };
  next.stats = { ...next.stats, contractsClaimed: (next.stats?.contractsClaimed || 0) + 1 };
  next.lumens += reward;
  next.lifetimeLumens += reward;
  next.totalLumensAllTime += reward;
  return { state: next, reward };
}

export function prestigeGain(state) {
  if ((state.lifetimeLumens || 0) < 500000) return 0;
  return Math.max(1, Math.floor(Math.sqrt(state.lifetimeLumens / 500000)));
}

export function ascend(state, now = Date.now()) {
  const gain = prestigeGain(state);
  if (gain <= 0) return { state, gain: 0 };
  const fresh = createDefaultState(now);
  fresh.stardust = (state.stardust || 0) + gain;
  fresh.totalStardust = (state.totalStardust || 0) + gain;
  fresh.ascensions = (state.ascensions || 0) + 1;
  // Meta-progression should make the repeated opening materially faster, not merely replay it.
  // A small legacy bankroll buys immediate automation; Pulse is ready at once and the first comet arrives quickly.
  fresh.lumens = Math.min(150, fresh.ascensions * 15);
  fresh.pulseReadyAt = now;
  fresh.cometReadyAt = now + 6000;
  fresh.relics = { ...state.relics };
  fresh.settings = { ...state.settings };
  fresh.monetization = { ...fresh.monetization, ...state.monetization };
  fresh.achievements = [...new Set([...(state.achievements || []), 'ascend'])];
  fresh.totalLumensAllTime = state.totalLumensAllTime || 0;
  fresh.stats = { ...state.stats };
  fresh.service = { ...state.service, dailyBaseline: { ...(state.service?.dailyBaseline || {}) }, dailyMissionIds: [...(state.service?.dailyMissionIds || [])], dailyMissionClaimed: [...(state.service?.dailyMissionClaimed || [])], seasonClaimedLevels: [...(state.service?.seasonClaimedLevels || [])], eventClaimedMilestones: [...(state.service?.eventClaimedMilestones || [])], unlockedSkins: [...(state.service?.unlockedSkins || ['dawn'])], inboxSeen: [...(state.service?.inboxSeen || [])] };
  return { state: fresh, gain };
}

export function relicCost(state, relicId) {
  const level = state.relics[relicId] || 0;
  return 1 + level * level;
}

export function buyRelic(state, relicId) {
  if (!RELICS.some(r => r.id === relicId)) return { state, bought: false, cost: 0 };
  const cost = relicCost(state, relicId);
  if (state.stardust < cost) return { state, bought: false, cost };
  const next = { ...state, relics: { ...state.relics } };
  next.stardust -= cost;
  next.relics[relicId] = (next.relics[relicId] || 0) + 1;
  return { state: next, bought: true, cost };
}

export function activatePulse(state, now = Date.now()) {
  if ((state.pulseReadyAt || 0) > now) return { state, activated: false };
  return {
    state: { ...state, stats: { ...state.stats, pulsesUsed: (state.stats?.pulsesUsed || 0) + 1 }, pulseUntil: now + 10000, pulseReadyAt: now + 45000 },
    activated: true
  };
}

export function cometReward(state, now = Date.now()) {
  const reward = Math.max(50, passiveRate(state, now) * 20 + tapValue(state, now) * 10) * relicMultiplier(state, 'comet');
  const next = { ...state };
  next.stats = { ...next.stats, cometsCaught: (next.stats?.cometsCaught || 0) + 1 };
  next.lumens += reward;
  next.lifetimeLumens += reward;
  next.totalLumensAllTime += reward;
  next.cometReadyAt = now + 18000 + Math.random() * 18000;
  return { state: next, reward };
}

export function offlineReward(state, now = Date.now()) {
  const elapsed = Math.max(0, Math.min(8 * 3600, (now - (state.lastSeenAt ?? now)) / 1000));
  const rate = passiveRate({ ...state, pulseUntil: 0, monetization: { ...state.monetization, rewardedBoostUntil: 0 } }, now);
  return rate * elapsed * relicMultiplier(state, 'offline');
}

export function applyOfflineReward(state, now = Date.now()) {
  const reward = offlineReward(state, now);
  const next = { ...state, lastSeenAt: now };
  next.lumens += reward;
  next.lifetimeLumens += reward;
  next.totalLumensAllTime += reward;
  return { state: next, reward };
}


function localDayKey(now = Date.now()) {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayIndex(now = Date.now()) {
  const d = new Date(now);
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
}

export function dailyStatus(state, now = Date.now()) {
  const today = localDayKey(now);
  const canClaim = state.dailyClaimDate !== today;
  let nextStreak = 1;
  if (state.dailyClaimDate) {
    const prev = new Date(`${state.dailyClaimDate}T12:00:00`);
    nextStreak = dayIndex(now) - dayIndex(prev.getTime()) === 1 ? (state.dailyStreak || 0) + 1 : 1;
  }
  const reward = Math.max(100, passiveRate(state, now) * 60 + 100 * nextStreak);
  return { canClaim, reward, nextStreak, today };
}

export function claimDaily(state, now = Date.now()) {
  const status = dailyStatus(state, now);
  if (!status.canClaim) return { state, reward: 0, streak: state.dailyStreak || 0 };
  const next = { ...state, dailyClaimDate: status.today, dailyStreak: status.nextStreak };
  next.stats = { ...next.stats, dailyClaims: (next.stats?.dailyClaims || 0) + 1 };
  next.lumens += status.reward;
  next.lifetimeLumens += status.reward;
  next.totalLumensAllTime += status.reward;
  return { state: next, reward: status.reward, streak: status.nextStreak };
}


export function rewardedAdStatus(state, now = Date.now()) {
  const today = localDayKey(now);
  const monetization = state.monetization || {};
  const used = monetization.rewardedAdsDate === today ? (monetization.rewardedAdsToday || 0) : 0;
  const cooldownMs = Math.max(0, (monetization.lastRewardedAt || 0) + REWARDED_COOLDOWN_MS - now);
  const boostMs = Math.max(0, (monetization.rewardedBoostUntil || 0) - now);
  return {
    canWatch: used < REWARDED_DAILY_LIMIT && cooldownMs <= 0,
    used,
    remaining: Math.max(0, REWARDED_DAILY_LIMIT - used),
    cooldownMs,
    boostMs,
    dailyLimit: REWARDED_DAILY_LIMIT
  };
}

export function grantRewardedBoost(state, now = Date.now()) {
  const status = rewardedAdStatus(state, now);
  if (!status.canWatch) return { state, granted: false, status };
  const today = localDayKey(now);
  const currentUntil = Math.max(now, state.monetization?.rewardedBoostUntil || 0);
  const rewardedBoostUntil = Math.min(now + REWARDED_BOOST_MAX_MS, currentUntil + REWARDED_BOOST_MS);
  const next = {
    ...state,
    monetization: {
      ...state.monetization,
      rewardedBoostUntil,
      rewardedAdsDate: today,
      rewardedAdsToday: status.used + 1,
      lastRewardedAt: now
    }
  };
  next.stats = { ...next.stats, rewardedAdsCompleted: (next.stats?.rewardedAdsCompleted || 0) + 1 };
  return { state: next, granted: true, status: rewardedAdStatus(next, now), boostAddedMs: rewardedBoostUntil - currentUntil };
}

export function canShowInterstitial(state, now = Date.now()) {
  const m = state.monetization || {};
  const sinceInterstitial = now - (m.lastInterstitialAt || 0);
  const sinceRewarded = now - (m.lastRewardedAt || 0);
  return sinceInterstitial >= INTERSTITIAL_COOLDOWN_MS && sinceRewarded >= 2 * 60_000;
}

export function markInterstitialShown(state, now = Date.now()) {
  return {
    ...state,
    monetization: {
      ...state.monetization,
      lastInterstitialAt: now,
      interstitialsShown: (state.monetization?.interstitialsShown || 0) + 1
    }
  };
}

export function currentZone(state) {
  let zone = ZONES[0];
  for (const item of ZONES) if (state.lifetimeLumens >= item.threshold) zone = item;
  return zone;
}

export function updateAchievements(state) {
  const set = new Set(state.achievements || []);
  if (state.taps >= 1) set.add('firstTap');
  if (totalOwned(state) >= 100) set.add('fleet100');
  if (state.bestCombo >= 5) set.add('combo5');
  if (passiveRate(state) >= 1000) set.add('rate1k');
  if (state.ascensions >= 1) set.add('ascend');
  return { ...state, achievements: [...set] };
}
