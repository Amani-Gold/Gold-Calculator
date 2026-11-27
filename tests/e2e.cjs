// End-to-end browser tests:  node tests/e2e.cjs http://localhost:5300
// (start the local server first: node scripts/serve.mjs 5300)
const { chromium, devices } = require("playwright");
const base = process.argv[2] || "http://localhost:5300";
let failures = 0, passes = 0;
const check = (ok, msg) => { if (ok) passes++; else { failures++; console.log("  ✗ " + msg); } };
const eq = (a, b, msg) => check(a === b, `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const COUNTRY = {
  "/": { cur: "BHD", vat: 10, fin: "352.00", d: 2, bahrain: true },
  "/ksa": { cur: "SAR", vat: 15, fin: "368.00", d: 2 },
  "/uae": { cur: "AED", vat: 5, fin: "336.00", d: 2 },
  "/kw": { cur: "KWD", vat: 0, fin: "320.000", d: 3 },
  "/qatar": { cur: "QAR", vat: 0, fin: "320.00", d: 2 },
  "/oman": { cur: "OMR", vat: 5, fin: "336.000", d: 3 },
};
const pathOf = (p) => new URL(p.url()).pathname;

async function fill(p, w, m, price) { await p.fill("#g1", w); await p.fill("#m1", m); await p.fill("#p1", price); }

async function checkCountry(p, path, label) {
  const c = COUNTRY[path];
  eq(pathOf(p), path, `${label} URL`);
  eq((await p.textContent(".cur-btn")).replace(/\s+/g, " ").trim().slice(-3), c.cur, `${label} currency button`);
  check(await p.locator(".cur-list").isHidden(), `${label} currency list hidden until tapped`);
  await fill(p, "10", "2", "30");
  eq(await p.textContent("#final1"), c.fin, `${label} final price (10 g × 30 + 2/g making, VAT ${c.vat}%)`);
  if (!c.bahrain) {
    if (c.vat) {
      check(await p.locator("#vatMode").isVisible(), `${label} VAT switch visible`);
      check((await p.textContent("#vatOn")).includes(String(c.vat)), `${label} VAT switch shows ${c.vat}%`);
      eq(await p.textContent("#vat1"), (320 * c.vat / 100).toFixed(c.d), `${label} VAT amount`);
    } else {
      check(await p.locator("#vatMode").isHidden(), `${label} has no VAT switch`);
      check(/not implemented|غير مطبقة/.test(await p.textContent("#vatNone")), `${label} says VAT not implemented`);
      check(await p.locator("#vat1").isHidden(), `${label} hides VAT line`);
    }
    // Reverse: final → making charge per gram
    await p.click('.tab[data-tab="2"]');
    await p.fill("#final2", c.fin.replace(/,/g, "")); await p.fill("#g2", "10"); await p.fill("#p2", "30");
    eq(await p.textContent("#manu2"), (2).toFixed(c.d), `${label} reverse making charge`);
    await p.click('.tab[data-tab="1"]');
    // Rates shown in this currency once loaded
    await p.waitForFunction(() => !document.querySelector(".rate[disabled]") || document.getElementById("ratesNote").textContent, null, { timeout: 15000 });
    const unit = (await p.locator(".rate .u").first().textContent()).trim();
    check(unit && unit !== "د.ب" && unit !== "BHD", `${label} karat prices not in BHD (${unit})`);
  }
}

async function goVia(p, path) {
  await p.click(".cur-btn");
  check(await p.locator(".cur-list").isVisible(), "currency list opens on tap");
  await Promise.all([p.waitForNavigation({ waitUntil: "domcontentloaded" }), p.click(`.cur-list a[href="${path}"]`)]);
  await p.waitForTimeout(400);
}

(async () => {
  const b = await chromium.launch();

  console.log("0. Main link: currency changes in place, Bahrain VAT stays");
  {
    const ctx = await b.newContext(); const p = await ctx.newPage();
    const fx = await (await fetch(base + "/api/gcc-rates")).json().then((d) => d.fx).catch(() => null);
    await p.goto(base + "/"); await p.waitForTimeout(800);
    await fill(p, "10", "2", "30");
    eq(await p.textContent("#final1"), "352.00", "BHD final");
    await p.click(".cur-btn");
    check(await p.locator(".cur-list button.opt").count() === 6, "six currency options on main page");
    await p.click('.cur-list button.opt[data-cur="SAR"]'); await p.waitForTimeout(800);
    eq(pathOf(p), "/", "URL stays on the main link");
    check(new URL(p.url()).searchParams.get("cur") === "SAR", "choice kept in link (?cur=SAR)");
    eq((await p.textContent(".cur-btn")).trim().slice(-3), "SAR", "button shows SAR");
    const k = fx.SAR / fx.BHD;
    eq(await p.inputValue("#p1"), String(Number((30 * k).toFixed(2))), "typed gold price converted to SAR");
    eq(await p.inputValue("#g1"), "10", "weight unchanged");
    const exp = ((10 * Number((30 * k).toFixed(2)) + 10 * Number((2 * k).toFixed(2))) * 1.1).toFixed(2);
    eq(await p.textContent("#final1"), Number(exp).toLocaleString("en-US", { minimumFractionDigits: 2 }), "final in SAR with Bahrain 10% VAT");
    check((await p.textContent("#vat1")) !== "—" && (await p.textContent(".vat-mode")).includes("10"), "VAT is still Bahrain's 10%");
    check((await p.textContent('.result .unit')).includes("ر.س"), "result unit is ر.س");
    await p.waitForFunction(() => !document.querySelector(".rate[disabled]"), null, { timeout: 15000 });
    check((await p.textContent(".rate .u")).includes("ر.س"), "karat prices in SAR");
    check(/1 BHD/.test(await p.textContent("#ratesNote")), "conversion note shown");
    await p.click(".cur-btn"); await p.click('.cur-list button.opt[data-cur="KWD"]'); await p.waitForTimeout(500);
    check(/^\d+\.\d{3}$/.test((await p.textContent("#final1")).replace(/,/g, "")), "KWD shows 3 decimals");
    await p.reload(); await p.waitForTimeout(1200);
    eq((await p.textContent(".cur-btn")).trim().slice(-3), "KWD", "refresh keeps ?cur=KWD");
    await p.click(".cur-btn"); await p.click('.cur-list button.opt[data-cur="BHD"]'); await p.waitForTimeout(500);
    eq(p.url().includes("cur="), false, "back to BHD removes ?cur");
    await fill(p, "10", "2", "30");
    eq(await p.textContent("#final1"), "352.00", "BHD again gives the original result");
    check((await p.textContent('[data-t="sub"]')).includes("بالدينار البحريني") || (await p.textContent('[data-t="sub"]')).includes("Bahraini Dinar"), "original subtitle restored");
    await p.click(".cur-btn");
    check(await p.locator('.cur-foot a[href="/ksa"]').count() === 1, "list links to /ksa for Saudi VAT and settings");
    await ctx.close();
    const ctx2 = await b.newContext(); const p2 = await ctx2.newPage();
    await p2.route("**/api/gcc-rates", (r) => r.fulfill({ status: 502, body: "{}" }));
    await p2.goto(base + "/"); await p2.waitForTimeout(500);
    await p2.click(".cur-btn"); await p2.click('.cur-list button.opt[data-cur="AED"]'); await p2.waitForTimeout(800);
    eq((await p2.textContent(".cur-btn")).trim().slice(-3), "BHD", "rates down → stays BHD");
    await fill(p2, "10", "2", "30"); eq(await p2.textContent("#final1"), "352.00", "Bahrain still works when rates are down");
    await ctx2.close();
  }

  console.log("1. Country switching Bahrain → KSA → UAE → KW → QA → OM → Bahrain");
  {
    const ctx = await b.newContext(); const p = await ctx.newPage();
    const gccCalls = []; p.on("request", (r) => { if (r.url().includes("/api/gcc-rates")) gccCalls.push(pathOf(p)); });
    await p.goto(base + "/"); await p.waitForTimeout(600);
    await checkCountry(p, "/", "Bahrain");
    for (const path of ["/ksa", "/uae", "/kw", "/qatar", "/oman", "/"]) { await goVia(p, path); await checkCountry(p, path, path); }
    check(!gccCalls.includes("/"), "Bahrain page never calls the international price API");
    await ctx.close();
  }

  console.log("2. Arabic / Persian / mixed digits (typed and pasted), Bahrain and KSA");
  for (const path of ["/", "/ksa"]) {
    const ctx = await b.newContext(); const p = await ctx.newPage();
    await p.goto(base + path); await p.waitForTimeout(500);
    for (const [w, m, pr] of [["١٠", "٢", "٣٠"], ["۱۰", "۲", "۳۰"], ["1٠", "۲", "٣0"]]) {
      for (const id of ["#g1", "#m1", "#p1"]) await p.fill(id, "");
      await p.type("#g1", w); await p.type("#m1", m); await p.type("#p1", pr);
      eq(await p.textContent("#final1"), COUNTRY[path].fin, `${path} typed ${w}/${m}/${pr}`);
    }
    await fill(p, "١٠٫٥", "٢", "٣٠");
    eq(await p.textContent("#final1"), path === "/" ? "369.60" : "386.40", `${path} Arabic decimal ١٠٫٥ (10.5 g × 32 + VAT)`);
    await fill(p, "1,0", "2", "30");
    eq(await p.textContent("#final1"), "—", `${path} ambiguous "1,0" gives no result`);
    check(await p.locator("#g1.invalid").count() === 1, `${path} invalid field is flagged`);
    await p.fill("#g1", "10");
    check(await p.locator("#g1.invalid").count() === 0, `${path} flag clears when fixed`);
    await ctx.close();
  }

  console.log("3. Direct links, refresh, back/forward, aliases");
  {
    const ctx = await b.newContext(); const p = await ctx.newPage();
    await p.goto(base + "/ksa"); await p.waitForTimeout(500);
    eq((await p.textContent(".cur-btn")).trim().slice(-3), "SAR", "direct /ksa opens SAR");
    await p.reload(); await p.waitForTimeout(400);
    eq((await p.textContent(".cur-btn")).trim().slice(-3), "SAR", "refresh keeps SAR");
    await goVia(p, "/kw"); await p.goBack(); await p.waitForTimeout(400);
    eq(pathOf(p), "/ksa", "back returns to /ksa"); eq((await p.textContent(".cur-btn")).trim().slice(-3), "SAR", "back shows SAR");
    await p.goForward(); await p.waitForTimeout(400);
    eq(pathOf(p), "/kw", "forward returns to /kw");
    for (const [alias, to] of [["/bh", "/"], ["/bahrain", "/"], ["/k8", "/kw"], ["/saudi", "/ksa"], ["/ae", "/uae"], ["/qa", "/qatar"], ["/om", "/oman"], ["/sa", "/ksa"], ["/kuwait", "/kw"]]) {
      await p.goto(base + alias); eq(pathOf(p), to, `${alias} redirects`);
    }
    // Root stays Bahrain even with another country saved / browser language set.
    await p.goto(base + "/oman"); await p.goto(base + "/"); await p.waitForTimeout(400);
    eq(pathOf(p), "/", "root never redirects"); eq((await p.textContent(".cur-btn")).trim().slice(-3), "BHD", "root is BHD after visiting Oman");
    await ctx.close();
    const ctx2 = await b.newContext({ locale: "ar-SA", timezoneId: "Asia/Riyadh" }); const p2 = await ctx2.newPage();
    await p2.goto(base + "/"); await p2.waitForTimeout(400);
    eq(pathOf(p2), "/", "Saudi browser locale still opens Bahrain at /");
    await ctx2.close();
  }

  console.log("4. Settings isolation between countries");
  {
    const ctx = await b.newContext(); const p = await ctx.newPage();
    await p.goto(base + "/ksa"); await p.waitForTimeout(400);
    await p.click("#vatOff"); await fill(p, "10", "2", "30");
    eq(await p.textContent("#final1"), "320.00", "KSA without VAT = 320.00");
    await p.goto(base + "/uae"); await p.waitForTimeout(400); await fill(p, "10", "2", "30");
    eq(await p.textContent("#final1"), "336.00", "UAE still with 5% VAT after KSA switched off");
    await p.goto(base + "/"); await p.waitForTimeout(400); await fill(p, "10", "2", "30");
    eq(await p.textContent("#final1"), "352.00", "Bahrain still with 10% VAT after KSA switched off");
    await p.click("#vatOff");
    await p.goto(base + "/oman"); await p.waitForTimeout(400); await fill(p, "10", "2", "30");
    eq(await p.textContent("#final1"), "336.000", "Oman unaffected by Bahrain's switch");
    await p.goto(base + "/ksa"); await p.waitForTimeout(400); await fill(p, "10", "2", "30");
    eq(await p.textContent("#final1"), "320.00", "KSA remembers its own setting");
    await p.click("#vatOn"); await fill(p, "10", "2", "30");
    eq(await p.textContent("#final1"), "368.00", "KSA back to official 15%");
    const keys = await p.evaluate(() => Object.keys(localStorage).sort());
    check(keys.includes("dramani-calc-vat") && keys.includes("amani-gold:ksa:settings"), `separate keys: ${keys.join(", ")}`);
    // Two tabs, two countries at once
    const p2 = await ctx.newPage(); await p2.goto(base + "/kw"); await p2.waitForTimeout(400);
    await fill(p, "10", "2", "30"); await fill(p2, "10", "2", "30");
    eq(await p.textContent("#final1"), "368.00", "tab 1 KSA"); eq(await p2.textContent("#final1"), "320.000", "tab 2 Kuwait");
    await ctx.close();
  }

  console.log("5. International price API failure and stale data");
  {
    const ctx = await b.newContext(); const p = await ctx.newPage();
    await p.goto(base + "/uae"); await p.waitForFunction(() => !document.querySelector(".rate[disabled]"), null, { timeout: 15000 });
    const live = await p.textContent(".rate .v");
    await p.route("**/api/gcc-rates", (r) => r.fulfill({ status: 502, body: "{}" }));
    await p.reload(); await p.waitForTimeout(1500);
    eq(await p.textContent(".rate .v"), live, "last verified price shown when live data fails");
    check(/last verified|آخر سعر/.test(await p.textContent("#ratesNote")), "stale notice shown");
    const p3 = await (await b.newContext()).newPage();
    await p3.route("**/api/gcc-rates", (r) => r.fulfill({ status: 502, body: "{}" }));
    await p3.goto(base + "/qatar"); await p3.waitForTimeout(1500);
    check(/unavailable|تعذّر/.test(await p3.textContent("#ratesNote")), "no data → manual entry message");
    await fill(p3, "10", "2", "30"); eq(await p3.textContent("#final1"), "320.00", "manual entry still works when API is down");
    await p.route("**/shop.amani-gold.app/**", (r) => r.continue());
    await p.goto(base + "/"); await p.waitForTimeout(500); await fill(p, "10", "2", "30");
    eq(await p.textContent("#final1"), "352.00", "Bahrain works while international API is down");
    await ctx.close();
  }

  console.log("6. Language switch on an international page");
  {
    const ctx = await b.newContext(); const p = await ctx.newPage();
    await p.goto(base + "/oman?lang=en"); await p.waitForTimeout(500);
    check((await p.textContent("h1")).includes("Oman"), "English title mentions Oman");
    check((await p.textContent('[data-t="goldPrice"]')).includes("OMR"), "English labels show OMR");
    await p.click("#langBtn"); await p.waitForTimeout(200);
    check((await p.textContent("h1")).includes("عُمان"), "Arabic title mentions عُمان");
    check((await p.textContent('[data-t="goldPrice"]')).includes("ر.ع"), "Arabic labels show ر.ع");
    await ctx.close();
  }

  console.log("7. Mobile layout (iPhone / Pixel): no horizontal scroll, menu fits");
  for (const dev of ["iPhone 13", "Pixel 5", "iPhone SE"]) {
    const ctx = await b.newContext({ ...devices[dev] }); const p = await ctx.newPage();
    for (const path of ["/", "/ksa"]) {
      await p.goto(base + path); await p.waitForTimeout(400);
      const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(over <= 0, `${dev} ${path} no horizontal scroll (${over}px)`);
      await p.click(".cur-btn");
      const box = await p.locator(".cur-list").boundingBox(), vw = p.viewportSize().width;
      check(box.x >= 0 && box.x + box.width <= vw, `${dev} ${path} currency list inside screen`);
    }
    await ctx.close();
  }

  await b.close();
  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
})();
