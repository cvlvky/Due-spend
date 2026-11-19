"""Makes test PDFs: an Axis-style bank statement (plain and with a password) and a CAMS-style CAS."""
import datetime
from reportlab.pdfgen import canvas
from reportlab.lib.pdfencrypt import StandardEncryption
T=datetime.date.today()
def d(n,fmt="%d-%m-%Y"): return (T+datetime.timedelta(days=n)).strftime(fmt)
ROWS=[(-20,"UPI/P2M/600000000101/Meesho","266.00",""),(-18,"IMPS/P2A/600000000103/ARUNKUMAR","","85250.75"),(-15,"POS 4123XXXXXXXX1234 BIG BAZAAR","1,450.50",""),
      (-12,"NEFT CR-HDFC0000001-ACME CONSULTING","","45,000.00"),(-9,"UPI/P2M/600000000102/Suresh Kumar R","3,400.00",""),(-5,"ACH D- LIC OF INDIA PREMIUM","28,450.00","")]
def statement(path,pw=None):
    c=canvas.Canvas(path,encrypt=StandardEncryption(pw,canPrint=1,strength=128) if pw else None)
    c.setFont("Helvetica-Bold",12);c.drawString(40,800,"Statement of Axis Account No :921010000004417 for the period "+d(-25)+" to "+d(0));c.setFont("Helvetica",9)
    y=770;c.drawString(40,y,"Tran Date");c.drawString(110,y,"Particulars");c.drawRightString(390,y,"Debit");c.drawRightString(460,y,"Credit");c.drawRightString(540,y,"Balance");y-=16
    bal=50000.00;c.drawString(110,y,"OPENING BALANCE");c.drawRightString(540,y,"{:,.2f}".format(bal));y-=16
    for n,part,dr,cr in ROWS:
        a=float((dr or cr).replace(",",""));bal=bal-a if dr else bal+a
        c.drawString(40,y,d(n));c.drawString(110,y,part[:34]);c.drawRightString(390,y,dr);c.drawRightString(460,y,cr);c.drawRightString(540,y,"{:,.2f}".format(bal));y-=13
        if len(part)>34:c.drawString(110,y,part[34:]);y-=13
        y-=3
    c.drawString(110,y,"CLOSING BALANCE");c.drawRightString(540,y,"{:,.2f}".format(bal));c.drawString(40,y-30,"This is a computer generated statement.");c.save();return bal
def cas(path,pw):
    c=canvas.Canvas(path,encrypt=StandardEncryption(pw,canPrint=1,strength=128));c.setFont("Helvetica",8.5);y=800
    def L(*cols):
        nonlocal y
        for x,t in cols: c.drawString(x,y,t)
        y-=13
    L((40,"Consolidated Account Statement"),(300,"01-Apr-2023 To 13-Nov-2026"))
    L((40,"Folio No: 1234567 / 89"),(220,"PAN: ABCDE1234F"),(330,"KYC: OK  PAN: OK"))
    L((40,"B205RG-Mirae Asset Large Cap Fund - Regular Plan Growth (Non-Demat) - ISIN: INF769K01010(Advisor: DIRECT)"))
    L((40,"Opening Unit Balance: 0.000"))
    for dt,desc,amt,units,price,ub in [("05-Jan-2024","Purchase - Systematic Investment","5,000.00","50.000","100.0000","50.000"),("05-Feb-2024","Purchase - Systematic Investment","5,000.00","47.619","105.0000","97.619"),("10-Jun-2025","Redemption","(2,200.00)","(20.000)","110.0000","77.619")]:
        L((40,dt),(100,desc),(300,amt),(370,units),(430,price),(500,ub))
    L((40,"05-Feb-2024"),(100,"*** Stamp Duty ***"),(300,"0.25"))
    L((40,"Closing Unit Balance: 77.619"),(180,"NAV on 13-Nov-2026: INR 125.5000"),(340,"Total Cost Value: 7,800.00"))
    L((40,"Market Value on 13-Nov-2026: INR 9,741.18"))
    y-=10
    L((40,"Folio No: 9988776 / 11"),(220,"PAN: ABCDE1234F"))
    L((40,"P123-Parag Parikh Flexi Cap Fund - Direct Plan - Growth - ISIN: INF879O01027"))
    L((40,"01-Mar-2024"),(100,"Purchase"),(300,"20,000.00"),(370,"300.000"),(430,"66.6667"),(500,"300.000"))
    L((40,"Closing Unit Balance: 300.000"),(180,"NAV on 13-Nov-2026: INR 85.1000"))
    c.save()
if __name__=="__main__":
    b=statement("test/fixtures/axis.pdf");statement("test/fixtures/axis-locked.pdf","CUST1234");cas("test/fixtures/cas.pdf","ABCDE1234F");print("closing",b)
