import test from 'node:test';
import assert from 'node:assert/strict';
import { beginJourney, syncJourney, journeyDone } from '../src/state/journey.ts';

const seed = () => ({ calls:[], call:null, slips:['dock'], pots:[{ g:1, bloomAt:0 }], rig:null });

test('prepared resources are recorded and moving the plant does not undo growth', () => {
  const s = seed(); syncJourney(s, 1000);
  assert.equal(s.journey.prepared, true);
  assert.equal(journeyDone(s, 'take'), true);
  assert.equal(journeyDone(s, 'grow'), true);
  s.call = { to:'dock', eta:120000 }; s.slips = [];
  syncJourney(s, 1000);
  s.pots = [null]; s.rig = { glass:false, lit:false };
  syncJourney(s, 2000);
  assert.equal(journeyDone(s, 'course'), true);
  assert.equal(journeyDone(s, 'grow'), true);
  assert.equal(journeyDone(s, 'build'), false);
});

test('handing over and leaving preserves all completed milestones', () => {
  const s = seed(); syncJourney(s, 1000);
  s.call = { to:'dock' }; s.rig = { glass:true, lit:true }; syncJourney(s, 2000);
  s.call.gave = 3000; s.calls.push({ id:'dock', at:3000 }); s.rig = null; s.pots = [null];
  syncJourney(s, 3000); s.call = null; syncJourney(s, 6000);
  for (const step of ['take','course','grow','build','give']) assert.equal(journeyDone(s, step), true, step);
  const restored = JSON.parse(JSON.stringify(s)); syncJourney(restored, 10000);
  assert.deepEqual(restored.journey, s.journey);
});

test('the next request has its own progress and old saves can infer the active request', () => {
  const s = seed(); s.calls = [{ id:'dock' }]; s.pots = [null];
  s.call = { to:'echo' }; s.slips = [];
  syncJourney(s, 1000);
  assert.equal(s.journey.to, 'echo');
  assert.equal(s.journey.prepared, false);
  assert.equal(s.journey.course, true);
  s.journey.delivered = true; s.call = null; s.slips = ['bell'];
  beginJourney(s, 'bell', 2000);
  assert.equal(s.journey.to, 'bell');
  assert.equal(s.journey.course, false);
  assert.equal(s.journey.grown, false);
  assert.equal(s.journey.delivered, false);
});

test('a clipped flower with a future bloom time is not ready for a new request', () => {
  const s = seed(); s.pots[0].bloomAt = 5000;
  syncJourney(s, 1000); assert.equal(s.journey.grown, false);
  syncJourney(s, 5001); assert.equal(s.journey.grown, true);
});
