import sys
def rep(s,a,b,n=1):
    assert s.count(a)==n,(a[:70],s.count(a)); return s.replace(a,b)
def edit(p,pairs):
    s=open(p,encoding='utf-8',newline='').read(); crlf='\r\n' in s; s=s.replace('\r\n','\n')
    for a,b in pairs: s=rep(s,a,b)
    open(p,'w',encoding='utf-8',newline='').write(s.replace('\n','\r\n') if crlf else s)
