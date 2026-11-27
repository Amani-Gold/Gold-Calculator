/* Anonymous page view counting for /admin → Visitors on shop.amani-gold.app.
 * A random id kept in this browser; no cookies, no personal data. Never blocks the page. */
(function () {
  "use strict";
  try {
    var id = null;
    try {
      id = localStorage.getItem("amani-vid");
      if (!id) { id = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); localStorage.setItem("amani-vid", id); }
    } catch (e) {}
    var cur = new URLSearchParams(location.search).get("cur");
    var body = JSON.stringify({ site: "cal", path: location.pathname + (cur ? "?cur=" + cur.slice(0, 3).toUpperCase() : ""), ref: document.referrer, vid: id });
    var url = "https://shop.amani-gold.app/api/track";
    if (!(navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }))))
      fetch(url, { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(function () {});
  } catch (e) {}
})();
