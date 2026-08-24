// Served RAW from jsDelivr (william-ordotype/crisp@main) to every Webflow
// page, including the old hospital browsers still on Chrome 78 / Safari 13.
// Two syntax traps kill this WHOLE file at parse time on those browsers
// (loader dead, runtime guard included, no titled Sentry issue):
//   1. ES2020+ syntax (?. / ?? / ??= / class fields): Chrome < 80,
//      Sentry ORDOTYPE-FRONTEND-1F7.
//   2. Lookbehind inside a regex LITERAL: Safari <= 16.3. Use the
//      new RegExp("...") string form (runtime-only), as in crispRuntimeGap().
// Both are enforced by eslint.config.js (ecmaVersion 2019 parse + lookbehind
// literal ban), run by .github/workflows/parse-floor.yml on every push.
window.$crisp = [];
window.CRISP_WEBSITE_ID = "7fcb1bdb-58d0-49a9-a269-397bac574b0b";

(function() {
  var COOKIE_NAME = "fs-cc";
  var IDLE_TIMEOUT_MS = 5000;
  var INTERACTION_DELAY_MS = 500;
  var INTERACTION_EVENTS = ['mousemove', 'scroll', 'keydown', 'touchstart'];

  function isLoggedIn() {
    try {
      var raw = localStorage.getItem("_ms-mem");
      if (!raw) return false;
      var m = JSON.parse(raw);
      return !!(m && m.id);
    } catch (e) { return false; }
  }

  function readConsents() {
    var match = document.cookie.match(new RegExp("(^| )" + COOKIE_NAME + "=([^;]+)"));
    if (!match) return null;
    try {
      var data = JSON.parse(decodeURIComponent(match[2]));
      return data && data.consents ? data.consents : null;
    } catch (e) { return null; }
  }

  function canLoad() {
    // Logged-in users: chat is customer support under the service contract
    if (isLoggedIn()) return true;
    // Anonymous: only load if analytics consent is granted (Crisp sets visitor cookies)
    var c = readConsents();
    return !!(c && c.analytics);
  }

  // Crisp's own bundle (client_default / client_legacy, injected by l.js as a
  // type=module script) needs regex lookbehind (Safari 16.4+, regression on
  // their side first seen 2026-06-23: ORDOTYPE-FRONTEND-1D5) AND ES2020
  // syntax (Chrome 80+: the "legacy" variant l.js serves to Chrome 63-117 is
  // not transpiled below ES2020). On older engines the bundle dies at parse
  // and the widget stays dead, so injecting it only produces third-party
  // SyntaxError noise. Skip the injection and throw a titled reporting error
  // instead, so each affected cohort stays measurable in ONE clean Sentry
  // issue. The throw reaches Sentry through the site-wide window.onerror
  // hook (auth-bundle GlobalHandlers) only when the embed tag carries
  // crossorigin="anonymous"; without it the browser mutes it to
  // "Script error." and it is dropped.
  // Both probes keep the unsupported token inside a string, so this file
  // itself still parses everywhere.
  function crispRuntimeGap() {
    try {
      new RegExp("(?<=a)b");
    } catch (e) {
      return "no regex lookbehind support (Safari < 16.4)";
    }
    try {
      new Function("return ({})?.a");
    } catch (e) {
      return "no ES2020 syntax support (Chrome < 80)";
    }
    return null;
  }

  var injected = false;
  function inject() {
    if (injected) return;
    if (!canLoad()) {
      // Consent revoked between arming and firing: disarm so the next
      // grant can arm again instead of loading after the refusal
      lazyArmed = false;
      return;
    }
    injected = true;
    var gap = crispRuntimeGap();
    if (gap) {
      setTimeout(function() {
        throw new Error("Crisp skipped: " + gap);
      }, 0);
      return;
    }
    var d = document;
    var s = d.createElement("script");
    s.src = "https://client.crisp.chat/l.js";
    s.async = 1;
    s.crossOrigin = "anonymous";
    d.getElementsByTagName("head")[0].appendChild(s);
  }

  // Lazy-load Crisp on first user interaction or after IDLE_TIMEOUT_MS.
  // Bots and instant-bouncers never trigger the load; real users see the
  // widget ~50ms after they touch the page.
  var lazyArmed = false;
  function armLazyLoader() {
    if (lazyArmed) return;
    lazyArmed = true;

    var idleTimer;
    function onInteraction() {
      if (idleTimer) clearTimeout(idleTimer);
      INTERACTION_EVENTS.forEach(function(evt) {
        window.removeEventListener(evt, onInteraction);
      });
      // Buffer briefly so fleeting cursor passes / scroll-throughs don't trigger load
      setTimeout(inject, INTERACTION_DELAY_MS);
    }

    INTERACTION_EVENTS.forEach(function(evt) {
      window.addEventListener(evt, onInteraction, { passive: true });
    });
    idleTimer = setTimeout(inject, IDLE_TIMEOUT_MS);
  }

  function tryInject() {
    if (canLoad()) armLazyLoader();
  }

  tryInject();
  window.addEventListener("ordo:consent-updated", tryInject);
})();

function pushCrispData() {
  var msMemberData = localStorage.getItem("_ms-mem");
  var userId = null;
  var email = null;

  if (msMemberData) {
    try {
      var memberData = JSON.parse(msMemberData);
      userId = memberData.id;
      // Deliberately not memberData.auth?.email: see the parse-floor header
      email = memberData.auth && memberData.auth.email;
    } catch (e) {
      console.error("[CrispLoader] Failed to parse Memberstack data", e);
    }
  }

  if (userId) {
    window.$crisp.push(["set", "session:data", ["ms_member_id", userId]]);
  }

  var pageUrl = window.location.href;
  window.$crisp.push(["set", "session:data", ["page_url", pageUrl]]);

  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    window.$crisp.push(["set", "user:email", [email]]);
  }
}

window.$crisp.push(["on", "chat:opened", pushCrispData]);
window.$crisp.push(["on", "message:sent", pushCrispData]);
