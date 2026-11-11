import test from "node:test";
import assert from "node:assert/strict";
import {
  calculate,
  defaults,
  newArea,
  measure,
  geometry,
  marginPrice,
  complexityLaborRate,
  parseDraft,
  TREATMENTS,
  MATERIALS,
  STAIR_MATERIALS,
} from "../lib/smart-estimate/engine.ts";
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
function fixture() {
  const c = defaults();
  Object.assign(c, {
    laborRate: 30,
    equipmentHourly: 10,
    fuel: 20,
    overheadHourly: 5,
    costsReviewed: true,
    wastePercent: 0,
  });
  for (const p of Object.values(c.products))
    Object.assign(p, {
      price: 40,
      shipping: 10,
      productVerified: true,
      assumptionsReviewed: true,
    });
  c.products.rust.name="Verified test rust product";c.products.rust.url="https://www.amazon.com/dp/TESTONLY";c.products.memorial.name="Verified test conservation cleaner";
  const a = newArea();
  a.length.ft = 20;
  a.width.ft = 30;
  return {
    version: 1,
    customerId: "test",
    serviceAddressId: "test",
    notes: "",
    config: c,
    areas: [a],
  };
}
test("feet and inches do not round before geometry", () => {
  close(measure({ ft: 2, inches: 6 }), 2.5);
  const d = fixture();
  d.areas[0].length = { ft: 10, inches: 6 };
  d.areas[0].width = { ft: 5, inches: 3 };
  close(geometry(d.areas[0]).area, 55.125);
});
test("invalid geometry rejects negative, nonfinite, and 12 inches", () => {
  for (const m of [
    { ft: -1, inches: 0 },
    { ft: 1, inches: 12 },
    { ft: NaN, inches: 0 },
    { ft: 1, inches: Infinity },
  ])
    assert.throws(() => measure(m));
});
test("stairs include treads, risers, stepped sides and multiple landings", () => {
  const a = fixture().areas[0];
  Object.assign(a, {
    kind: "stairs",
    steps: 3,
    sides: 2,
    width: { ft: 4, inches: 0 },
    depth: { ft: 1, inches: 0 },
    height: { ft: 0, inches: 6 },
    landings: [{ length: { ft: 4, inches: 0 }, width: { ft: 4, inches: 0 } }],
  });
  const g = geometry(a);
  close(g.parts.treads, 12);
  close(g.parts.risers, 6);
  close(g.parts.sides, 6);
  close(g.parts.landings, 16);
  close(g.area, 40);
});
test("monument selected exposed faces only", () => {
  const a = fixture().areas[0];
  Object.assign(a, {
    kind: "monument",
    width: { ft: 2, inches: 0 },
    height: { ft: 3, inches: 0 },
    depth: { ft: 0, inches: 6 },
    faces: { front: true, back: false, left: true, right: false, top: true },
  });
  close(geometry(a).area, 8.5);
});
test("SH stock concentration and surfactant conserve applied volume", () => {
  const d = fixture();
  Object.assign(d.config, { surfactantOzPerGal: 1, surfactantPrice: 35 });
  const row = calculate(d).rows[0];
  close(row.solutionGal, 3);
  close(row.concentrateGal, 0.6);
  close(row.surfactantOz, 3);
  close(
    row.waterGal + row.concentrateGal + row.surfactantOz / 128,
    row.solutionGal,
  );
  close(row.chemicalCost, 30 + (3 / 128) * 35);
});
test("specialty dilution, affected area, severity, coats and landed shipping", () => {
  const d = fixture();
  d.areas[0].treatments = [{ type: "clay", percent: 25, severity: 2 }];
  Object.assign(d.config.products.clay, {
    productParts: 1,
    waterParts: 3,
    coats: 2,
  });
  const row = calculate(d).rows[0];
  close(row.area, 150);
  assert.equal(row.passes, 3);
  close(row.solutionGal, 6);
  close(row.concentrateGal, 1.5);
  close(row.waterGal, 4.5);
  close(row.chemicalCost, 75);
});
test("30 percent margin differs from 30 percent markup", () => {
  close(marginPrice(70, 30), 100);
  assert.throws(() => marginPrice(10, 100));
  assert.throws(() => marginPrice(10, -1));
});
test("shared setup, travel, fuel and minimum charged once for all add-ons", () => {
  const d = fixture();
  d.areas[0].treatments.push({ type: "clay", percent: 10, severity: 1 });
  const r = calculate(d);
  close(r.sharedCost, 65);
  close(
    r.rows.reduce((n, x) => n + x.price, 0),
    r.total,
  );
  const expected = r.rows.reduce((n, x) => n + x.cost, 0) + 65;
  close(r.cost, Math.round(expected * 100) / 100);
  d.config.minimum = 5000;
  const minimum = calculate(d);
  close(minimum.total, 5000);
  close(
    minimum.rows.reduce((n, x) => n + x.price, 0),
    5000,
  );
});
test("all combinations use independent affected areas and one shared cost", () => {
  for (let mask = 1; mask < 32; mask++) {
    const d = fixture();
    d.areas[0].treatments = TREATMENTS.slice(0, 5)
      .filter((_, i) => mask & (1 << i))
      .map((type) => ({ type, percent: 25, severity: 1 }));
    const r = calculate(d);
    assert.equal(r.rows.length, d.areas[0].treatments.length);
    close(r.sharedCost, 65);
    close(
      r.rows.reduce((n, x) => n + x.price, 0),
      r.total,
    );
  }
});
test("missing costs and unverified product prevent finalization", () => {
  const d = fixture();
  d.config.products.organic.price = null;
  d.config.fuel = null;
  d.config.products.organic.assumptionsReviewed = false;
  const r = calculate(d);
  assert.ok(r.errors.some((x) => x.includes("price")));
  assert.ok(r.errors.some((x) => x.includes("fuel")));
  assert.ok(r.errors.some((x) => x.includes("review")));
});
test("incompatible materials and monument safety checks block unsafe work", () => {
  const d = fixture();
  d.areas[0].material = "wood";
  d.areas[0].treatments = [{ type: "clay", percent: 100, severity: 1 }];
  assert.ok(calculate(d).errors.some((x) => x.includes("compatible")));
  Object.assign(d.areas[0], {
    kind: "monument",
    material: "marble",
    height: { ft: 2, inches: 0 },
    depth: { ft: 1, inches: 0 },
  });
  assert.ok(calculate(d).errors.some((x) => x.includes("conservation")));
});
test("all eight stair material categories are available", () =>
  assert.equal(STAIR_MATERIALS.length, 8));
test("memorial labor includes exposed area, dwell, detail, access and shared time", () => {
  const d = fixture(),
    a = d.areas[0];
  Object.assign(a, {
    kind: "monument",
    material: "granite",
    width: { ft: 2, inches: 0 },
    height: { ft: 3, inches: 0 },
    depth: { ft: 1, inches: 0 },
    detailMinutes: 30,
    accessMinutes: 15,
    treatments: [{ type: "memorial", percent: 100, severity: 1 }],
    safety: {
      sound: true,
      permission: true,
      testPatch: true,
      dry: false,
      label: true,
    },
  });
  const r = calculate(d);
  assert.deepEqual(r.errors, []);
  close(r.rows[0].area, 20);
  close(r.rows[0].hours, 20 / 25 + 10 / 60 + 0.75);
});
test("draft JSON roundtrip preserves costs, geometry, dimensions, add-ons and calculations", () => {
  const d = fixture();
  d.areas[0].showDimensions = true;
  const copy = parseDraft(JSON.parse(JSON.stringify(d)));
  assert.deepEqual(copy, d);
  assert.deepEqual(calculate(copy), calculate(d));
  copy.notes = "changed";
  assert.equal(d.notes, "");
});
test("invalid version, oversized data, duplicate treatments, bad severity and dilution rejected", () => {
  const d = fixture();
  assert.throws(() => parseDraft({ ...d, version: 2 }));
  assert.throws(() => parseDraft({ ...d, notes: "x".repeat(200001) }));
  d.areas[0].treatments.push({ ...d.areas[0].treatments[0] });
  assert.ok(calculate(d).errors.some((x) => x.includes("duplicate")));
  d.areas[0].treatments[0].severity = -1;
  assert.throws(() => calculate(d));
});
test("zero area, invalid crew and stronger-than-stock SH cannot finalize", () => {
  const d = fixture();
  d.areas[0].width.ft = 0;
  assert.ok(calculate(d).errors.length);
  d.config.crew = 0;
  assert.throws(() => calculate(d));
  d.config.crew = 1;
  d.config.targetSH.concrete = 11;
  assert.ok(calculate(d).errors.some((x) => x.includes("stock")));
});
test("cent allocation never produces negative amounts for small equal shares", () => {
  const d = fixture();
  Object.assign(d.config, {
    laborRate: 0,
    equipmentHourly: 0,
    fuel: 0,
    overheadHourly: 0,
    minimum: 0.03,
  });
  d.config.products.organic.price = 0;
  d.config.products.organic.shipping = 0;
  d.areas = Array.from({ length: 6 }, () => {
    const a = newArea();
    a.length.ft = 1;
    a.width.ft = 1;
    return a;
  });
  const r = calculate(d);
  assert.ok(r.rows.every((x) => x.price >= 0));
  close(
    r.rows.reduce((n, x) => n + x.price, 0),
    0.03,
  );
});
test("surface factors change labor but preserve chemical quantities", () => {
  const d = fixture();
  const before = calculate(d).rows[0];
  d.config.materialFactors.concrete = 0.5;
  const after = calculate(d).rows[0];
  close(after.concentrateGal, before.concentrateGal);
  close(
    after.hours - d.config.products.organic.dwellMinutes / 60,
    2 * (before.hours - d.config.products.organic.dwellMinutes / 60),
  );
});
test("SH inventory shortage warns and tank volume must be positive", () => {
  const d = fixture();
  d.config.stockAvailableGal = 0.1;
  assert.ok(calculate(d).warnings.some((x) => x.includes("shortfall")));
  d.config.tankGal = 0;
  assert.throws(() => calculate(d));
});

test("complexity labor rate uses editable $30 baseline and severity", () => {
  assert.equal(defaults().laborRate, 30);
  assert.equal(complexityLaborRate(30, 1), 25);
  assert.equal(complexityLaborRate(30, 1.5), 30);
  assert.equal(complexityLaborRate(30, 2), 35);
  assert.equal(complexityLaborRate(32, 2), 37);
  assert.throws(() => complexityLaborRate(30, 3));
});

test("severity pass counts and summary quantities agree with line items", () => {
  const d = fixture();
  for (const [severity, expectedPasses] of [[1, 1], [1.5, 2], [2, 3]]) {
    d.areas[0].treatments[0].severity = severity;
    const r = calculate(d);
    assert.equal(r.rows[0].passes, expectedPasses);
    close(r.totalSolutionGal, r.rows.reduce((sum, row) => sum + row.solutionGal, 0));
    close(r.chemicalCost, r.rows.reduce((sum, row) => sum + row.chemicalCost, 0));
  }
});
