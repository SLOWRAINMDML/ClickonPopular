import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState } from '../src/game.js';
import { DEFAULT_LIVEOPS, ensureServiceState, dailyMissions, claimServiceMission, seasonStatus, claimSeasonRewards, addEventPoints, eventStatus, claimEventRewards, unlockSkin, equipSkin, atlasSummary, CORE_SKINS } from '../src/liveops.js';

const now = new Date(2026,8,17,12).getTime();

test('service state creates deterministic daily ops and monthly season',()=>{
  let s=ensureServiceState(createDefaultState(now), DEFAULT_LIVEOPS, now);
  const a=dailyMissions(s,DEFAULT_LIVEOPS,now).map(m=>m.id);
  const b=dailyMissions(s,DEFAULT_LIVEOPS,now).map(m=>m.id);
  assert.equal(a.length,3); assert.deepEqual(a,b); assert.match(seasonStatus(s,DEFAULT_LIVEOPS,now).id,/season-2026-09/);
});

test('daily mission progress uses a daily baseline and grants season xp once',()=>{
  let s=ensureServiceState(createDefaultState(now),DEFAULT_LIVEOPS,now);
  const mission=dailyMissions(s,DEFAULT_LIVEOPS,now)[0];
  s.stats={...s.stats,[mission.metric]:(s.stats[mission.metric]||0)+mission.target};
  let r=claimServiceMission(s,mission.id,500,DEFAULT_LIVEOPS,now);
  assert.equal(r.claimed,true); assert.equal(r.state.service.seasonXp,40); assert.equal(r.state.lumens,500);
  assert.equal(claimServiceMission(r.state,mission.id,500,DEFAULT_LIVEOPS,now).claimed,false);
});

test('season track converts earned xp into claimable permanent star tokens',()=>{
  let s=ensureServiceState(createDefaultState(now),DEFAULT_LIVEOPS,now); s.service.seasonXp=500;
  assert.equal(seasonStatus(s,DEFAULT_LIVEOPS,now).level,5);
  const r=claimSeasonRewards(s,DEFAULT_LIVEOPS,now); assert.equal(r.claimed,true); assert.equal(r.levels.length,5); assert.ok(r.tokens>=6); assert.equal(claimSeasonRewards(r.state,DEFAULT_LIVEOPS,now).claimed,false);
});

test('weekly event points unlock milestone token caches',()=>{
  let s=ensureServiceState(createDefaultState(now),DEFAULT_LIVEOPS,now); s=addEventPoints(s,360,DEFAULT_LIVEOPS,now);
  const status=eventStatus(s,DEFAULT_LIVEOPS,now); assert.equal(status.milestones.filter(m=>m.ready).length,3);
  const r=claimEventRewards(s,DEFAULT_LIVEOPS,now); assert.equal(r.targets.length,3); assert.equal(r.tokens,4);
});

test('star tokens unlock permanent core skins and atlas completion rises',()=>{
  let s=ensureServiceState(createDefaultState(now),DEFAULT_LIVEOPS,now); const before=atlasSummary(s).unlocked; const skin=CORE_SKINS.find(x=>x.id==='solar');
  s.service.starTokens=skin.cost; const unlock=unlockSkin(s,'solar'); assert.equal(unlock.unlocked,true); const equip=equipSkin(unlock.state,'solar'); assert.equal(equip.equipped,true); assert.equal(equip.state.service.equippedSkin,'solar'); assert.ok(atlasSummary(equip.state).unlocked>before);
});

test('daily ops roll over without deleting season or cosmetic progress',()=>{
  let s=ensureServiceState(createDefaultState(now),DEFAULT_LIVEOPS,now); s.service.seasonXp=240; s.service.starTokens=9; s.service.unlockedSkins=['dawn','solar']; const old=s.service.dayKey;
  s=ensureServiceState(s,DEFAULT_LIVEOPS,now+24*3600*1000); assert.notEqual(s.service.dayKey,old); assert.equal(s.service.seasonXp,240); assert.equal(s.service.starTokens,9); assert.deepEqual(s.service.unlockedSkins,['dawn','solar']);
});
