# Lumen Loop — Engagement & Growth System

## Product thesis
The game should not rely on one compulsion loop. It should stack different reasons to return: immediate skill/feedback, visible progress, curiosity, collection, strategic choice, comeback generosity, medium-term rhythm, live operations, personal records, and shareable identity.

A 10M-download outcome cannot be guaranteed by mechanics alone. Distribution, creative quality, store conversion, localization, UA efficiency, ratings, device stability, content cadence and long-term retention all matter. This system is designed to make those growth loops measurable rather than assumed.

## Hook stack
1. **Launch Track — first-session momentum.** Eight explicit onboarding milestones with immediate currency/capsule rewards. The player always knows the next meaningful action.
2. **Momentum / Breakthrough — active session climax.** Active actions fill a visible 0–100 meter. At 100, the player deliberately triggers a one-minute Overdrive and receives a free Signal Capsule.
3. **Signal Capsules — curiosity + collection.** Capsules are earned from play, never sold for money. Odds are displayed. A pity rule guarantees a Rare-or-better result after repeated Commons. Duplicates convert to a permanent Star Token.
4. **Doctrine — agency after prestige.** Reignite unlocks a run-defining choice: automation, active tapping or comet/discovery. The choice can be made again after later Reignites.
5. **Comeback Cache — reactivation without punishment.** Players absent for 6+ hours receive a catch-up cache and Momentum. It does not create a punitive missed-day reset.
6. **Orbit Rhythm — medium-term habit without streak anxiety.** Five distinct play days inside a weekly cycle earn a reward. Missing a day does not reset progress.
7. **Story Log — meaning behind numbers.** Logs unlock from actual gameplay milestones and make the star factory feel like a world rather than a spreadsheet.
8. **Pilot Card / Share — organic acquisition.** A privacy-safe card shares only gameplay achievements (Atlas %, Reignites, collection count). It never shares device or account identifiers.
9. **Live Ops — daily/weekly/monthly reasons to return.** Existing Daily Ops, Comet Surge and Constellation Season remain the calendar layer.
10. **A/B copy variant — learn instead of guess.** Each local Pilot is persistently assigned a progress-first or reward-first Launch Track presentation. Exposure, engagement and completion events are logged for comparison.

## Instrumentation contract
Every hook should be measurable through events:
- `hook_variant_assigned`
- `hook_exposure`
- `hook_engage`
- `hook_complete`
- `launch_reward_claim`
- `breakthrough_trigger`
- `signal_capsule_open`
- `signal_card_new`
- `signal_card_duplicate`
- `doctrine_select`
- `comeback_claim`
- `rhythm_claim`
- `story_unlock`
- `pilot_card_share`
- `active_time_milestone`

Evaluation should prioritize D1/D7/D30 retention, session frequency, first Reignite conversion, collection completion, crash/freeze-free sessions and revenue together. Never optimize ads or session length in isolation.

## Ethical guardrails
- No paid randomized Signal Capsules.
- Show capsule rarity odds in-product.
- Pity protection is explicit and favorable to the player.
- Missing a day does not erase weekly rhythm progress.
- No fake countdowns, fake social proof or fabricated global activity.
- No forced notification permission.
- Ads remain optional boosts; hook systems must work without ads.
- Sharing is explicit user action and contains gameplay-only data.

## Growth operation
Use Remote Config / `liveops.json` to tune reward sizes, hook visibility and experiment allocation. Roll out new variants to small cohorts, measure retention and stability, then expand only when they improve the complete experience. Firebase Remote Config and A/B Testing support Web and allow retention/revenue goals and controlled rollouts.
