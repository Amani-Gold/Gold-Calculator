// Unit tests: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const N = require("../assets/num.js");
const E = require("../assets/gcc-engine.js");
const { COUNTRIES, byId } = require("../assets/gcc-config.js");

test("Arabic, Persian and mixed digits normalise to the same number", () => {
  const cases = [
    ["٢٥", 25], ["٢٥٫٥", 25.5], ["٢٥.٥", 25.5], ["۲۵٫۵", 25.5], ["٢5٫٥", 25.5],
    ["١٬٢٥٠٫٥", 1250.5], ["1,250.5", 1250.5], ["25", 25], ["0.75", 0.75], [".5", 0.5],
    ["  ١٠  ", 10], ["١٠٠٠٠٠٠", 1000000], ["۱,۲۵۰.۵", 1250.5], ["٣٠.", 30],
  ];
  for (const [input, expected] of cases) {
    const r = N.parseAmount(input);
    assert.equal(r.valid, true, `${input} should be valid`);
    assert.equal(r.value, expected, `${input} → ${expected}`);
  }
});

test("malformed or ambiguous numbers are rejected, empty is not an error", () => {
  for (const bad of ["12,5", "1,25", "1.2.3", "1 250", "abc", "-5", "1e3", "٢٥،٥", "1,2,3", "٫", "Infinity", "--1"]) {
    const r = N.parseAmount(bad);
    assert.equal(r.valid, false, `${bad} should be rejected`);
    assert.ok(Number.isNaN(r.value));
  }
  assert.deepEqual(N.parseAmount(""), { empty: true, valid: false, value: NaN });
  assert.equal(N.parseAmount("   ").empty, true);
});

// Synthetic fixture: 10 g, gold 30/g, making 2/g → gold 300, making 20, subtotal 320.
const FIXTURE = {
  bh: { vat: 10, vatAmount: "32.000", final: "352.000" },
  ksa: { vat: 15, vatAmount: "48.00", final: "368.00" },
  uae: { vat: 5, vatAmount: "16.00", final: "336.00" },
  kw: { vat: 0, vatAmount: "0.000", final: "320.000" },
  qatar: { vat: 0, vatAmount: "0.00", final: "320.00" },
  oman: { vat: 5, vatAmount: "16.000", final: "336.000" },
};

test("country configuration matches the expected currencies, VAT and precision", () => {
  const expect = { bh: ["BHD", 3], ksa: ["SAR", 2], uae: ["AED", 2], kw: ["KWD", 3], qatar: ["QAR", 2], oman: ["OMR", 3] };
  assert.equal(COUNTRIES.length, 6);
  for (const [id, [cur, d]] of Object.entries(expect)) {
    assert.equal(byId[id].currency, cur); assert.equal(byId[id].decimals, d);
  }
  for (const id of ["ksa", "uae", "oman"]) assert.equal(byId[id].vat.status, "implemented");
  assert.equal(byId.ksa.vat.rate, 15); assert.equal(byId.uae.vat.rate, 5); assert.equal(byId.oman.vat.rate, 5);
  for (const id of ["kw", "qatar"]) { assert.equal(byId[id].vat.status, "not_implemented"); assert.equal(byId[id].vat.rate, 0); }
});

test("final price for every country (English, Arabic, Persian and mixed digits)", () => {
  const digitSets = [["10", "30", "2"], ["١٠", "٣٠", "٢"], ["۱۰", "۳۰", "۲"], ["1٠", "٣0", "۲"]];
  for (const [id, f] of Object.entries(FIXTURE)) {
    const d = byId[id].decimals;
    const vatPercent = id === "bh" ? 10 : byId[id].vat.rate;
    for (const [w, p, m] of digitSets) {
      const r = E.finalPrice({ weight: N.parseAmount(w).value, pricePerGram: N.parseAmount(p).value, makingPerGram: N.parseAmount(m).value, vatPercent });
      assert.equal(E.format(r.gold, d), E.format(300, d));
      assert.equal(E.format(r.making, d), E.format(20, d));
      assert.equal(E.format(r.subtotal, d), E.format(320, d));
      assert.equal(E.format(r.vat, d), f.vatAmount, `${id} VAT`);
      assert.equal(E.format(r.final, d), f.final, `${id} final`);
    }
  }
});

test("reverse calculation recovers the 2/g making charge; no VAT is removed where there is none", () => {
  for (const [id, f] of Object.entries(FIXTURE)) {
    const vatPercent = id === "bh" ? 10 : byId[id].vat.rate;
    const r = E.makingFromFinal({ final: Number(f.final), weight: 10, pricePerGram: 30, vatPercent });
    assert.ok(Math.abs(r.makingPerGram - 2) < 1e-9, `${id}: ${r.makingPerGram}`);
    assert.ok(Math.abs(r.beforeVat - 320) < 1e-9);
    if (vatPercent === 0) assert.equal(r.vat, 0);
  }
});

test("without VAT the final price equals the subtotal", () => {
  const r = E.finalPrice({ weight: 10, pricePerGram: 30, makingPerGram: 2, vatPercent: 0 });
  assert.equal(r.final, 320); assert.equal(r.vat, 0);
});

test("invalid inputs give no result instead of NaN or Infinity", () => {
  assert.equal(E.finalPrice({ weight: 0, pricePerGram: 30, makingPerGram: 2, vatPercent: 15 }), null);
  assert.equal(E.finalPrice({ weight: NaN, pricePerGram: 30, makingPerGram: 2, vatPercent: 15 }), null);
  assert.equal(E.finalPrice({ weight: 10, pricePerGram: 0, makingPerGram: 2, vatPercent: 15 }), null);
  assert.equal(E.finalPrice({ weight: 10, pricePerGram: 30, makingPerGram: -1, vatPercent: 15 }), null);
  assert.equal(E.makingFromFinal({ final: 368, weight: 0, pricePerGram: 30, vatPercent: 15 }), null);
  assert.equal(E.makingFromFinal({ final: Infinity, weight: 10, pricePerGram: 30, vatPercent: 15 }), null);
  assert.equal(E.format(NaN, 2), "—");
});

test("rounding is decimal-safe and only applied for display", () => {
  assert.equal(E.round(1.005, 2), 1.01);
  assert.equal(E.round(1.0005, 3), 1.001);
  assert.equal(E.format(1234.5, 3), "1,234.500");
  const r = E.finalPrice({ weight: 3.333, pricePerGram: 41.29, makingPerGram: 1.1, vatPercent: 15 });
  assert.equal(E.format(r.final, 2), E.format((3.333 * 41.29 + 3.333 * 1.1) * 1.15, 2));
});

test("reference karat price = spot ÷ 31.1034768 × FX × purity + local adjustment", () => {
  const p24 = E.karatPrice(3110.34768, 3.75, 24, 0);
  assert.ok(Math.abs(p24 - 375) < 1e-9);
  assert.ok(Math.abs(E.karatPrice(3110.34768, 3.75, 21, 0) - 375 * 21 / 24) < 1e-9);
  assert.ok(Math.abs(E.karatPrice(3110.34768, 3.75, 24, 2) - 377) < 1e-9);
  assert.ok(Number.isNaN(E.karatPrice(0, 3.75, 24, 0)));
});
