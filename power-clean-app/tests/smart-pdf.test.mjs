import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { defaults, newArea } from "../lib/smart-estimate/engine.ts";
// TS source imports use extensionless bundler resolution; transform only the import for Node.
const source = readFileSync(
  new URL("../lib/smart-estimate/pdf.ts", import.meta.url),
  "utf8",
).replace(/from ["']\.\/engine["']/, 'from "./engine.ts"');
import { stripTypeScriptTypes } from "node:module";
import { writeFile, unlink } from "node:fs/promises";
test("branded PDF handles pagination and includes embedded logo", async () => {
  const file = new URL("../lib/smart-estimate/.pdf-test.mjs", import.meta.url);
  await writeFile(file, stripTypeScriptTypes(source));
  try {
    const { estimatePdf } = await import(file.href);
    const config = defaults();
    Object.assign(config, {
      laborRate: 30,
      equipmentHourly: 10,
      fuel: 20,
      overheadHourly: 5,
      costsReviewed: true,
    });
    Object.assign(config.products.organic, {
      price: 30,
      shipping: 0,
      productVerified: true,
      assumptionsReviewed: true,
    });
    const areas = Array.from({ length: 20 }, () => {
      const a = newArea();
      a.length.ft = 20;
      a.width.ft = 30;
      a.showDimensions = true;
      return a;
    });
    const d = {
      version: 1,
      customerId: "test",
      serviceAddressId: "test",
      notes: "Test notes",
      config,
      areas,
    };
    const bytes = await estimatePdf(
      d,
      "Disposable Test Customer",
      "123 Test Street",
      "TEST ONLY",
      readFileSync(
        new URL("../public/power-clean-estimate-logo.png", import.meta.url),
      ),
    );
    const pdf = await PDFDocument.load(bytes);
    assert.ok(pdf.getPageCount() > 1);
    assert.equal(pdf.getTitle(), "Power Clean Estimate");
    assert.ok(bytes.length > 1000);
  } finally {
    await unlink(file);
  }
});
