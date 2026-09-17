const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

export const DEFAULT_LIVEOPS = {
  schema: 1,
  announcement: {
    id: 'service-launch',
    title: 'The Star Atlas is online',
    body: 'Daily Ops, weekly Comet Surge and monthly Constellation Seasons now turn every run into permanent collection progress.'
  },
  daily: { missionCount: 3, xpPerMission: 40, lumenSeconds: 75 },
  season: { xpPerLevel: 100, maxLevel: 20 },
  event: {
    name: 'Comet Surge',
    milestones: [50, 150, 350, 700, 1200],
    tokenRewards: [1, 1, 2, 2, 4]
  },
  tuning: {
    eventTapEvery: 25,
    eventTapPoints: 2,
    eventGeneratorPoint: 1,
    eventPulsePoints: 5,
    eventCometPoints: 25,
    eventContractPoints: 12,
    eventMissionPoints: 15
  }
};

export const MISSION_TEMPLATES = [
  { id: 'tap', metric: 'tapsAllTime', icon: '✦', title: 'Warm the Core', target: 80, verb: 'Tap the core 80 times' },
  { id: 'build', metric: 'generatorsBuilt', icon: '⬡', title: 'Expand the Orbit', target: 6, verb: 'Build 6 machines' },
  { id: 'comet', metric: 'cometsCaught', icon: '☄', title: 'Catch the Wanderer', target: 1, verb: 'Catch 1 Lucky Comet' },
  { id: 'pulse', metric: 'pulsesUsed', icon: '⌁', title: 'Overclock', target: 2, verb: 'Activate Pulse twice' },
  { id: 'active', metric: 'activeSeconds', icon: '◷', title: 'Keep Watch', target: 180, verb: 'Stay active for 3 minutes' },
  { id: 'contract', metric: 'contractsClaimed', icon: '✓', title: 'Close the Loop', target: 1, verb: 'Claim 1 Contract' }
];

export const CORE_SKINS = [
  { id: 'dawn', name: 'Dawn Seed', cost: 0, symbol: '✦', description: 'The original pocket star.' },
  { id: 'solar', name: 'Solar Crown', cost: 4, symbol: '☀', description: 'A warm gold core earned through service play.' },
  { id: 'aurora', name: 'Aurora Glass', cost: 7, symbol: '◇', description: 'Cold cyan light with a glassy halo.' },
  { id: 'rose', name: 'Void Rose', cost: 10, symbol: '✿', description: 'A deep-space magenta core.' },
  { id: 'mint', name: 'Comet Mint', cost: 14, symbol: '☄', description: 'A pale green core traced by comet dust.' }
];

const METRIC_DEFAULTS = {
  tapsAllTime: 0, generatorsBuilt: 0, cometsCaught: 0, pulsesUsed: 0,
  activeSeconds: 0, contractsClaimed: 0
};

function dateParts(now = Date.now()) {
  const d = new Date(now);
  return { y: d.getFullYear(), m: d.getMonth() + 1, day: d.getDate() };
}

export function dayKey(now = Date.now()) {
  const { y, m, day } = dateParts(now);
  return `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

export function seasonDescriptor(now = Date.now(), cfg = DEFAULT_LIVEOPS) {
  const d = new Date(now);
  const id = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
  const names = ['Dawn','Prism','Comet','Bloom','Aurora','Zenith','Ember','Halo','Genesis','Violet','Nebula','Solstice'];
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  return { id: `season-${id}`, name: `${names[d.getMonth()]} Constellation`, start, end, ...cfg.season };
}

export function eventDescriptor(now = Date.now(), cfg = DEFAULT_LIVEOPS) {
  const d = new Date(now);
  const localDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const weekday = (new Date(localDay).getDay() + 6) % 7;
  const start = localDay - weekday * DAY_MS;
  const end = start + WEEK_MS;
  const weekNumber = Math.floor(start / WEEK_MS);
  return { id: `comet-${weekNumber}`, name: cfg.event.name || 'Comet Surge', start, end, ...cfg.event };
}

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function metricsSnapshot(state) {
  const stats = state.stats || {};
  return Object.fromEntries(Object.keys(METRIC_DEFAULTS).map(key => [key, Number(stats[key] || 0)]));
}

export function dailyMissionIds(now = Date.now(), cfg = DEFAULT_LIVEOPS) {
  const count = Math.max(1, Math.min(MISSION_TEMPLATES.length, Number(cfg.daily?.missionCount || 3)));
  const seed = hash(dayKey(now));
  return [...MISSION_TEMPLATES]
    .map((m, i) => ({ ...m, sort: hash(`${seed}:${i}:${m.id}`) }))
    .sort((a,b) => a.sort - b.sort)
    .slice(0, count)
    .map(m => m.id);
}

export function mergeLiveOps(remote = {}) {
  return {
    ...DEFAULT_LIVEOPS,
    ...remote,
    announcement: { ...DEFAULT_LIVEOPS.announcement, ...(remote.announcement || {}) },
    daily: { ...DEFAULT_LIVEOPS.daily, ...(remote.daily || {}) },
    season: { ...DEFAULT_LIVEOPS.season, ...(remote.season || {}) },
    event: { ...DEFAULT_LIVEOPS.event, ...(remote.event || {}) },
    tuning: { ...DEFAULT_LIVEOPS.tuning, ...(remote.tuning || {}) }
  };
}

export function ensureServiceState(input, cfg = DEFAULT_LIVEOPS, now = Date.now()) {
  const state = { ...input, service: { ...(input.service || {}) } };
  const service = state.service;
  const today = dayKey(now);
  const season = seasonDescriptor(now, cfg);
  const event = eventDescriptor(now, cfg);

  if (service.dayKey !== today) {
    service.dayKey = today;
    service.dailyBaseline = metricsSnapshot(state);
    service.dailyMissionIds = dailyMissionIds(now, cfg);
    service.dailyMissionClaimed = [];
  }
  if (service.seasonId !== season.id) {
    service.seasonId = season.id;
    service.seasonXp = 0;
    service.seasonClaimedLevels = [];
  }
  if (service.eventId !== event.id) {
    service.eventId = event.id;
    service.eventPoints = 0;
    service.eventClaimedMilestones = [];
  }
  service.starTokens = Math.max(0, Number(service.starTokens || 0));
  service.unlockedSkins = Array.isArray(service.unlockedSkins) && service.unlockedSkins.length ? service.unlockedSkins : ['dawn'];
  service.equippedSkin = service.unlockedSkins.includes(service.equippedSkin) ? service.equippedSkin : 'dawn';
  return state;
}

export function dailyMissions(state, cfg = DEFAULT_LIVEOPS, now = Date.now()) {
  state = ensureServiceState(state, cfg, now);
  const base = state.service.dailyBaseline || {};
  const claimed = new Set(state.service.dailyMissionClaimed || []);
  return (state.service.dailyMissionIds || []).map(id => {
    const template = MISSION_TEMPLATES.find(m => m.id === id);
    const current = Number(state.stats?.[template.metric] || 0);
    const progress = Math.max(0, current - Number(base[template.metric] || 0));
    return { ...template, progress, ready: progress >= template.target, claimed: claimed.has(id), xp: Number(cfg.daily?.xpPerMission || 40) };
  });
}

export function claimServiceMission(input, id, lumenReward, cfg = DEFAULT_LIVEOPS, now = Date.now()) {
  let state = ensureServiceState(input, cfg, now);
  const mission = dailyMissions(state, cfg, now).find(m => m.id === id);
  if (!mission || !mission.ready || mission.claimed) return { state, claimed: false, mission };
  state = { ...state, service: { ...state.service, dailyMissionClaimed: [...state.service.dailyMissionClaimed, id], seasonXp: (state.service.seasonXp || 0) + mission.xp } };
  const reward = Math.max(0, Number(lumenReward || 0));
  state.lumens += reward; state.lifetimeLumens += reward; state.totalLumensAllTime += reward;
  return { state, claimed: true, mission, reward, xp: mission.xp };
}

export function seasonStatus(state, cfg = DEFAULT_LIVEOPS, now = Date.now()) {
  state = ensureServiceState(state, cfg, now);
  const season = seasonDescriptor(now, cfg);
  const xp = Number(state.service.seasonXp || 0);
  const level = Math.min(season.maxLevel, Math.floor(xp / season.xpPerLevel));
  const inLevel = season.maxLevel === level ? season.xpPerLevel : xp % season.xpPerLevel;
  return { ...season, xp, level, inLevel, nextXp: season.xpPerLevel, claimedLevels: state.service.seasonClaimedLevels || [] };
}

export function tokenRewardForSeasonLevel(level, maxLevel = 20) {
  if (level >= maxLevel) return 5;
  if (level % 5 === 0) return 2;
  return 1;
}

export function claimSeasonRewards(input, cfg = DEFAULT_LIVEOPS, now = Date.now()) {
  let state = ensureServiceState(input, cfg, now);
  const status = seasonStatus(state, cfg, now);
  const claimed = new Set(state.service.seasonClaimedLevels || []);
  const levels = [];
  let tokens = 0;
  for (let level = 1; level <= status.level; level++) {
    if (claimed.has(level)) continue;
    levels.push(level); claimed.add(level); tokens += tokenRewardForSeasonLevel(level, status.maxLevel);
  }
  if (!levels.length) return { state, claimed: false, levels: [], tokens: 0 };
  state = { ...state, service: { ...state.service, seasonClaimedLevels: [...claimed].sort((a,b)=>a-b), starTokens: (state.service.starTokens || 0) + tokens } };
  return { state, claimed: true, levels, tokens };
}

export function addEventPoints(input, amount, cfg = DEFAULT_LIVEOPS, now = Date.now()) {
  const state = ensureServiceState(input, cfg, now);
  const points = Math.max(0, Math.floor(Number(amount || 0)));
  if (!points) return state;
  return { ...state, service: { ...state.service, eventPoints: (state.service.eventPoints || 0) + points } };
}

export function eventStatus(state, cfg = DEFAULT_LIVEOPS, now = Date.now()) {
  state = ensureServiceState(state, cfg, now);
  const event = eventDescriptor(now, cfg);
  const points = Number(state.service.eventPoints || 0);
  const claimed = new Set(state.service.eventClaimedMilestones || []);
  const milestones = event.milestones.map((target, i) => ({ target, reward: event.tokenRewards[i] || 1, ready: points >= target, claimed: claimed.has(target) }));
  return { ...event, points, milestones };
}

export function claimEventRewards(input, cfg = DEFAULT_LIVEOPS, now = Date.now()) {
  let state = ensureServiceState(input, cfg, now);
  const status = eventStatus(state, cfg, now);
  const claimed = new Set(state.service.eventClaimedMilestones || []);
  const targets = []; let tokens = 0;
  status.milestones.forEach(m => { if (m.ready && !m.claimed) { claimed.add(m.target); targets.push(m.target); tokens += m.reward; } });
  if (!targets.length) return { state, claimed: false, targets: [], tokens: 0 };
  state = { ...state, service: { ...state.service, eventClaimedMilestones: [...claimed].sort((a,b)=>a-b), starTokens: (state.service.starTokens || 0) + tokens } };
  return { state, claimed: true, targets, tokens };
}

export function unlockSkin(input, skinId) {
  const skin = CORE_SKINS.find(s => s.id === skinId);
  if (!skin) return { state: input, unlocked: false, reason: 'missing' };
  const service = input.service || {};
  if ((service.unlockedSkins || []).includes(skinId)) return { state: input, unlocked: false, reason: 'owned' };
  if ((service.starTokens || 0) < skin.cost) return { state: input, unlocked: false, reason: 'tokens' };
  const state = { ...input, service: { ...service, starTokens: service.starTokens - skin.cost, unlockedSkins: [...(service.unlockedSkins || ['dawn']), skinId] } };
  return { state, unlocked: true, skin };
}

export function equipSkin(input, skinId) {
  if (!(input.service?.unlockedSkins || []).includes(skinId)) return { state: input, equipped: false };
  return { state: { ...input, service: { ...input.service, equippedSkin: skinId } }, equipped: true };
}

export function atlasEntries(state) {
  const generatorNames = ['Spark Drone','Prism Rig','Orbit Forge','Comet Array','Nebula Garden','Star Lift'];
  const generatorIds = ['sparkDrone','prismRig','orbitForge','cometArray','nebulaGarden','starLift'];
  const entries = generatorIds.map((id,i) => ({ id:`gen:${id}`, group:'Machines', name:generatorNames[i], unlocked:(state.generators?.[id] || 0) > 0 }));
  const zoneDefs = [[0,'Dawn Pocket'],[10000,'Violet Orbit'],[1000000,'Aurora Belt'],[100000000,'Deep Lumen']];
  zoneDefs.forEach(([threshold,name]) => entries.push({ id:`zone:${name}`, group:'Skies', name, unlocked:(state.totalLumensAllTime || state.lifetimeLumens || 0) >= threshold }));
  const achievementDefs = [['firstTap','First Light'],['combo5','Hot Hands'],['rate1k','Machine Heart'],['fleet100','Busy Orbit'],['ascend','Born Again']];
  achievementDefs.forEach(([id,name]) => entries.push({ id:`achievement:${id}`, group:'Feats', name, unlocked:(state.achievements || []).includes(id) }));
  CORE_SKINS.forEach(skin => entries.push({ id:`skin:${skin.id}`, group:'Cores', name:skin.name, unlocked:(state.service?.unlockedSkins || ['dawn']).includes(skin.id) }));
  [[1,'First Reignite'],[5,'Five Reignites'],[10,'Ten Reignites']].forEach(([target,name]) => entries.push({ id:`ascend:${target}`, group:'Legacy', name, unlocked:(state.ascensions || 0) >= target }));
  return entries;
}

export function atlasSummary(state) {
  const entries = atlasEntries(state); const unlocked = entries.filter(e => e.unlocked).length;
  return { unlocked, total: entries.length, percent: Math.round(unlocked / entries.length * 100), entries };
}

export function timeRemaining(end, now = Date.now()) {
  const ms = Math.max(0, end - now);
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.max(1, Math.floor(ms / 60_000));
  return `${Math.floor(mins/60)}h ${mins%60}m`;
}
