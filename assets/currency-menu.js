/*
 * Small "🇧🇭 BHD ⌄" button in the header. The list of GCC currencies is hidden until the
 * button is tapped; each option is a real link to that country's calculator URL.
 * Needs assets/gcc-config.js. Mount point: <div data-currency-menu="bh"></div>.
 *
 * data-currency-mode="convert" (main Bahrain page): picking a currency does not leave the page —
 * it fires "amani:currency" and the page converts its amounts, keeping Bahrain's VAT. The list
 * ends with links to the country calculators (/ksa …) for that country's VAT and settings.
 */
(function () {
  "use strict";
  var mount = document.querySelector("[data-currency-menu]");
  if (!mount || !window.AmaniGCC) return;
  var current = AmaniGCC.byId[mount.getAttribute("data-currency-menu")] || AmaniGCC.byId.bh;
  var convert = mount.getAttribute("data-currency-mode") === "convert";

  var css =
    ".cur-wrap{position:relative}" +
    ".cur-list{position:absolute;top:calc(100% + 6px);inset-inline-end:0;z-index:50;min-width:230px;list-style:none;" +
    "background:var(--surface);border:1px solid var(--border-strong);box-shadow:0 12px 30px rgba(0,0,0,.25);padding:4px 0}" +
    ".cur-list[hidden]{display:none}" +
    ".cur-list a{display:flex;align-items:center;gap:10px;padding:10px 14px;color:var(--text);text-decoration:none;font-size:14px;white-space:nowrap}" +
    ".cur-list a:hover,.cur-list a:focus{background:var(--bg2);outline:none}" +
    ".cur-list a[aria-current=page]{color:var(--gold);font-weight:500}" +
    ".cur-list .cc{font-variant-numeric:tabular-nums;letter-spacing:.5px;min-width:34px}" +
    ".cur-list button.opt{display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:none;border:none;color:var(--text);font:inherit;font-size:14px;white-space:nowrap;cursor:pointer;text-align:start}" +
    ".cur-list button.opt:hover,.cur-list button.opt:focus{background:var(--bg2);outline:none}" +
    ".cur-list button.opt[aria-current=true]{color:var(--gold);font-weight:500}" +
    ".cur-list .cur-foot{border-top:1px solid var(--border);margin-top:4px;padding:8px 14px 6px;font-size:12px;color:var(--text-muted);white-space:normal;line-height:1.6}" +
    ".cur-list .cur-foot a{display:inline;padding:0 3px;color:var(--gold);font-size:12px}" +
    ".cur-btn .chev{width:10px!important;height:10px!important;opacity:.8}" +
    // Narrow phones: the header has no spare room, so the button sits just below it, in the
    // empty space above the page title, and the header keeps its original layout.
    "@media (max-width:400px){.cur-wrap{position:absolute;inset-inline-end:16px;z-index:40}}" +
    // Small phones: pin the list full width under the button, so it never runs off-screen.
    "@media (max-width:480px){.cur-list{position:fixed;left:12px;right:12px;min-width:0}}";
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  mount.className = "cur-wrap";
  mount.innerHTML =
    '<button type="button" class="icon-btn cur-btn" aria-haspopup="true" aria-expanded="false">' +
    '<span aria-hidden="true">' + current.flag + "</span><span>" + current.currency + "</span>" +
    '<svg class="chev" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 3.5l3 3 3-3"/></svg></button>' +
    '<ul class="cur-list" hidden></ul>';
  var btn = mount.querySelector("button"), list = mount.querySelector("ul");

  function render() {
    var ar = document.documentElement.lang !== "en";
    btn.setAttribute("aria-label", ar ? "تغيير العملة" : "Change currency");
    btn.title = btn.getAttribute("aria-label");
    var label = function (c) {
      return '<span aria-hidden="true">' + c.flag + '</span><span class="cc">' + c.currency + "</span>" +
        "<span>— " + (ar ? c.currencyAr : c.currencyEn) + "</span>";
    };
    if (convert) {
      list.innerHTML = AmaniGCC.COUNTRIES.map(function (c) {
        return '<li><button type="button" class="opt" data-cur="' + c.currency + '" aria-current="' + (c.id === current.id) + '">' + label(c) + "</button></li>";
      }).join("") +
        '<li class="cur-foot">' + (ar ? "تغيير العملة فقط — تبقى ضريبة البحرين. لضريبة وإعدادات دولة أخرى استخدمي رابطها: " : "Changes the currency only — Bahrain VAT stays. For another country's VAT and settings use its link: ") +
        AmaniGCC.COUNTRIES.filter(function (c) { return !c.original; }).map(function (c) {
          return '<a href="' + c.path + '" dir="ltr">' + c.path + "</a>";
        }).join(" ") + "</li>";
    } else {
      list.innerHTML = AmaniGCC.COUNTRIES.map(function (c) {
        return '<li><a href="' + c.path + '"' + (c.id === current.id ? ' aria-current="page"' : "") + ">" + label(c) + "</a></li>";
      }).join("");
    }
  }
  function setOpen(open) {
    if (open) list.style.top = window.matchMedia("(max-width:480px)").matches ? btn.getBoundingClientRect().bottom + 6 + "px" : "";
    list.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    if (open) { var a = list.querySelector("a, button"); if (a) a.focus(); }
  }

  var narrow = window.matchMedia("(max-width:400px)");
  function place() {
    var header = document.querySelector("header");
    mount.style.top = narrow.matches && header ? header.getBoundingClientRect().bottom + window.scrollY + 6 + "px" : "";
  }
  window.addEventListener("resize", place);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);

  btn.addEventListener("click", function (e) { e.stopPropagation(); setOpen(list.hidden); });
  list.addEventListener("click", function (e) {
    var opt = e.target.closest("button.opt");
    if (!opt) return;
    setOpen(false);
    document.dispatchEvent(new CustomEvent("amani:currency", { detail: { code: opt.getAttribute("data-cur") } }));
  });
  // The page confirms the switch (it falls back to BHD if exchange rates are unavailable).
  document.addEventListener("amani:currency-changed", function (e) {
    current = AmaniGCC.COUNTRIES.filter(function (c) { return c.currency === e.detail.code; })[0] || current;
    btn.querySelector("span:not([aria-hidden])").textContent = current.currency;
    btn.querySelector("span[aria-hidden]").textContent = current.flag;
    render();
  });
  document.addEventListener("click", function (e) { if (!mount.contains(e.target)) setOpen(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !list.hidden) { setOpen(false); btn.focus(); } });
  // Re-label when the page language switches between Arabic and English.
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  render();
  place();
})();
