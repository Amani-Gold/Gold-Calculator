/*
 * Calculation engine for the international (GCC) calculators.
 * The Bahrain calculator at "/" keeps its own original formulas and does not use this file.
 *
 *   Gold value       = weight × gold price per gram
 *   Making charges   = weight × making charge per gram
 *   Subtotal         = gold value + making charges
 *   VAT              = subtotal × VAT rate          (0 where VAT is off or not implemented)
 *   Final price      = subtotal + VAT
 * Reverse (making charge from a final price):
 *   Price before VAT = final ÷ (1 + VAT rate)
 *   Making / gram    = (price before VAT − weight × gold price) ÷ weight
 *
 * Full precision is kept internally; rounding happens only for display (round()/format()).
 */
(function (root) {
  "use strict";

  var GRAMS_PER_TROY_OUNCE = 31.1034768;

  var isNum = function (n) { return typeof n === "number" && isFinite(n); };

  // Decimal-safe half-up rounding to d places (avoids 1.005 → 1.00 binary-float errors).
  function round(x, d) {
    if (!isNum(x)) return NaN;
    var sign = x < 0 ? -1 : 1;
    return sign * Number(Math.round(Number(Math.abs(x) + "e" + d)) + "e-" + d);
  }

  function format(x, d) {
    if (!isNum(x)) return "—";
    return round(x, d).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  // Reference price per gram in local currency for a karat (24, 22, 21, 18 …).
  function karatPrice(spotUsdPerOz, unitsPerUsd, karat, adjustmentPerGram) {
    if (!(spotUsdPerOz > 0) || !(unitsPerUsd > 0) || !(karat > 0)) return NaN;
    return (spotUsdPerOz / GRAMS_PER_TROY_OUNCE) * unitsPerUsd * (karat / 24) + (adjustmentPerGram || 0);
  }

  function rateFraction(vatPercent) {
    return isNum(vatPercent) && vatPercent > 0 ? vatPercent / 100 : 0;
  }

  // Returns null when the inputs cannot give a meaningful result.
  function finalPrice(o) {
    var w = o.weight, m = o.makingPerGram, p = o.pricePerGram, v = rateFraction(o.vatPercent);
    if (!(isNum(w) && w > 0) || !(isNum(m) && m >= 0) || !(isNum(p) && p > 0)) return null;
    var gold = w * p, making = w * m, subtotal = gold + making, vat = subtotal * v;
    return { gold: gold, making: making, subtotal: subtotal, vat: vat, final: subtotal + vat };
  }

  function makingFromFinal(o) {
    var total = o.final, w = o.weight, p = o.pricePerGram, v = rateFraction(o.vatPercent);
    if (!(isNum(total) && total > 0) || !(isNum(w) && w > 0) || !(isNum(p) && p > 0)) return null;
    var beforeVat = total / (1 + v), gold = w * p, makingTotal = beforeVat - gold;
    return { beforeVat: beforeVat, vat: total - beforeVat, gold: gold, makingTotal: makingTotal, makingPerGram: makingTotal / w };
  }

  var api = {
    GRAMS_PER_TROY_OUNCE: GRAMS_PER_TROY_OUNCE,
    round: round, format: format, karatPrice: karatPrice, finalPrice: finalPrice, makingFromFinal: makingFromFinal,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AmaniGCCEngine = api;
})(this);
