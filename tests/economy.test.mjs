import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState, GENERATORS, costFor, costForAmount, buyGenerator, registerTap, passiveRate, milestoneMultiplier, prestigeGain, ascend, buyRelic, offlineReward, dailyStatus, claimDaily, rewardedAdStatus, grantRewardedBoost, adBoostMultiplier, canShowInterstitial, markInterstitialShown } from '../src/game.js';

test('generator costs strictly increase',()=>{const g=GENERATORS[0];for(let i=0;i<30;i++) assert.ok(costFor(g,i+1)>costFor(g,i));});
test('multi-buy spends exact quoted amount',()=>{let s=createDefaultState(0);s.lumens=10000;const cost=costForAmount(GENERATORS[0],0,10);const r=buyGenerator(s,'sparkDrone',10);assert.equal(r.bought,10);assert.equal(r.spent,cost);assert.equal(r.state.generators.sparkDrone,10);});
test('combo tapping increases tap reward',()=>{let s=createDefaultState(0);let first=registerTap(s,0);s=first.state;for(let i=0;i<20;i++) s=registerTap(s,0).state;assert.ok(s.combo>1);assert.ok(registerTap(s,0).value>first.value);});
test('milestones create meaningful breakpoints',()=>{assert.equal(milestoneMultiplier(9),1);assert.equal(milestoneMultiplier(10),2);assert.equal(milestoneMultiplier(25),4);assert.equal(milestoneMultiplier(50),12);});
test('passive rate rises after ownership',()=>{let s=createDefaultState(0);s.generators.sparkDrone=10;assert.ok(passiveRate(s,0)>=10);});
test('prestige unlocks at 500k lifetime',()=>{let s=createDefaultState(0);s.lifetimeLumens=499999;assert.equal(prestigeGain(s),0);s.lifetimeLumens=500000;assert.equal(prestigeGain(s),1);const r=ascend(s,1000);assert.equal(r.gain,1);assert.equal(r.state.totalStardust,1);assert.equal(r.state.generators.sparkDrone,0);});
test('relic purchase spends stardust without reducing totalStardust',()=>{let s=createDefaultState(0);s.stardust=5;s.totalStardust=5;const r=buyRelic(s,'gloves');assert.equal(r.bought,true);assert.equal(r.state.totalStardust,5);assert.equal(r.state.relics.gloves,1);});
test('offline reward is positive and capped at eight hours',()=>{let s=createDefaultState(1000);s.generators.sparkDrone=100;s.lastSeenAt=1000;const eight=offlineReward(s,1000+8*3600*1000);const twelve=offlineReward(s,1000+12*3600*1000);assert.ok(eight>0);assert.equal(eight,twelve);});
test('daily reward can only be claimed once per local day',()=>{let s=createDefaultState(new Date(2026,8,17,10).getTime());const now=new Date(2026,8,17,10).getTime();assert.equal(dailyStatus(s,now).canClaim,true);let r=claimDaily(s,now);assert.ok(r.reward>=100);assert.equal(dailyStatus(r.state,now).canClaim,false);});

test('rewarded ads grant a five minute x2 boost with daily and cooldown caps',()=>{
  const now=new Date(2026,8,17,12).getTime(); let s=createDefaultState(now);
  assert.equal(adBoostMultiplier(s,now),1); const r=grantRewardedBoost(s,now+60_001); assert.equal(r.granted,true); s=r.state;
  assert.equal(adBoostMultiplier(s,now+60_002),2); assert.equal(rewardedAdStatus(s,now+60_002).canWatch,false);
  for(let i=1;i<4;i++) s=grantRewardedBoost(s,now+60_001+i*60_001).state;
  assert.equal(rewardedAdStatus(s,now+5*60_001).remaining,0);
});

test('interstitials are frequency capped and can be marked after a natural break',()=>{
  const now=1_000_000; let s=createDefaultState(now); assert.equal(canShowInterstitial(s,now+5*60_000),false);
  assert.equal(canShowInterstitial(s,now+16*60_000),true); s=markInterstitialShown(s,now+16*60_000);
  assert.equal(canShowInterstitial(s,now+20*60_000),false);
});
