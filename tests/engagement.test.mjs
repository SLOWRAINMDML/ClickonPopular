import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState } from '../src/game.js';
import {
  ensureHooksState, launchStatus, claimLaunchReward, addMomentum, breakthroughStatus, claimBreakthrough,
  prepareReturn, comebackStatus, claimComeback, rhythmStatus, claimRhythm, capsuleStatus, openSignalCapsule,
  doctrineStatus, chooseDoctrine, storyLog, hookStripModel
} from '../src/engagement.js';

function seeded(now=1_700_000_000_000){ return ensureHooksState(createDefaultState(now), now, 'pilot-test'); }

test('launch track unlocks and pays once', () => {
  let state=seeded(); state={...state,taps:30,stats:{...state.stats,tapsAllTime:30}};
  const status=launchStatus(state); assert.equal(status.steps[0].ready,true); assert.equal(status.steps[1].ready,true);
  const first=claimLaunchReward(state,'light'); assert.equal(first.claimed,true); const second=claimLaunchReward(first.state,'light'); assert.equal(second.claimed,false);
});

test('momentum breakthrough grants capsule and temporary overdrive', () => {
  let state=addMomentum(seeded(),100); assert.equal(breakthroughStatus(state).ready,true);
  const result=claimBreakthrough(state,1_700_000_000_000); assert.equal(result.claimed,true); assert.equal(capsuleStatus(result.state).capsules,1); assert.ok(breakthroughStatus(result.state,1_700_000_000_000).boostMs>0);
});

test('return hook appears after six hours and claims once', () => {
  const now=1_700_100_000_000; let state=prepareReturn(seeded(now),7*3_600_000,now,'pilot-test'); assert.equal(comebackStatus(state).ready,true);
  const result=claimComeback(state,10); assert.equal(result.claimed,true); assert.ok(result.reward>=500); assert.equal(comebackStatus(result.state).ready,false);
});

test('weekly rhythm is forgiving and rewards five distinct days', () => {
  let state=seeded(new Date('2026-09-14T12:00:00').getTime());
  for(let i=1;i<5;i++) state=ensureHooksState(state,new Date(`2026-09-${14+i}T12:00:00`).getTime(),'pilot-test');
  assert.equal(rhythmStatus(state).ready,true); const result=claimRhythm(state); assert.equal(result.claimed,true); assert.equal(result.starTokens,1);
});

test('signal capsule never costs money and returns a card', () => {
  let state=seeded(); state={...state,service:{...state.service,hooks:{...state.service.hooks,capsules:1}}};
  const result=openSignalCapsule(state,1_700_000_000_000); assert.equal(result.opened,true); assert.ok(result.card.id); assert.equal(capsuleStatus(result.state).capsules,0);
});

test('doctrine becomes selectable after first reignite', () => {
  let state=seeded(); state={...state,ascensions:1}; assert.equal(doctrineStatus(state).available,true);
  const result=chooseDoctrine(state,'architect'); assert.equal(result.chosen,true); assert.equal(doctrineStatus(result.state).doctrine,'architect');
});

test('story log unlocks from actual progress', () => {
  let state=seeded(); state={...state,stats:{...state.stats,generatorsBuilt:1}}; const log=storyLog(state,0); assert.equal(log[0].unlocked,true); assert.equal(log[1].unlocked,false);
});

test('hook strip prioritizes comeback over launch track', () => {
  const now=1_700_100_000_000; const state=prepareReturn(seeded(now),7*3_600_000,now,'pilot-test'); assert.equal(hookStripModel(state).kind,'comeback');
});
