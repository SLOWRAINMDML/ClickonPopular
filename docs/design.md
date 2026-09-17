# Lumen Loop — product brief

## Player fantasy
Grow a tiny star from a hand-tapped spark into a self-running cosmic factory. The emotional promise is not merely “number goes up”; it is **I can see my tiny system automate, choose how it grows, leave it running, and come back stronger**.

## Retention promise
- Every short session should expose one nearby target: a generator discovery, ownership breakpoint, contract, zone or Reignite.
- Active play accelerates progress but is never mandatory once automation begins.
- Reignite must make the repeated opening obviously faster; it should not ask the player to replay the same first minutes at nearly the same speed.
- Mobile play is a fixed one-hand cockpit: Core always visible, lower tray scroll only, persistent three-tab navigation.

## Core loop
Tap core → earn Lumens → buy orbit machines → hit ownership milestones → complete contracts → trigger Pulse / catch Comets → reach 500K run lifetime → Reignite → earn Stardust → buy permanent Relics → repeat faster.

## Session targets
- 0–10 s: first purchase.
- 10–45 s: noticeable passive production and first contract.
- 1–3 min: machine milestone, second/third generator, Pulse/comet interruption.
- 5–15 min: first prestige depending on activity.
- Return session: offline payout appears immediately.

## Visual direction
Warm cosmic toybox: deep violet glass panels, gold/pink star core, cool cyan orbital detail. The scene uses authored SVG plus CSS motion so the web build stays tiny and crisp at any mobile density.

## Audio direction
Procedural Web Audio SFX: soft tap blips, two-note purchase response, ascending contract chord, comet sparkle and prestige arpeggio. No external copyrighted audio is required.

## Technical contract
- Static HTML/CSS/ES modules; no framework or build step.
- Responsive portrait-first layout and desktop split view. Portrait phones use a fixed `100dvh` cockpit with no document scrolling.
- PWA manifest + service worker.
- localStorage save, 8-hour offline cap.
- Web Audio and Vibration API degrade gracefully.
- Pure economy module covered by Node built-in tests.
