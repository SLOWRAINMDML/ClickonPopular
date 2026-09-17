from pathlib import Path


def rep(path, old, new, count=1):
    p = Path(path)
    s = p.read_text()
    if s.count(old) < count:
        raise SystemExit(f'missing patch target in {path}: {old[:120]!r}')
    p.write_text(s.replace(old, new, count))

# --- index surfaces ---
rep('index.html', '<link rel="stylesheet" href="./liveops.css" />', '<link rel="stylesheet" href="./liveops.css" />\n  <link rel="stylesheet" href="./engagement.css" />')
rep('index.html', '          <div class="goal-mini" aria-live="polite"><span id="goal-label">NEXT · Build the first Spark Drone</span><i><b id="goal-fill"></b></i></div>\n        </div>', '          <div class="goal-mini" aria-live="polite"><span id="goal-label">NEXT · Build the first Spark Drone</span><i><b id="goal-fill"></b></i></div>\n        </div>\n        <article id="hook-strip" class="hook-strip" aria-live="polite"></article>')
rep('index.html', '          <article id="live-announcement" class="live-card announcement-card"></article>', '          <section id="engagement-hub" class="engagement-grid"></section>\n          <article id="live-announcement" class="live-card announcement-card"></article>')
rep('index.html', '  <div id="fx-layer" aria-hidden="true"></div><div id="toasts" aria-live="polite"></div>', '  <div id="fx-layer" aria-hidden="true"></div><div id="toasts" aria-live="polite"></div><div id="engagement-reveal" class="engagement-toast-card" aria-live="polite"></div>')

# --- app import and state bootstrap ---
rep('src/app.js', "import { fetchLiveOps, serviceProfile, cloudCapability, syncCloudSave } from './service-client.js';", "import { fetchLiveOps, serviceProfile, cloudCapability, syncCloudSave } from './service-client.js';\nimport { ensureHooksState, prepareReturn, launchStatus, claimLaunchReward, addMomentum, breakthroughStatus, claimBreakthrough, comebackStatus, claimComeback, rhythmStatus, claimRhythm, capsuleStatus, openSignalCapsule, signalCollection, doctrineStatus, chooseDoctrine, storyLog, hookStripModel, readyHookCount, experimentVariant, dueSessionMilestones, markSessionMilestone } from './engagement.js';")
rep('src/app.js', "let state = ensureServiceState(load(), liveOpsConfig);", "let state = ensureHooksState(ensureServiceState(load(), liveOpsConfig), Date.now(), serviceProfile().pilotId);\nconst initialAwayMs = Math.max(0, Date.now() - (state.lastSeenAt || Date.now()));\nstate = prepareReturn(state, initialAwayMs, Date.now(), serviceProfile().pilotId);")
rep('src/app.js', "let lastPulseMarkup = '';", "let lastPulseMarkup = '';\nconst hookExposureSeen = new Set();")
rep('src/app.js', "track('game_loaded', { version: state.version, offlineReward: Math.round(initialOffline.reward) });", "track('game_loaded', { version: state.version, offlineReward: Math.round(initialOffline.reward) });\ntrack('hook_variant_assigned', { variant: experimentVariant(state) });")

# reveal helper
marker = "function burst(x, y, count = 7) {"
helper = '''function showEngagementReveal(card, duplicate = false) {
  const root = $('#engagement-reveal');
  if (!root || !card) return;
  root.innerHTML = `<div class="big">${card.symbol || '✦'}</div><b>${duplicate ? 'Signal Echo' : card.name}</b><span>${duplicate ? 'Duplicate converted to 1 ★ Star Token' : `${String(card.rarity || '').toUpperCase()} · ${card.bonus || ''}`}</span>`;
  root.classList.add('show');
  setTimeout(() => root.classList.remove('show'), 2200);
}

'''
rep('src/app.js', marker, helper + marker)

# engagement renderer
marker = "function renderNavBadges() {"
renderer = '''function renderEngagement(now = Date.now()) {
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

'''
rep('src/app.js', marker, renderer + marker)

# render and nav badge
rep('src/app.js', "renderHUD(); renderGenerators(); renderContracts(); renderRelics(); renderLive(); renderOrbit(); renderMonetization(); renderNavBadges();", "renderHUD(); renderGenerators(); renderContracts(); renderRelics(); renderLive(); renderEngagement(); renderOrbit(); renderMonetization(); renderNavBadges();")
rep('src/app.js', "const ready = missionsReady + eventReady + seasonReady;", "const ready = missionsReady + eventReady + seasonReady + readyHookCount(state);")

# click delegate additions
needle = "function bindDelegates() {\n  document.addEventListener('click', (e) => {"
addition = '''function bindDelegates() {
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
    }'''
rep('src/app.js', needle, addition)

# momentum on meaningful actions
rep('src/app.js', "if (result.bought) { state = result.state; state = addEventPoints(state, Math.min(10, result.bought) * Number(liveOpsConfig.tuning?.eventGeneratorPoint || 1), liveOpsConfig);", "if (result.bought) { state = addMomentum(result.state, Math.min(20, result.bought * 2)); state = addEventPoints(state, Math.min(10, result.bought) * Number(liveOpsConfig.tuning?.eventGeneratorPoint || 1), liveOpsConfig);")
rep('src/app.js', "if (result.reward) { state = result.state; state = addEventPoints(state, Number(liveOpsConfig.tuning?.eventContractPoints || 12), liveOpsConfig);", "if (result.reward) { state = addMomentum(result.state, 15); state = addEventPoints(state, Number(liveOpsConfig.tuning?.eventContractPoints || 12), liveOpsConfig);")
rep('src/app.js', "const result = registerTap(state);\n  state = result.state;", "const result = registerTap(state);\n  state = result.state;\n  if ((state.stats?.tapsAllTime || 0) % 5 === 0) state = addMomentum(state, 5);")
rep('src/app.js', "if (result.activated) { state = addEventPoints(result.state, Number(liveOpsConfig.tuning?.eventPulsePoints || 5), liveOpsConfig);", "if (result.activated) { state = addMomentum(result.state, 12); state = addEventPoints(state, Number(liveOpsConfig.tuning?.eventPulsePoints || 5), liveOpsConfig);")
rep('src/app.js', "const result = cometReward(state); state = addEventPoints(result.state, Number(liveOpsConfig.tuning?.eventCometPoints || 25), liveOpsConfig);", "const result = cometReward(state); state = addMomentum(result.state, 25); state = addEventPoints(state, Number(liveOpsConfig.tuning?.eventCometPoints || 25), liveOpsConfig);")

# time instrumentation and comeback on resume
rep('src/app.js', "  renderNavBadges();\n  refreshTelemetrySummary();\n}, 1000);", "  renderNavBadges();\n  for (const seconds of dueSessionMilestones(state)) { track('active_time_milestone', { seconds, variant:experimentVariant(state) }); state = markSessionMilestone(state, seconds); }\n  refreshTelemetrySummary();\n}, 1000);")
rep('src/app.js', "  const resumed = applyOfflineReward(state);\n  state = resumed.state;", "  const awayMs = Math.max(0, Date.now() - (state.lastSeenAt || Date.now()));\n  const resumed = applyOfflineReward(state);\n  state = prepareReturn(resumed.state, awayMs, Date.now(), serviceProfile().pilotId);")

# --- game economy bonuses from collection/doctrine/overdrive ---
marker = "export function passiveRate(state, now = Date.now()) {"
bonus = '''function engagementMultiplier(state, kind, now = Date.now()) {
  const hooks = state.service?.hooks || {};
  const cards = new Set(hooks.signalCards || []);
  let mult = 1;
  if (kind === 'passive') {
    if (hooks.doctrine === 'architect') mult *= 1.25;
    if (cards.has('emberMap')) mult *= 1.04;
    if (cards.has('prismHeart')) mult *= 1.07;
    if (cards.has('auroraKey')) mult *= 1.05;
    if (cards.has('blackStar')) mult *= 1.08;
  }
  if (kind === 'tap') {
    if (hooks.doctrine === 'resonant') mult *= 1.35;
    if (cards.has('echoCoil')) mult *= 1.06;
    if (cards.has('auroraKey')) mult *= 1.05;
    if (cards.has('blackStar')) mult *= 1.08;
  }
  if (kind === 'comet') {
    if (hooks.doctrine === 'surveyor') mult *= 1.40;
    if (cards.has('cometThread')) mult *= 1.08;
    if (cards.has('blackStar')) mult *= 1.08;
  }
  if (kind === 'offline') {
    if (hooks.doctrine === 'surveyor') mult *= 1.15;
    if (cards.has('hourglassSeed')) mult *= 1.10;
    if (cards.has('quietOrbit')) mult *= 1.15;
  }
  if ((kind === 'passive' || kind === 'tap') && Number(hooks.overdriveUntil || 0) > now) mult *= 2;
  return mult;
}

'''
rep('src/game.js', marker, bonus + marker)
rep('src/game.js', "return base * prestigeMultiplier(state) * relicMultiplier(state, 'passive') * pulseMultiplier(state, now) * adBoostMultiplier(state, now);", "return base * prestigeMultiplier(state) * relicMultiplier(state, 'passive') * pulseMultiplier(state, now) * adBoostMultiplier(state, now) * engagementMultiplier(state, 'passive', now);")
rep('src/game.js', "return prestigeMultiplier(state) * relicMultiplier(state, 'tap') * combo * pulseMultiplier(state, now) * adBoostMultiplier(state, now);", "return prestigeMultiplier(state) * relicMultiplier(state, 'tap') * combo * pulseMultiplier(state, now) * adBoostMultiplier(state, now) * engagementMultiplier(state, 'tap', now);")
rep('src/game.js', "const reward = Math.max(50, passiveRate(state, now) * 20 + tapValue(state, now) * 10) * relicMultiplier(state, 'comet');", "const reward = Math.max(50, passiveRate(state, now) * 20 + tapValue(state, now) * 10) * relicMultiplier(state, 'comet') * engagementMultiplier(state, 'comet', now);")
rep('src/game.js', "return rate * elapsed * relicMultiplier(state, 'offline');", "return rate * elapsed * relicMultiplier(state, 'offline') * engagementMultiplier(state, 'offline', now);")

# --- service worker ---
rep('service-worker.js', "const CACHE='lumen-loop-v5';", "const CACHE='lumen-loop-v6';")
rep('service-worker.js', "'./liveops.css','./config.js'", "'./liveops.css','./engagement.css','./config.js'")
rep('service-worker.js', "'./src/liveops.js','./src/service-client.js'", "'./src/liveops.js','./src/service-client.js','./src/engagement.js'")
