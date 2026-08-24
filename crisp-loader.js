// Served RAW from jsDelivr (william-ordotype/crisp@main) to every Webflow
// page, including the old hospital browsers still on Chrome 78 / Safari 13.
// Two syntax traps kill this WHOLE file at parse time on part of that fleet
// (loader dead, runtime guard included, no titled Sentry issue):
//   1. Anything newer than ES2019: ?. and ?? (Chrome < 80 / Safari < 13.1,
//      Sentry ORDOTYPE-FRONTEND-1F7), ??= (Chrome < 85 / Safari < 14),
//      class fields (Safari < 14.1)...
//   2. Lookbehind inside a regex LITERAL: Safari <= 16.3. Use the
//      new RegExp("...") string form (runtime-only), as in crispRuntimeGap().
// Both are enforced by eslint.config.js (ecmaVersion 2019 parse + lookbehind
// literal ban), run by .github/workflows/parse-floor.yml on every pull
// request and every push to main.
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

  // Crisp's own bundle (client_default / client_legacy: the same ES2020
  // module, injected by l.js) fails on old engines in two ways: on
  // Chrome < 80 / Safari < 13.1 it does not parse (optional chaining), and on
  // Safari 13.1-16.3 it parses but builds a lookbehind RegExp from a string
  // during module init and dies there (regression on Crisp's side first seen
  // 2026-06-23: ORDOTYPE-FRONTEND-1D5). Either way the widget stays dead, so
  // injecting it only produces third-party SyntaxError noise. Skip the
  // injection and report a titled error instead, so each cohort stays
  // measurable in its own Sentry issue (the Sentry browser tag says which
  // browser). Both probes keep the unsupported token inside a string, so
  // this file itself still parses everywhere. Only a SyntaxError counts as
  // an engine gap: a CSP that refuses eval makes new Function throw an
  // EvalError on every browser, which must not disable Crisp.
  function crispRuntimeGap() {
    try {
      new RegExp("(?<=a)b");
    } catch (e) {
      if (e && e.name === "SyntaxError") {
        return { kind: "NoLookbehind", why: "engine lacks regex lookbehind (typically Safari < 16.4)" };
      }
    }
    try {
      new Function("return ({})?.a");
    } catch (e) {
      if (e && e.name === "SyntaxError") {
        return { kind: "NoES2020", why: "engine lacks ES2020 syntax (typically Chrome < 80)" };
      }
    }
    return null;
  }

  // Reported by dispatching a synthetic ErrorEvent at window, which invokes
  // the site-wide window.onerror hook (Sentry GlobalHandlers in auth-bundle)
  // with the full message on every engine, with or without crossorigin on
  // the embed tag. The obvious alternatives are muted for a cross-origin
  // classic script like this one: WebKit sanitizes an exception thrown from
  // a timer callback to "Script error." even with crossorigin="anonymous"
  // (the setTimeout-throw version never produced a single Sentry event from
  // Safari), and Chromium never dispatches unhandledrejection for a promise
  // created by a script fetched without CORS (Blink SanitizeScriptErrors
  // gate), so Promise.reject is lost on embeds lacking crossorigin. Both are
  // kept only as fallbacks. The error NAME differs per cohort because Sentry
  // fingerprints on the exception type and stack, never on the message:
  // with one name both cohorts would merge into a single issue titled after
  // whichever reported first.
  function reportSkip(gap) {
    var err = new Error("Crisp skipped: " + gap.why);
    err.name = "CrispSkipped" + gap.kind;
    try {
      window.dispatchEvent(new ErrorEvent("error", { message: err.message, error: err }));
      return;
    } catch (e) {}
    if (typeof Promise !== "undefined" && Promise.reject) {
      Promise.reject(err);
    } else {
      setTimeout(function() { throw err; }, 0);
    }
  }

  var injected = false;
  function inject() {
    if (injected) return;
    if (!canLoad()) {
      // Consent revoked between arming and firing: stand down until the
      // next grant instead of loading after the refusal
      disarmLazyLoader();
      return;
    }
    injected = true;
    stopWaiting();
    var gap = crispRuntimeGap();
    if (gap) {
      reportSkip(gap);
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
  var idleTimer = null;

  function stopWaiting() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
    INTERACTION_EVENTS.forEach(function(evt) {
      window.removeEventListener(evt, onInteraction);
    });
  }

  function onInteraction() {
    stopWaiting();
    // Buffer briefly so fleeting cursor passes / scroll-throughs don't trigger load
    setTimeout(inject, INTERACTION_DELAY_MS);
  }

  function armLazyLoader() {
    if (injected || lazyArmed) return;
    lazyArmed = true;
    INTERACTION_EVENTS.forEach(function(evt) {
      window.addEventListener(evt, onInteraction, { passive: true });
    });
    idleTimer = setTimeout(inject, IDLE_TIMEOUT_MS);
  }

  function disarmLazyLoader() {
    stopWaiting();
    lazyArmed = false;
  }

  function tryInject() {
    if (canLoad()) armLazyLoader();
    else disarmLazyLoader();
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
