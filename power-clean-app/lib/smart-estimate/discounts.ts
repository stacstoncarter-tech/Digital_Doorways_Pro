export const DISCOUNT_CATEGORIES = {
  custom: "Custom discount",
  "first-time": "First-time customer",
  returning: "Returning customer",
  military: "Military discount",
  senior: "Senior discount",
  "multi-service": "Multi-service discount",
  seasonal: "Seasonal promotion",
} as const;

export type Discount = {
  id: string;
  category: keyof typeof DISCOUNT_CATEGORIES;
  method: "percent" | "fixed";
  value: number;
  serviceKey: string | null;
  reason: string;
};

export type PublicDiscount = { label: string; amount: number };

const cents = (value: number) => Math.round((value + Number.EPSILON) * 100);

export function applyDiscounts(
  entries: Discount[] = [],
  services: { key: string; description: string; price: number }[],
) {
  if (!Array.isArray(entries) || entries.length > 20)
    throw Error("Use up to 20 discounts per estimate.");

  const errors: string[] = [];
  const details: PublicDiscount[] = [];
  const byKey = new Map(services.map(service => [service.key, service]));
  const remaining = new Map(services.map(service => [service.key, cents(service.price)]));
  const subtotal = [...remaining.values()].reduce((sum, price) => sum + price, 0);
  let balance = subtotal;
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!entry || typeof entry.id !== "string" || !entry.id || seen.has(entry.id) ||
        !Object.hasOwn(DISCOUNT_CATEGORIES, entry.category) ||
        !["percent", "fixed"].includes(entry.method) ||
        !Number.isFinite(entry.value) || entry.value < 0 || entry.value > (entry.method === "percent" ? 100 : 10000000) ||
        (entry.serviceKey !== null && typeof entry.serviceKey !== "string") ||
        typeof entry.reason !== "string" || entry.reason.length > 250)
      throw Error("Check discount type, amount, scope, and reason.");
    seen.add(entry.id);
  }
  // Service savings reduce the balance before estimate-wide promotions.
  for (const entry of [...entries.filter(d => d.serviceKey !== null), ...entries.filter(d => d.serviceKey === null)]) {
    const category = DISCOUNT_CATEGORIES[entry.category];
    const service = entry.serviceKey === null ? undefined : byKey.get(entry.serviceKey);
    if (entry.serviceKey !== null && !service) {
      errors.push(category + ": select an existing service.");
      continue;
    }
    if (entry.category === "multi-service" && services.length < 2) {
      errors.push(category + ": add at least two services.");
      continue;
    }
    if (!entry.reason.trim()) errors.push(category + ": enter an internal reason.");
    const available = service ? remaining.get(service.key)! : balance;
    const hundredths = cents(entry.value);
    if (Math.abs(hundredths / 100 - entry.value) > 1e-8) {
      errors.push(category + ": use up to two decimal places.");
      continue;
    }
    const amount = entry.method === "percent"
      ? Math.round(available * hundredths / 10000)
      : hundredths;
    if (amount <= 0 || amount > available) {
      errors.push(category + ": the discount must be at least $0.01 and fit the remaining price.");
      continue;
    }
    if (service) remaining.set(service.key, available - amount);
    balance -= amount;
    const scope = service?.description ?? "Entire estimate";
    const rate = entry.method === "percent" ? " (" + entry.value + "%)" : "";
    details.push({ label: category + rate + " · " + scope, amount: amount / 100 });
  }
  return { details, errors, subtotal: subtotal / 100, discount: (subtotal - balance) / 100, total: balance / 100 };
}
