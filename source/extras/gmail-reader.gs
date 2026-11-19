/**
 * Personal Diary: Gmail bank alert reader (Google Apps Script).
 *
 * It runs inside YOUR Google account. Every 15 minutes it looks for new bank alert
 * emails and puts their text into your Personal Diary sync space. The app then shows
 * them under "Payments to review" on both phones. Nothing is sent anywhere else.
 *
 * Setup (about 5 minutes, once):
 *  1. In Personal Diary: Settings > Google sync > copy the setup code (it starts with DS1.).
 *  2. Open script.google.com > New project. Delete what is there and paste this whole file.
 *  3. Fill in CONFIG below: SETUP_CODE, EMAIL and PASSWORD (the same email and password
 *     you use for sync in the app).
 *  4. At the top, choose the function "setup" and press Run. Allow access when Google asks.
 *     Google warns because you wrote the script yourself: Advanced > Go to project > Allow.
 *  5. When the log says "All set", delete the password from CONFIG and press Save.
 *     The script keeps a sign-in token instead, so it keeps working.
 * Outlook: create a rule in Outlook that forwards emails from your banks to this Gmail.
 */
var CONFIG = {
  SETUP_CODE: "DS1.paste-your-setup-code-here",
  EMAIL: "",
  PASSWORD: "",
  // Bank alert senders to read. Add or remove addresses as you like.
  SENDERS: ["alerts@axis.bank.in", "cbqsms@cbq.com.qa", "alerts@hdfcbank.net", "alerts@icicibank.com",
            "cbssbi.cas@alerts.sbi.co.in", "donotreply.sbiatm@alerts.sbi.co.in", "alerts@kotak.com",
            "qnbalerts@qnb.com", "noreply@dohabank.com.qa", "alerts@dukhanbank.com"],
  // Extra Gmail search words, for example: 'OR subject:(debited OR credited)'
  EXTRA_QUERY: "",
  DAYS_BACK: 2
};

function readSetupCode_(code) {
  var m = String(code || "").match(/DS1\.([A-Za-z0-9_-]{20,})/);
  if (!m) throw new Error("Paste the setup code from the app into CONFIG.SETUP_CODE");
  var b64 = m[1];
  while (b64.length % 4) b64 += "=";
  var json = Utilities.newBlob(Utilities.base64DecodeWebSafe(b64)).getDataAsString();
  var o = JSON.parse(json);
  if (!o.k || !o.p || !o.s) throw new Error("That setup code is incomplete");
  return { apiKey: o.k, projectId: o.p, space: String(o.s).replace(/[^\w-]/g, "") };
}

function post_(url, body, token, form) {
  var opt = { method: "post", muteHttpExceptions: true };
  if (form) { opt.payload = body; } else { opt.contentType = "application/json"; opt.payload = JSON.stringify(body); }
  if (token) opt.headers = { Authorization: "Bearer " + token };
  var r = UrlFetchApp.fetch(url, opt), txt = r.getContentText(), j = {};
  try { j = JSON.parse(txt); } catch (e) {}
  if (r.getResponseCode() >= 300) throw new Error("HTTP " + r.getResponseCode() + ": " + (j.error && (j.error.message || j.error.status) || txt).toString().slice(0, 200));
  return j;
}

function signIn_(cfg) {
  if (!CONFIG.EMAIL || !CONFIG.PASSWORD) throw new Error("Fill in CONFIG.EMAIL and CONFIG.PASSWORD for the first run");
  var j = post_("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + cfg.apiKey,
                { email: CONFIG.EMAIL, password: CONFIG.PASSWORD, returnSecureToken: true });
  PropertiesService.getUserProperties().setProperty("pd_refresh", j.refreshToken);
  return j.idToken;
}

function idToken_(cfg) {
  var rt = PropertiesService.getUserProperties().getProperty("pd_refresh");
  if (!rt) return signIn_(cfg);
  var j = post_("https://securetoken.googleapis.com/v1/token?key=" + cfg.apiKey,
                "grant_type=refresh_token&refresh_token=" + encodeURIComponent(rt), null, true);
  if (j.refresh_token) PropertiesService.getUserProperties().setProperty("pd_refresh", j.refresh_token);
  return j.id_token;
}

function docUrl_(cfg, id) {
  return "https://firestore.googleapis.com/v1/projects/" + cfg.projectId + "/databases/(default)/documents/spaces/" + id;
}

function members_(cfg, token) {
  var r = UrlFetchApp.fetch(docUrl_(cfg, cfg.space), { headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true });
  if (r.getResponseCode() >= 300) throw new Error("Can't open your sync space (" + r.getResponseCode() + "). Check the setup code and that this email is a member.");
  var d = JSON.parse(r.getContentText()), v = d.fields && d.fields.members && d.fields.members.arrayValue && d.fields.members.arrayValue.values || [];
  return v.map(function (x) { return x.stringValue; }).filter(String);
}

function query_() {
  var from = CONFIG.SENDERS.map(function (s) { return "from:" + s; }).join(" OR ");
  return "(" + from + (CONFIG.EXTRA_QUERY ? " " + CONFIG.EXTRA_QUERY : "") + ") newer_than:" + (CONFIG.DAYS_BACK || 2) + "d";
}

function clean_(t) {
  return String(t || "").replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim().slice(0, 1500);
}

function collect_() {
  var props = PropertiesService.getUserProperties(), seen = JSON.parse(props.getProperty("pd_seen") || "[]"), set = {}, out = [];
  seen.forEach(function (id) { set[id] = 1; });
  GmailApp.search(query_(), 0, 50).forEach(function (th) {
    th.getMessages().forEach(function (m) {
      var id = m.getId();
      if (set[id]) return;
      set[id] = 1; seen.push(id);
      out.push({ id: id, from: String(m.getFrom()).slice(0, 120), subject: String(m.getSubject()).slice(0, 200),
                 body: clean_(m.getPlainBody()), time: m.getDate().getTime() });
    });
  });
  props.setProperty("pd_seen", JSON.stringify(seen.slice(-500)));
  return out;
}

function str_(s) { return { stringValue: String(s) }; }

function send_(cfg, token, items) {
  if (!items.length) return 0;
  var mem = members_(cfg, token);
  var body = { writes: [{
    update: { name: "projects/" + cfg.projectId + "/databases/(default)/documents/spaces/" + cfg.space + "__mail",
              fields: { members: { arrayValue: { values: mem.map(str_) } }, ts: { integerValue: String(Date.now()) } } },
    updateMask: { fieldPaths: ["members", "ts"] },
    updateTransforms: [{ fieldPath: "items", appendMissingElements: { values: items.map(function (x) {
      return { mapValue: { fields: { id: str_(x.id), from: str_(x.from), subject: str_(x.subject), body: str_(x.body), time: { integerValue: String(x.time) } } } };
    }) } }]
  }] };
  post_("https://firestore.googleapis.com/v1/projects/" + cfg.projectId + "/databases/(default)/documents:commit", body, token);
  return items.length;
}

function runWith_(token) {
  var cfg = readSetupCode_(CONFIG.SETUP_CODE), items = collect_();
  if (!items.length) { console.log("No new bank emails"); return 0; }
  var n = send_(cfg, token || idToken_(cfg), items);
  console.log("Sent " + n + " bank emails to Personal Diary");
  return n;
}

/** Runs every 15 minutes once setup has been run. */
function run() { return runWith_(null); }

/** Run this once by hand. */
function setup() {
  var cfg = readSetupCode_(CONFIG.SETUP_CODE), token = signIn_(cfg), mem = members_(cfg, token);
  if (mem.indexOf(CONFIG.EMAIL) < 0 && mem.indexOf(CONFIG.EMAIL.toLowerCase()) < 0) throw new Error(CONFIG.EMAIL + " isn't a member of space " + cfg.space + ". Invite it from the app first.");
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() == "run") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("run").timeBased().everyMinutes(15).create();
  var n = runWith_(token);
  console.log("All set. Checking every 15 minutes. " + n + " recent bank emails sent now. You can delete the password from CONFIG.");
}
