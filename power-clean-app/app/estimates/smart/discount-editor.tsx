import { DISCOUNT_CATEGORIES, type Discount } from "@/lib/smart-estimate/discounts";
import { TREATMENTS, type Area } from "@/lib/smart-estimate/engine";

type Props = {
  entries: Discount[];
  areas: Area[];
  overrideReason: string;
  belowMinimum: boolean;
  canOverride: boolean;
  disabled: boolean;
  onChange: (entries: Discount[]) => void;
  onOverride: (reason: string) => void;
};

export default function DiscountEditor({
  entries, areas, overrideReason, belowMinimum, canOverride, disabled, onChange, onOverride,
}: Props) {
  const services = areas.flatMap(area => area.kind==="window" ? [{key:area.id+":window",label:area.name+" · Window cleaning"}] : area.treatments
    .filter(treatment => TREATMENTS.includes(treatment.type))
    .map(treatment => ({ key: area.id + ":" + treatment.type, label: area.name + " · " + treatment.type })));
  return (
    <fieldset disabled={disabled}>
      <legend>Discounts &amp; Promotions</legend>
      <p>Service discounts apply first. Each percentage uses the price remaining after earlier discounts. Confirm customer eligibility before applying a promotion.</p>
      {entries.map((entry, index) => {
        const update = (patch: Partial<Discount>) =>
          onChange(entries.map(discount => discount.id === entry.id ? { ...discount, ...patch } : discount));
        return (
          <fieldset key={entry.id}>
            <legend>Discount {index + 1}</legend>
            <div className="smart-grid">
              <label>Promotion
                <select value={entry.category} onChange={e => update({ category: e.target.value as Discount["category"] })}>
                  {Object.entries(DISCOUNT_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </label>
              <label>Applies to
                <select value={entry.serviceKey ?? ""} onChange={e => update({ serviceKey: e.target.value || null })}>
                  <option value="">Entire estimate</option>
                  {entry.serviceKey && !services.some(service => service.key === entry.serviceKey) &&
                    <option value={entry.serviceKey}>Service removed. Select a replacement.</option>}
                  {services.map(service => <option value={service.key} key={service.key}>{service.label}</option>)}
                </select>
              </label>
              <label>Discount type
                <select value={entry.method} onChange={e => update({ method: e.target.value as Discount["method"], value: 0 })}>
                  <option value="percent">Percentage</option>
                  <option value="fixed">Fixed dollar amount</option>
                </select>
              </label>
              <label>{entry.method === "percent" ? "Discount (%)" : "Discount ($)"}
                <input type="number" min={0} max={entry.method === "percent" ? 100 : 10000000} step="0.01"
                  value={entry.value || ""} onChange={e => update({ value: Number(e.target.value) })} />
              </label>
              <label>Internal reason
                <input maxLength={250} value={entry.reason} onChange={e => update({ reason: e.target.value })} />
              </label>
            </div>
            <button type="button" onClick={() => onChange(entries.filter(discount => discount.id !== entry.id))}>Remove discount</button>
          </fieldset>
        );
      })}
      {entries.length < 20 && <button type="button" onClick={() => onChange([...entries, {
        id: crypto.randomUUID(), category: "custom", method: "percent", value: 0, serviceKey: null, reason: "",
      }])}>Add discount</button>}
      {belowMinimum && canOverride &&
        <label>Authorize below-minimum pricing (internal reason required)
          <input maxLength={250} value={overrideReason} onChange={e => onOverride(e.target.value)} />
        </label>}
    </fieldset>
  );
}
