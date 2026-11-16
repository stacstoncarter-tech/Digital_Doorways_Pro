import type { PublicDiscount } from "@/lib/smart-estimate/discounts";

const money = (value: number) =>
  Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function DiscountBreakdown({ details = [], total }: {
  details?: PublicDiscount[];
  total: number;
}) {
  return <>
    {details.length > 0 && <ul aria-label="Discount breakdown">
      {details.map((detail, index) => <li key={index}>{detail.label} &minus;{money(detail.amount)}</li>)}
    </ul>}
    <p>{details.length ? "Total discounts" : "Discount"}: {total > 0 ? "−" : ""}{money(total)}</p>
  </>;
}
