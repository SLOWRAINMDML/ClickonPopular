# Lumen Loop: Pocket Star Factory

A mobile-first web idle clicker built from a benchmark synthesis of 10M+ download incremental games while using an original theme, art direction, economy and implementation.

## Run locally
```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Verify
```bash
npm test
npm run smoke
```

## Included
- one-thumb tap + combo loop
- six passive generator tiers with milestone multipliers
- x1/x10/MAX purchasing
- timed ×4 Pulse
- random Lucky Comet reward
- short contracts
- daily streak cache + visible achievements
- voluntary prestige / Stardust
- five permanent relic upgrade paths
- offline earnings (8h cap)
- local save + settings
- fixed one-hand mobile cockpit / safe areas (no document scroll)
- visible next-goal progress cue + ready-action nav badges
- Reignite momentum: stronger meta multiplier, legacy bankroll, ready Pulse, early comet
- procedural sound + optional haptics
- PWA manifest and offline cache
- original SVG game icon/core asset
- economy tests and two documented review cycles

See `docs/benchmark-analysis.md`, `docs/design.md`, `docs/mobile-retention-redesign.md`, `docs/review-cycle-1.md`, `docs/review-cycle-2.md`, `docs/review-cycle-3.md`.

## Monetization & records
- AdSense H5 Games / Ad Placement API adapter for web
- Android WebView AdMob slot bridge through the same H5 API
- opt-in rewarded x2 boost with daily/frequency caps
- natural-break interstitial hook after Reignite
- local bounded analytics log with CSV/JSON export
- optional GA4 after player opt-in
- optional external supporter link

Production credentials live in `config.js`; it ships in `mock` mode so development never generates real ad traffic. See `docs/monetization.md`.

## Live service layer
The current build is designed around a real service goal: **build today, complete a universe over time**. It includes 3 rotating Daily Ops, a weekly Comet Surge, a monthly Constellation Season, permanent Star Tokens/Core Skins, Star Atlas completion, first-run onboarding, remote/cached live-ops configuration, and an optional authenticated cloud-save adapter.

Operator/product docs:
- `docs/service-product-strategy.md`
- `docs/liveops-operator-guide.md`
- `docs/backend-contract.md`

`liveops.json` works as the zero-backend default. For production, set `LUMEN_CONFIG.liveOps.configUrl` to a remotely managed JSON/Remote Config bridge and `LUMEN_CONFIG.service.apiBase` to an authenticated backend.
