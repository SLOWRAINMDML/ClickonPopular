import { track } from './telemetry.js';

let initialized = false;
let initPromise = null;

function config() { return globalThis.LUMEN_CONFIG?.ads || { provider: 'disabled' }; }

export function adProviderStatus() {
  const ads = config();
  const configured = ads.provider === 'google-h5' ? Boolean(ads.adsenseClient) : ads.provider === 'mock';
  return { provider: ads.provider || 'disabled', configured, isMock: ads.provider === 'mock' };
}

export async function initAds() {
  if (initialized) return adProviderStatus();
  if (initPromise) return initPromise;
  const ads = config();
  if (ads.provider !== 'google-h5') { initialized = true; return adProviderStatus(); }
  if (!ads.adsenseClient) throw new Error('Missing adsenseClient');
  initPromise = new Promise((resolve, reject) => {
    globalThis.adsbygoogle = globalThis.adsbygoogle || [];
    globalThis.adBreak = globalThis.adBreak || function(o) { globalThis.adsbygoogle.push(o); };
    globalThis.adConfig = globalThis.adConfig || function(o) { globalThis.adsbygoogle.push(o); };
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.adClient = ads.adsenseClient;
    if (ads.admobInterstitialSlot) script.dataset.admobInterstitialSlot = ads.admobInterstitialSlot;
    if (ads.admobRewardedSlot) script.dataset.admobRewardedSlot = ads.admobRewardedSlot;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ads.adsenseClient)}`;
    script.onload = () => { initialized = true; track('ad_sdk_ready', { provider: 'google-h5' }); resolve(adProviderStatus()); };
    script.onerror = () => { track('ad_sdk_error', { provider: 'google-h5' }); reject(new Error('Ad SDK failed to load')); };
    document.head.append(script);
  });
  return initPromise;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function showRewarded({ placement = 'production_boost', beforeAd = () => {}, afterAd = () => {} } = {}) {
  const status = adProviderStatus();
  track('rewarded_ad_request', { placement, provider: status.provider });
  if (status.provider === 'disabled' || !status.configured) return { granted: false, shown: false, reason: 'unavailable' };
  if (status.isMock) {
    beforeAd(); await sleep(900); afterAd();
    track('rewarded_ad_granted', { placement, provider: 'mock' });
    return { granted: true, shown: true, mock: true };
  }
  try { await initAds(); }
  catch { return { granted: false, shown: false, reason: 'sdk_error' }; }
  return new Promise(resolve => {
    let settled = false;
    let shown = false;
    const finish = result => { if (settled) return; settled = true; resolve(result); };
    globalThis.adBreak({
      type: 'reward',
      name: placement,
      beforeAd: () => { shown = true; beforeAd(); track('rewarded_ad_show', { placement }); },
      afterAd: () => afterAd(),
      beforeReward: showAdFn => showAdFn(),
      adDismissed: () => { track('rewarded_ad_dismissed', { placement }); finish({ granted: false, shown: true, reason: 'dismissed' }); },
      adViewed: () => { track('rewarded_ad_granted', { placement, provider: 'google-h5' }); finish({ granted: true, shown: true }); },
      adBreakDone: info => finish({ granted: false, shown, reason: info?.breakStatus || 'not_shown' })
    });
  });
}

export async function showInterstitial({ placement = 'after_reignite', beforeAd = () => {}, afterAd = () => {} } = {}) {
  const status = adProviderStatus();
  track('interstitial_request', { placement, provider: status.provider });
  if (status.provider === 'disabled' || !status.configured) return { shown: false, reason: 'unavailable' };
  if (status.isMock) {
    beforeAd(); await sleep(500); afterAd(); track('interstitial_show', { placement, provider: 'mock' });
    return { shown: true, mock: true };
  }
  try { await initAds(); }
  catch { return { shown: false, reason: 'sdk_error' }; }
  return new Promise(resolve => {
    let shown = false;
    let settled = false;
    const finish = result => { if (settled) return; settled = true; resolve(result); };
    globalThis.adBreak({
      type: 'next',
      name: placement,
      beforeAd: () => { shown = true; beforeAd(); track('interstitial_show', { placement, provider: 'google-h5' }); },
      afterAd: () => afterAd(),
      adBreakDone: info => finish({ shown, reason: info?.breakStatus || (shown ? 'shown' : 'not_shown') })
    });
  });
}
