import test from "node:test";
import assert from "node:assert/strict";
import { defaultGrowthPlan, growthProjection } from "../lib/smart-estimate/growth.ts";
test("growth targets match six-month truck and repair plan", () => {
  const p = defaultGrowthPlan();
  const r = growthProjection(p, 483);
  assert.ok(Math.abs(r.targetMonthlyRevenue - 5786.666666666667) < 0.01);
  assert.ok(Math.abs(r.targetPerJob - 482.22222222222223) < 0.01);
  assert.ok(r.availableTakeHome >= 2000);
  assert.equal(r.sixMonthEquipment, 5040);
  assert.equal(r.sixMonthTruck, 4032);
  assert.equal(r.sixMonthRepairs, 1512);
  assert.equal(r.monthsToEquipment, 6);
  assert.equal(r.monthsToTruck, 6);
  assert.equal(r.monthsToRepairReserve, 6);
  assert.equal(r.equipmentNewAllocationPerJob, 65);
  assert.equal(r.repairNewAllocationPerJob, 18);
});
test("lower sales report a gap without changing quote", () => {
  const r = growthProjection(defaultGrowthPlan(), 300);
  assert.ok(r.monthlyShortfall > 2000);
  assert.equal(r.monthlyRevenue, 3600);
});
