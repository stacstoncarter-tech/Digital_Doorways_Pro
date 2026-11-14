"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ImageMeasurements from "./image-measurements";
import { defaultGrowthPlan, growthProjection } from "@/lib/smart-estimate/growth";
import { createClient } from "@/lib/supabase/client";
import { POWER_CLEAN_LOGO } from "@/lib/branding";
import {
  CUSTOMER_SERVICE_ADDRESS,
  calculate,
  defaults,
  newArea,
  MATERIALS,
  STAIR_MATERIALS,
  EXTERIOR_KINDS,
  MATERIAL_LABELS,
  isElevation,
  STONES,
  TREATMENTS,
  geometry,
  parseDraft,
  type Area,
  type Config,
  type Draft,
  type Measurement,
  type Product,
  type Treatment,
} from "@/lib/smart-estimate/engine";
import {
  saveSmartDraft,
  loadSmartDraft,
  listSmartDrafts,
  finalizeSmartEstimate,
} from "./actions";
const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  nullable = false,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  min?: number;
  max?: number;
  nullable?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step="any"
        value={value ?? ""}
        onChange={(e) =>
          onChange(
            e.target.value === "" && nullable ? null : Number(e.target.value),
          )
        }
      />
    </label>
  );
}
function Feet({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Measurement;
  onChange: (m: Measurement) => void;
}) {
  return (
    <fieldset>
      <legend>{label}</legend>
      <div className="smart-flex">
        <NumberField
          label="Feet"
          value={value.ft}
          onChange={(n) => onChange({ ...value, ft: n ?? 0 })}
        />
        <NumberField
          label="Inches"
          value={value.inches}
          max={11.999}
          onChange={(n) => onChange({ ...value, inches: n ?? 0 })}
        />
      </div>
    </fieldset>
  );
}
const initial = (): Draft => ({
  version: 1,
  customerId: "",
  serviceAddressId: "",
  notes: "",
  areas: [newArea()],
  config: defaults(),
});
export default function SmartEstimate() {
  const [growth, setGrowth] = useState(defaultGrowthPlan),
    [draft, setDraft] = useState<Draft | null>(null),
    [draftId, setDraftId] = useState(""),
    [savedEstimate, setSavedEstimate] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [loadError, setLoadError] = useState("");
  const [customers, setCustomers] = useState<{ id: string; name: string; service_address: string | null }[]>(
      [],
    ),
    [properties, setProperties] = useState<
      { id: string; label: string; address: string }[]
    >([]),
    [savedDrafts, setSavedDrafts] = useState<
      {
        id: string;
        name: string;
        updated_at: string;
        estimate_id: string | null;
      }[]
    >([]);
  useEffect(() => {
    const d = initial();
    d.customerId = new URLSearchParams(location.search).get("customer") || "";
    setDraft(d);
    (async () => {
      const db = createClient();
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) {
        setLoadError("Sign in to load customers and drafts.");
        return;
      }
      const { data: m } = await db
        .from("business_members")
        .select("business_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (!m) return;
      const { data, error } = await db
        .from("customers")
        .select("id,name,service_address")
        .eq("business_id", m.business_id)
        .order("name")
        .limit(500);
      setCustomers(data ?? []);
      if (error) setLoadError(error.message);
      const list = await listSmartDrafts();
      if (list.error) setLoadError(list.error);
      else {
        setSavedDrafts(list.drafts ?? []);
        const params = new URLSearchParams(location.search);
        const requested = params.get("draft");
        if (requested) {
          const loaded = await loadSmartDraft(requested);
          if (loaded.snapshot) {
            setDraft(parseDraft(loaded.snapshot));
            if (params.get("revise") === "1" && loaded.estimateId) {
              setMessage("Editing a copy. Finalize it and send a new approval link for the revised price.");
            } else {
              setDraftId(requested);
              setSavedEstimate(loaded.estimateId ?? "");
            }
          }
        }
      }
    })().catch((e) => setLoadError(String(e)));
  }, []);
  useEffect(() => {
    setProperties([]);
    if (!draft?.customerId) return;
    let active = true;
    (async () => {
      const { data, error } = await createClient()
        .from("customer_addresses")
        .select("id,label,address")
        .eq("customer_id", draft.customerId)
        .order("created_at");
      if (active) {
        setProperties(data ?? []);
        if (error) setLoadError(error.message);
      }
    })();
    return () => {
      active = false;
    };
  }, [draft?.customerId]);
  const originalAddress = customers.find((customer) => customer.id === draft?.customerId)
    ?.service_address?.trim();
  const addressOptions = originalAddress &&
    (draft?.serviceAddressId === CUSTOMER_SERVICE_ADDRESS ||
      !properties.some((property) => property.address.trim() === originalAddress))
    ? [{ id: CUSTOMER_SERVICE_ADDRESS, label: "Customer address", address: originalAddress }, ...properties]
    : properties;
  const result = useMemo(() => {
    if (!draft) return null;
    try {
      return { value: calculate(draft), error: "" };
    } catch (e) {
      return {
        value: null,
        error: e instanceof Error ? e.message : "Invalid inputs",
      };
    }
  }, [draft]);
  const change = (p: Partial<Draft>) => {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setMessage("Unsaved changes");
  };
  const config = (p: Partial<Config>) =>
    draft && change({ config: { ...draft.config, ...p } });
  const area = (id: string, p: Partial<Area>) =>
    draft &&
    change({
      areas: draft.areas.map((a) => (a.id === id ? { ...a, ...p } : a)),
    });
  const product = (type: Treatment, p: Partial<Product>) =>
    draft &&
    config({
      products: {
        ...draft.config.products,
        [type]: { ...draft.config.products[type], ...p },
      },
    });
  async function perform(final = false) {
    if (!draft) return;
    setBusy(true);
    setMessage("");
    try {
      let id = draftId;
      if (!id) {
        const saved = await saveSmartDraft(draft);
        if (saved.error || !saved.draftId)
          throw Error(saved.error || "Draft save failed");
        id = saved.draftId;
        setDraftId(id);
      }
      if (final) {
        const r = await finalizeSmartEstimate(draft, id);
        if (r.error) throw Error(r.error);
        if (r.estimateId) setSavedEstimate(r.estimateId);
        setMessage("Estimate saved to customer history.");
      } else {
        const r = await saveSmartDraft(draft, id);
        if (r.error) throw Error(r.error);
        setMessage("Draft saved and verified.");
      }
      const list = await listSmartDrafts();
      setSavedDrafts(list.drafts ?? []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function restore(id: string) {
    setBusy(true);
    try {
      const r = await loadSmartDraft(id);
      if (r.error || !r.snapshot) {
        setMessage(r.error || "Draft unavailable");
        return;
      }
      setDraft(parseDraft(r.snapshot));
      setDraftId(id);
      setSavedEstimate(r.estimateId ?? "");
      setMessage("Draft restored.");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  if (!draft)
    return (
      <main className="workspace">
        <p>Loading smart estimator…</p>
      </main>
    );
  const r = result?.value,
    c = draft.config,
    locked = Boolean(savedEstimate);
  return (
    <main className="workspace smart-estimate">
      <style>{`.smart-estimate input:not([type=checkbox]),.smart-estimate select,.smart-estimate textarea{display:block;width:100%;min-width:0;padding:10px;border:1px solid #bacbd7;border-radius:6px;background:white;color:#172d3a}.smart-estimate label{display:block;min-width:0}.smart-estimate fieldset{border:1px solid #c9d7e1;border-radius:8px;min-width:0;padding:12px}.smart-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:14px}.smart-flex{display:flex;flex-wrap:wrap;gap:12px}.smart-flex>label{flex:1;min-width:90px}.smart-area{border-top:3px solid #0871bd;margin-top:20px;padding-top:16px}.smart-estimate summary{cursor:pointer;font-weight:700;padding:12px 0}.smart-estimate table{border-collapse:collapse;width:100%}.smart-estimate td,.smart-estimate th{text-align:left;padding:10px;border-bottom:1px solid #d5dfe6}.smart-scroll{overflow-x:auto}.smart-alert{border-left:4px solid #b65117;padding:12px;background:#fff6eb}.smart-total{font-size:1.8rem;color:#0069b4}.customer-print{display:none}@media print{body *{visibility:hidden}.customer-print,.customer-print *{visibility:visible}.customer-print{display:block;position:absolute;inset:0;padding:20px;background:white}.smart-screen{display:none!important}.customer-print table{width:100%}@page{size:letter;margin:15mm}}`}</style>
      <div className="smart-screen">
        <header className="workspace-header">
          <div>
            <span className="eyebrow">POWER CLEAN / OPERATIONS</span>
            <h1>Smart Estimate System</h1>
            <p className="muted">
              Measure, select treatments, review true costs, and save a customer
              estimate.
            </p>
          </div>
          <div>
            <Link href="/estimates">Estimate Builder</Link> ·{" "}
            <Link href="/estimates/history">Saved estimates</Link>
          </div>
        </header>
        {loadError && (
          <p role="alert" className="smart-alert">
            {loadError}
          </p>
        )}
        <section className="panel">
          <h2>Customer & drafts</h2>
          <div className="smart-grid">
            <label>
              Customer
              <select
                disabled={locked}
                value={draft.customerId}
                onChange={(e) =>
                  change({ customerId: e.target.value, serviceAddressId: "" })
                }
              >
                <option value="">Select customer</option>
                {customers.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Service address
              <select
                disabled={locked}
                value={draft.serviceAddressId}
                onChange={(e) => change({ serviceAddressId: e.target.value })}
              >
                <option value="">Select address</option>
                {addressOptions.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label} — {x.address}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Saved smart drafts
              <select
                value={draftId}
                disabled={busy}
                onChange={(e) => e.target.value && restore(e.target.value)}
              >
                <option value="">Choose a saved draft</option>
                {savedDrafts.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} · {new Date(x.updated_at).toLocaleDateString()}{" "}
                    {x.estimate_id ? "(finalized)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {draft.customerId && (
            <p>
              <Link href={"/customers/" + draft.customerId}>
                Edit customer, addresses & history
              </Link>
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setDraft({ ...initial(), config: structuredClone(draft.config) });
              setDraftId("");
              setSavedEstimate("");
              setMessage("New estimate started.");
            }}
          >
            New estimate with these settings
          </button>
        </section>
        <fieldset disabled={busy || locked} style={{ border: 0, padding: 0 }}>
          <section className="panel">
            <h2>Treatment areas</h2>
            <p>
              Each add-on uses its own affected-area percentage and severity.
              Setup, travel and fuel are charged once per job.
            </p>
            {draft.areas.map((a, i) => (
              <div key={a.id} className="smart-area">
                <h3>Area {i + 1}</h3>
                <div className="smart-grid">
                  <label>
                    Area name
                    <input
                      maxLength={80}
                      value={a.name}
                      onChange={(e) => area(a.id, { name: e.target.value })}
                    />
                  </label>
                  <label>
                    Geometry
                    <select
                      value={a.kind}
                      onChange={(e) => {
                        const kind = e.target.value as Area["kind"];
                        area(a.id, {
                          kind,
                          confirmedSquareFeet: undefined,
                          measurementSource: undefined,
                          material:
                            kind === "monument" ? "granite" : ((kind === "stairs" ? STAIR_MATERIALS : MATERIALS) as readonly string[]).includes(a.material) ? a.material : "concrete",
                          treatments: [
                            {
                              type:
                                kind === "monument" ? "memorial" : "organic",
                              percent: 100,
                              severity: 1,
                            },
                          ],
                        });
                      }}
                    >
                      <option value="rectangle">Surface / rectangle</option>
                      {Object.entries(EXTERIOR_KINDS).map(([value,label])=><option key={value} value={value}>{label}</option>)}
                      <option value="stairs">Stairs</option>
                      <option value="monument">Monument / memorial</option>
                    </select>
                  </label>
                  <label>
                    {a.kind === "monument" ? "Stone" : "Material"}
                    <select
                      value={a.material}
                      onChange={(e) => area(a.id, { material: e.target.value })}
                    >
                      {(a.kind === "monument" ? STONES : a.kind === "stairs" ? STAIR_MATERIALS : MATERIALS).map((m) => (
                        <option key={m} value={m}>{MATERIAL_LABELS[m]||m}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="smart-grid" style={{ marginTop: 14 }}>
                  {(a.kind === "rectangle" || a.kind === "fascia" || a.kind === "soffit"
                    ? ["length", "width"]
                    : isElevation(a.kind) ? ["length","height"]
                    : a.kind === "gable" ? ["length","height","depth"]
                    : a.kind === "stairs"
                      ? ["width", "depth", "height"]
                      : ["width", "height", "depth"]
                  ).map((k) => (
                    <Feet
                      key={k}
                      label={
                        isElevation(a.kind) ? k === "length" ? "Wall width" : "Wall height"
                        : a.kind === "gable" ? k === "length" ? "Wall / gable base width" : k === "height" ? "Rectangular wall height to eave (0 for triangle only)" : "Triangular rise above eave"
                        : a.kind === "fascia" || a.kind === "soffit" ? k === "length" ? "Total run length" : a.kind === "fascia" ? "Fascia face height" : "Soffit projection depth"
                        : a.kind === "stairs"
                          ? k === "depth"
                            ? "Tread depth"
                            : k === "height"
                              ? "Riser height"
                              : "Step width"
                          : k
                      }
                      value={a[k as "length"]}
                      onChange={(m) => area(a.id, { [k]: m, confirmedSquareFeet: undefined, measurementSource: undefined })}
                    />
                  ))}
                </div>
                {a.kind in EXTERIOR_KINDS && <p>{a.kind === "gable" ? "Area = rectangular wall + half × base width × triangular rise. The rise is above the eave, not total roof height." : a.kind === "fascia" ? "Measure the visible vertical fascia face: total run × face height." : a.kind === "soffit" ? "Measure the underside of the overhang: total run × projection depth." : "Measure each wall separately as width × height. Left and right are viewed from the front."} Add separate areas for different materials or sections; do not count the same surface twice.</p>}
                {a.kind === "rectangle" && <>
                  <ImageMeasurements onApply={m=>area(a.id,m.length&&m.width?{length:m.length,width:m.width,confirmedSquareFeet:undefined,measurementSource:m.text.slice(0,500)}:{confirmedSquareFeet:m.squareFeet,measurementSource:m.text.slice(0,500)})}/>
                  {a.measurementSource&&<p>Confirmed image measurement: {a.measurementSource}</p>}
                  {a.confirmedSquareFeet!==undefined&&<p>Using confirmed area: {a.confirmedSquareFeet.toFixed(2)} sq ft. <button type="button" onClick={()=>area(a.id,{confirmedSquareFeet:undefined,measurementSource:undefined})}>Use length × width instead</button></p>}
                </>}
                {a.kind === "stairs" && (
                  <>
                    <div className="smart-flex">
                      <NumberField
                        label="Step count"
                        value={a.steps}
                        onChange={(n) => area(a.id, { steps: n ?? 0 })}
                      />
                      <NumberField
                        label="Exposed sides (0–2)"
                        value={a.sides}
                        max={2}
                        onChange={(n) => area(a.id, { sides: n ?? 0 })}
                      />
                    </div>
                    <p>
                      Sides use a stepped elevation profile. Add irregular
                      surfaces as separate areas.
                    </p>
                    {a.landings.map((l, j) => (
                      <div key={j} className="smart-grid">
                        <Feet
                          label={"Landing " + (j + 1) + " length"}
                          value={l.length}
                          onChange={(m) =>
                            area(a.id, {
                              landings: a.landings.map((x, k) =>
                                k === j ? { ...x, length: m } : x,
                              ),
                            })
                          }
                        />
                        <Feet
                          label="Landing width"
                          value={l.width}
                          onChange={(m) =>
                            area(a.id, {
                              landings: a.landings.map((x, k) =>
                                k === j ? { ...x, width: m } : x,
                              ),
                            })
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            area(a.id, {
                              landings: a.landings.filter((_, k) => k !== j),
                            })
                          }
                        >
                          Remove landing
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        area(a.id, {
                          landings: [
                            ...a.landings,
                            {
                              length: { ft: 0, inches: 0 },
                              width: { ft: 0, inches: 0 },
                            },
                          ],
                        })
                      }
                    >
                      + Landing
                    </button>
                  </>
                )}
                {a.kind === "monument" && (
                  <>
                    <p>
                      Exposed faces — measure each block/base as a separate
                      area.
                    </p>
                    <div className="smart-flex">
                      {Object.entries(a.faces).map(([k, v]) => (
                        <label key={k}>
                          <input
                            type="checkbox"
                            checked={v}
                            onChange={(e) =>
                              area(a.id, {
                                faces: { ...a.faces, [k]: e.target.checked },
                              })
                            }
                          />
                          {k}
                        </label>
                      ))}
                    </div>
                    <div className="smart-flex">
                      <NumberField
                        label="Detail / lettering minutes"
                        value={a.detailMinutes}
                        onChange={(n) => area(a.id, { detailMinutes: n ?? 0 })}
                      />
                      <NumberField
                        label="Access / protection minutes"
                        value={a.accessMinutes}
                        onChange={(n) => area(a.id, { accessMinutes: n ?? 0 })}
                      />
                    </div>
                    <p className="smart-alert">
                      Gentle conservation cleaning only. Unknown, cracked,
                      flaking or historic stone requires specialist assessment.
                      No pressure washing, SH, acid stain removers or sealing.
                    </p>
                  </>
                )}
                <p>
                  Measured surface:{" "}
                  <strong>
                    {(() => {
                      try {
                        return geometry(a).area.toFixed(2) + " sq ft";
                      } catch {
                        return "Check measurements";
                      }
                    })()}
                  </strong>
                </p>
                <div className="smart-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Treatment</th>
                        <th>Affected area %</th>
                        <th>Severity</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {a.treatments.map((t, j) => (
                        <tr key={t.type}>
                          <td>{t.type}</td>
                          <td>
                            <NumberField
                              label="Coverage %"
                              value={t.percent}
                              max={100}
                              onChange={(n) =>
                                area(a.id, {
                                  treatments: a.treatments.map((x, k) =>
                                    k === j ? { ...x, percent: n ?? 0 } : x,
                                  ),
                                })
                              }
                            />
                          </td>
                          <td>
                            <label>
                              Severity
                              <select
                                value={t.severity}
                                onChange={(e) =>
                                  area(a.id, {
                                    treatments: a.treatments.map((x, k) =>
                                      k === j
                                        ? {
                                            ...x,
                                            severity: Number(e.target.value),
                                          }
                                        : x,
                                    ),
                                  })
                                }
                              >
                                <option value={1}>Normal ×1</option>
                                <option value={1.5}>Heavy ×1.5</option>
                                <option value={2}>Severe ×2</option>
                              </select>
                            </label>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() =>
                                area(a.id, {
                                  treatments: a.treatments.filter(
                                    (_, k) => k !== j,
                                  ),
                                })
                              }
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <label>
                  Add treatment
                  <select
                    value=""
                    onChange={(e) =>
                      e.target.value &&
                      area(a.id, {
                        treatments: [
                          ...a.treatments,
                          {
                            type: e.target.value as Treatment,
                            percent: 100,
                            severity: 1,
                          },
                        ],
                      })
                    }
                  >
                    <option value="">Choose add-on</option>
                    {TREATMENTS.filter(
                      (t) => !a.treatments.some((x) => x.type === t),
                    ).map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <details>
                  <summary>Safety checks & customer dimensions</summary>
                  {Object.entries({
                    sound: "Stone is sound and stable",
                    permission: "Owner / cemetery permission confirmed",
                    testPatch: "Compatible test patch reviewed",
                    dry: "Clean, dry substrate / curing conditions confirmed",
                    label:
                      "Current label is compatible with this surface and method",
                  }).map(([k, label]) => (
                    <label key={k}>
                      <input
                        type="checkbox"
                        checked={a.safety[k as keyof Area["safety"]]}
                        onChange={(e) =>
                          area(a.id, {
                            safety: { ...a.safety, [k]: e.target.checked },
                          })
                        }
                      />
                      {label}
                    </label>
                  ))}
                  <label>
                    <input
                      type="checkbox"
                      checked={a.showDimensions}
                      onChange={(e) =>
                        area(a.id, { showDimensions: e.target.checked })
                      }
                    />
                    Show square feet and measurements on customer estimate
                  </label>
                </details>
                <button
                  type="button"
                  onClick={() =>
                    change({ areas: draft.areas.filter((x) => x.id !== a.id) })
                  }
                >
                  Remove area
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={draft.areas.length >= 20}
              onClick={() => change({ areas: [...draft.areas, newArea()] })}
            >
              + Treatment area
            </button>
          </section>
          <section className="panel">
            <h2>Product & application settings</h2>
            <p className="smart-alert">
              These starting values are planning examples, not manufacturer
              specifications. Enter current purchase prices, shipping,
              label-compatible application assumptions and productivity. No
              specialty product is assumed safe to mix with SH. Apply separately
              with appropriate rinsing and preparation.
            </p>
            {TREATMENTS.map((type) => {
              const p = c.products[type];
              return (
                <details key={type}>
                  <summary>
                    {type} — {p.name}
                  </summary>
                  <div className="smart-grid">
                    <label>
                      Product name
                      <input
                        value={p.name}
                        onChange={(e) =>
                          product(type, { name: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Label / product URL
                      <input
                        value={p.url}
                        onChange={(e) => product(type, { url: e.target.value })}
                      />
                    </label>
                    {(
                      [
                        "price",
                        "shipping",
                        "containerGal",
                        "coverage",
                        "productivity",
                        "dwellMinutes",
                        "coats",
                        ...(type === "organic"
                          ? []
                          : ["productParts", "waterParts"]),
                      ] as (keyof Product)[]
                    ).map((k) => (
                      <NumberField
                        key={k}
                        label={
                          (
                            {
                              price: "Container price $",
                              shipping: "Shipping per container $",
                              containerGal: "Container gallons",
                              coverage: "Sq ft / applied gallon / coat",
                              productivity: "Sq ft / crew clock hour",
                              dwellMinutes:
                                "Dwell / preparation minutes per application",
                              coats: "Coats",
                              productParts: "Product parts",
                              waterParts: "Water parts",
                            } as Record<string, string>
                          )[k]
                        }
                        value={p[k] as number | null}
                        nullable={k === "price" || k === "shipping"}
                        onChange={(n) => product(type, { [k]: n })}
                      />
                    ))}
                  </div>
                  <label>
                    <input
                      type="checkbox"
                      checked={p.productVerified}
                      onChange={(e) =>
                        product(type, { productVerified: e.target.checked })
                      }
                    />
                    I identified this exact product and verified its current
                    label.
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={p.assumptionsReviewed}
                      onChange={(e) =>
                        product(type, { assumptionsReviewed: e.target.checked })
                      }
                    />
                    I reviewed coverage, dilution, coats and labor assumptions
                    for this work.
                  </label>
                </details>
              );
            })}
            <details>
              <summary>Surface labor productivity factors</summary>
              <p>
                Multiply treatment productivity by these editable planning
                factors. Lower values allow more labor time for delicate or
                difficult materials.
              </p>
              <div className="smart-grid">
                {Object.entries(c.materialFactors).map(([material, factor]) => (
                  <NumberField
                    key={material}
                    label={material + " productivity multiplier"}
                    value={factor}
                    onChange={(n) =>
                      config({
                        materialFactors: {
                          ...c.materialFactors,
                          [material]: n ?? 0,
                        },
                      })
                    }
                  />
                ))}
              </div>
            </details>
            <details>
              <summary>Organic growth: SH strength & surfactant</summary>
              <div className="smart-grid">
                <NumberField
                  label="Sprayer / batch tank gallons"
                  value={c.tankGal}
                  onChange={(n) => config({ tankGal: n ?? 0 })}
                />
                <NumberField
                  label="Stock SH gallons on hand"
                  value={c.stockAvailableGal}
                  onChange={(n) => config({ stockAvailableGal: n ?? 0 })}
                />
                <NumberField
                  label="Stock SH %"
                  value={c.stockSH}
                  onChange={(n) => config({ stockSH: n ?? 0 })}
                />
                {MATERIALS.map((m) => (
                  <NumberField
                    key={m}
                    label={m + " applied SH % (0 = not approved)"}
                    value={c.targetSH[m] ?? 0}
                    onChange={(n) =>
                      config({ targetSH: { ...c.targetSH, [m]: n ?? 0 } })
                    }
                  />
                ))}
                <NumberField
                  label="Surfactant oz / finished gallon"
                  value={c.surfactantOzPerGal}
                  onChange={(n) => config({ surfactantOzPerGal: n ?? 0 })}
                />
                <NumberField
                  label="Surfactant landed cost $ / gallon"
                  value={c.surfactantPrice}
                  nullable
                  onChange={(n) => config({ surfactantPrice: n })}
                />
                <NumberField
                  label="Waste allowance %"
                  value={c.wastePercent}
                  onChange={(n) => config({ wastePercent: n ?? 0 })}
                />
              </div>
              <p>
                Quantities are for the applied solution, with surfactant volume
                included. Downstream use requires a measured injector draw
                ratio; this screen does not assume one.
              </p>
            </details>
          </section>
          <section className="panel">
            <h2>Job costs & profit</h2>
            <div className="smart-grid">
              {(
                [
                  "laborRate",
                  "crew",
                  "equipmentHourly",
                  "fuel",
                  "overheadHourly",
                  "setupMinutes",
                  "travelMinutes",
                  "minimum",
                  "margin",
                ] as const
              ).map((k) => (
                <NumberField
                  key={k}
                  label={
                    {
                      laborRate: "Labor $ / person-hour",
                      crew: "Crew count",
                      equipmentHourly: "Equipment $ / clock hour",
                      fuel: "Fuel / travel $ per job",
                      overheadHourly: "Overhead $ / clock hour",
                      setupMinutes: "Shared setup / cleanup minutes",
                      travelMinutes: "Shared travel minutes",
                      minimum: "Job minimum $",
                      margin: "Target operating margin %",
                    }[k]
                  }
                  value={c[k]}
                  nullable={[
                    "laborRate",
                    "equipmentHourly",
                    "fuel",
                    "overheadHourly",
                  ].includes(k)}
                  onChange={(n) => config({ [k]: n })}
                />
              ))}
            </div>
            <p>
              Planning defaults from the Power Clean truck-and-repair plan: equipment $8/hour (including repair and upgrade allowances), local job fuel $15, overhead $9.25/hour at 24 billable hours/month excluding advertising, 10% SH $15/gallon, and surfactant $35/gallon. These are not verified purchase costs; review receipts, actual bills, fuel usage, and the effect of advertising before checking costs reviewed. Labor uses the editable base rate: at $30/hour, light work is $25/hour, moderate is $30/hour, and heavy is $35/hour. Severity also estimates 1, 2, or 3 application passes respectively; verify actual passes and product coats against the job and label before approval. Price = operating cost ÷ (1 − margin). A 30% margin is a 42.86%
              markup. Shared costs and the job minimum apply once. No discounts
              are applied that could silently reduce your target margin.
            </p>
            <label>
              <input
                type="checkbox"
                checked={c.costsReviewed}
                onChange={(e) => config({ costsReviewed: e.target.checked })}
              />
              All job costs reviewed; any zero entries are intentional.
            </label>
            <label>
              Customer notes
              <textarea
                maxLength={2000}
                value={draft.notes}
                onChange={(e) => change({ notes: e.target.value })}
              />
            </label>
          </section>
        </fieldset>
        <section className="panel">
          <h2>Calculation & review</h2>
          {result?.error && <p role="alert">{result.error}</p>}
          {r && (
            <>
              <p>
                Clock hours: {r.hours.toFixed(2)} · Person-hours:{" "}
                {r.laborHours.toFixed(2)} · Shared job cost: {usd(r.sharedCost)}
              </p>
              <div className="smart-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Area</th>
                      <th>Applied / product / water gal</th>
                      <th>Passes</th>
                      <th>Surfactant oz</th>
                      <th>Hours</th>
                      <th>Chemicals</th>
                      <th>Customer amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.rows.map((x) => (
                      <tr key={x.key}>
                        <td>{x.description}</td>
                        <td>{x.area.toFixed(2)}</td>
                        <td>
                          {x.solutionGal.toFixed(3)} /{" "}
                          {x.concentrateGal.toFixed(3)} /{" "}
                          {x.waterGal.toFixed(3)}
                        </td>
                        <td>{x.passes}</td>
                        <td>{x.surfactantOz.toFixed(2)}</td>
                        <td>{x.hours.toFixed(2)}</td>
                        <td>{usd(x.chemicalCost)}</td>
                        <td>{usd(x.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Total chemicals {usd(r.chemicalCost)} · Solution {r.totalSolutionGal.toFixed(2)} gal · Operating cost {usd(r.cost)} · Operating profit {usd(r.profit)}{" "}
                · Margin {r.margin.toFixed(2)}% · Markup {r.markup.toFixed(2)}%
              </p>
              <p className="smart-total">
                {r.errors.length ? "Provisional total" : "Customer total"}:{" "}
                {usd(r.total)}
              </p>
              {r.errors.length > 0 && (
                <div role="alert" className="smart-alert">
                  <strong>Resolve before finalizing or exporting</strong>
                  <ul>
                    {r.errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
              <details>
                <summary>Batch mixing quantities</summary>
                <p>
                  Each treatment is a separate application. Quantities below
                  describe the finished applied mix. Do not combine leftover
                  chemicals.
                </p>
                {r.rows.map((x) => {
                  const full = Math.min(c.tankGal, x.solutionGal),
                    scale = x.solutionGal ? full / x.solutionGal : 0;
                  return (
                    <p key={x.key}>
                      {x.description}: {Math.ceil(x.solutionGal / c.tankGal)}{" "}
                      batch(es), up to {full.toFixed(3)} gal each. First batch:{" "}
                      {(x.concentrateGal * scale).toFixed(3)} gal product +{" "}
                      {(x.waterGal * scale).toFixed(3)} gal water +{" "}
                      {(x.surfactantOz * scale).toFixed(2)} oz surfactant. Scale
                      the final partial batch to the remaining volume.
                    </p>
                  );
                })}
              </details>
              <details>
                <summary>Application cautions</summary>
                {r.warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
              </details>
            </>
          )}
          {r && (() => {
            const g = growthProjection(growth, r.total);
            const edit = (key: keyof typeof growth, value: number) => setGrowth((old) => ({ ...old, [key]: value }));
            return (
              <details className="smart-growth" open>
                <summary>Business Growth Planner — internal only</summary>
                <p>Planning scenario, not a customer quote adjustment. The $483/job target in your plan assumes 12 jobs/month, $64/job operating costs, and a 25% modeled tax reserve. Actual operating costs and taxes may differ.</p>
                <div className="smart-flex">
                  <NumberField label="Paid jobs per month" value={growth.jobsPerMonth} min={1} onChange={(v) => edit("jobsPerMonth", Math.max(1, v ?? 1))} />
                  <NumberField label="Modeled operating cost per job ($)" value={growth.operatingCostPerJob} onChange={(v) => edit("operatingCostPerJob", v ?? 0)} />
                  <NumberField label="Owner take-home after tax / month ($)" value={growth.takeHomeAfterTax} onChange={(v) => edit("takeHomeAfterTax", v ?? 0)} />
                  <NumberField label="Equipment savings / month ($)" value={growth.equipmentMonthly} onChange={(v) => edit("equipmentMonthly", v ?? 0)} />
                  <NumberField label="Truck savings / month ($)" value={growth.truckMonthly} onChange={(v) => edit("truckMonthly", v ?? 0)} />
                  <NumberField label="Repair savings / month ($)" value={growth.repairsMonthly} onChange={(v) => edit("repairsMonthly", v ?? 0)} />
                  <NumberField label="Tax reserve (%)" value={growth.taxRate * 100} max={95} onChange={(v) => edit("taxRate", Math.max(0, Math.min(0.95, (v ?? 0) / 100)))} />
                </div>
                <p><strong>Required average sale: {usd(g.targetPerJob)} per job</strong> · Monthly revenue target: {usd(g.targetMonthlyRevenue)}</p>
                <p>At this estimate&apos;s price ({usd(r.total)}), modeled monthly revenue: {usd(g.monthlyRevenue)} · Cash available for owner after modeled costs, taxes and growth transfers: {usd(g.availableTakeHome)} · Revenue shortfall: {usd(g.monthlyShortfall)}</p>
                <p>Six-month savings at these transfer amounts: equipment {usd(g.sixMonthEquipment)} (target $5,000; {g.monthsToEquipment ?? "not funded"} months), truck {usd(g.sixMonthTruck)} (target $4,000; {g.monthsToTruck ?? "not funded"} months), and repair reserve {usd(g.sixMonthRepairs)} (target $1,500; {g.monthsToRepairReserve ?? "not funded"} months). Assumes $0 starting balances and no withdrawals. Trailer cost and ongoing truck payments are not included.</p>
                <p>Equipment and repair allowances already inside operating costs must not be added a second time. These goals are planning targets only; they do not override the estimate&apos;s minimum or operating-margin formula. This scenario uses the entered monthly job count and assumes every job sells at this estimate&apos;s price.</p>
              </details>
            );
          })()}
          <div className="smart-flex">
            <button
              type="button"
              disabled={
                busy || locked || !draft.customerId || Boolean(result?.error)
              }
              onClick={() => perform()}
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={
                busy ||
                locked ||
                !draft.customerId ||
                !draft.serviceAddressId ||
                !r ||
                Boolean(r.errors.length)
              }
              onClick={() => perform(true)}
            >
              Finalize customer estimate
            </button>
            <button
              type="button"
              disabled={
                !r ||
                Boolean(r.errors.length) ||
                !draft.customerId ||
                !draft.serviceAddressId
              }
              onClick={() => window.print()}
            >
              Export branded PDF / print
            </button>
          </div>
          {message && <p role="status">{message}</p>}
          {savedEstimate && (
            <p>
              <Link href={"/estimates/view?id=" + savedEstimate}>
                Open saved estimate
              </Link>{" "}
              ·{" "}
              <Link href={"/estimates/smart/pdf?id=" + draftId}>
                Download saved PDF
              </Link>
              {" · "}
              <Link href={"/estimates/smart?draft=" + draftId + "&revise=1"}>
                Revise estimate
              </Link>
            </p>
          )}
        </section>
      </div>
      {r && !r.errors.length && (
        <article className="customer-print">
          <img
            src={POWER_CLEAN_LOGO}
            alt="Power Clean"
            style={{ maxWidth: 330 }}
          />
          <h1>Power Clean Estimate</h1>
          <p>{customers.find((x) => x.id === draft.customerId)?.name}</p>
          <p>
            {addressOptions.find((x) => x.id === draft.serviceAddressId)?.address}
          </p>
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((x) => (
                <tr key={x.key}>
                  <td>
                    {x.description}
                    {x.showDimensions && (
                      <p>
                        {x.dimensions} · {x.area.toFixed(2)} sq ft
                      </p>
                    )}
                  </td>
                  <td>{usd(x.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2>Total: {usd(r.total)}</h2>
          <p>{draft.notes}</p>
          <footer>Stacston Carter — Owner, Power Clean</footer>
        </article>
      )}
    </main>
  );
}
