// Live data for the international (GCC) calculators only — the Bahrain calculator at "/"
// keeps its own price feed (shop.amani-gold.app) and never calls this endpoint.
//
// Returns the international gold spot price (USD per troy ounce) and USD exchange rates for
// the GCC currencies. Each page turns these into local reference prices per karat.
// No hardcoded fallback rates: if a source fails, the request fails and the page shows the
// last verified data it saved, with its timestamp.

const GOLD_URL = "https://api.gold-api.com/price/XAU";
const FX_URL = "https://open.er-api.com/v6/latest/USD";
const CURRENCIES = ["BHD", "SAR", "AED", "KWD", "QAR", "OMR"];

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
  return res.json();
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const [gold, fx] = await Promise.all([getJson(GOLD_URL), getJson(FX_URL)]);
    if (!(gold.price > 0)) throw new Error("gold price missing");
    if (fx.result !== "success" || !fx.rates) throw new Error("exchange rates missing");
    const rates = {};
    for (const c of CURRENCIES) {
      if (!(fx.rates[c] > 0)) throw new Error(`exchange rate for ${c} missing`);
      rates[c] = fx.rates[c];
    }
    // Cache at the edge for 5 minutes; serve the previous copy while refreshing.
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    res.statusCode = 200;
    res.end(JSON.stringify({
      spotUsdPerOz: gold.price,
      spotUpdatedAt: gold.updatedAt || new Date().toISOString(),
      goldSource: "gold-api.com — international spot price (USD per troy ounce)",
      fx: rates,
      fxUpdatedAt: fx.time_last_update_utc ? new Date(fx.time_last_update_utc).toISOString() : null,
      fxSource: "ExchangeRate-API (open.er-api.com) — daily USD rates",
      fetchedAt: new Date().toISOString(),
    }));
  } catch (err) {
    res.setHeader("Cache-Control", "no-store");
    res.statusCode = 502;
    res.end(JSON.stringify({ error: `Live prices unavailable: ${err.message}` }));
  }
};
