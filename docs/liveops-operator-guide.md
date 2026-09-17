# LiveOps Operator Guide

## Runtime config flow
`src/service-client.js` loads the URL in `LUMEN_CONFIG.liveOps.configUrl` with `cache: no-store`.

Fallback order:
1. remote JSON;
2. last-known local cached config;
3. compiled `DEFAULT_LIVEOPS`.

The repository ships `liveops.json` so GitHub Pages works with no external service. In production, point `configUrl` at a CDN, Firebase/Remote-Config bridge, edge function, or another authenticated publishing pipeline.

## Safe parameters to tune
`daily.missionCount` — 1..6 expected.
`daily.xpPerMission` — Season XP granted per completed Daily Op.
`daily.lumenSeconds` — dynamic Lumen reward measured in seconds of current passive output.
`season.xpPerLevel`, `season.maxLevel` — monthly track length.
`event.name`, `event.milestones`, `event.tokenRewards` — weekly event progression.
`tuning.event*` — points awarded by taps/builds/Pulse/Comet/contracts/Daily Ops.
`announcement` — service news shown at the top of LIVE.

## Do not remotely store
- API secrets;
- private signing keys;
- payment credentials;
- authoritative premium entitlements.

Client config is readable by players.

## Recommended experiments
Change one variable per experiment and keep a holdout:
- Daily Ops target difficulty;
- Season XP pacing;
- weekly milestone spacing;
- rewarded-ad placement/frequency;
- onboarding wording;
- cosmetic Token pricing.

Primary evaluation should combine retention and revenue, not optimize ad impressions alone.

## Emergency operations
If a remote config breaks, the app falls back to cached/default config. For high-risk service features, add a server/CDN feature flag and retain a known-good config document that can be republished immediately.
