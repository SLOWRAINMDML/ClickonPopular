# Monetization & records

## Recommended production path

Lumen Loop is an HTML5 web game, so the web build should use **AdSense H5 Games Ads / Ad Placement API**. The same H5 API can route to **AdMob** when the game is hosted in a registered Android WebView with the Google Mobile Ads SDK.

### 1. Web: AdSense H5 Games Ads
1. Join/receive approval for AdSense H5 Games Ads.
2. Copy `config.example.js` to `config.js` (already present with safe defaults).
3. Set:
   - `ads.provider = 'google-h5'`
   - `ads.adsenseClient = 'ca-pub-...'`
4. Use a Google-certified CMP / consent setup where required before serving personalized advertising.
5. Replace mock mode before public launch.

The runtime injects the Google script only when an ad is requested. Rewarded placement name: `production_boost`. Interstitial placement name: `after_reignite`.

### 2. Android app wrapper: AdMob
For an Android WebView build, register the WebView with the Google Mobile Ads SDK / H5 Ads WebView support and provide:
- `ads.admobRewardedSlot`
- `ads.admobInterstitialSlot`

The same JavaScript placement calls are reused. Do not place a separate AdMob banner inside the HTML game without following Google's supported WebView integration.

## Player-friendly frequency design
- Rewarded ads are opt-in only.
- Reward: x2 Lumen output for 5 minutes.
- Maximum four rewarded grants per local day.
- 60-second cooldown between rewarded grants.
- Boosts stack only up to 15 minutes ahead.
- Interstitials are only requested after Reignite, never during continuous tapping.
- First interstitial cannot be requested until 15 minutes after a fresh save.
- Interstitials are capped to one request every 15 minutes and kept at least two minutes away from a rewarded ad.

Rewarded value is an in-game, non-transferable benefit; it is never cash or a cash-equivalent reward.

## Records / analytics
The game records a bounded first-party activity log in localStorage (`lumen-loop-events-v1`, latest 600 events). Settings can export:
- activity events as JSON
- activity events as CSV
- current save as JSON

Tracked examples:
- `session_start`, `game_loaded`
- `tap_milestone`
- `generator_purchase`, `contract_claim`, `relic_upgrade`
- `daily_claim`, `pulse_activate`, `comet_claim`, `prestige`
- `rewarded_offer_accept`, `rewarded_ad_request`, `rewarded_ad_show`, `rewarded_ad_granted`, `rewarded_ad_dismissed`, `rewarded_boost_granted`
- `interstitial_request`, `interstitial_show`
- `support_link_open`

### Optional GA4
Set `analytics.gaMeasurementId = 'G-...'`. Remote analytics is off by default. The Google tag loads only after the player enables **Anonymous remote analytics** in Settings.

### Optional raw endpoint
Set `analytics.customEndpoint` to your HTTPS collector. With player opt-in, the client can post recent event batches. In production, put authentication/rate limiting/schema validation on the endpoint; do not trust browser events for currency or purchase entitlements.

## Other revenue hooks
`support.url` can point to an external supporter/tip/store page. The game tracks only the outbound click and grants no in-game entitlement, so it does not pretend a payment succeeded.

For stronger monetization later:
1. package the game for Google Play and combine AdMob rewarded ads with Play Billing,
2. add a one-time no-ads + cosmetic theme product,
3. add cosmetic star/core/orbit themes rather than selling raw progression,
4. add cloud accounts before paid entitlements so purchases survive device changes,
5. evaluate ad LTV versus retention using rewarded completion rate, sessions/player, prestige conversion and D1/D7 return rate.
