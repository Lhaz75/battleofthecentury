import sys,io,json
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
from playwright.sync_api import sync_playwright
SP=sys.argv[1]; errs=[]
KIND={'zeed':'fight','old':'event','kiba':'elite','ruines':'fight','jagi':'boss'}
LOOT={'zeed':['gants-cloutes~hp2'],'old':['talisman-yuria'],'kiba':['brassard-nanto~my1'],'ruines':['bottes-desert'],'jagi':['ceinture-ermite~rg1','bandana']}
PRICE={'bottes-desert':20,'bandages':20,'gourde':20,'bandana':20,'gants-cloutes':40,'epaulettes':40,'casque-punk':40,'viande-sechee':40,'talisman-yuria':80,'carte-puits':80,'masque-fer':80,'ceinturon-clous':80}
def fake():
    st={'pts':500,'ryoSpent':0,'rpg':{'bag':[],'eq':{}},'rpgSeen':{}}
    def h(route):
        b=json.loads(route.request.post_data or '{}'); act=b.get('act','save'); out={'gain':0,'loot':[],'lost':0,'first':False,'saved':'ok'}
        if act=='win':
            n=b['node']; k=KIND[n]; first=('mamiya:'+n) not in st['rpgSeen']; st['rpgSeen']['mamiya:'+n]=1
            out['first']=first; out['gain']={'fight':6,'event':8,'elite':10,'boss':25}[k] if first else {'fight':1,'event':1,'elite':2,'boss':5}[k]; st['pts']+=out['gain']
            if first or k=='boss': out['loot']=LOOT[n]; st['rpg']['bag']+=LOOT[n]
        elif act=='buy': st['ryoSpent']+=PRICE[b['item']]; st['rpg']['bag'].append(b['item'])
        else: st['rpg']=b['inv']
        out['user']={'id':1,'name':'Dave','admin':True,'stats':json.loads(json.dumps(st))}
        route.fulfill(status=200,content_type='application/json',body=json.dumps(out))
    return h
with sync_playwright() as p:
    b=p.chromium.launch()
    for name,(w,h) in {'pc':(1280,800),'port':(375,812),'land':(812,375)}.items():
        pg=b.new_page(viewport={'width':w,'height':h}); pg.on('pageerror',lambda e:errs.append(name+' '+str(e)))
        pg.route('**/api/rpg',fake()); pg.goto('http://localhost:8822/index.html'); pg.wait_for_timeout(1500); ev=pg.evaluate
        shot=lambda n:pg.screenshot(path=f'{SP}/shots/lt-{name}-{n}.png')
        def win(): ev('()=>{ S.a.team.forEach(t=>{t.hp=0;t.ko=true}); S.over=true; renderEnd(true); }'); pg.wait_for_timeout(600)
        ev('()=>{ localStorage.removeItem("boc-rpg-run"); ACC.on=true; ACC.user={id:1,name:"Dave",admin:true,stats:{pts:500}}; LANG="fr"; MODE="solo"; ME="p"; rpgStart(["maitre","dans","mamiya"]); }'); pg.wait_for_timeout(400)
        pg.click('#rggo'); pg.wait_for_timeout(2500); win(); shot('1loot')
        print(name,'butin 1:',ev('()=>JSON.stringify([S.rpgRes.loot,rpgInv().bag,document.querySelector("#rgloot").innerText.replace(/\\n/g," / ").slice(0,90),document.querySelector("#accline").textContent])'))
        pg.click('#rgnext'); pg.wait_for_timeout(400)
        pg.click('.rgn[data-n="bazar"]'); pg.wait_for_timeout(150); pg.click('#rggo'); pg.wait_for_timeout(300); pg.click('.rgbuy >> nth=0'); pg.wait_for_timeout(500)
        print(name,'achat:',ev('()=>JSON.stringify([rpgInv().bag,RPG.run.sold,ryoNow()])'))
        pg.click('#rgeq'); pg.wait_for_timeout(300)
        i=ev('()=>rpgInv().bag.indexOf("gants-cloutes~hp2")'); pg.click(f'button.rgcell[data-i="{i}"]'); pg.wait_for_timeout(150); shot('2equip'); pg.click('#rgact'); pg.wait_for_timeout(400)
        print(name,'équipé:',ev('()=>JSON.stringify({eq:rpgInv().eq,hp:rpgStat("maitre","hp"),leger:rpgStat("maitre","dmg",0),max:rpgMaxes(),nom:rpgName("gants-cloutes~hp2"),fx:rpgFx("gants-cloutes~hp2"),fx2:rpgFx("ceinture-ermite~rg1")})'))
        # deuxième voyage : zeed déjà pillé
        ev('()=>{ rpgStart(["maitre","dans","mamiya"]); }'); pg.wait_for_timeout(400); shot('3seen')
        print(name,'rejeu:',ev('()=>document.querySelector(".rgloot").innerText.replace(/\\n/g," / ")'))
        pg.click('#rggo'); pg.wait_for_timeout(2500); win(); shot('4none')
        print(name,'butin rejeu:',ev('()=>JSON.stringify([S.rpgRes.loot,document.querySelector("#rgloot").innerText,document.querySelector("#accline").textContent])'))
        # boss : butin à chaque fois
        ev('()=>{ RPG.run.at="kiba"; RPG.run.done.push("bazar","old","kiba"); renderRpg(); }'); pg.wait_for_timeout(300); pg.click('#rggo'); pg.wait_for_timeout(2500); win()
        pg.click('#rgnext'); pg.wait_for_timeout(300); ev('()=>{ rpgStart(["maitre","dans","mamiya"]); RPG.run.at="kiba"; RPG.run.done.push("zeed","bazar","old","kiba"); renderRpg(); }'); pg.wait_for_timeout(300)
        print(name,'boss rejeu, panneau:',ev('()=>document.querySelector(".rgloot").innerText.replace(/\\n/g," / ")'))
        pg.click('#rggo'); pg.wait_for_timeout(2500); win(); shot('5boss')
        print(name,'boss rejeu, butin:',ev('()=>JSON.stringify([S.rpgRes.loot,rpgInv().bag.length])'))
        # serveur muet
        pg.unroute('**/api/rpg'); pg.route('**/api/rpg',lambda r:r.fulfill(status=500,body='{}'))
        ev('()=>{ rpgStart(["maitre","dans","mamiya"]); }'); pg.wait_for_timeout(300); pg.click('#rggo'); pg.wait_for_timeout(2500); win()
        print(name,'serveur en panne:',ev('()=>document.querySelector("#rgloot").innerText'))
        pg.close()
    b.close()
print('erreurs',errs)
