// Generates the international calculator pages (ksa.html, uae.html, kw.html, qatar.html,
// oman.html), sitemap.xml and the alias redirects in vercel.json.
//
// The pages reuse the Bahrain page's exact CSS, pre-paint script, header and footer, copied
// from index.html, so all calculators look the same. index.html itself is only read, never
// written. Run after changing the template, config or the Bahrain page's look:
//   node scripts/build-gcc.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { COUNTRIES, SITE } = require(join(root, "assets/gcc-config.js"));

const bahrain = readFileSync(join(root, "index.html"), "utf8");
const slice = (start, end) => {
  const a = bahrain.indexOf(start), b = bahrain.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error(`Could not find ${start} … ${end} in index.html`);
  return bahrain.slice(a, b + end.length);
};
const prepaint = slice("<script>", "</script>");
const style = slice("<style>", "</style>");
const header = slice("<header>", "</header>");
const footer = slice("<footer>", "</footer>");
const template = readFileSync(join(root, "templates/country.html"), "utf8");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

for (const c of COUNTRIES.filter((c) => !c.original)) {
  const url = SITE + c.path;
  const vatAr = c.vat.status === "implemented" ? `شامل ضريبة القيمة المضافة ${c.vat.rate}٪` : "بدون ضريبة القيمة المضافة (غير مطبقة)";
  const vatEn = c.vat.status === "implemented" ? `with ${c.vat.rate}% VAT` : "VAT not implemented";
  const page = template
    .replaceAll("{{TITLE}}", esc(`حاسبة الذهب ${c.nameInAr} | Gold Calculator ${c.nameEn} (${c.currency}) — Dr. Amani Gold`))
    .replaceAll("{{DESC}}", esc(`حاسبة الذهب ${c.nameInAr}: احسبي السعر النهائي بـ${c.currencyAr} ${vatAr}، أو استخرجي المصنعية. Gold price calculator for ${c.nameEn} in ${c.currency}, ${vatEn}.`))
    .replaceAll("{{KEYWORDS}}", esc(`حاسبة الذهب ${c.nameInAr}, سعر الذهب ${c.nameInAr}, سعر الذهب اليوم ${c.currencyAr}, gold calculator ${c.nameEn}, gold price ${c.currency}, making charge calculator`))
    .replaceAll("{{URL}}", url)
    .replaceAll("{{OG_LOCALE}}", c.locale.replace("-", "_"))
    .replaceAll("{{ID}}", c.id)
    .replaceAll("{{H1}}", esc(`حاسبة الذهب ${c.nameInAr}`))
    .replaceAll("{{SUB}}", esc(`احسبي السعر النهائي للقطعة، أو استخرجي المصنعية من سعر نهائي. جميع الأسعار بـ${c.currencyAr} (${c.currency}).`))
    .replaceAll("{{SYMBOL}}", esc(c.symbolAr))
    .replace("{{PREPAINT}}", prepaint)
    .replace("{{STYLE}}", style)
    // Country pages keep the navigating currency menu (no in-place conversion).
    .replace("{{HEADER}}", header.replace(/data-currency-menu="bh"( data-currency-mode="[a-z]+")?/, `data-currency-menu="${c.id}"`))
    .replace("{{FOOTER}}", footer);
  if (/data-currency-mode/.test(page)) throw new Error(`${c.id}: currency menu must navigate, not convert`);
  if (/\{\{[A-Z_]+\}\}/.test(page)) throw new Error(`Unfilled placeholder in ${c.id}`);
  writeFileSync(join(root, `${c.path.slice(1)}.html`), page);
  console.log(`wrote ${c.path.slice(1)}.html`);
}

// Sitemap: primary URLs only (aliases redirect, so they are not listed).
const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(root, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  COUNTRIES.map((c) => `  <url><loc>${SITE}${c.path}</loc><lastmod>${today}</lastmod></url>`).join("\n") +
  `\n</urlset>\n`);
console.log("wrote sitemap.xml");

// Alias URLs → primary URL (permanent). Bahrain's aliases go to "/".
const vercel = {
  cleanUrls: true,
  trailingSlash: false,
  redirects: COUNTRIES.flatMap((c) => c.aliases.map((a) => ({ source: a, destination: c.path, permanent: true }))),
};
writeFileSync(join(root, "vercel.json"), JSON.stringify(vercel, null, 2) + "\n");
console.log("wrote vercel.json");
