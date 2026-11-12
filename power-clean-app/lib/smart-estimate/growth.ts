/** Internal business planning only. Never include these allocations in customer PDFs or job cost twice. */
export type GrowthPlan = {
  jobsPerMonth: number;
  operatingCostPerJob: number;
  takeHomeAfterTax: number;
  equipmentMonthly: number;
  truckMonthly: number;
  repairsMonthly: number;
  taxRate: number;
  equipmentAlreadyInJobCost: number;
  repairsAlreadyInJobCost: number;
};
export const defaultGrowthPlan = (): GrowthPlan => ({
  jobsPerMonth: 12,
  operatingCostPerJob: 64,
  takeHomeAfterTax: 2000,
  equipmentMonthly: 840,
  truckMonthly: 672,
  repairsMonthly: 252,
  taxRate: 0.25,
  equipmentAlreadyInJobCost: 5,
  repairsAlreadyInJobCost: 3,
});
/** All allocations are cash-flow goals; they do not change the estimate's price or operating margin. */
export function growthProjection(plan: GrowthPlan, jobPrice: number) {
  const jobs = Math.max(1, plan.jobsPerMonth);
  const monthlyRevenue = jobPrice * jobs;
  const operatingCost = plan.operatingCostPerJob * jobs;
  const taxReserve = Math.max(0, monthlyRevenue - operatingCost) * plan.taxRate;
  const cashAfterCostsAndTaxes = monthlyRevenue - operatingCost - taxReserve;
  const equipment = plan.equipmentMonthly;
  const truck = plan.truckMonthly;
  const repairs = plan.repairsMonthly;
  const availableTakeHome = cashAfterCostsAndTaxes - equipment - truck - repairs;
  const targetMonthlyRevenue = operatingCost + (plan.takeHomeAfterTax + equipment + truck + repairs) / (1 - plan.taxRate);
  const targetPerJob = targetMonthlyRevenue / jobs;
  return {
    monthlyRevenue, operatingCost, taxReserve, cashAfterCostsAndTaxes,
    availableTakeHome, targetMonthlyRevenue, targetPerJob,
    monthlyShortfall: Math.max(0, targetMonthlyRevenue - monthlyRevenue),
    equipmentNewAllocationPerJob: Math.max(0, equipment / jobs - plan.equipmentAlreadyInJobCost),
    repairNewAllocationPerJob: Math.max(0, repairs / jobs - plan.repairsAlreadyInJobCost),
    // Do not add these incremental transfers to the quote: allowances already reside in operating cost.
  };
}
