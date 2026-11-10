/** Pure estimator. All defaults are editable planning assumptions, never label directions. */
export const MATERIALS = [
  "concrete",
  "brick",
  "pavers",
  "natural-stone",
  "wood",
  "composite",
  "tile",
  "metal",
] as const;
export const STONES = [
  "granite",
  "marble",
  "limestone",
  "sandstone",
  "slate",
  "unknown",
] as const;
export const TREATMENTS = [
  "organic",
  "clay",
  "rust",
  "seal",
  "wood",
  "memorial",
] as const;
export type Treatment = (typeof TREATMENTS)[number];
export type Measurement = { ft: number; inches: number };
export type Area = {
  id: string;
  name: string;
  kind: "rectangle" | "stairs" | "monument";
  material: string;
  confirmedSquareFeet?: number;
  measurementSource?: string;
  length: Measurement;
  width: Measurement;
  height: Measurement;
  depth: Measurement;
  steps: number;
  sides: number;
  landings: { length: Measurement; width: Measurement }[];
  faces: {
    front: boolean;
    back: boolean;
    left: boolean;
    right: boolean;
    top: boolean;
  };
  treatments: { type: Treatment; percent: number; severity: number }[];
  showDimensions: boolean;
  safety: {
    sound: boolean;
    permission: boolean;
    testPatch: boolean;
    dry: boolean;
    label: boolean;
  };
  detailMinutes: number;
  accessMinutes: number;
};
export type Product = {
  name: string;
  url: string;
  price: number | null;
  shipping: number | null;
  containerGal: number;
  coverage: number;
  waterParts: number;
  productParts: number;
  productVerified: boolean;
  assumptionsReviewed: boolean;
  productivity: number;
  dwellMinutes: number;
  coats: number;
};
export type Config = {
  products: Record<Treatment, Product>;
  laborRate: number | null;
  crew: number;
  equipmentHourly: number | null;
  fuel: number | null;
  overheadHourly: number | null;
  setupMinutes: number;
  travelMinutes: number;
  minimum: number;
  margin: number;
  stockSH: number;
  targetSH: Record<string, number>;
  surfactantOzPerGal: number;
  surfactantPrice: number | null;
  wastePercent: number;
  costsReviewed: boolean;
  materialFactors: Record<string, number>;
  tankGal: number;
  stockAvailableGal: number;
};
export type Draft = {
  version: 1;
  customerId: string;
  serviceAddressId: string;
  notes: string;
  areas: Area[];
  config: Config;
};
export const money = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;
export function measure(m: Measurement): number {
  if (
    !m ||
    !Number.isFinite(m.ft) ||
    !Number.isFinite(m.inches) ||
    m.ft < 0 ||
    m.ft > 100000 ||
    m.inches < 0 ||
    m.inches >= 12
  )
    throw Error(
      "Measurements need nonnegative feet and inches from 0 to less than 12.",
    );
  return m.ft + m.inches / 12;
}
const nonnegative = (n: number, label: string) => {
  if (!Number.isFinite(n) || n < 0 || n > 1e8) throw Error("Invalid " + label);
  return n;
};
export function geometry(a: Area) {
  const l = measure(a.length),
    w = measure(a.width),
    h = measure(a.height),
    d = measure(a.depth);
  if (a.confirmedSquareFeet !== undefined && (a.kind !== "rectangle" || !Number.isFinite(a.confirmedSquareFeet) || a.confirmedSquareFeet <= 0 || a.confirmedSquareFeet > 1e8)) throw Error("Invalid confirmed square footage.");
  if (a.measurementSource !== undefined && (typeof a.measurementSource !== "string" || a.measurementSource.length > 500)) throw Error("Invalid measurement source.");
  if (a.kind === "rectangle") {const area=a.confirmedSquareFeet ?? l*w;return { area, parts: { surface: area } };}
  if (a.kind === "stairs") {
    if (
      !Number.isInteger(a.steps) ||
      a.steps < 1 ||
      a.steps > 1000 ||
      ![0, 1, 2].includes(a.sides)
    )
      throw Error("Check step and side counts.");
    const treads = a.steps * w * d,
      risers = a.steps * w * h;
    // Side elevation is the sum of each step's rectangular profile, not a full bounding box.
    const sides = (a.sides * d * h * a.steps * (a.steps + 1)) / 2;
    const landings = a.landings.reduce(
      (n, x) => n + measure(x.length) * measure(x.width),
      0,
    );
    return {
      area: treads + risers + sides + landings,
      parts: { treads, risers, sides, landings },
    };
  }
  if (a.kind !== "monument") throw Error("Unknown geometry.");
  const parts = {
    front: a.faces.front ? w * h : 0,
    back: a.faces.back ? w * h : 0,
    left: a.faces.left ? d * h : 0,
    right: a.faces.right ? d * h : 0,
    top: a.faces.top ? w * d : 0,
  };
  return { area: Object.values(parts).reduce((n, v) => n + v, 0), parts };
}
export function marginPrice(cost: number, margin: number) {
  nonnegative(cost, "cost");
  if (!Number.isFinite(margin) || margin < 0 || margin >= 100)
    throw Error("Margin must be at least 0 and below 100%.");
  return cost / (1 - margin / 100);
}
export function defaults(): Config {
  const p = (
    name: string,
    url: string,
    coverage: number,
    productivity: number,
  ): Product => ({
    name,
    url,
    price: null,
    shipping: null,
    containerGal: 1,
    coverage,
    waterParts: 0,
    productParts: 1,
    productVerified: false,
    assumptionsReviewed: false,
    productivity,
    dwellMinutes: 10,
    coats: 1,
  });
  return {
    products: {
      organic: p("Sodium hypochlorite", "", 200, 600),
      clay: p(
        "Mud May-Day",
        "https://southeastsoftwash.com/products/mud-may-day-stain-remover",
        150,
        250,
      ),
      rust: {...p(
        "Southeast Softwash Rust Remedy — 1 gallon",
        "https://www.amazon.com/dp/B0FFQ7PLWF",
        150,
        200,
      ),price:85,dwellMinutes:2.5},
      seal: p(
        "Super Seal Siloxane",
        "https://southeastsoftwash.com/products/super-seal-siloxane-concrete-sealer-water-based",
        200,
        500,
      ),
      wood: p(
        "Wood Wizard",
        "https://southeastsoftwash.com/products/wood-wizard",
        150,
        250,
      ),
      memorial: p(
        "Stone-compatible conservation cleaner — verify label",
        "",
        100,
        25,
      ),
    },
    laborRate: null,
    crew: 1,
    equipmentHourly: null,
    fuel: null,
    overheadHourly: null,
    setupMinutes: 30,
    travelMinutes: 30,
    minimum: 150,
    margin: 30,
    stockSH: 10,
    targetSH: {
      concrete: 2,
      brick: 1,
      pavers: 1,
      "natural-stone": 0,
      wood: 0,
      composite: 0,
      tile: 0,
      metal: 0,
    },
    surfactantOzPerGal: 0,
    surfactantPrice: null,
    wastePercent: 10,
    costsReviewed: false,
    materialFactors: {
      concrete: 1,
      brick: 0.8,
      pavers: 0.8,
      "natural-stone": 0.6,
      wood: 0.6,
      composite: 0.7,
      tile: 0.6,
      metal: 0.7,
      granite: 1,
      marble: 0.6,
      limestone: 0.5,
      sandstone: 0.4,
      slate: 0.6,
      unknown: 0,
    },
    tankGal: 4.2,
    stockAvailableGal: 3,
  };
}
export function newArea(): Area {
  const zero = () => ({ ft: 0, inches: 0 });
  return {
    id: crypto.randomUUID(),
    name: "Treatment area",
    kind: "rectangle",
    material: "concrete",
    length: zero(),
    width: zero(),
    height: zero(),
    depth: zero(),
    steps: 1,
    sides: 0,
    landings: [],
    faces: { front: true, back: true, left: true, right: true, top: true },
    treatments: [{ type: "organic", percent: 100, severity: 1 }],
    showDimensions: false,
    safety: {
      sound: false,
      permission: false,
      testPatch: false,
      dry: false,
      label: false,
    },
    detailMinutes: 15,
    accessMinutes: 10,
  };
}
export type Result = ReturnType<typeof calculate>;
export function calculate(draft: Draft) {
  const c = draft.config,
    errors: string[] = [],
    warnings: string[] = [
      "All coverage, dilution, strength and productivity values are operator planning assumptions. Verify current labels and test patches. Specialty treatments are separate applications; never mix chemicals.",
    ];
  if (
    draft.version !== 1 ||
    !Array.isArray(draft.areas) ||
    !draft.areas.length ||
    draft.areas.length > 20
  )
    throw Error("Use 1–20 treatment areas.");
  for (const k of [
    "crew",
    "setupMinutes",
    "travelMinutes",
    "minimum",
    "stockSH",
    "surfactantOzPerGal",
    "wastePercent",
    "tankGal",
    "stockAvailableGal",
  ] as const)
    nonnegative(c[k], k);
  if (!Number.isInteger(c.crew) || c.crew < 1 || c.crew > 20)
    throw Error("Crew must be 1–20.");
  if (!c.tankGal) throw Error("Tank gallons must be positive.");
  if (c.stockSH <= 0 || c.stockSH > 100 || c.wastePercent > 100)
    throw Error("Check stock SH and waste allowance.");
  marginPrice(0, c.margin);
  for (const k of [
    "laborRate",
    "equipmentHourly",
    "fuel",
    "overheadHourly",
  ] as const) {
    if (c[k] === null) errors.push("Missing cost: " + k);
    else nonnegative(c[k], k);
  }
  if (c.costsReviewed !== true)
    errors.push("Review job costs, including intentional zero costs.");
  const rows: {
    key: string;
    description: string;
    area: number;
    hours: number;
    laborHours: number;
    solutionGal: number;
    concentrateGal: number;
    waterGal: number;
    surfactantOz: number;
    chemicalCost: number;
    cost: number;
    price: number;
    dimensions: string;
    showDimensions: boolean;
  }[] = [];
  if (new Set(draft.areas.map((a) => a.id)).size !== draft.areas.length)
    throw Error("Treatment areas need unique identities.");
  for (const a of draft.areas) {
    if (
      a.kind === "monument" &&
      (!a.faces || Object.values(a.faces).some((v) => typeof v !== "boolean"))
    )
      throw Error("Select valid exposed faces.");
    if (!Array.isArray(a.landings) || a.landings.length > 100)
      throw Error("Use at most 100 landings per stair area.");
    if (
      typeof a.id !== "string" ||
      !a.id ||
      typeof a.showDimensions !== "boolean" ||
      !a.safety ||
      Object.values(a.safety).some((v) => typeof v !== "boolean")
    )
      throw Error("Invalid area identity or safety checks.");
    if (!a.name?.trim() || a.name.length > 80)
      errors.push("Each area needs a name of at most 80 characters.");
    const { area } = geometry(a);
    if (area <= 0 || area > 1e7)
      errors.push(a.name + ": enter positive dimensions.");
    if (
      !Array.isArray(a.treatments) ||
      !a.treatments.length ||
      a.treatments.length > 6
    )
      throw Error("Choose 1–6 treatments per area.");
    if (new Set(a.treatments.map((t) => t.type)).size !== a.treatments.length)
      errors.push(a.name + ": duplicate treatment.");
    const isMonument = a.kind === "monument";
    if (isMonument) {
      if (
        !STONES.includes(a.material as (typeof STONES)[number]) ||
        a.material === "unknown"
      )
        errors.push(a.name + ": identify the stone before estimating.");
      if (
        !a.safety.sound ||
        !a.safety.permission ||
        !a.safety.testPatch ||
        !a.safety.label
      )
        errors.push(
          a.name +
            ": confirm sound stone, permission, test patch and conservation-compatible label.",
        );
      if (a.treatments.some((t) => t.type !== "memorial"))
        errors.push(
          a.name +
            ": memorials require a separate stone-compatible conservation cleaner. No SH, acids, sealer or pressure washing.",
        );
      warnings.push(
        a.name +
          ": use gentle hand cleaning only; fragile or historic stone requires a conservator.",
      );
    } else if (!MATERIALS.includes(a.material as (typeof MATERIALS)[number]))
      errors.push(a.name + ": unknown material.");
    for (const t of a.treatments) {
      if (!TREATMENTS.includes(t.type)) throw Error("Unknown treatment.");
      if (
        !Number.isFinite(t.percent) ||
        t.percent <= 0 ||
        t.percent > 100 ||
        ![1, 1.5, 2].includes(t.severity)
      )
        throw Error("Check treatment coverage and severity.");
      const p = c.products[t.type];
      if (!p) throw Error("Missing product settings.");
      for (const k of [
        "containerGal",
        "coverage",
        "waterParts",
        "productParts",
        "productivity",
        "dwellMinutes",
        "coats",
      ] as const)
        nonnegative(p[k], k);
      if (
        !p.containerGal ||
        !p.coverage ||
        !p.productParts ||
        !p.productivity ||
        !Number.isInteger(p.coats) ||
        p.coats < 1 ||
        p.coats > 10
      )
        throw Error(
          "Product size, coverage, ratio, coats and productivity must be positive.",
        );
      if (p.price === null || p.shipping === null)
        errors.push(p.name + ": enter price and shipping (zero if included).");
      if (p.price !== null) nonnegative(p.price, "product price");
      if (p.shipping !== null) nonnegative(p.shipping, "shipping");
      if (p.productVerified !== true || p.assumptionsReviewed !== true)
        errors.push(
          p.name +
            ": verify product identity/label and review planning assumptions.",
        );
      if (t.type === "wood" && a.material !== "wood")
        errors.push(a.name + ": Wood Wizard requires wood.");
      if (
        (t.type === "clay" || t.type === "rust" || t.type === "seal") &&
        !["concrete", "brick", "pavers"].includes(a.material)
      )
        errors.push(
          a.name +
            ": specialty treatment requires confirmed compatible concrete/masonry; sensitive materials need a separate reviewed method.",
        );
      if (
        t.type === "seal" &&
        (!a.safety.dry || !a.safety.testPatch || !a.safety.label)
      )
        errors.push(
          a.name + ": verify clean/dry substrate, test patch and sealer label.",
        );
      if (t.type === "memorial" && !isMonument)
        errors.push(
          a.name + ": conservation cleaning is for memorial geometry.",
        );
      if (
        typeof p.name !== "string" ||
        !p.name.trim() ||
        p.name.length > 200 ||
        typeof p.url !== "string" ||
        p.url.length > 2000
      )
        throw Error("Invalid product identification.");
      if(t.type==='rust'&&(!/^https:\/\/(?:www\.)?(?:amazon\.[a-z.]+|a\.co|amzn\.to)\//i.test(p.url)||p.name.includes('identification required')))errors.push('Identify the previously selected Amazon rust product and its exact listing before finalizing.');
      if(t.type==='memorial'&&p.name.includes('verify label'))errors.push('Enter the exact conservation cleaner name before finalizing.');
      const factor = c.materialFactors[a.material];
      if (!Number.isFinite(factor) || factor <= 0 || factor > 10)
        errors.push(
          a.name + ": enter a positive material labor productivity factor.",
        );
      const treated = (area * t.percent) / 100;
      const solutionGal =
        (treated / p.coverage) *
        p.coats *
        t.severity *
        (1 + c.wastePercent / 100);
      let fraction = p.productParts / (p.productParts + p.waterParts),
        surfactantOz = 0;
      if (t.type === "organic") {
        const target = c.targetSH[a.material];
        if (!Number.isFinite(target) || target <= 0 || target > c.stockSH)
          errors.push(
            a.name +
              ": set a reviewed, surface-compatible SH target above zero and no stronger than stock.",
          );
        fraction =
          Number.isFinite(target) && target > 0 && target <= c.stockSH
            ? target / c.stockSH
            : 0;
        surfactantOz = solutionGal * c.surfactantOzPerGal;
        if (c.surfactantOzPerGal > 0 && c.surfactantPrice === null)
          errors.push("Missing surfactant cost.");
        if (c.surfactantPrice !== null)
          nonnegative(c.surfactantPrice, "surfactant price");
        if (fraction + c.surfactantOzPerGal / 128 > 1)
          errors.push("SH plus surfactant exceeds solution volume.");
      }
      const concentrateGal = solutionGal * fraction,
        waterGal = Math.max(
          0,
          solutionGal - concentrateGal - surfactantOz / 128,
        );
      const chemicalCost =
        (concentrateGal * ((p.price ?? 0) + (p.shipping ?? 0))) /
          p.containerGal +
        (surfactantOz / 128) * (c.surfactantPrice ?? 0);
      const detail = isMonument
        ? (nonnegative(a.detailMinutes, "detail minutes") +
            nonnegative(a.accessMinutes, "access minutes")) /
          60
        : 0;
      const hours =
        (treated / (p.productivity * (factor > 0 ? factor : 1))) *
          t.severity *
          p.coats +
        p.dwellMinutes / 60 +
        detail;
      const cost =
        chemicalCost +
        hours *
          ((c.laborRate ?? 0) * c.crew +
            (c.equipmentHourly ?? 0) +
            (c.overheadHourly ?? 0));
      const dimensions =
        a.confirmedSquareFeet !== undefined
          ? `Confirmed area: ${a.confirmedSquareFeet} sq ft`
          : a.kind === "rectangle"
          ? `${a.length.ft} ft ${a.length.inches} in × ${a.width.ft} ft ${a.width.inches} in`
          : a.kind === "stairs"
            ? `${a.steps} steps; ${a.width.ft} ft ${a.width.inches} in wide; treads ${a.depth.ft} ft ${a.depth.inches} in; risers ${a.height.ft} ft ${a.height.inches} in; ${a.sides} sides; ${a.landings.length} landings`
            : `${a.width.ft} ft ${a.width.inches} in × ${a.height.ft} ft ${a.height.inches} in × ${a.depth.ft} ft ${a.depth.inches} in; faces ${Object.entries(
                a.faces,
              )
                .filter(([, v]) => v)
                .map(([k]) => k)
                .join(", ")}`;
      rows.push({
        key: a.id + ":" + t.type,
        description: `${a.name} — ${t.type} (${a.material})`,
        area: treated,
        hours,
        laborHours: hours * c.crew,
        solutionGal,
        concentrateGal,
        waterGal,
        surfactantOz,
        chemicalCost,
        cost,
        price: 0,
        dimensions,
        showDimensions: a.showDimensions,
      });
    }
  }
  const shRequired = rows
    .filter((r) => r.key.endsWith(":organic"))
    .reduce((n, r) => n + r.concentrateGal, 0);
  if (shRequired > c.stockAvailableGal)
    warnings.push(
      "SH inventory shortfall: " +
        (shRequired - c.stockAvailableGal).toFixed(3) +
        " gallons. Purchase before service.",
    );
  const sharedHours = (c.setupMinutes + c.travelMinutes) / 60;
  const sharedCost =
    sharedHours *
      ((c.laborRate ?? 0) * c.crew +
        (c.equipmentHourly ?? 0) +
        (c.overheadHourly ?? 0)) +
    (c.fuel ?? 0);
  const cost = rows.reduce((n, r) => n + r.cost, 0) + sharedCost;
  const total = money(Math.max(c.minimum, marginPrice(cost, c.margin)));
  // Allocate shared costs and the job minimum once using largest-remainder cents.
  const base = rows.reduce((n, r) => n + r.cost, 0),
    cents = Math.round(total * 100);
  const allocations = rows.map((r, i) => {
    const share = cents * (base ? r.cost / base : 1 / rows.length);
    return { i, cents: Math.floor(share), fraction: share - Math.floor(share) };
  });
  let remainder = cents - allocations.reduce((n, x) => n + x.cents, 0);
  for (const x of [...allocations].sort((a, b) => b.fraction - a.fraction)) {
    if (remainder-- <= 0) break;
    x.cents++;
  }
  allocations.forEach((x) => {
    rows[x.i].price = x.cents / 100;
  });
  if (total > 10000000)
    errors.push("Estimate exceeds the supported $10,000,000 limit.");
  return {
    rows,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    cost: money(cost),
    sharedCost: money(sharedCost),
    total,
    profit: money(total - cost),
    margin: total ? (100 * (total - cost)) / total : 0,
    markup: cost ? (100 * (total - cost)) / cost : 0,
    hours: rows.reduce((n, r) => n + r.hours, 0) + sharedHours,
    laborHours: (rows.reduce((n, r) => n + r.hours, 0) + sharedHours) * c.crew,
    shRequired,
  };
}
export function parseDraft(value: unknown): Draft {
  if (
    !value ||
    typeof value !== "object" ||
    JSON.stringify(value).length > 200000
  )
    throw Error("Invalid or oversized draft.");
  const d = value as Draft;
  if (
    typeof d.customerId !== "string" ||
    typeof d.serviceAddressId !== "string" ||
    typeof d.notes !== "string" ||
    d.notes.length > 2000
  )
    throw Error("Invalid customer details or notes.");
  calculate(d);
  return structuredClone(d);
}
