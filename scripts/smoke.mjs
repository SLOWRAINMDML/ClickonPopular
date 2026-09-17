import { readFile, access } from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const refs=[...html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)].map(m=>m[1]);
for(const ref of refs){if(ref.startsWith('./')) await access(new URL('..'+ref.slice(1),import.meta.url));}
if(!html.includes('viewport-fit=cover')) throw new Error('mobile viewport safe area missing');
if(!html.includes('bottom-nav')) throw new Error('mobile navigation missing');
if(!html.includes('rewarded-ad-btn')) throw new Error('rewarded monetization UI missing');
if(!html.includes('setting-analytics')) throw new Error('analytics controls missing');

const css=(await readFile(new URL('../styles.css',import.meta.url),'utf8'))+(await readFile(new URL('../mobile-v3.css',import.meta.url),'utf8'));
if(!html.includes('goal-mini')) throw new Error('visible next-goal cue missing');
if(!css.includes('height:100dvh') || !css.includes('overflow:hidden')) throw new Error('mobile fixed-cockpit contract missing');
if(!css.includes('.tab-panel.active') || !css.includes('overflow-y:auto')) throw new Error('scroll must be isolated to lower tray');
console.log(`Smoke OK: ${refs.length} local references checked; fixed mobile cockpit + goal cue + tray scrolling present.`);
