import { readFile, access } from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const refs=[...html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)].map(m=>m[1]);
for(const ref of refs){if(ref.startsWith('./')) await access(new URL('..'+ref.slice(1),import.meta.url));}
if(!html.includes('viewport-fit=cover')) throw new Error('mobile viewport safe area missing');
if(!html.includes('bottom-nav')) throw new Error('mobile navigation missing');
if(!html.includes('rewarded-ad-btn')) throw new Error('rewarded monetization UI missing');
if(!html.includes('setting-analytics')) throw new Error('analytics controls missing');
if(!html.includes('data-panel="live"') || !html.includes('daily-mission-list') || !html.includes('atlas-list')) throw new Error('live service hub missing');
if(!html.includes('data-tab="live"')) throw new Error('live service navigation missing');

const css=(await readFile(new URL('../styles.css',import.meta.url),'utf8'))+(await readFile(new URL('../mobile-v3.css',import.meta.url),'utf8'));
const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
const sw=await readFile(new URL('../service-worker.js',import.meta.url),'utf8');
if(!html.includes('goal-mini')) throw new Error('visible next-goal cue missing');
if(!css.includes('height:100dvh') || !css.includes('overflow:hidden')) throw new Error('mobile fixed-cockpit contract missing');
if(!css.includes('.tab-panel.active') || !css.includes('overflow-y:auto')) throw new Error('scroll must be isolated to lower tray');
console.log(`Smoke OK: ${refs.length} local references checked; fixed mobile cockpit + Live hub + goal cue + tray scrolling present.`);

if (html.includes('src/mobile-v3.js')) throw new Error('legacy mobile-v3 runtime must not load');
if (app.includes('new MutationObserver')) throw new Error('self-triggering MutationObserver regression');
if (app.includes("setInterval(() => { state = ensureServiceState(state, liveOpsConfig); renderGenerators();")) throw new Error('periodic full-panel rebuild regression');
if (!app.includes('nowPerf - lastHudRender >= 100')) throw new Error('HUD DOM updates must be frame-rate capped');
if (!sw.includes('lumen-loop-v6')) throw new Error('service worker cache version must be v6');
if (!sw.includes('engagement.css') || !sw.includes('src/engagement.js')) throw new Error('engagement hook assets missing from offline cache');
if (!html.includes('hook-strip') || !html.includes('engagement-hub')) throw new Error('engagement hook surfaces missing');
