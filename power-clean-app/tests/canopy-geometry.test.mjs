import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, defaults, geometry, newArea, parseDraft } from '../lib/smart-estimate/engine.ts';

const m = (ft, inches = 0) => ({ ft, inches });
const face = (length, width, shape = 'rectangle', secondBase = m(0)) => ({ length, width, shape, secondBase });
const reference = face(m(3, 2), m(3, 4));
const canopy = canopyFaces => ({ ...newArea(), kind: 'canopy', material: 'metal', canopyFaces, accessMinutes: 0 });

test('reference face areas use exact inch dimensions and sum before rounding', () => {
  assert.equal(geometry(canopy({ top: reference })).area.toFixed(2), '10.56');
  const { area } = geometry(canopy({ top: reference, underside: reference }));
  assert.equal(area.toFixed(2), '21.11');
  assert.equal(Math.round(area * 144), 3040);
});

test('compound canopy adds fascia, triangle, trapezoid, sloped roof and supports', () => {
  assert.equal(geometry(canopy({
    front: face(m(8), m(0, 6)),
    left: face(m(4), m(3), 'triangle'),
    right: face(m(4), m(3), 'trapezoid', m(2)),
    leftRoof: face(m(5), m(8), 'sloped'),
    supports: face(m(7), m(2)),
  })).area, 73);
});

test('canopy rejects overlapping roof selections and missing dimensions', () => {
  assert.throws(() => geometry(canopy({ top: reference, leftRoof: reference })), /whole top/);
  assert.throws(() => geometry(canopy({ front: face(m(0), m(1)) })), /all dimensions/);
});

test('canopy draft round-trips and prices measured area and access through the common engine', () => {
  const draft = { version: 1, customerId: '', serviceAddressId: '', notes: '', config: defaults(),
    areas: [canopy({ top: reference, underside: reference })] };
  const rectangle = { ...draft, areas: [{ ...draft.areas[0], kind: 'rectangle',
    confirmedSquareFeet: geometry(draft.areas[0]).area }] };
  const baseline = calculate(rectangle);
  const canopyResult = calculate(parseDraft(JSON.parse(JSON.stringify(draft))));
  assert.equal(canopyResult.total, baseline.total);
  assert.equal(canopyResult.totalSolutionGal, baseline.totalSolutionGal);
  draft.areas[0].accessMinutes = 30;
  assert.ok(Math.abs(calculate(draft).hours - baseline.hours - 0.5) < 1e-9);
});
