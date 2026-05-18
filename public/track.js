/**
 * Godevelopers Analytics Tracker
 *
 * Usage (add to any internal service's <head>):
 *   <script
 *     src="https://hustlersdashboard.lovable.app/track.js"
 *     data-api-key="YOUR_SERVICE_API_KEY"
 *     data-endpoint="https://api.godevelopers.online/analytics/collect"
 *     defer></script>
 *
 * Tracks:
 *   - pageviews (initial load + SPA route changes via history API)
 *   - unique visitor (anonymous, localStorage UUID, no PII)
 *   - referrer, screen, language, UTM params
 */
(function () {
  if (typeof window === "undefined") return;
  if (window.__GODEV_TRACKER__) return;
  window.__GODEV_TRACKER__ = true;

  var script =
    document.currentScript ||
    document.querySelector('script[src*="track.js"]');
  if (!script) return;

  var apiKey = script.getAttribute("data-api-key");
  var endpoint =
    script.getAttribute("data-endpoint") ||
    "https://api.godevelopers.online/analytics/collect";

  if (!apiKey) {
    console.warn("[godev-track] missing data-api-key");
    return;
  }

  // Anonymous visitor id (per device, per service domain)
  var VID_KEY = "godev_vid";
  var vid = null;
  try {
    vid = localStorage.getItem(VID_KEY);
    if (!vid) {
      vid =
        (crypto.randomUUID && crypto.randomUUID()) ||
        "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(VID_KEY, vid);
    }
  } catch (_) {
    vid = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // Session id (per tab, 30 min inactivity)
  var SID_KEY = "godev_sid";
  var SID_TS_KEY = "godev_sid_ts";
  var THIRTY_MIN = 30 * 60 * 1000;
  function getSid() {
    try {
      var now = Date.now();
      var sid = sessionStorage.getItem(SID_KEY);
      var ts = parseInt(sessionStorage.getItem(SID_TS_KEY) || "0", 10);
      if (!sid || now - ts > THIRTY_MIN) {
        sid = "s_" + Math.random().toString(36).slice(2) + now.toString(36);
        sessionStorage.setItem(SID_KEY, sid);
      }
      sessionStorage.setItem(SID_TS_KEY, String(now));
      return sid;
    } catch (_) {
      return "s_" + Date.now();
    }
  }

  function utm() {
    try {
      var p = new URLSearchParams(window.location.search);
      var o = {};
      ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(
        function (k) {
          var v = p.get(k);
          if (v) o[k] = v;
        }
      );
      return o;
    } catch (_) {
      return {};
    }
  }

  function send(eventType, extra) {
    var payload = Object.assign(
      {
        type: eventType,
        apiKey: apiKey,
        vid: vid,
        sid: getSid(),
        url: window.location.href,
        path: window.location.pathname,
        referrer: document.referrer || null,
        title: document.title || null,
        lang: navigator.language || null,
        screen: window.screen
          ? window.screen.width + "x" + window.screen.height
          : null,
        viewport: window.innerWidth + "x" + window.innerHeight,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        utm: utm(),
        ts: Date.now(),
      },
      extra || {}
    );

    try {
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        var blob = new Blob([body], { type: "application/json" });
        if (navigator.sendBeacon(endpoint, blob)) return;
      }
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
        keepalive: true,
        mode: "cors",
      }).catch(function () {});
    } catch (_) {}
  }

  // Initial pageview
  send("pageview");

  // SPA route changes
  var lastPath = window.location.pathname + window.location.search;
  function onRoute() {
    var current = window.location.pathname + window.location.search;
    if (current !== lastPath) {
      lastPath = current;
      send("pageview");
    }
  }
  var _push = history.pushState;
  history.pushState = function () {
    _push.apply(this, arguments);
    setTimeout(onRoute, 0);
  };
  var _replace = history.replaceState;
  history.replaceState = function () {
    _replace.apply(this, arguments);
    setTimeout(onRoute, 0);
  };
  window.addEventListener("popstate", onRoute);

  // Expose minimal API
  window.godev = {
    track: function (name, props) {
      send("event", { name: name, props: props || {} });
    },
  };
})();
