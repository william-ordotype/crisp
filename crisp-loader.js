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

  var injected = false;
  function inject() {
    if (injected) return;
    injected = true;
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
      email = memberData.auth?.email;
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
