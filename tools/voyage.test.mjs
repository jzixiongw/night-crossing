/* node --test tools/voyage.test.mjs (Node 24+, or Node 22 with
   --experimental-strip-types). The voyage clock in state/voyage.ts: where the
   ship is on the chart, when it casts off, what is outside, and how saves made
   before any of it existed are read. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { castAt, handOf, litK, pastLegs, progress, shipOnChart, sights, wakeOf, PART_MS, DOOR_S } from '../src/state/voyage.ts';
import { HUB, portPt, routePath } from '../src/data/chart.ts';

const MIN = 60000;
const save = (o = {}) => ({ calls: [], call: null, slips: [], wake: null, ...o });

test('a crossing runs from the junction to the port in real time', () => {
  const s = save({ call: { to: 'dock', dep: 0, eta: 2*MIN, docked: 0, from: 'hub' } });
  assert.equal(progress(s, 0), 0);
  assert.equal(progress(s, MIN), .5);
  const mid = shipOnChart(s, MIN);
  assert.ok(Math.hypot(mid.x - HUB[0], mid.y - HUB[1]) > 10, 'the ship has left the junction');
  const end = shipOnChart(s, 2*MIN);
  assert.deepEqual([Math.round(end.x), Math.round(end.y)], portPt('dock'));
});

test('a save from before call.from/dep infers both from what it has', () => {
  const s = save({ calls: [{ id: 'dock', at: 0 }], call: { to: 'echo', eta: 10*MIN, docked: 0 } });
  assert.equal(progress(s, 10*MIN - 2*MIN), .5, 'departure is eta minus the crossing time');
  const p = shipOnChart(s, 6*MIN).path;
  assert.deepEqual(p[0], portPt('dock'), 'it set out from the last place it left a lamp');
  assert.deepEqual(p[p.length - 1], portPt('echo'));
  assert.deepEqual(wakeOf(s), { id: 'dock', at: 60000 });
});

test('the ship casts off only once the door is shut and the lamp is where it goes', () => {
  const h = handOf('dock');
  const call = { to: 'dock', docked: 1, gave: 10000 };
  assert.equal(castAt(call), 0, 'not while the door is open');
  call.shut = 11000;
  assert.equal(castAt(call), 10000 + h.arrive*1000 + 1500, 'shut early: waits for them to arrive');
  call.shut = 10000 + 60000;
  assert.equal(castAt(call), call.shut + DOOR_S*1000, 'shut late: waits for the door');
});

test('outside: a speck, then alongside, then astern, then gone', () => {
  const s = save({ call: { to: 'bell', dep: 0, eta: 5*MIN, docked: 0, from: 'hub' } });
  const far = sights(s, 10000)[0], near = sights(s, 4.8*MIN)[0];
  assert.equal(far.phase, 'approach'); assert.ok(far.k < .02 && near.k > .8);
  s.call.docked = 5*MIN; assert.equal(sights(s, 5*MIN)[0].k, 1);
  s.call.gave = 6*MIN; s.call.shut = 6*MIN + 1000; s.calls.push({ id: 'bell', at: 6*MIN, sp: 'vine' });
  const cast = castAt(s.call), leaving = sights(s, cast + PART_MS/2)[0];
  assert.equal(leaving.phase, 'parting'); assert.ok(leaving.k < 1 && leaving.lit === 1);
  s.call = null; s.wake = { id: 'bell', at: cast };
  assert.equal(sights(s, cast + PART_MS + 1000)[0].phase, 'wake');
  assert.equal(sights(s, cast + PART_MS + 7*MIN).length, 0);
});

test('a lamp lights its place as it is set down, and stays lit', () => {
  const T = 5e6, h = handOf('echo'), s = save({ calls: [{ id: 'echo', at: T }], call: { to: 'echo', docked: 1, gave: T } });
  assert.equal(litK(s, 'echo', T + 1000), 0);
  assert.equal(litK(s, 'echo', T + h.arrive*1000), 1);
  s.call = null; assert.equal(litK(s, 'echo', 0), 1);
  assert.equal(litK(s, 'ship', 0), 0);
});

test('legs already sailed are read off the deliveries, the current one left out', () => {
  const s = save({ calls: [{ id: 'dock' }, { id: 'echo' }] });
  assert.deepEqual(pastLegs(s), [{ from: 'hub', to: 'dock' }, { from: 'dock', to: 'echo' }]);
  s.call = { to: 'echo', gave: 1 };
  assert.deepEqual(pastLegs(s), [{ from: 'hub', to: 'dock' }]);
  assert.deepEqual(routePath('dock', 'echo')[0], portPt('dock'));
});
