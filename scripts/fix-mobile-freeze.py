from pathlib import Path


def replace(path, old, new):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"missing patch anchor in {path}: {old[:80]!r}")
    p.write_text(s.replace(old, new, 1))

# 1) Remove the legacy helper that contains a self-triggering MutationObserver.
replace('index.html', '  <script type="module" src="./src/mobile-v3.js"></script>\n', '')
Path('src/mobile-v3.js').unlink(missing_ok=True)

# 2) Force clients off the old runtime cache and prefer the network for executable code.
p = Path('service-worker.js')
s = p.read_text()
s = s.replace("const CACHE='lumen-loop-v4';", "const CACHE='lumen-loop-v5';")
s = s.replace(",'./src/mobile-v3.js'", '')
start = s.index("self.addEventListener('fetch'")
s = s[:start] + """self.addEventListener('fetch',e=>{\n  if(e.request.method!=='GET')return;\n  const url=new URL(e.request.url); if(url.origin!==location.origin)return;\n  const isDocument=e.request.mode==='navigate'||e.request.destination==='document';\n  const liveConfig=url.pathname.endsWith('/liveops.json');\n  const codeAsset=['script','style','worker'].includes(e.request.destination);\n  if(isDocument||liveConfig||codeAsset){\n    e.respondWith(fetch(e.request,{cache:'no-cache'}).then(res=>{\n      if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}\n      return res;\n    }).catch(()=>caches.match(e.request).then(r=>r||(isDocument?caches.match('./index.html'):Response.error()))));\n    return;\n  }\n  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{\n    if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}\n    return res;\n  })));\n});\n"""
p.write_text(s)

# 3) Keep simulation smooth, but cap DOM writes and never rebuild scrollable panels on a timer.
replace('src/app.js',
        'let rewardedBusy = false;\n',
        "let rewardedBusy = false;\nlet lastHudRender = 0;\nlet lastBodyClass = '';\nlet lastPulseMarkup = '';\n")
replace('src/app.js',
        "  document.body.className = `${zone.className} skin-${state.service?.equippedSkin || 'dawn'}`;",
        "  const bodyClass = `${zone.className} skin-${state.service?.equippedSkin || 'dawn'}`;\n  if (bodyClass !== lastBodyClass) { document.body.className = bodyClass; lastBodyClass = bodyClass; }")
replace('src/app.js',
        "  $('#pulse-btn').disabled = cooldown > 0 && !active;\n  $('#pulse-btn').innerHTML = active ? `PULSE ACTIVE <b>${Math.ceil((state.pulseUntil-now)/1000)}s</b>` : cooldown > 0 ? `PULSE <b>${Math.ceil(cooldown/1000)}s</b>` : 'PULSE <b>×4 / 10s</b>';",
        "  const pulseBtn = $('#pulse-btn');\n  pulseBtn.disabled = cooldown > 0 && !active;\n  const pulseMarkup = active ? `PULSE ACTIVE <b>${Math.ceil((state.pulseUntil-now)/1000)}s</b>` : cooldown > 0 ? `PULSE <b>${Math.ceil(cooldown/1000)}s</b>` : 'PULSE <b>×4 / 10s</b>';\n  if (pulseMarkup !== lastPulseMarkup) { pulseBtn.innerHTML = pulseMarkup; lastPulseMarkup = pulseMarkup; }")

insert = '''function refreshGeneratorAffordability() {\n  if (activeTab !== 'forge') return;\n  for (const g of GENERATORS) {\n    const card = $(`.generator-card[data-id="${g.id}"]`);\n    const btn = card?.querySelector('.buy-btn');\n    if (!btn) continue;\n    const quote = buyCost(g);\n    const disabled = quote.amount < 1 || quote.cost > state.lumens;\n    if (btn.disabled !== disabled) btn.disabled = disabled;\n    const cost = btn.querySelector('b');\n    const expected = `${fmt(quote.cost)} ✦`;\n    if (cost && cost.textContent !== expected) cost.textContent = expected;\n    if (state.buyMode === 'max') {\n      const label = btn.querySelector('span');\n      const expectedLabel = `BUY MAX (${quote.amount})`;\n      if (label && label.textContent !== expectedLabel) label.textContent = expectedLabel;\n    }\n  }\n}\n\nfunction refreshLiveClocks(now = Date.now()) {\n  if (activeTab !== 'live') return;\n  const event = eventStatus(state, liveOpsConfig, now);\n  const season = seasonStatus(state, liveOpsConfig, now);\n  const eventTime = $('#event-time');\n  const seasonTime = $('#season-time');\n  if (eventTime) eventTime.textContent = timeRemaining(event.end, now);\n  if (seasonTime) seasonTime.textContent = timeRemaining(season.end, now);\n}\n\n'''
replace('src/app.js', 'function renderAll() {\n', insert + 'function renderAll() {\n')

old_loop = '''function frame(nowPerf) {\n  if (adPaused) { lastFrame = nowPerf; requestAnimationFrame(frame); return; }\n  const dt = Math.min(0.25, (nowPerf - lastFrame) / 1000);\n  lastFrame = nowPerf;\n  const result = tick(state, dt); state = updateAchievements(result.state);\n  saveTimer += dt;\n  if (saveTimer > 5) { save(); saveTimer = 0; }\n  renderHUD(Date.now());\n  requestAnimationFrame(frame);\n}\nrequestAnimationFrame(frame);\n\nsetInterval(() => { state = ensureServiceState(state, liveOpsConfig); renderGenerators(); renderContracts(); renderRelics(); renderLive(); renderOrbit(); renderMonetization(); renderNavBadges(); refreshTelemetrySummary(); }, 1000);\n'''
new_loop = '''function frame(nowPerf) {\n  if (adPaused) { lastFrame = nowPerf; requestAnimationFrame(frame); return; }\n  const dt = Math.min(0.25, (nowPerf - lastFrame) / 1000);\n  lastFrame = nowPerf;\n  const result = tick(state, dt); state = updateAchievements(result.state);\n  saveTimer += dt;\n  if (saveTimer > 5) { save(); saveTimer = 0; }\n  // Simulation may run at display rate, but DOM work is capped at 10 Hz.\n  if (nowPerf - lastHudRender >= 100) { renderHUD(Date.now()); lastHudRender = nowPerf; }\n  requestAnimationFrame(frame);\n}\nrequestAnimationFrame(frame);\n\n// Passive income only changes affordability and clocks. Never rebuild scrollable panels on a timer.\nsetInterval(() => {\n  state = ensureServiceState(state, liveOpsConfig);\n  refreshGeneratorAffordability();\n  refreshLiveClocks();\n  if (activeTab === 'contracts') renderMonetization();\n  renderNavBadges();\n  refreshTelemetrySummary();\n}, 1000);\n'''
replace('src/app.js', old_loop, new_loop)

# 4) Regression gates.
p = Path('scripts/smoke.mjs')
s = p.read_text()
needle = "const css=(await readFile(new URL('../styles.css',import.meta.url),'utf8'))+(await readFile(new URL('../mobile-v3.css',import.meta.url),'utf8'));"
if "const app=await readFile" not in s:
    s = s.replace(needle, needle + "\nconst app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');\nconst sw=await readFile(new URL('../service-worker.js',import.meta.url),'utf8');")
checks = """\nif (html.includes('src/mobile-v3.js')) throw new Error('legacy mobile-v3 runtime must not load');\nif (app.includes('new MutationObserver')) throw new Error('self-triggering MutationObserver regression');\nif (app.includes(\"setInterval(() => { state = ensureServiceState(state, liveOpsConfig); renderGenerators();\")) throw new Error('periodic full-panel rebuild regression');\nif (!app.includes('nowPerf - lastHudRender >= 100')) throw new Error('HUD DOM updates must be frame-rate capped');\nif (!sw.includes('lumen-loop-v5')) throw new Error('service worker cache version must be v5');\n"""
if 'self-triggering MutationObserver regression' not in s:
    s += checks
p.write_text(s)

# This is a one-shot repair; leave the final tree clean.
Path('.github/workflows/fix-mobile-freeze.yml').unlink(missing_ok=True)
Path('scripts/fix-mobile-freeze.py').unlink(missing_ok=True)
