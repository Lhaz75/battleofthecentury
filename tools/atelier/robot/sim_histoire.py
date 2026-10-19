# robot : joue les deux camps sur un chapitre (toutes les vagues), N fois, en accéléré
import sys,json,time,asyncio
from playwright.async_api import async_playwright
CH=sys.argv[1].split(','); N=int(sys.argv[2]) if len(sys.argv)>2 else 3; OV=json.loads(sys.argv[3]) if len(sys.argv)>3 else {}
SPEED=0.06
def patch_body(s):
    a='const human = k => MODE==="vs" || k==="p";'; assert a in s
    s=s.replace(a,'const human = k => !window.BOT && (MODE==="vs" || k==="p");')
    b='else { S.busy=true; render(); aiTurn(); }'; assert b in s
    s=s.replace(b,'else { S.busy=true; render(); aiTurn(k); }')
    c='S.evName=ev.name; S.busy=!human(k);'; assert s.count(c)==1; s=s.replace(c,c+' if(window.BOT) setTimeout(()=>aiTurn(k),1500);')
    s=s.replace('<head>','<head><script>window.BOT=true;const _st=window.setTimeout;window.setTimeout=(f,ms,...a)=>_st(f,Math.max(0,(ms||0)*%s),...a);</script>'%SPEED,1)
    return s
async def one(b,cid,k):
    ctx=await b.new_context(viewport={'width':1280,'height':800},service_workers='block'); pg=await ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:150]))
    async def rt(route):
        r=await route.fetch(); s=await r.text(); await route.fulfill(response=r,body=patch_body(s),headers={**r.headers,'content-type':'text/html; charset=utf-8'})
    await pg.route('**/index.html*',rt)
    await pg.route('**/api/**',lambda r:asyncio.ensure_future(r.fulfill(status=200,content_type='application/json',body='{}')))
    await pg.goto('http://localhost:8833/index.html'); await pg.wait_for_timeout(1200)
    await pg.evaluate('''([cid,ov])=>{ FAST=true; LANG="fr"; ACC.on=true; const st={pts:500,story:{}}; STORY_CH.forEach(c=>st.story[c.id]=3); ACC.user={id:1,name:"Dave",admin:true,stats:st};
      const c=STORY_CH.find(x=>x.id===cid); Object.assign(c,ov); STORY.on=true; STORY.i=STORY_CH.indexOf(c); STORY.diff="n"; STORY.wave=0; STORY.hp=null; storyFight(); }''',[cid,OV])
    t0=time.time(); res=None; lastkey=None; stall=0
    while time.time()-t0<400:
        await pg.wait_for_timeout(700)
        st=await pg.evaluate('''()=>typeof S==="undefined"||!S?null:{over:!!S.over,round:S.round,wave:STORY.wave,p:S.p.team.map(t=>t.hp+"/"+t.max),a:S.a.team.map(t=>t.id+":"+t.hp),win:S.over?S.a.team.every(t=>t.ko||t.hp<=0):null,nw:!!document.querySelector("#stw"),waves:(STORY_CH[STORY.i].waves||[1]).length}''')
        if st is None: res='?'; break
        if st['over']:
            await pg.wait_for_timeout(400)
            if st['win'] and st['wave']+1<st['waves']:
                btn=await pg.query_selector('#stnw,#stwave,#stnext') 
                ok=await pg.evaluate('''()=>{ const b=[...document.querySelectorAll("button")].find(b=>/vague|suivant|continuer|next/i.test(b.textContent)); if(b){ b.click(); return b.textContent; } return null; }''')
                if not ok: res=('VAGUE?',st); break
                await pg.wait_for_timeout(1500); continue
            res=('V' if st['win'] else 'D', st['round'], st['wave'], st['p']); break
        key=json.dumps(st)
        if key==lastkey: stall+=1
        else: stall=0; lastkey=key
        if stall>40: res=('BLOQUE',st); break
    await ctx.close(); return cid,k,res,errs[:2]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        jobs=[one(b,c,k) for c in CH for k in range(N)]
        sem=asyncio.Semaphore(6)
        async def lim(j):
            async with sem: return await j
        out=await asyncio.gather(*[lim(j) for j in jobs])
        await b.close()
    agg={}
    for cid,k,res,errs in out:
        agg.setdefault(cid,[]).append(res); 
        if errs: print(cid,'ERR',errs)
    for cid in CH:
        r=agg[cid]; w=sum(1 for x in r if x and x[0]=='V')
        print(f'{cid}: {w}/{len(r)}  ', r, flush=True)
asyncio.run(main())
