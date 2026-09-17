# Review cycle 2 — rendered mobile UX + retention completeness

## Checks
- Rendered the app at 390×844 through headless Chromium using an inline QA bundle.
- Verified the live core click changed currency and six generator cards rendered with zero runtime errors.
- Inspected mobile hierarchy, fixed navigation overlap risk and rechecked long-loop completeness.
- Re-ran economy simulation after the first review fixes.

## Findings
1. **Bottom-nav overlap risk:** fixed navigation could cover the last portion of the internally scrolling factory list.
2. **Context noise:** buy quantity controls remained visible outside the Forge tab.
3. **Return loop gap:** offline earnings existed, but there was no explicit once-per-day return reward or visible long-term achievement checklist.
4. **Prestige pacing:** aggressive play still reached the first reset in ~4:07, slightly faster than the 5–15 minute target.
5. **Offline test weakness:** the original test used timestamp `0`, and `||` fallback could make the assertion pass with a zero reward.

## Fixes applied
- Added mobile bottom padding inside the content scroller so fixed navigation cannot obscure the final controls.
- Purchase-mode controls now hide outside Forge.
- Added **Daily Spark**: a once-per-local-day reward with a streak, scaled to roughly one minute of current passive output plus a streak floor.
- Added a visible five-badge achievement strip for tap, combo, income rate, machine count and first Reignite.
- Moved first Reignite requirement from 250K to **500K run lifetime**.
- Fixed offline timestamp handling to use nullish fallback and strengthened the test to assert a positive, capped reward.

## Final acceptance gate
- No runtime errors in the mobile QA render.
- Core tap works in the rendered build.
- All economy/unit/smoke tests pass.
- First prestige meets the intended several-minute cadence under aggressive play.
- Graphics, particle feedback, zone themes, procedural SFX, haptics, save/resume, daily reward, contracts, relics and prestige are all present.
