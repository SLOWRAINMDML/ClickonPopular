# Mobile cockpit & retention redesign (2026-09-17)

## Product question
Why should someone open Lumen Loop again instead of treating it as a one-session number toy?

The answer is **visible acceleration**: the player should be able to see a small star system become a machine, make a few meaningful choices about how it grows, leave, return to useful progress, and then Reignite into a clearly faster version of the same fantasy.

## External signals reviewed
- Google Play, **Idle Miner Tycoon** (100M+): automation, management decisions, offline earnings and a growing business fantasy.
- Google Play, **Tap Titans 2** (10M+): collection, equipment, permanent artifacts, clans/tournaments and long-term progression.
- Google Play, **Egg, Inc.**: relaxed presentation plus research, contracts, collectibles/artifacts and layered prestige.
- Android/Material navigation guidance: 3–5 primary destinations belong in persistent bottom navigation on compact screens.
- Incremental-game community discussions: the strongest recurring positives are meaningful choices, clear progression, automation, theme/aesthetics, offline progress and prestige that makes the repeated opening dramatically faster. Repeated early-game grind, UI friction and excessive ad interruption are recurring negatives.

Reference starting points:
- https://play.google.com/store/apps/details?id=com.fluffyfairygames.idleminertycoon
- https://play.google.com/store/apps/details?id=com.gamehivecorp.taptitans2
- https://play.google.com/store/apps/details?id=com.auxbrain.egginc
- https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns
- https://www.reddit.com/r/incremental_games/comments/1qsmr0r/what_pulls_you_in_to_play_an_incremental_game/
- https://www.reddit.com/r/incremental_games/comments/1v1vci6/why_do_you_hate_prestige_mechanics/

## Player motivation pillars
1. **Touch feels good now** — the Core is always present, with combo, Pulse, comet and immediate audiovisual feedback.
2. **The machine visibly grows** — generators fill the orbit, production lines hit breakpoint multipliers, zones change, and the next target is always shown.
3. **I decide what kind of run this is** — tapping, passive output, offline efficiency, comet hunting or contracts can be emphasized with Relics.
4. **Leaving is allowed** — offline progress and daily cache make return sessions rewarding rather than punitive.
5. **Resetting is exciting, not a chore** — Reignite now gives a stronger permanent multiplier, a small legacy bankroll, immediately ready Pulse and an early comet so the repeated opening is materially faster.
6. **There is always a nearby target** — a compact NEXT bar selects a close generator discovery, production breakpoint, zone or Reignite target.

## Mobile UX contract
Portrait phones are a fixed game cockpit, not a scrolling web page.

- `html/body/app-shell`: locked to `100dvh`; document scrolling is disabled.
- Top: compact currency HUD; settings remains infrequent and out of the primary thumb path.
- Middle upper: Core stays visible and tappable on every top-level tab.
- Middle lower: Forge / Contracts / Relics content occupies the remaining space and is the **only** vertical scroll container.
- Bottom: persistent three-destination navigation.
- Forge cards are single-row on phones so 4–5 choices remain visible without leaving the Core.
- Low-frequency support and analytics controls are removed from the active game surface on phones and remain in Settings/documentation.
- Navigation badges surface ready daily/contracts or Relic/Reignite actions without forcing the player to hunt.

## Tested portrait targets
Static layout audit is run at:
- 360 × 800
- 390 × 844
- 430 × 932

Acceptance criteria:
- document scroll height == viewport height;
- Core remains above the tray;
- bottom navigation remains visible;
- overflow, when required, is isolated to the active lower tray only;
- primary buy buttons are at least ~44 px high and navigation buttons ~48 px high.
