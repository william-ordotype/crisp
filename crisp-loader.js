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

  // Crisp's client_default bundle uses lookbehind regexes, which Safari only
  // parses from 16.4 (regression on their side, first seen 2026-06-23:
  // ORDOTYPE-FRONTEND-1D5). On older WebKit the widget script dies at parse
  // time anyway, so injecting it only produces a SyntaxError and a dead
  // widget. Skip the injection and throw a titled reporting error instead
  // (monitoring.js hooks window.onerror), so the affected-user count stays
  // measurable in ONE clean Sentry issue while the raw noise stops.
  function supportsCrispRuntime() {
    try {
      new RegExp("(?<=a)b");
      return true;
    } catch (e) {
      return false;
    }
  }

  var injected = false;
  function inject() {
    if (injected) return;
    injected = true;
    if (!supportsCrispRuntime()) {
      setTimeout(function() {
        throw new Error("Crisp skipped: no regex lookbehind support (Safari < 16.4)");
      }, 0);
      return;
    }
    var d = document;
    var s = d.createElement("script");
    s.src = "https://client.crisp.chat/l.js";
    s.async = 1;
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
  const msMemberData = localStorage.getItem("_ms-mem");
  let userId = null;
  let email = null;

  if (msMemberData) {
    try {
      const memberData = JSON.parse(msMemberData);
      userId = memberData.id;
      // No ES2020 syntax (?. / ??) anywhere in this file: one token makes the
      // whole loader fail to parse on old hospital browsers (Chrome 78,
      // Sentry ORDOTYPE-FRONTEND-1F7) and Crisp never loads for them
      email = memberData.auth && memberData.auth.email;
    } catch (e) {
      console.error("Failed to parse Memberstack data", e);
    }
  }

  if (userId) {
    window.$crisp.push(["set", "session:data", ["ms_member_id", userId]]);
  }

  const pageUrl = window.location.href;
  window.$crisp.push(["set", "session:data", ["page_url", pageUrl]]);

  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    window.$crisp.push(["set", "user:email", [email]]);
  }
}

window.$crisp.push(["on", "chat:opened", pushCrispData]);
window.$crisp.push(["on", "message:sent", pushCrispData]);
