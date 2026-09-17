# Lumen Loop — Service Product Strategy

## The player purpose
Lumen Loop is not positioned as "tap a number forever." The service promise is:

> **Build a pocket star today, complete a universe over time.**

Every session should advance at least one of four horizons:

1. **Seconds / minutes — mastery:** tap rhythm, Pulse, Comets, efficient purchases.
2. **Today — intent:** three Daily Ops and the next visible progression goal.
3. **This week / month — anticipation:** Comet Surge milestones and the Constellation Season track.
4. **Permanent — identity / completion:** Reignites, Relics, Core Skins and Star Atlas completion.

A player can stop actively tapping once automation takes over, but they should still care about returning because the service rotates objectives and permanent collectibles.

## What the service is optimizing
Primary: sustainable D1/D7/D30 retention and session return rate without destructive ad pressure.

Guardrails:
- rewarded-ad completion rate vs. next-day retention;
- time to first automation, first Pulse, first Reignite;
- Daily Ops completion rate;
- weekly-event participation and milestone completion;
- Season level distribution and claim rate;
- Star Atlas completion distribution;
- ad impressions per DAU and churn after an ad;
- percentage of returning players who make meaningful permanent progress.

Revenue is a consequence of a healthy retained audience, not the core objective shown to the player.

## Implemented retention stack
- fixed one-thumb mobile cockpit;
- visible NEXT goal;
- offline earnings;
- forgiving local daily cache;
- three deterministic rotating Daily Ops;
- weekly Comet Surge event points earned through normal play;
- monthly Constellation Season XP track;
- Star Tokens earned from event/season rewards;
- five permanent cosmetic Core Skins;
- Star Atlas completion across machines, skies, feats, skins and Reignite legacy;
- first-run onboarding explaining the service promise;
- local-first profile and save;
- optional authenticated cloud-save adapter;
- remote/cached live-ops config;
- bounded telemetry plus optional GA4/custom endpoint;
- ads remain opt-in reward acceleration except for frequency-capped natural-break interstitials.

## LiveOps cadence
- **Daily:** 3 Ops, daily cache.
- **Weekly:** Comet Surge reset each local Monday.
- **Monthly:** a new Constellation Season.
- **Evergreen:** Reignite, Relics, skins, Atlas completion.

Daily missions are intentionally short. Season completion requires repeated participation across the month rather than a single binge.

## Economy of permanent cosmetics
Star Tokens are non-power collection currency. They are earned through service participation and currently unlock Core Skins. This prevents the live-service layer from becoming mandatory pay-to-win progression and gives long-term completion value that survives Reignite resets.

## Production boundary
Client-side saves and browser scores are editable by the player. Therefore:
- local play, cosmetics, offline progress and unranked progression can remain client-first;
- purchases, competitive leaderboards, premium entitlements and cross-device authoritative progress must be validated by a backend;
- never ship server secrets in Remote Config or `config.js`.

See `backend-contract.md` for the server boundary and `liveops-operator-guide.md` for operational tuning.
