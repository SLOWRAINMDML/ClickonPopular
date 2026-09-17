const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

export const SIGNAL_CARDS = [
  { id:'emberMap', name:'Ember Map', symbol:'✦', rarity:'common', weight:34, bonus:'+4% passive output' },
  { id:'echoCoil', name:'Echo Coil', symbol:'⌁', rarity:'common', weight:31, bonus:'+6% tap power' },
  { id:'cometThread', name:'Comet Thread', symbol:'☄', rarity:'common', weight:26, bonus:'+8% comet rewards' },
  { id:'hourglassSeed', name:'Hourglass Seed', symbol:'◷', rarity:'rare', weight:18, bonus:'+10% offline efficiency' },
  { id:'auroraKey', name:'Aurora Key', symbol:'◇', rarity:'rare', weight:14, bonus:'+5% tap + passive output' },
  { id:'prismHeart', name:'Prism Heart', symbol:'◆', rarity:'rare', weight:10, bonus:'+7% passive output' },
  { id:'quietOrbit', name:'Quiet Orbit', symbol:'○', rarity:'rare', weight:8, bonus:'+15% offline efficiency' },
  { id:'blackStar', name:'Black Star Fragment', symbol:'✹', rarity:'epic', weight:5, bonus:'+8% all core output' }
];

export const DOCTRINES = [
  { id:'architect', name:'Architect', symbol:'⬡', summary:'Build the machine.', bonus:'+25% passive output' },
  { id:'resonant', name:'Resonant', symbol:'≋', summary:'Stay on the core.', bonus:'+35% tap power' },
  { id:'surveyor', name:'Surveyor', symbol:'☄', summary:'Chase the strange signal.', bonus:'+40% comet · +15% offline' }
];

export const LAUNCH_STEPS = [
  { id:'light', label:'Make First Light', metric:'taps', target:1, lumens:25, capsules:0 },
  { id:'warm', label:'Warm the Core', metric:'taps', target:25, lumens:100, capsules:0 },
  { id:'machine', label:'Build First Machine', metric:'built', target:1, lumens:200, capsules:0 },
  { id:'orbit', label:'Form First Orbit', metric:'owned', target:10, lumens:250, capsules:1 },
  { id:'pulse', label:'Trigger a Pulse', metric:'pulses', target:1, lumens:500, capsules:0 },
  { id:'comet', label:'Catch a Comet', metric:'comets', target:1, lumens:500, capsules:1 },
  { id:'contract', label:'Finish a Contract', metric:'contracts', target:1, lumens:750, capsules:0 },
  { id:'horizon', label:'Cross 10K All-Time', metric:'alltime', target:10_000, lumens:1000, capsules:1 }
];

function localDayKey(now = Date.now()) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function localWeekKey(now = Date.now()) {
  const d = new Date(now);
  const noon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  const day = (noon.getDay() + 6) % 7;
  noon.setDate(noon.getDate() - day);
  return localDayKey(noon.getTime());
}

function hashString(text) {
  let h = 2166136261;
  for (let i=0;i<text.length;i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function totalOwned(state) {
  return Object.values(state.generators || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

function metricValue(state, metric) {
  const stats = state.stats || {};
  if (metric === 'taps') return Number(stats.tapsAllTime || state.taps || 0);
  if (metric === 'built') return Number(stats.generatorsBuilt || 0);
  if (metric === 'owned') return totalOwned(state);
  if (metric === 'pulses') return Number(stats.pulsesUsed || 0);
  if (metric === 'comets') return Number(stats.cometsCaught || 0);
  if (metric === 'contracts') return Number(stats.contractsClaimed || 0);
  if (metric === 'alltime') return Number(state.totalLumensAllTime || 0);
  return 0;
}

function defaultHooks(now, seed) {
  return {
    version: 1,
    firstSeenAt: now,
    launchClaimed: [],
    capsules: 0,
    signalCards: [],
    capsuleOpens: 0,
    pityMisses: 0,
    doctrine: '',
    doctrineAscension: -1,
    momentum: 0,
    overdriveUntil: 0,
    breakthroughCount: 0,
    weekKey: localWeekKey(now),
    rhythmDays: [],
    rhythmClaimed: false,
    comebackReady: false,
    lastComebackOfferDay: '',
    visitDays: [],
    experimentVariant: hashString(String(seed || 'pilot')) % 2 === 0 ? 'progress' : 'reward',
    analyticsMilestones: []
  };
}

export function ensureHooksState(state, now = Date.now(), seed = 'pilot') {
  const service = { ...(state.service || {}) };
  const base = defaultHooks(now, seed);
  const raw = service.hooks || {};
  const hooks = { ...base, ...raw };
  hooks.launchClaimed = Array.isArray(raw.launchClaimed) ? raw.launchClaimed : [];
  hooks.signalCards = Array.isArray(raw.signalCards) ? raw.signalCards : [];
  hooks.rhythmDays = Array.isArray(raw.rhythmDays) ? raw.rhythmDays : [];
  hooks.visitDays = Array.isArray(raw.visitDays) ? raw.visitDays : [];
  hooks.analyticsMilestones = Array.isArray(raw.analyticsMilestones) ? raw.analyticsMilestones : [];

  const week = localWeekKey(now);
  if (hooks.weekKey !== week) {
    hooks.weekKey = week;
    hooks.rhythmDays = [];
    hooks.rhythmClaimed = false;
  }
  const today = localDayKey(now);
  if (!hooks.rhythmDays.includes(today)) hooks.rhythmDays = [...hooks.rhythmDays, today].slice(-7);
  if (!hooks.visitDays.includes(today)) hooks.visitDays = [...hooks.visitDays, today].slice(-60);
  service.hooks = hooks;
  return { ...state, service };
}

export function prepareReturn(state, awayMs, now = Date.now(), seed = 'pilot') {
  let next = ensureHooksState(state, now, seed);
  const hooks = { ...next.service.hooks };
  const today = localDayKey(now);
  if (awayMs >= 6 * HOUR_MS && hooks.lastComebackOfferDay !== today) {
    hooks.comebackReady = true;
    hooks.lastComebackOfferDay = today;
  }
  next = { ...next, service: { ...next.service, hooks } };
  return next;
}

export function launchStatus(state) {
  const hooks = state.service?.hooks || defaultHooks(Date.now(), 'pilot');
  const claimed = new Set(hooks.launchClaimed || []);
  const steps = LAUNCH_STEPS.map(step => {
    const value = metricValue(state, step.metric);
    return { ...step, value, ready:value >= step.target, claimed:claimed.has(step.id), progress:Math.min(1, value / step.target) };
  });
  const next = steps.find(step => !step.claimed) || null;
  return { steps, next, claimed:steps.filter(s=>s.claimed).length, total:steps.length, complete:!next };
}

function addLumens(state, amount) {
  const value = Math.max(0, Number(amount || 0));
  return {
    ...state,
    lumens: (state.lumens || 0) + value,
    lifetimeLumens: (state.lifetimeLumens || 0) + value,
    totalLumensAllTime: (state.totalLumensAllTime || 0) + value
  };
}

export function claimLaunchReward(state, id) {
  const status = launchStatus(state);
  const step = status.steps.find(item => item.id === id);
  if (!step || !step.ready || step.claimed) return { state, claimed:false };
  let next = addLumens(state, step.lumens);
  const hooks = { ...next.service.hooks };
  hooks.launchClaimed = [...new Set([...(hooks.launchClaimed || []), step.id])];
  hooks.capsules = Number(hooks.capsules || 0) + Number(step.capsules || 0);
  next = { ...next, service:{ ...next.service, hooks } };
  return { state:next, claimed:true, step };
}

export function addMomentum(state, points) {
  const hooks = { ...(state.service?.hooks || defaultHooks(Date.now(), 'pilot')) };
  hooks.momentum = Math.min(100, Math.max(0, Number(hooks.momentum || 0) + Number(points || 0)));
  return { ...state, service:{ ...(state.service || {}), hooks } };
}

export function breakthroughStatus(state, now = Date.now()) {
  const hooks = state.service?.hooks || defaultHooks(now, 'pilot');
  return {
    momentum:Number(hooks.momentum || 0),
    ready:Number(hooks.momentum || 0) >= 100,
    boostMs:Math.max(0, Number(hooks.overdriveUntil || 0) - now),
    count:Number(hooks.breakthroughCount || 0)
  };
}

export function claimBreakthrough(state, now = Date.now()) {
  const status = breakthroughStatus(state, now);
  if (!status.ready) return { state, claimed:false };
  const hooks = { ...state.service.hooks };
  hooks.momentum = 0;
  hooks.capsules = Number(hooks.capsules || 0) + 1;
  hooks.breakthroughCount = Number(hooks.breakthroughCount || 0) + 1;
  hooks.overdriveUntil = Math.max(now, Number(hooks.overdriveUntil || 0)) + 60_000;
  return { state:{ ...state, service:{ ...state.service, hooks } }, claimed:true, boostMs:60_000 };
}

export function comebackStatus(state) {
  return { ready:Boolean(state.service?.hooks?.comebackReady) };
}

export function claimComeback(state, passiveRatePerSecond = 0) {
  if (!state.service?.hooks?.comebackReady) return { state, claimed:false, reward:0 };
  const reward = Math.max(500, Number(passiveRatePerSecond || 0) * 600);
  let next = addLumens(state, reward);
  const hooks = { ...next.service.hooks, comebackReady:false };
  hooks.momentum = Math.min(100, Number(hooks.momentum || 0) + 25);
  next = { ...next, service:{ ...next.service, hooks } };
  return { state:next, claimed:true, reward };
}

export function rhythmStatus(state) {
  const hooks = state.service?.hooks || defaultHooks(Date.now(), 'pilot');
  const count = new Set(hooks.rhythmDays || []).size;
  return { count, target:5, ready:count >= 5 && !hooks.rhythmClaimed, claimed:Boolean(hooks.rhythmClaimed) };
}

export function claimRhythm(state) {
  const status = rhythmStatus(state);
  if (!status.ready) return { state, claimed:false };
  const hooks = { ...state.service.hooks, rhythmClaimed:true };
  hooks.capsules = Number(hooks.capsules || 0) + 2;
  const service = { ...state.service, hooks, starTokens:Number(state.service?.starTokens || 0) + 1 };
  return { state:{ ...state, service }, claimed:true, capsules:2, starTokens:1 };
}

export function capsuleStatus(state) {
  const hooks = state.service?.hooks || defaultHooks(Date.now(), 'pilot');
  return {
    capsules:Number(hooks.capsules || 0),
    owned:new Set(hooks.signalCards || []).size,
    total:SIGNAL_CARDS.length,
    pityMisses:Number(hooks.pityMisses || 0),
    odds:{ common:65, rare:28, epic:7 }
  };
}

function weightedPick(cards, seed) {
  const total = cards.reduce((sum, card) => sum + card.weight, 0);
  let roll = (hashString(seed) / 0xffffffff) * total;
  for (const card of cards) {
    roll -= card.weight;
    if (roll <= 0) return card;
  }
  return cards.at(-1);
}

export function openSignalCapsule(state, now = Date.now()) {
  const hooks = { ...(state.service?.hooks || defaultHooks(now, 'pilot')) };
  if (Number(hooks.capsules || 0) < 1) return { state, opened:false };
  const pity = Number(hooks.pityMisses || 0) >= 4;
  let pool = pity ? SIGNAL_CARDS.filter(card => card.rarity !== 'common') : SIGNAL_CARDS;
  const seed = `${hooks.firstSeenAt}:${hooks.capsuleOpens}:${localDayKey(now)}:${hooks.signalCards.join(',')}`;
  let card = weightedPick(pool, seed);
  const sameRarityUnowned = pool.filter(item => item.rarity === card.rarity && !hooks.signalCards.includes(item.id));
  if (sameRarityUnowned.length) card = weightedPick(sameRarityUnowned, `${seed}:unowned`);
  const duplicate = hooks.signalCards.includes(card.id);
  hooks.capsules -= 1;
  hooks.capsuleOpens = Number(hooks.capsuleOpens || 0) + 1;
  hooks.pityMisses = card.rarity === 'common' ? Number(hooks.pityMisses || 0) + 1 : 0;
  if (!duplicate) hooks.signalCards = [...hooks.signalCards, card.id];
  const service = { ...state.service, hooks };
  if (duplicate) service.starTokens = Number(service.starTokens || 0) + 1;
  return { state:{ ...state, service }, opened:true, card, duplicate, duplicateTokens:duplicate ? 1 : 0, pity };
}

export function signalCollection(state) {
  const owned = new Set(state.service?.hooks?.signalCards || []);
  return SIGNAL_CARDS.map(card => ({ ...card, owned:owned.has(card.id) }));
}

export function doctrineStatus(state) {
  const hooks = state.service?.hooks || defaultHooks(Date.now(), 'pilot');
  const ascensions = Number(state.ascensions || 0);
  return {
    doctrine:hooks.doctrine || '',
    available:ascensions >= 1 && Number(hooks.doctrineAscension ?? -1) < ascensions,
    ascensions,
    doctrines:DOCTRINES
  };
}

export function chooseDoctrine(state, id) {
  const doctrine = DOCTRINES.find(item => item.id === id);
  const status = doctrineStatus(state);
  if (!doctrine || !status.available) return { state, chosen:false };
  const hooks = { ...state.service.hooks, doctrine:id, doctrineAscension:Number(state.ascensions || 0) };
  return { state:{ ...state, service:{ ...state.service, hooks } }, chosen:true, doctrine };
}

export function storyLog(state, atlasPercent = 0) {
  const cards = state.service?.hooks?.signalCards || [];
  const entries = [
    { id:'spark', title:'Log 01 · The Seed Answers', unlocked:Number(state.stats?.generatorsBuilt || 0) >= 1, text:'The core stopped feeling like a button the moment the first drone began circling it.' },
    { id:'echo', title:'Log 02 · A Signal That Is Not Ours', unlocked:Number(state.stats?.cometsCaught || 0) >= 1, text:'There is structure inside the comet noise. Someone—or something—built a rhythm into it.' },
    { id:'reignite', title:'Log 03 · Death Was an Upgrade', unlocked:Number(state.ascensions || 0) >= 1, text:'Reignition did not erase the star. It taught the next star how to begin.' },
    { id:'archive', title:'Log 04 · The Pocket Remembers', unlocked:cards.length >= 3, text:'Fragments from different skies resonate when stored together. The Atlas is becoming more than a catalogue.' },
    { id:'halfway', title:'Log 05 · Beyond the Pocket', unlocked:Number(atlasPercent || 0) >= 50, text:'Half the map is filled. The empty half no longer looks empty—it looks like an invitation.' }
  ];
  return entries;
}

export function hookStripModel(state, variant = null) {
  const hooks = state.service?.hooks || defaultHooks(Date.now(), 'pilot');
  const comeback = comebackStatus(state);
  if (comeback.ready) return { kind:'comeback', eyebrow:'WELCOME BACK', title:'Your orbit kept working.', detail:'Claim a 10-minute catch-up cache and 25 Momentum.', cta:'CLAIM CATCH-UP', ready:true };
  const launch = launchStatus(state);
  if (launch.next) {
    const step = launch.next;
    const reward = `${step.lumens} ✦${step.capsules ? ` + ${step.capsules} Capsule` : ''}`;
    const copyVariant = variant || hooks.experimentVariant || 'progress';
    return { kind:'launch', id:step.id, eyebrow:`LAUNCH TRACK ${launch.claimed+1}/${launch.total}`, title:step.label, detail:copyVariant === 'reward' ? `Reward · ${reward}` : `${Math.floor(step.progress*100)}% complete · ${reward}`, progress:step.progress, cta:step.ready?'CLAIM':'IN PROGRESS', ready:step.ready };
  }
  const burst = breakthroughStatus(state);
  return { kind:'breakthrough', eyebrow:'BREAKTHROUGH', title:burst.ready?'A breakthrough is ready.':'Build Momentum through active play.', detail:burst.boostMs > 0 ? `Overdrive active · ${Math.ceil(burst.boostMs/1000)}s` : `${Math.floor(burst.momentum)} / 100 · reward: Capsule + 60s ×2`, progress:burst.momentum/100, cta:burst.ready?'TRIGGER':'CHARGING', ready:burst.ready };
}

export function readyHookCount(state) {
  const launch = launchStatus(state);
  let ready = launch.steps.filter(step => step.ready && !step.claimed).length;
  if (breakthroughStatus(state).ready) ready += 1;
  if (comebackStatus(state).ready) ready += 1;
  if (rhythmStatus(state).ready) ready += 1;
  if (capsuleStatus(state).capsules > 0) ready += 1;
  return ready;
}

export function experimentVariant(state) {
  return state.service?.hooks?.experimentVariant || 'progress';
}

export function dueSessionMilestones(state) {
  const hooks = state.service?.hooks || defaultHooks(Date.now(), 'pilot');
  const done = new Set(hooks.analyticsMilestones || []);
  const seconds = Number(state.stats?.activeSeconds || 0);
  return [60,300,900,1800].filter(target => seconds >= target && !done.has(`active_${target}`));
}

export function markSessionMilestone(state, seconds) {
  const hooks = { ...state.service.hooks };
  hooks.analyticsMilestones = [...new Set([...(hooks.analyticsMilestones || []), `active_${seconds}`])];
  return { ...state, service:{ ...state.service, hooks } };
}
