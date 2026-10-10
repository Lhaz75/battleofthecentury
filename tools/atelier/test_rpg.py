import sys,json,io
from playwright.sync_api import sync_playwright
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
SP=sys.argv[1]; errs=[]
VP={'pc':(1280,800),'port':(375,812),'land':(812,375)}
with sync_playwright() as p:
    b=p.chromium.launch()
    for name,(w,h) in VP.items():
        pg=b.new_page(viewport={'width':w,'height':h})
        pg.on('pageerror',lambda e:errs.append(name+' PAGEERR '+str(e)))
        pg.on('console',lambda m:errs.append(name+' CONSOLE '+m.text) if m.type=='error' and 'Failed to load resource' not in m.text and 'WebSocket' not in m.text else None)
        pg.route('**/api/rpg',lambda r:r.fulfill(status=200,content_type='application/json',body='{"gain":6}'))
        pg.goto('http://localhost:8822/index.html'); pg.wait_for_timeout(1500)
        shot=lambda n:pg.screenshot(path=f'{SP}/shots/{name}-{n}.png')
        ev=pg.evaluate
        ev('''()=>{ localStorage.removeItem("boc-rpg-run"); ACC.on=true; ACC.user={id:1,name:"Dave",admin:true,stats:{pts:500}}; LANG="fr"; renderTitle([]); }''')
        pg.wait_for_timeout(600); print(name,'home has rpg:',ev('()=>!!document.querySelector(\'.hmi[data-m="rpg"]\')')); 
        if name=='pc':
            pg.hover('.hmi[data-m="rpg"]'); pg.wait_for_timeout(300); shot('0home')
        ev('()=>{ MODE="solo"; ME="p"; rpgStart(["maitre","dans","mamiya"]); }'); pg.wait_for_timeout(500); shot('1map')
        print(' run',ev('()=>JSON.stringify(RPG.run)'))
        # dégâts de base d'un Léger avant équipement
        def win():
            ev('()=>{ S.a.team.forEach(t=>{t.hp=0;t.ko=true}); S.p.team[0].hp=Math.max(1,S.p.team[0].hp-7); S.over=true; renderEnd(true); }'); pg.wait_for_timeout(400)
        pg.click('#rggo'); pg.wait_for_timeout(2500); shot('2fight')
        print(' fight',ev('()=>JSON.stringify({rpg:S.rpg,foe:S.a.team.map(t=>t.id+":"+t.max),me:S.p.team.map(t=>t.hp+"/"+t.max),rage:S.p.rage,ai:S.aiSkill})'))
        win(); shot('3loot'); print(' loot',ev('()=>JSON.stringify([S.rpgRes.loot,RPG.run.hp,rpgInv().bag])'))
        pg.click('#rgnext'); pg.wait_for_timeout(400); shot('4map2')
        # bazar
        pg.click('.rgn[data-n="bazar"]'); pg.wait_for_timeout(200); pg.click('#rggo'); pg.wait_for_timeout(300); shot('5shop')
        pg.click('.rgbuy >> nth=1'); pg.wait_for_timeout(400); print(' after buy',ev('()=>JSON.stringify([rpgInv().bag,RPG.run.sold])'))
        # équipement : donner tous les objets pour voir l'écran rempli
        ev('()=>{ ["gants-cloutes","talisman-yuria","ceinture-ermite","brassard-nanto","casque-jagi","bottes-desert","bandages","gourde","carte-puits","epaulettes","bandana","masque-fer","viande-sechee","ceinturon-clous","epaulette-shin","casque-punk"].forEach(rpgAdd); }')
        pg.click('#rgeq'); pg.wait_for_timeout(300)
        def equip(nm):
            i=ev('(n)=>rpgInv().bag.indexOf(n)',nm); pg.click(f'button.rgcell[data-i="{i}"]'); pg.wait_for_timeout(150); pg.click('#rgact'); pg.wait_for_timeout(150)
        equip('gants-cloutes'); equip('bottes-desert'); equip('casque-jagi')
        i=ev('()=>rpgInv().bag.indexOf("bandages")'); pg.click(f'button.rgcell[data-i="{i}"]'); pg.wait_for_timeout(200); shot('6equip')
        print(' eq',ev('()=>JSON.stringify([rpgInv().eq,RPG.run.hp,rpgMaxes()])'))
        pg.click('#rgact'); pg.wait_for_timeout(200); print(' after bandage',ev('()=>JSON.stringify(RPG.run.hp)'))
        pg.click('.rgtab >> nth=1'); pg.wait_for_timeout(150); equip('talisman-yuria'); equip('ceinture-ermite')
        pg.click('.rgslot[data-s="waist"]'); pg.wait_for_timeout(150); pg.click('#rgact'); pg.wait_for_timeout(150); equip('ceinture-ermite')
        pg.click('#back'); pg.wait_for_timeout(300)
        # événement
        pg.click('#rggo'); pg.wait_for_timeout(300); shot('7event')
        pg.click('.rgch[data-c="B"]'); pg.wait_for_timeout(300); print(' event B',ev('()=>JSON.stringify([RPG.run.hp,RPG.run.rage,RPG.run.at,RPG.run.ev])'))
        # élite : vérifie les bonus en combat
        pg.click('.rgn[data-n="kiba"]'); pg.wait_for_timeout(200); shot('8elite'); pg.click('#rggo'); pg.wait_for_timeout(2500)
        print(' elite',ev('''()=>{ const s=S.p, c0=Object.values(CARDS).find(c=>c.owner==="maitre"&&c.kind==="atk"&&c.lvl===0), c2=Object.values(CARDS).find(c=>c.owner==="maitre"&&c.kind==="atk"&&c.lvl===2);
           const a=[hitDamage("p",c0),hitDamage("p",c2)]; const keep=S.rpg; S.rpg=null; const b=[hitDamage("p",c0),hitDamage("p",c2)]; S.rpg=keep;
           s.active=1; S.round=1; startTurn("p"); const e1=s.end; return JSON.stringify({withItems:a,without:b,rage:s.rage,endDans:e1,foe:S.a.team.map(t=>t.id+":"+t.max),me:s.team.map(t=>t.hp+"/"+t.max)}); }'''))
        win(); pg.click('#rgnext'); pg.wait_for_timeout(300)
        pg.click('#rggo'); pg.wait_for_timeout(2500); print(' boss',ev('()=>JSON.stringify({foe:S.a.team.map(t=>t.id+":"+t.max),rage:S.a.rage})'))
        win(); shot('9bossloot'); pg.click('#rgnext'); pg.wait_for_timeout(300); shot('10clear')
        print(' clear',ev('()=>JSON.stringify([RPG.run.clear,RPG.run.done,rpgInv().bag.length])'))
        # reprise après rechargement + défaite
        ev('()=>{ renderTitle([]); }'); pg.wait_for_timeout(300); print(' resume ok',ev('()=>{ const r=rpgLoad(); return !!r&&r.clear===1; }'))
        ev('()=>{ rpgStart(["maitre","dans","mamiya"]); }'); pg.wait_for_timeout(300); pg.click('.rgn[data-n="oasis"]',force=True) if False else None
        pg.click('#rggo'); pg.wait_for_timeout(2500); ev('()=>{ S.p.team.forEach(t=>{t.hp=0;t.ko=true}); S.over=true; renderEnd(false); }'); pg.wait_for_timeout(400); shot('11lose')
        print(' lose run:',ev('()=>JSON.stringify([RPG.run,localStorage.getItem("boc-rpg-run"),rpgInv().bag.length])'))
        # repos
        ev('()=>{ rpgStart(["maitre","dans","mamiya"]); RPG.run.at="zeed"; RPG.run.done.push("zeed"); RPG.run.hp=[5,0,9]; renderRpg(); }'); pg.wait_for_timeout(300)
        pg.click('.rgn[data-n="oasis"]'); pg.wait_for_timeout(200); pg.click('#rggo'); pg.wait_for_timeout(900); shot('12rest'); print(' rest',ev('()=>JSON.stringify(RPG.run.hp)'))
        for lg in ('en','it','ja'):
            ev('(l)=>{ LANG=l; renderRpg(); }',lg); pg.wait_for_timeout(250)
            if name=='pc': shot('13map-'+lg)
        pg.close()
    b.close()
print('ERRORS',len(errs)); [print(' ',e[:300]) for e in errs[:20]]
