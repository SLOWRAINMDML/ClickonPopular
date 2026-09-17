# Review cycle 1 — economy + mobile lifecycle

## Checks
- Compared implementation against the benchmark pillars and product brief.
- Ran deterministic economy tests and an active-play progression simulation.
- Audited save/resume flow for mobile backgrounding.
- Audited touch targets, viewport safe-area handling and accessibility basics.

## Findings
1. **Early reward spike:** the `Find the Rhythm` contract paid 3,500 Lumens after only a few taps. In simulation this cascaded into 10+ machine purchases and moved first prestige to ~3 minutes.
2. **Pulse too early:** ×4 Pulse was available at second zero, masking the natural first-purchase curve.
3. **Background resume gap:** a suspended mobile tab saved correctly but did not calculate catch-up income unless the page was reloaded.
4. **Zoom lock:** `user-scalable=no` was unnecessary and reduced accessibility.

## Fixes applied
- Rebalanced all early contract rewards; combo contract 3,500 → 120 and other early rewards reduced.
- First Pulse becomes available after 20 seconds; later cooldown remains 45 seconds.
- Added foreground resume settlement using the same capped offline-income formula.
- Removed browser zoom lock while keeping tap behavior controlled through `touch-action` on the core.

## Acceptance gate
- Unit tests pass.
- First purchase remains near-immediate.
- First prestige must move into the intended several-minute session instead of the initial ~3-minute spike.
