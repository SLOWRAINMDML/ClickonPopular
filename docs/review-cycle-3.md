# Review cycle 3 — fixed mobile cockpit + player motivation

## Why this cycle existed
The previous responsive layout technically kept the page within the viewport, but on a 390×844 phone the hero consumed ~463 px while the interactive factory tray had only ~155 px. Players therefore had to spend too much time scrolling a tiny tray to make basic decisions, breaking the tap → buy → tap rhythm.

## Research signals
- Major idle games retain players through automation, visible growth, offline progress, collections/strategy and meaningful prestige rather than endless manual tapping.
- Community feedback repeatedly values meaningful choices and prestige that makes the repeated opening much faster; repeated early-game grind and intrusive ads are common quit reasons.
- Android/Material guidance supports persistent bottom navigation for 3–5 primary destinations on compact devices.

## Fixes
1. **No document scrolling on portrait phones.** `html`, `body` and `.app-shell` are locked to `100dvh`.
2. **Core always visible.** The upper game cockpit remains on screen while Forge / Contracts / Relics change below it.
3. **Scroll is isolated to the lower tray.** The active tab is the only vertical scroll container.
4. **More useful screen allocation.** At 390×844 the hero dropped from ~463 px to ~297 px and the content tray grew from ~155 px to ~404 px.
5. **Compact Forge cards.** One-row cards keep about five production lines visible at once while preserving ~44 px buy targets.
6. **Persistent bottom nav.** Forge / Contracts / Relics stay visible; ready actions receive badges.
7. **Visible NEXT objective.** The tray header automatically surfaces a nearby generator discovery, ownership milestone, zone, or Reignite target.
8. **Gameplay before monetization.** Daily reward and contracts are shown before the optional rewarded-ad card on phones; support UI is removed from the active mobile play surface.
9. **Reignite is visible first in Relics.** Players no longer need to hunt below the Relic grid for the primary meta-progression action.
10. **Stronger meta-progression.** Total Stardust is now +35% global production each. A Reignite begins with a small legacy bankroll (15 ✦ per ascension, capped at 150), Pulse ready immediately and an early comet.
11. **Visible machine growth.** Orbit markers now use the purchased generator symbols instead of generic dots.
12. **Fresher PWA updates.** Service worker cache moved to v3, claims clients immediately, and navigations use network-first fallback so Pages updates are less likely to appear stale.

## Portrait layout audit
Rendered static game-shell QA with six Forge rows:

| Viewport | Document scroll | Hero | Content tray | Active tray client/scroll |
| --- | --- | ---: | ---: | ---: |
| 360×800 | none (800=800) | ~279 px | ~378 px | 321 / 395 px |
| 390×844 | none (844=844) | ~297 px | ~404 px | 341 / 395 px |
| 430×932 | none (932=932) | ~334 px | ~455 px | 398 / 398 px |

Contracts and Relics were also rendered at 390×844. Both kept document height exactly equal to the viewport; overflow remained inside the lower tray.

## Economy check
An aggressive synthetic active-play loop still reached first Reignite in roughly the same several-minute band. With one Stardust and the immediate post-Reignite momentum, a comparable second run was ~1.4× faster without spending Stardust; choosing the passive Relic pushed the sample run to ~1.55× faster. The exact value varies because comet timing is randomized, but the repeated opening is materially faster instead of nearly identical.

## Acceptance gate
- `npm test`: 11/11 pass.
- `npm run smoke`: pass.
- 360×800, 390×844 and 430×932: no document scrolling.
- Core + Pulse + bottom navigation remain visible while the lower tray scrolls.
- Optional ads do not precede the primary daily/contract gameplay in the mobile Contracts flow.
