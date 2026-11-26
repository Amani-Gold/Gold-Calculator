/*
 * GCC country configuration — the single place for country-specific settings.
 *
 * Bahrain is listed only so the currency menu can link back to it: the Bahrain calculator at "/"
 * is the original page and keeps its own prices, VAT and formulas. It does not read this file
 * for calculations.
 *
 * VAT (retail sale of gold jewellery, full price = gold value + making charge):
 *   verified 2026-11-26. Re-check the official sources before changing a rate.
 * goldAdjustmentPerGram: optional local market premium, in the country's own currency,
 *   added to the reference price of every karat (0 = pure international reference price).
 */
(function (root) {
  "use strict";

  var COUNTRIES = [
    {
      id: "bh", code: "BH", flag: "🇧🇭", path: "/", aliases: ["/bh", "/bahrain"],
      nameEn: "Bahrain", nameAr: "البحرين",
      currency: "BHD", currencyEn: "Bahraini Dinar", currencyAr: "الدينار البحريني", symbolAr: "د.ب", decimals: 3,
      original: true,
    },
    {
      id: "ksa", code: "SA", flag: "🇸🇦", path: "/ksa", aliases: ["/sa", "/saudi"],
      nameEn: "Saudi Arabia", nameAr: "السعودية", nameInAr: "في السعودية", nameInEn: "in Saudi Arabia",
      currency: "SAR", currencyEn: "Saudi Riyal", currencyAr: "الريال السعودي", symbolAr: "ر.س", decimals: 2,
      locale: "ar-SA", timezone: "Asia/Riyadh",
      vat: { status: "implemented", rate: 15, effective: "2020-07-01",
        source: "Zakat, Tax and Customs Authority (ZATCA) — zatca.gov.sa", verified: "2026-11-26" },
      goldAdjustmentPerGram: 0,
    },
    {
      id: "uae", code: "AE", flag: "🇦🇪", path: "/uae", aliases: ["/ae"],
      nameEn: "United Arab Emirates", nameAr: "الإمارات", nameInAr: "في الإمارات", nameInEn: "in the UAE",
      currency: "AED", currencyEn: "UAE Dirham", currencyAr: "الدرهم الإماراتي", symbolAr: "د.إ", decimals: 2,
      locale: "ar-AE", timezone: "Asia/Dubai",
      vat: { status: "implemented", rate: 5, effective: "2018-01-01",
        source: "Federal Tax Authority (FTA) — tax.gov.ae", verified: "2026-11-26" },
      goldAdjustmentPerGram: 0,
    },
    {
      id: "kw", code: "KW", flag: "🇰🇼", path: "/kw", aliases: ["/k8", "/kuwait"],
      nameEn: "Kuwait", nameAr: "الكويت", nameInAr: "في الكويت", nameInEn: "in Kuwait",
      currency: "KWD", currencyEn: "Kuwaiti Dinar", currencyAr: "الدينار الكويتي", symbolAr: "د.ك", decimals: 3,
      locale: "ar-KW", timezone: "Asia/Kuwait",
      vat: { status: "not_implemented", rate: 0, effective: null,
        source: "No VAT law in force (Ministry of Finance, Kuwait; PwC Worldwide Tax Summaries, reviewed Jul 2026)", verified: "2026-11-26" },
      goldAdjustmentPerGram: 0,
    },
    {
      id: "qatar", code: "QA", flag: "🇶🇦", path: "/qatar", aliases: ["/qa"],
      nameEn: "Qatar", nameAr: "قطر", nameInAr: "في قطر", nameInEn: "in Qatar",
      currency: "QAR", currencyEn: "Qatari Riyal", currencyAr: "الريال القطري", symbolAr: "ر.ق", decimals: 2,
      locale: "ar-QA", timezone: "Asia/Qatar",
      vat: { status: "not_implemented", rate: 0, effective: null,
        source: "No VAT law in force (General Tax Authority, Qatar; PwC Worldwide Tax Summaries, reviewed Sep 2026)", verified: "2026-11-26" },
      goldAdjustmentPerGram: 0,
    },
    {
      id: "oman", code: "OM", flag: "🇴🇲", path: "/oman", aliases: ["/om"],
      nameEn: "Oman", nameAr: "عُمان", nameInAr: "في عُمان", nameInEn: "in Oman",
      currency: "OMR", currencyEn: "Omani Rial", currencyAr: "الريال العماني", symbolAr: "ر.ع", decimals: 3,
      locale: "ar-OM", timezone: "Asia/Muscat",
      vat: { status: "implemented", rate: 5, effective: "2021-04-16",
        source: "Oman Tax Authority — taxoman.gov.om", verified: "2026-11-26" },
      goldAdjustmentPerGram: 0,
    },
  ];

  var SITE = "https://cal.amani-gold.app";
  var byId = {};
  COUNTRIES.forEach(function (c) { byId[c.id] = c; });

  var api = { COUNTRIES: COUNTRIES, SITE: SITE, byId: byId };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AmaniGCC = api;
})(this);
