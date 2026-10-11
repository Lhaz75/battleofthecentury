import json,time,urllib.request
from playwright.sync_api import sync_playwright
BASE='http://localhost:8897'
def tok(n): return json.loads(urllib.request.urlopen(urllib.request.Request(BASE+"/api/login",data=json.dumps({"name":n,"password":"testpass123"}).encode(),headers={"Content-Type":"application/json"})).read())["token"]
def patch(route):
    r=route.fetch(); s=r.text()
    a='const human = k => MODE==="vs" || k==="p";'; assert a in s
    s=s.replace(a,'const human = k => (MODE==="vs" || k==="p") && !(window.BOT && k===ME);')
    s=s.replace('else { S.busy=true; render(); aiTurn(); }','else { if(MODE==="vs" && k!==ME) return; S.busy=true; render(); aiTurn(k); }')
    c='S.evName=ev.name; S.busy=!human(k);'; s=s.replace(c,c+' if(window.BOT && k===ME) setTimeout(()=>aiTurn(k),1500);')
    s=s.replace('async function endTurn(k){','async function endTurn(k){ if(window.BOT && MODE==="vs" && k===ME) NET.handoff=true;',1)
    route.fulfill(response=r,body=s,headers={**r.headers,'content-type':'text/html; charset=utf-8'})
with sync_playwright() as p:
    b=p.chromium.launch(); pages=[]; errs=[]
    for n,team in [('Dave',['dans','zeed','jackal']),('Bob',['spade','club','fox'])]:
        pg=b.new_context(viewport={'width':1100,'height':760},service_workers='block').new_page(); pg.on('pageerror',lambda e,n=n:errs.append(n+' '+str(e)[:200]))
        pg.on('response',lambda r,n=n:errs.append(f'{n} {r.status} {r.url[-50:]}') if r.status>=400 else None)
        pg.on('console',lambda m,n=n:errs.append(n+' console: '+m.text[:150]) if m.type=='error' else None)
        pg.route('**/',patch); pg.route('**/index.html*',patch)
        pg.goto(BASE+'/'); pg.evaluate(f"localStorage.setItem('boc-token','{tok(n)}')"); pg.reload(); pg.wait_for_timeout(2500)
        pg.evaluate("t=>{ setInterval(()=>{ if(window.BOT && typeof S!=='undefined' && S && MODE==='vs' && !S.over && S.turn===ME && !S.busy && !S.react && !window._ai){ window._ai=1; S.busy=true; aiTurn(ME).finally(()=>{window._ai=0;}); } },2500); window.BOT=true; FAST=true; LANG='fr'; renderLobby(t); }",team); pg.wait_for_timeout(500)
        pg.click('#quick'); pages.append(pg); pg.wait_for_timeout(1500)
    t0=time.time(); out='timeout'
    while time.time()-t0<400:
        time.sleep(3)
        st=[pg.evaluate("()=>typeof S!=='undefined'&&S?{mode:MODE,me:ME,over:!!S.over,turn:S.turn,round:S.round,p:S.p.team.map(t=>t.hp),a:S.a.team.map(t=>t.hp)}:null") for pg in pages]
        if all(st) and all(x['over'] for x in st): out='fini: '+json.dumps(st); break
        if time.time()-t0>40 and not all(st): out='pas lancé: '+json.dumps(st); break
    print(out); print('dernier état',json.dumps(st)[:600]); print([pg.evaluate('()=>S&&(S.log+" | "+S.sub+" | busy:"+S.busy+" react:"+!!S.react+" net:"+JSON.stringify(typeof NET!=="undefined"?{wait:NET.wait,q:(NET.q||[]).length}:0))') for pg in pages])
    
    if all(st): print('synchro PV identiques :', st[0]['p']==st[1]['p'] and st[0]['a']==st[1]['a'])
    for i,pg in enumerate(pages): pg.wait_for_timeout(2000); pg.screenshot(path=f'vs{i}.png')
    print(errs[:6]); b.close()
