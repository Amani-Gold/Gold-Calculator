/*
 * International calculator page (/ksa, /uae, /kw, /qatar, /oman).
 * The country comes from <body data-country="…">, which each page's URL serves, so a shared
 * or directly opened link always loads that country's currency, prices and VAT.
 * Needs: num.js, gcc-config.js, gcc-engine.js.
 */
(function () {
  "use strict";
  var C = AmaniGCC.byId[document.body.getAttribute("data-country")];
  var E = AmaniGCCEngine;
  if (!C || C.original) return;

  var hasVat = C.vat.status === "implemented" && C.vat.rate > 0;
  var D = C.decimals;
  var KARATS = ["24K", "22K", "21K", "18K"];

  // ─── Per-country saved settings (never shared with Bahrain or other countries) ───
  var KEY = "amani-gold:" + C.id + ":";
  function load(name, fallback) { try { var v = JSON.parse(localStorage.getItem(KEY + name)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function save(name, value) { try { localStorage.setItem(KEY + name, JSON.stringify(value)); } catch (e) {} }
  var settings = load("settings", {});
  var withVat = hasVat && settings.withVat !== false; // with VAT by default, like Bahrain
  var vatPct = function () { return withVat ? C.vat.rate : 0; };

  var T = {
    ar: {
      brand: 'د. أماني للذهب<span>حاسبة الذهب</span>', switchTo: "English",
      tag: "أدوات الذهب", title: "حاسبة الذهب " + C.nameInAr,
      sub: "احسبي السعر النهائي للقطعة، أو استخرجي المصنعية من سعر نهائي. جميع الأسعار ب" + C.currencyAr + " (" + C.currency + ").",
      tab1: "حساب السعر النهائي", tab2: "استخراج المصنعية",
      weight: "الوزن (غرام)", manuPerGram: "المصنعية لكل غرام (" + C.symbolAr + ")", goldPrice: "سعر الذهب اليوم للغرام (" + C.symbolAr + ")",
      finalPrice: "السعر النهائي (" + C.symbolAr + ")",
      noVat: "بدون ضريبة", vat: "ضريبة القيمة المضافة (" + C.vat.rate + "٪)", final: "السعر النهائي",
      goldOnly: "سعر الذهب بدون مصنعية", manuResult: "المصنعية لكل غرام", unit: C.symbolAr,
      copy: "نسخ", copied: "تم النسخ ✓", reset: "مسح",
      note: "الحسابات تقديرية — السعر النهائي يؤكده المحل.",
      by: "إعداد:", shop: "تسوّقي من متجر د. أماني للذهب ←",
      vatOn: "شامل الضريبة " + C.vat.rate + "٪", vatOff: "بدون ضريبة",
      vatNone: "ضريبة القيمة المضافة غير مطبقة حالياً في " + C.nameAr + ".",
      vatInfo: "ضريبة القيمة المضافة في " + C.nameAr + ": " + C.vat.rate + "٪ على سعر القطعة كاملاً (الذهب + المصنعية).",
      copyFinal: function (v) { return "السعر النهائي: " + v + " " + C.currency + (hasVat ? (withVat ? " (شامل الضريبة " + C.vat.rate + "٪)" : " (بدون ضريبة)") : ""); },
      copyManu: function (v) { return "المصنعية لكل غرام: " + v + " " + C.currency; },
      ratesTitle: "سعر الذهب اليوم للغرام",
      ratesHint: "اضغطي على العيار لإضافة سعره للحاسبة — ويمكنك تعديله لأن الأسعار تختلف بين المحلات",
      ratesRef: function (spot, fx, t) { return "سعر مرجعي: سعر الذهب العالمي " + spot + " دولار للأونصة × سعر الصرف " + fx + " · آخر تحديث " + t + " · أسعار المحلات تشمل علاوة محلية وتختلف"; },
      ratesStale: function (t) { return "تعذّر تحميل السعر المباشر — هذا آخر سعر تم التحقق منه بتاريخ " + t; },
      ratesDown: "تعذّر تحميل السعر المباشر — أدخلي السعر يدوياً",
    },
    en: {
      brand: 'Dr. Amani Gold<span>Gold Calculator</span>', switchTo: "عربي",
      tag: "Gold Tools", title: "Gold Calculator " + C.nameInEn,
      sub: "Work out a piece's final price, or extract the making charge from a final price. All prices in " + C.currencyEn + " (" + C.currency + ").",
      tab1: "Final Price", tab2: "Making Charge",
      weight: "Weight (g)", manuPerGram: "Making charge / gram (" + C.currency + ")", goldPrice: "Gold price today / gram (" + C.currency + ")",
      finalPrice: "Final price (" + C.currency + ")",
      noVat: "Before VAT", vat: "VAT (" + C.vat.rate + "%)", final: "Final Price",
      goldOnly: "Gold value (no making charge)", manuResult: "Making charge / gram", unit: C.currency,
      copy: "Copy", copied: "Copied ✓", reset: "Reset",
      note: "Estimates only — the final price is confirmed by the shop.",
      by: "By", shop: "Shop at Dr. Amani Gold →",
      vatOn: "With " + C.vat.rate + "% VAT", vatOff: "Without VAT",
      vatNone: "VAT is currently not implemented in " + C.nameEn + ".",
      vatInfo: "VAT " + C.nameInEn + ": " + C.vat.rate + "% on the full price of the piece (gold + making charge).",
      copyFinal: function (v) { return "Final price: " + v + " " + C.currency + (hasVat ? (withVat ? " (incl. " + C.vat.rate + "% VAT)" : " (excl. VAT)") : ""); },
      copyManu: function (v) { return "Making charge per gram: " + v + " " + C.currency; },
      ratesTitle: "Today's gold price per gram",
      ratesHint: "Tap a karat to use its price in the calculator — you can still edit it, as prices differ between shops",
      ratesRef: function (spot, fx, t) { return "Reference price: international gold $" + spot + "/oz × exchange rate " + fx + " · updated " + t + " · shop prices include a local premium and differ"; },
      ratesStale: function (t) { return "Live price unavailable — showing the last verified price from " + t; },
      ratesDown: "Live price unavailable — enter the price manually",
    },
  };

  var $ = function (id) { return document.getElementById(id); };
  var root = document.documentElement;
  var lang = root.lang === "en" ? "en" : "ar";
  var t = function () { return T[lang]; };

  // ─── Language & theme (same preferences as the Bahrain page) ───
  function applyLang() {
    root.lang = lang;
    root.dir = lang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-t]").forEach(function (el) {
      var v = t()[el.dataset.t];
      if (typeof v === "string") el.innerHTML = v;
    });
    $("langBtn").textContent = t().switchTo;
    renderVat(); renderRates();
  }
  $("langBtn").addEventListener("click", function () {
    lang = lang === "ar" ? "en" : "ar";
    try { localStorage.setItem("dramani-lang", lang); } catch (e) {}
    applyLang();
  });
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var syncThemeMeta = function () { themeMeta.content = root.dataset.theme === "dark" ? "#0A0A0A" : "#FAF7F0"; };
  $("themeBtn").addEventListener("click", function () {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("dramani-theme", root.dataset.theme); } catch (e) {}
    syncThemeMeta();
  });
  syncThemeMeta();

  // ─── Tabs ───
  document.querySelectorAll(".tab").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (b) { b.classList.toggle("active", b === btn); });
      document.querySelectorAll(".panel").forEach(function (p) { p.classList.toggle("active", p.id === "tab" + btn.dataset.tab); });
      renderRates();
    });
  });

  // ─── VAT setting (per country) ───
  function renderVat() {
    var box = $("vatMode"), none = $("vatNone");
    if (!hasVat) {
      box.hidden = true; none.hidden = false; none.textContent = t().vatNone;
    } else {
      box.hidden = false; none.hidden = false; none.textContent = t().vatInfo;
      $("vatOn").classList.toggle("active", withVat); $("vatOff").classList.toggle("active", !withVat);
      $("vatOn").setAttribute("aria-pressed", String(withVat)); $("vatOff").setAttribute("aria-pressed", String(!withVat));
    }
    document.querySelectorAll(".vat-only").forEach(function (el) { el.classList.toggle("hidden", !(hasVat && withVat)); });
  }
  function setVat(on) { withVat = on; settings.withVat = on; save("settings", settings); renderVat(); calc1(); calc2(); }
  $("vatOn").addEventListener("click", function () { setVat(true); });
  $("vatOff").addEventListener("click", function () { setVat(false); });

  // ─── Calculations ───
  var val = function (id) { return AmaniNum.readInput($(id)); };
  var show = function (id, n) { $(id).textContent = E.format(n, D); };
  var clear = function (ids) { ids.forEach(function (id) { $(id).textContent = "—"; }); };

  function calc1() {
    var r = E.finalPrice({ weight: val("g1"), makingPerGram: val("m1"), pricePerGram: val("p1"), vatPercent: vatPct() });
    if (!r) return clear(["noVat1", "vat1", "final1"]);
    show("noVat1", r.subtotal); show("vat1", r.vat); show("final1", r.final);
  }
  function calc2() {
    var r = E.makingFromFinal({ final: val("final2"), weight: val("g2"), pricePerGram: val("p2"), vatPercent: vatPct() });
    if (!r) return clear(["noVat2", "goldNoManu2", "manu2"]);
    show("noVat2", r.beforeVat); show("goldNoManu2", r.gold); show("manu2", r.makingPerGram);
  }
  ["g1", "m1", "p1"].forEach(function (id) { $(id).addEventListener("input", calc1); });
  ["final2", "g2", "p2"].forEach(function (id) { $(id).addEventListener("input", calc2); });
  $("reset1").addEventListener("click", function () { ["g1", "m1", "p1"].forEach(function (id) { $(id).value = ""; }); picked[1] = null; calc1(); renderRates(); });
  $("reset2").addEventListener("click", function () { ["final2", "g2", "p2"].forEach(function (id) { $(id).value = ""; }); picked[2] = null; calc2(); renderRates(); });

  function copy(btn, text) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(function () {
      btn.textContent = t().copied;
      setTimeout(function () { btn.textContent = t().copy; }, 1500);
    }).catch(function () {});
  }
  $("copy1").addEventListener("click", function (e) { if ($("final1").textContent !== "—") copy(e.currentTarget, t().copyFinal($("final1").textContent)); });
  $("copy2").addEventListener("click", function (e) { if ($("manu2").textContent !== "—") copy(e.currentTarget, t().copyManu($("manu2").textContent)); });

  // ─── Live reference prices in this country's currency ───
  var data = null, stale = false, failed = false;
  var picked = { 1: null, 2: null };
  var activeTab = function () { return document.querySelector(".tab.active").dataset.tab; };
  var priceField = function () { return activeTab() === "2" ? "p2" : "p1"; };
  var priceOf = function (k) { return data ? E.round(E.karatPrice(data.spot, data.fx, parseInt(k, 10), C.goldAdjustmentPerGram), D) : NaN; };
  var when = function (iso) {
    return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: C.timezone });
  };

  function renderRates() {
    var sel = picked[activeTab()];
    $("rates").innerHTML = KARATS.map(function (k) {
      return '<button type="button" class="rate' + (sel === k ? " selected" : "") + '" data-k="' + k + '" aria-pressed="' + (sel === k) + '"' + (data ? "" : " disabled") + ">" +
        '<span class="k">' + k + '</span><span class="v">' + (data ? E.format(priceOf(k), D) : "…") + '</span><span class="u">' + t().unit + "</span></button>";
    }).join("");
    var note = "";
    if (data) {
      note = stale ? t().ratesStale(when(data.savedAt))
        : t().ratesRef(E.format(data.spot, 2), data.fx + " " + C.currency + "/USD", when(data.spotUpdatedAt));
    } else if (failed) note = t().ratesDown;
    $("ratesNote").textContent = note;
  }

  function loadRates() {
    fetch("/api/gcc-rates", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (d) {
        var fx = d.fx && d.fx[C.currency];
        if (!(d.spotUsdPerOz > 0) || !(fx > 0)) throw new Error();
        data = { spot: d.spotUsdPerOz, fx: fx, spotUpdatedAt: d.spotUpdatedAt, savedAt: d.fetchedAt || new Date().toISOString() };
        stale = false; failed = false;
        save("lastPrices", data); // last verified prices for this country only
      })
      .catch(function () {
        failed = true;
        var last = load("lastPrices", null);
        if (last && last.spot > 0 && last.fx > 0) { data = last; stale = true; }
      })
      .then(renderRates);
  }

  // Tapping a karat copies its price into the open tab's gold-price field (still editable).
  $("rates").addEventListener("click", function (e) {
    var btn = e.target.closest(".rate");
    if (!btn || !data) return;
    var k = btn.dataset.k, field = $(priceField());
    field.value = E.round(priceOf(k), D).toFixed(D);
    picked[activeTab()] = k;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    renderRates();
  });
  ["p1", "p2"].forEach(function (id) {
    $(id).addEventListener("input", function () {
      var tab = id === "p2" ? "2" : "1", k = picked[tab];
      if (k && data && $(id).value !== E.round(priceOf(k), D).toFixed(D)) { picked[tab] = null; renderRates(); }
    });
  });

  // Placeholders in this currency's precision.
  ["g1", "m1", "p1", "final2", "g2", "p2"].forEach(function (id) {
    $(id).placeholder = id.charAt(0) === "g" ? "0.00" : (0).toFixed(D);
  });

  applyLang();
  calc1(); calc2();
  loadRates();
  setInterval(loadRates, 60000);
})();
