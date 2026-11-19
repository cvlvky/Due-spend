import json, datetime
T=datetime.date.today()
def d(n): return (T+datetime.timedelta(days=n)).isoformat()
def m(k,day=5):
    y=T.year; mo=T.month+k
    while mo<1: mo+=12; y-=1
    while mo>12: mo-=12; y+=1
    return f"{y:04d}-{mo:02d}-{day:02d}"
tx=[]
i=0
def add(kind,amt,acc,date,cat,note="",cur="INR",fx=26):
    global i; i+=1
    tx.append({"id":f"t{i}","kind":kind,"amt":amt,"acc":acc,"cur":cur,"fx":fx,"date":date,"cat":cat,"note":note})
for k in range(-4,1):
    add("in",12000,"a2",m(k,1),"Salary","",cur="QAR",fx=25.5+k*0.1)
    add("out",2500,"a2",m(k,2),"Rent","",cur="QAR")
    add("out",600+40*k,"a2",m(k,3),"Food","Lulu",cur="QAR")
    add("out",300,"a2",m(k,4) if k<0 else m(k,2),"Travel","",cur="QAR")
    add("out",15000,"a1",m(k,5) if k<0 else m(k,3),"Family","monthly support")
    add("out",2200,"a1",m(k,6) if k<0 else m(k,3),"Bills","electricity")
    add("save",5000,"a1",m(k,7) if k<0 else m(k,3),"SIP")
add("out",450,"a1",m(0,2),"","no category")
add("out",450,"a1",m(0,2),"","no category")
legacy={
 "acc":[{"id":"a1","name":"SBI Savings","type":"bank","cur":"INR","open":250000},{"id":"a2","name":"QNB Salary","type":"bank","cur":"QAR","open":4000},{"id":"a3","name":"Wallet","type":"cash","cur":"INR","open":3000}],
 "tx":tx,
 "tr":[{"id":"x1","from":"a2","to":"a1","amt":4000,"got":104400,"fee":15,"date":m(-2,10),"note":"remit"},{"id":"x2","from":"a2","to":"a1","amt":3500,"got":92050,"fee":15,"date":m(-1,10),"note":""},{"id":"x3","from":"a1","to":"a3","amt":2000,"got":2000,"fee":0,"date":m(0,1),"note":"cash"}],
 "dates":[{"id":"d1","name":"LIC Jeevan Anand","type":"premium","date":d(5),"amt":28450,"rep":"yearly","no":"P-1122","pay":"a1","sa":500000,"term":21,"lpy":"2040","mamt":1100000,"nom":"Spouse","att":[]},
          {"id":"d2","name":"HDFC FD","type":"fd","date":d(20),"amt":212000,"rep":"none","no":"","pay":"a1","att":[]},
          {"id":"d3","name":"Car insurance","type":"renewal","date":d(-3),"amt":9800,"rep":"yearly","att":[]},
          {"id":"d4","name":"Bike EMI","type":"emi","date":d(12),"amt":3200,"rep":"monthly","att":[]},
          {"id":"d5","name":"Health cover","type":"premium","date":d(40),"amt":0,"rep":"yearly","att":[]}],
 "inv":[{"id":"i1","name":"SBI FD 2027","kind":"fd","no":"","inv":200000,"val":0,"sd":m(-14,10),"mdate":m(10,10),"rt":7.1,"att":[]},{"id":"i2","name":"Nifty index fund","kind":"mf","no":"F-77","inv":150000,"val":181500,"sd":m(-20,1),"mdate":"","rt":0,"att":[]},{"id":"i3","name":"Gold coins","kind":"gold","inv":90000,"val":112000,"sd":"","mdate":"","att":[]}],
 "loans":[{"id":"l1","name":"Bike loan","cur":"INR","emi":3200,"total":36,"paid":14,"out":"","next":d(12),"acc":"a1"},{"id":"l2","name":"Home loan","cur":"INR","emi":24500,"total":180,"paid":40,"out":2450000,"next":d(8),"acc":"a1"}],
 "goals":[{"id":"g1","name":"Gold for wedding","target":200000,"cur":"INR","saved":50000,"date":m(8,1)},{"id":"g2","name":"Umrah trip","target":8000,"cur":"QAR","saved":1500,"date":""}],
 "bud":[{"id":"b1","cat":"Food","lim":700,"cur":"QAR"},{"id":"b2","cat":"Bills","lim":2000,"cur":"INR"}],
 "rec":[{"id":"r1","kind":"out","amt":499,"acc":"a1","cat":"Subscriptions","note":"Netflix","day":28,"from":m(0,1)[:7],"last":""}],
 "nw":{d(-9):2100000,d(-6):2125000,d(-3):2119000,d(-1):2140000},
 "cfg":{"wSeg":"all","rate":26.1,"view":"INR","last":"a2","theme":"","hide":False}
}
if __name__=="__main__":
    print(json.dumps(legacy))
