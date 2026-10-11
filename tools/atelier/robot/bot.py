import json,sys,time,urllib.request
from playwright.sync_api import sync_playwright
BASE='http://localhost:8897'
TOK=json.loads(urllib.request.urlopen(urllib.request.Request(BASE+"/api/login",data=b'{"name":"Dave","password":"testpass123"}',headers={"Content-Type":"application/json"})).read())["token"]
def patch(route):
    r=route.fetch(); s=r.text()
    a='const human = k => MODE==="vs" || k==="p";'; assert a in s
    s=s.replace(a,'const human = k => !window.BOT && (MODE==="vs" || k==="p");')
    b='else { S.busy=true; render(); aiTurn(); }'; assert b in s
    s=s.replace(b,'else { S.busy=true; render(); aiTurn(k); }')
    c='S.evName=ev.name; S.busy=!human(k);'; assert s.count(c)==1; s=s.replace(c,c+' if(window.BOT) setTimeout(()=>aiTurn(k),1500);')
    route.fulfill(response=r,body=s,headers={**r.headers,'content-type':'text/html; charset=utf-8'})
TEAM="['maitre','dans','sage']"
MODES={
 'rapide':f"()=>{{ MODE='solo'; ME='p'; newGame({TEAM},['emp','rival','narc'],st=>{{}}); }}",
 'histoire-1':"()=>{ STORY.on=true; STORY.i=0; STORY.diff='n'; STORY.wave=0; storyFight(); }",
 'histoire-arc2-fin':"()=>{ STORY.on=true; STORY.i=STORY_CH.findIndex(c=>c.id==='arc2-16'); STORY.diff='n'; STORY.wave=0; storyFight(); }",
 'histoire-arc2-10(fuite)':"()=>{ STORY.on=true; STORY.i=STORY_CH.findIndex(c=>c.id==='arc2-10'); STORY.diff='n'; STORY.wave=1; storyFight(); }",
 'quotidien':f"()=>{{ DAILY.day='2026-10-11'; DAILY.done=false; dailyStart({TEAM}); }}",
 'hebdo':"()=>{ WEEK.k='2026-W41'; WEEK.foe=['raoh','kai','bukoh']; const t=['dans','zeed','jackal']; console.log('cout',teamCost(t),BUDGET); weeklyStart(t); }",
 'boss-mondial':"async()=>{ try{ await bossLoad(true); }catch(e){} await bossStart(['dans','zeed','jackal']); }",
 'tuto':"()=>{ startTuto(); }",
 'survie':f"()=>{{ survStart({TEAM}); setTimeout(()=>$('#svgo').click(),300); }}",
 'arcade':f"()=>{{ arcStart({TEAM}); setTimeout(()=>$('#arcgo').click(),300); }}",
 'dojo':f"()=>{{ dojoStart({TEAM}); setTimeout(()=>document.querySelector('.djgo').click(),300); }}",
 'terres-z1-spade':f"()=>{{ rpgStart({TEAM},'sc'); RPG.run.at='sc_spade'; rpgFight('sc_spade'); }}",
 'terres-z1-chateau':f"()=>{{ rpgStart({TEAM},'sc'); RPG.run.at='sc_chateau'; rpgFight('sc_chateau'); }}",
 'terres-z1-shin':f"()=>{{ rpgStart({TEAM},'sc'); RPG.run.at='sc_shin'; rpgFight('sc_shin'); }}",
 'terres-z2-daioh':f"()=>{{ rpgStart({TEAM},'mamiya'); RPG.run.zone='mamiya'; RPG.run.at='daioh'; rpgFight('daioh'); }}",
}
only=sys.argv[1:] or list(MODES)
res={}
with sync_playwright() as p:
    b=p.chromium.launch()
    for name in only:
        pg=b.new_context(viewport={'width':1280,'height':800},service_workers='block').new_page(); errs=[]; bad=[]
        pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
        pg.on('console',lambda m:errs.append('console: '+m.text[:200]) if m.type=='error' else None)
        pg.on('response',lambda r:bad.append(f'{r.status} {r.url[-40:]}') if r.status>=400 and '/api/' in r.url else None)
        pg.route('**/',patch); pg.route('**/index.html*',patch)
        pg.goto(BASE+'/'); pg.evaluate(f"localStorage.setItem('boc-token','{TOK}')"); pg.reload(); pg.wait_for_timeout(2500)
        pg.evaluate("()=>{ window.BOT=true; FAST=true; LANG='fr'; }")
        try: pg.evaluate(MODES[name])
        except Exception as e: errs.append('launch: '+str(e)[:200])
        t0=time.time(); last=None; stall=0; out='timeout'
        while time.time()-t0<240:
            pg.wait_for_timeout(1500)
            st=pg.evaluate("()=>typeof S==='undefined'||!S?null:{over:!!S.over,turn:S.turn,round:S.round,busy:!!S.busy,react:!!S.react,p:S.p.team.map(t=>t.hp),a:S.a.team.map(t=>t.hp),log:S.log,sub:(S.sub||'').slice(0,120)}")
            if st is None: out='pas de combat'; break
            if st['over']:
                pg.wait_for_timeout(3500)
                win=all(h<=0 for h in st['a']); h1=pg.evaluate("()=>{const h=document.querySelector('h1,h2,.endt');return h?h.textContent.trim().slice(0,60):''}")
                btns=pg.evaluate("()=>[...document.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(Boolean).slice(0,6)")
                out=f"fini en {st['round']} tours, {'VICTOIRE' if win else 'défaite'} · écran: {h1} · boutons: {btns}"; break
            key=json.dumps(st)
            if key==last: stall+=1
            else: stall=0; last=key
            if stall>=12: out='BLOQUÉ: '+key; break
        pg.screenshot(path=f'end-{name}.png')
        res[name]=(out,errs[:5],bad[:5]); print(name,'→',out,'| erreurs:',errs[:3],'| api:',bad[:3],flush=True)
        pg.close()
    b.close()
json.dump(res,open('res.json','w'),ensure_ascii=False,indent=1)
