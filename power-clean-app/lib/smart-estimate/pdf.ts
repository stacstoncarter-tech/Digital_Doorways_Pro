import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { calculate, type Draft } from "./engine";
export async function estimatePdf(
  d: Draft,
  customer: string,
  address: string,
  reference: string,
  logo: Uint8Array,
) {
  const r = calculate(d);
  if (r.errors.length) throw Error("Estimate has unresolved validation.");
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica),
    bold = await pdf.embedFont(StandardFonts.HelveticaBold),
    image = await pdf.embedPng(logo);
  pdf.setTitle("Power Clean Estimate");
  pdf.setAuthor("Power Clean Solutions LLC");
  let page = pdf.addPage([612, 792]),
    y = 660;
  function header() {
    page.drawImage(image, { x: 40, y: 700, width: 245, height: 73.5 });
    page.drawText("ESTIMATE", {
      x: 410,
      y: 728,
      size: 20,
      font: bold,
      color: rgb(0, 0.35, 0.64),
    });
    page.drawLine({
      start: { x: 40, y: 692 },
      end: { x: 572, y: 692 },
      thickness: 2,
      color: rgb(0, 0.4, 0.7),
    });
  }
  const safe = (s: string) => s.replace(/[^\x20-\x7e]/g, " ");
  function line(text: string, size = 11, strong = false) {
    if (y < 65) {
      page = pdf.addPage([612, 792]);
      header();
      y = 665;
    }
    page.drawText(safe(text), { x: 42, y, size, font: strong ? bold : normal });
    y -= size + 7;
  }
  function wrap(s: string, width = 85) {
    const words = safe(s).split(/\s+/);
    let row = "";
    for (const word of words) {
      if ((row + " " + word).length > width) {
        line(row);
        row = word;
      } else row += (row ? " " : "") + word;
    }
    if (row) line(row);
  }
  const usd = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  header();
  line("Prepared for: " + customer, 12, true);
  wrap("Service address: " + address);
  line("Reference: " + reference, 9);
  y -= 16;
  for (const x of r.rows) {
    wrap(x.description);
    if (x.showDimensions)
      wrap(x.dimensions + " | " + x.area.toFixed(2) + " sq ft");
    line("Amount: " + usd(x.price), 12, true);
    y -= 8;
  }
  line("TOTAL: " + usd(r.total), 18, true);
  y -= 12;
  if (d.notes) {
    line("Notes", 12, true);
    wrap(d.notes);
  }
  y -= 14;
  line("Stacston Carter - Owner, Power Clean", 11, true);
  return pdf.save();
}
