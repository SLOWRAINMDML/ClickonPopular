// Runtime configuration. Safe defaults keep production credentials out of source control.
// Switch ads.provider to "google-h5" after your AdSense H5 Games Ads account is approved.
window.LUMEN_CONFIG = {
  ads: {
    provider: 'mock', // 'mock' | 'google-h5' | 'disabled'
    adsenseClient: '', // ca-pub-xxxxxxxxxxxxxxxx
    admobInterstitialSlot: '', // optional Android WebView slot
    admobRewardedSlot: '' // optional Android WebView slot
  },
  analytics: {
    gaMeasurementId: '', // G-XXXXXXXXXX. Remote analytics only loads after player opt-in.
    customEndpoint: '' // optional HTTPS endpoint receiving JSON event batches
  },
  support: {
    url: '' // optional Ko-fi / Buy Me a Coffee / storefront URL
  }
};
