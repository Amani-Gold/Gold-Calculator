/*
 * Number input normalisation shared by every calculator page.
 * Accepts Western (0-9), Arabic-Indic (٠-٩) and Persian (۰-۹) digits, mixed together,
 * the Arabic decimal separator ٫ and thousands separator ٬, an English "." decimal point and
 * "," thousands separators in groups of three (1,250.5).
 * Anything ambiguous or malformed (e.g. "12,5", "1.2.3", "1 250") is rejected rather than
 * guessed, so a calculation never runs on a value the user did not mean.
 */
(function (root) {
  "use strict";

  var ARABIC_ZERO = 0x0660, PERSIAN_ZERO = 0x06f0;

  function normalizeDigits(text) {
    return String(text)
      .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - ARABIC_ZERO); })
      .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - PERSIAN_ZERO); });
  }

  // Returns { empty, valid, value }. value is a finite number only when valid.
  function parseAmount(raw) {
    var s = raw == null ? "" : String(raw).trim();
    if (!s) return { empty: true, valid: false, value: NaN };
    s = normalizeDigits(s)
      .replace(/٫/g, ".")   // ٫ Arabic decimal separator
      .replace(/٬/g, ",");  // ٬ Arabic thousands separator
    // Thousands separators are only accepted in proper groups of three.
    if (/^\d{1,3}(,\d{3})+(\.\d*)?$/.test(s)) s = s.replace(/,/g, "");
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(s)) return { empty: false, valid: false, value: NaN };
    var value = parseFloat(s);
    if (!isFinite(value)) return { empty: false, valid: false, value: NaN };
    return { empty: false, valid: true, value: value };
  }

  // Reads an <input>, flags it when the text is not a valid number, and returns the
  // number (NaN when empty or invalid) — a drop-in for parseFloat(input.value).
  function readInput(input) {
    var r = parseAmount(input.value);
    var bad = !r.empty && !r.valid;
    input.classList.toggle("invalid", bad);
    if (bad) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
    return r.value;
  }

  var api = { normalizeDigits: normalizeDigits, parseAmount: parseAmount, readInput: readInput };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AmaniNum = api;
})(this);
