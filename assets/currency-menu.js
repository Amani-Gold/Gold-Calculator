/*
 * Small "🇧🇭 BHD ⌄" button in the header. The list of GCC currencies is hidden until the
 * button is tapped; each option is a real link to that country's calculator URL.
 * Needs assets/gcc-config.js. Mount point: <div data-currency-menu="bh"></div>.
 */
(function () {
  "use strict";
  var mount = document.querySelector("[data-currency-menu]");
  if (!mount || !window.AmaniGCC) return;
  var current = AmaniGCC.byId[mount.getAttribute("data-currency-menu")] || AmaniGCC.byId.bh;

  var css =
    ".cur-wrap{position:relative}" +
    ".cur-list{position:absolute;top:calc(100% + 6px);inset-inline-end:0;z-index:50;min-width:230px;list-style:none;" +
    "background:var(--surface);border:1px solid var(--border-strong);box-shadow:0 12px 30px rgba(0,0,0,.25);padding:4px 0}" +
    ".cur-list[hidden]{display:none}" +
    ".cur-list a{display:flex;align-items:center;gap:10px;padding:10px 14px;color:var(--text);text-decoration:none;font-size:14px;white-space:nowrap}" +
    ".cur-list a:hover,.cur-list a:focus{background:var(--bg2);outline:none}" +
    ".cur-list a[aria-current=page]{color:var(--gold);font-weight:500}" +
    ".cur-list .cc{font-variant-numeric:tabular-nums;letter-spacing:.5px;min-width:34px}" +
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
    list.innerHTML = AmaniGCC.COUNTRIES.map(function (c) {
      return '<li><a href="' + c.path + '"' + (c.id === current.id ? ' aria-current="page"' : "") + ">" +
        '<span aria-hidden="true">' + c.flag + '</span><span class="cc">' + c.currency + "</span>" +
        "<span>— " + (ar ? c.currencyAr : c.currencyEn) + "</span></a></li>";
    }).join("");
  }
  function setOpen(open) {
    if (open) list.style.top = window.matchMedia("(max-width:480px)").matches ? btn.getBoundingClientRect().bottom + 6 + "px" : "";
    list.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    if (open) { var a = list.querySelector("a"); if (a) a.focus(); }
  }

  var narrow = window.matchMedia("(max-width:400px)");
  function place() {
    var header = document.querySelector("header");
    mount.style.top = narrow.matches && header ? header.getBoundingClientRect().bottom + window.scrollY + 6 + "px" : "";
  }
  window.addEventListener("resize", place);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);

  btn.addEventListener("click", function (e) { e.stopPropagation(); setOpen(list.hidden); });
  document.addEventListener("click", function (e) { if (!mount.contains(e.target)) setOpen(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !list.hidden) { setOpen(false); btn.focus(); } });
  // Re-label when the page language switches between Arabic and English.
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  render();
  place();
})();
