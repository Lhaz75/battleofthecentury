import sys,io,json
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
from playwright.sync_api import sync_playwright
SP=sys.argv[1]; errs=[]
LOGIN='''()=>{ ACC.on=true; const st={pts:500,story:{}}; STORY_CH.forEach(c=>{ if(!/^arc2-1[0-6]$/.test(c.id)) st.story[c.id]=3; }); ACC.user={id:1,name:"Dave",admin:true,stats:st}; LANG="fr"; STORY.diff="n"; }'''
with sync_playwright() as p:
    b=p.chromium.launch()
    for name,(w,h) in {'pc':(1280,800),'port':(375,812),'land':(812,375)}.items():
        pg=b.new_page(viewport={'width':w,'height':h}); pg.on('pageerror',lambda e:errs.append(name+' '+str(e)))
        pg.route('**/api/story',lambda r:r.fulfill(status=200,content_type='application/json',body='{}'))
        pg.goto('http://localhost:8822/index.html'); pg.wait_for_timeout(1500); ev=pg.evaluate
        ev(LOGIN); ev('()=>{ ST_ARC=2; renderStory([]); }'); pg.wait_for_timeout(500); pg.screenshot(path=f'{SP}/shots/a2-list-{name}.png',full_page=False)
        idx=ev('()=>STORY_CH.findIndex(c=>c.id==="arc2-10")')
        if name=='pc':
            print('version',ev('()=>APP_VERSION'))
            for lg in ('fr','en','it','ja'):
                print(lg,ev('''(l)=>{ LANG=l; const bad=[]; STORY_CH.filter(c=>/^arc2-1[0-6]$/.test(c.id)).forEach(c=>{ for(const k of ["st_t_","st_i_","st_o_"]) if(!L(k+c.id)) bad.push(k+c.id); }); if(!L("st_m_arc2-16")) bad.push("m"); return STORY_CH.filter(c=>/^arc2-1[0-6]$/.test(c.id)).map(c=>L("st_t_"+c.id)).join(" | ")+" || manquants: "+bad.join(",")+" || "+L("stFled","Bella"); }''',lg))
            ev('()=>{ LANG="fr"; }')
            for k in range(7):
                ev('(i)=>{ renderStoryChapter(i); }',idx+k); pg.wait_for_timeout(300)
                ok=ev('()=>!!document.querySelector("#stgo")'); pg.click('#stgo'); pg.wait_for_timeout(2600)
                print(' ch',10+k,ok,ev('()=>JSON.stringify({me:S.p.team.map(t=>t.id+":"+t.max),foe:S.a.team.map(t=>t.id+":"+t.max),rage:S.a.rage,flee:S.flee||null,ai:S.aiSkill})'))
                ev('()=>{ S.over=true; S.dead=true; }')
        # chapitre 10, vague 2 : Bella s'éclipse pour de vrai après son attaque
        ev('(i)=>{ renderStoryChapter(i); STORY.wave=1; storyFight(); }',idx); pg.wait_for_timeout(3000)
        ev('()=>{ endTurn("p"); }')
        for _ in range(40):
            pg.wait_for_timeout(700)
            if ev('()=>S.turn==="p" && !S.busy'): break
        print(name,'ch10 bella:',ev('()=>JSON.stringify({team:S.a.team.map(t=>t.id+(t.fled?"(partie)":"")+":"+t.hp),active:act(S.a).id,koLog:(S.koLog||[]).map(x=>x.id),log:S.log})'))
        pg.screenshot(path=f'{SP}/shots/a2-bella-{name}.png')
        ev('()=>{ S.over=true; S.dead=true; }')
        # chapitre 16 : Rei perd, Kenshiro reprend
        ev('(i)=>{ renderStoryChapter(i); }',idx+6); pg.wait_for_timeout(400); pg.screenshot(path=f'{SP}/shots/a2-ch16-{name}.png')
        pg.click('#stgo'); pg.wait_for_timeout(2600)
        ev('()=>{ S.p.team.forEach(t=>{t.hp=0;t.ko=true}); S.over=true; renderEnd(false); }'); pg.wait_for_timeout(500); pg.screenshot(path=f'{SP}/shots/a2-fall-{name}.png')
        print(name,'après chute:',ev('()=>JSON.stringify({wave:STORY.wave,h1:document.querySelector("h1").textContent,btn:!!document.querySelector("#stw")})'))
        pg.click('#stw'); pg.wait_for_timeout(2600)
        print(name,'vague 2:',ev('()=>JSON.stringify({me:S.p.team.map(t=>t.id+":"+t.hp+"/"+t.max),foe:S.a.team.map(t=>t.id+":"+t.max),rage:S.a.rage})'))
        ev('()=>{ S.a.team.forEach(t=>{t.hp=0;t.ko=true}); S.over=true; renderEnd(true); }'); pg.wait_for_timeout(700); pg.screenshot(path=f'{SP}/shots/a2-end-{name}.png')
        print(name,'fin:',ev('()=>document.querySelector("h1").textContent+" | "+(document.querySelector(".stintro")||{}).textContent'))
        pg.close()
    b.close()
print('erreurs',errs)
