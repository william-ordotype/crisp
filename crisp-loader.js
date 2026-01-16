window.$crisp = [];
window.CRISP_WEBSITE_ID = "7fcb1bdb-58d0-49a9-a269-397bac574b0b";

(function() {
  const d = document;
  const s = d.createElement("script");
  s.src = "https://client.crisp.chat/l.js";
  s.async = 1;
  d.getElementsByTagName("head")[0].appendChild(s);
})();

function pushCrispData() {
  const userId = localStorage.getItem("ms_member_id");
  const pageUrl = window.location.href;
  
  if (userId) {
    window.$crisp.push(["set", "session:data", ["ms_member_id", userId]]);
  }
  window.$crisp.push(["set", "session:data", ["page_url", pageUrl]]);
  
  const email = sessionStorage.getItem("ms_email");
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    window.$crisp.push(["set", "user:email", [email]]);
  }
}

window.$crisp.push(["on", "chat:opened", pushCrispData]);
window.$crisp.push(["on", "message:sent", pushCrispData]);
