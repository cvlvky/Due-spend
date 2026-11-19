"""Checks Personal Diary before GitHub builds the APK. If anything fails, the build stops,
so a broken app is never published. Run by .github/workflows/build-apk.yml."""
import json, os, shutil, subprocess, sys, time, datetime
from playwright.sync_api import sync_playwright
page_file = sys.argv[1] if len(sys.argv) > 1 else "index.html"
T = datetime.date.today()
def d(n): return (T + datetime.timedelta(days=n)).isoformat()
SEED = {"acc": [{"id": "a1", "name": "Axis NRO", "type": "bank", "cur": "INR", "open": 80000}, {"id": "a2", "name": "CBQ", "type": "bank", "cur": "QAR", "open": 6000}],
        "tx": [{"id": "t%d" % i, "kind": k, "amt": a, "acc": ac, "cur": c, "date": d(n), "cat": cat, "payee": p} for i, (k, a, ac, c, n, cat, p) in enumerate([
            ("in", 12000, "a2", "QAR", -40, "Salary", ""), ("out", 2500, "a2", "QAR", -38, "Rent", ""), ("out", 450, "a2", "QAR", -30, "Food", "Lulu"),
            ("in", 12000, "a2", "QAR", -10, "Salary", ""), ("out", 2500, "a2", "QAR", -8, "Rent", ""), ("out", 2200, "a1", "INR", -6, "Bills", "TNEB"),
            ("tr", 3000, "a2", "QAR", -9, "", "")])],
        "dates": [{"id": "d1", "name": "LIC", "type": "premium", "date": d(20), "amt": 28000, "cur": "INR", "rep": "yearly", "pay": "a1", "att": []}],
        "cfg": {"rate": 23.9, "view": "INR"}}
SEED["tx"][-1].update({"to": "a1", "got": 71500, "fee": 15})
errors, fails = [], []
def ok(name, cond, info=""):
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else "  " + str(info)[:300]))
    if not cond: fails.append(name)
root = os.path.dirname(os.path.abspath(page_file)) or "."
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8799", "--bind", "127.0.0.1", "-d", root], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)
chrome = next((p for p in ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium-browser", "/usr/bin/chromium"] if os.path.exists(p)), None)
if not chrome: subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=False)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chrome, args=["--no-sandbox"]) if chrome else p.chromium.launch(args=["--no-sandbox"])
        c = b.new_context(viewport={"width": 360, "height": 740})
        c.add_init_script("localStorage.setItem('due-and-spend.v1',%s)" % json.dumps(json.dumps(SEED)))
        pg = c.new_page()
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto("http://127.0.0.1:8799/" + os.path.basename(page_file))
        pg.wait_for_selector("#nav button", timeout=20000)
        E = pg.evaluate
        ok("app opens with data", E("S.tx.length") >= 6)
        for t in ["home", "dates", "invest", "acc", "spend", "rep", "fam"]:
            E('tab="%s";render()' % t)
            ok("screen " + t, "couldn’t be shown" not in pg.inner_text("#app"))
        p1 = E('parseSms("Your card ending **4821 used for QAR 7.00 at Saffron Cafe at 07:06 11-Nov-26 Available Limit: QAR 3,193.00")')
        ok("reads a Qatar card alert", p1 and p1["amt"] == 7 and p1["cur"] == "QAR" and p1["payee"] == "Saffron Cafe", p1)
        p2 = E('parseSms("Amount Debited: INR 266.00 Account Number: XX7730 Date & Time: 14-11-26, 12:42:28 IST Transaction Info: UPI/P2M/600000000101/Meesho")')
        ok("reads an Axis email", p2 and p2["amt"] == 266 and p2["payee"] == "Meesho", p2)
        rd = E('rdRun({open:"2020-01-01",rate:6.7,dep:Array.from({length:60},(_,k)=>({d:addM("2020-01-01",k),a:1000}))},"2025-01-01").bal')
        ok("RD maturity maths", abs(rd - 71369) <= 60, rd)
        ok("radar and verdict run", isinstance(E("radar(90)"), list) and E("verdict().sc") >= 0)
        ok("money flow adds up", abs(sum(l["v"] for l in E("flowGraph(flowData(addMon(today().slice(0,7),0))).L") if l["s"] == "q_inc") - E("flowData(addMon(today().slice(0,7),0)).incQ")) < 1)
        ok("XIRR maths", abs(E('xirr([{d:"2024-01-01",a:-1000},{d:"2025-01-01",a:1100}])') - 10) < 0.1)
        ok("PDF lock maths", E('hex8(md5(lat1("abc")))') == "900150983cd24fb0d6963f7d28e17f72")
        ok("backup round trip", json.loads(E("bk()"))["acc"][0]["name"] == "Axis NRO")
        E('S.cfg.grat={join:addM(today(),-24),basic:6000,days:21};save()')
        ok("gratuity maths", abs(E("gratCalc().amt") - 6000 / 30 * 21 * E("gratCalc().yrs")) < 0.01)
        ok("no script errors", not errors, errors[:3])
        b.close()
finally:
    srv.terminate()
print("\n%d checks failed" % len(fails))
sys.exit(1 if fails else 0)
