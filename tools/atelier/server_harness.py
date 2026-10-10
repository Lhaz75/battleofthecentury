# exécute le vrai accounts.js dans Chromium (pas de Node sur cette machine) avec des faux modules, pour tester /api/rpg
import sys,io,json
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
from playwright.sync_api import sync_playwright
src=open('accounts.js',encoding='utf-8').read()
JS=r'''
async (src)=>{
  const out=[]; let now=1e12; const realNow=Date.now; Date.now=()=>now;
  const chain=()=>new Proxy(function(){}, {get:(t,k)=>k==="then"?undefined:chain(), apply:()=>chain()});
  const mods={crypto:{createHash:()=>({update(){return this},digest(){return "hash"}}),randomBytes:()=>({toString:()=>"ab".repeat(32)}),scrypt:(a,b,c,cb)=>cb(null,{toString:()=>"x"}),timingSafeEqual:()=>true},
    fs:{readFileSync(){ throw new Error("nofs"); },existsSync:()=>false,writeFileSync(){},mkdirSync(){},renameSync(){}},path:{join:(...a)=>a.join("/"),dirname:x=>x},"./tourney":{install(){}}};
  const require=n=>mods[n]||chain();
  const module={exports:{}}, process={env:{ADMINS:"Dave"}}, saved=[];
  new Function("require","module","exports","__dirname","process","Buffer",src)(require,module,module.exports,".",process,{from:()=>({})});
  const user={id:7,name:"Dave",banned:false,stats:{pts:100,ryoSpent:0,elo:1000,vsW:0,vsL:0,fav:{},ach:{}}};
  const store=new Proxy({}, {get:(t,k)=>k==="session"?async()=>user:k==="saveStats"?async(id,st)=>{ saved.push(JSON.parse(JSON.stringify(st))); }:k==="getSetting"?async()=>null:async()=>null});
  const acc=module.exports.makeAccounts({store,getDuel:()=>null,hasDuel:()=>false,version:"test",ready:Promise.resolve()});
  const call=(body,tok="a".repeat(64))=>new Promise(res=>{ const h={}; let code=0;
    const req={method:"POST",url:"/api/rpg",headers:{authorization:"Bearer "+tok,host:"x"},socket:{remoteAddress:"1.1.1.1"},on(ev,fn){ h[ev]=fn; if(ev==="end") setTimeout(()=>{ h.data&&h.data(JSON.stringify(body)); h.end(); },0); },destroy(){}};
    const rs={writeHead(c){ code=c; },setHeader(){},end(b){ let j={}; try{ j=JSON.parse(b); }catch(e){} res({code,...j}); }};
    acc.handle(req,rs); });
  const inv=()=>JSON.stringify(user.stats.rpg), step=(label,r,extra="")=>out.push(label+" -> "+r.code+" gain="+r.gain+" loot="+JSON.stringify(r.loot)+" first="+r.first+" saved="+r.saved+(r.error?" error="+r.error:"")+" "+extra);
  let r;
  r=await call({act:"win",node:"zeed",team:["maitre","dans"]}); step("1 première victoire zeed",r,"sac="+inv()+" pts="+user.stats.pts);
  r=await call({act:"win",node:"zeed"}); step("2 tout de suite après (anti-spam)",r);
  now+=30000; r=await call({act:"win",node:"zeed"}); step("3 zeed rejoué",r,"pts="+user.stats.pts);
  now+=30000; r=await call({act:"win",node:"jagi"}); step("4 boss première fois",r,"clears="+user.stats.rpgClears);
  now+=30000; r=await call({act:"win",node:"jagi"}); step("5 boss rejoué",r,"sac="+inv()+" pts="+user.stats.pts);
  now+=30000; r=await call({act:"win",node:"faux"}); step("6 étape inconnue",r);
  const bag0=user.stats.rpg.bag.slice();
  r=await call({act:"save",inv:{bag:[...bag0,"casque-jagi","casque-jagi"],eq:{}}}); step("7 triche : deux casques ajoutés",r,"sac inchangé="+(JSON.stringify(user.stats.rpg.bag)===JSON.stringify(bag0)));
  r=await call({act:"save",inv:{bag:[bag0[0]+"~ld1"],eq:{}}}); step("8 triche : qualité inventée",r,"sac inchangé="+(JSON.stringify(user.stats.rpg.bag)===JSON.stringify(bag0)));
  const eqItem=bag0.find(x=>!/^(bandages|gourde|carte-puits|viande-sechee)/.test(x)), rest=bag0.slice(); rest.splice(rest.indexOf(eqItem),1);
  r=await call({act:"save",inv:{bag:rest,eq:{maitre:{hands:eqItem}}}}); step("9 équiper un objet du sac",r,"inv="+inv());
  r=await call({act:"save",inv:{bag:rest.slice(1),eq:{maitre:{hands:eqItem}}}}); step("10 jeter un objet",r,"sac="+user.stats.rpg.bag.length+" (avant "+rest.length+")");
  const before=user.stats.pts-(user.stats.ryoSpent||0);
  r=await call({act:"buy",item:"masque-fer"}); step("11 achat masque de fer",r,"ryō "+before+" -> "+(user.stats.pts-user.stats.ryoSpent)+" dans le sac="+user.stats.rpg.bag.includes("masque-fer"));
  r=await call({act:"buy",item:"casque-jagi"}); step("12 achat d'un objet pas en vente",r);
  user.stats.pts=0; r=await call({act:"buy",item:"gourde"}); step("13 achat sans ryō",r);
  process.env.ADMINS="";
  // tirages : répartition des qualités et des raretés
  const roll=new Function("require","module","exports","__dirname","process","Buffer",src+"\nmodule.exports.rpgRoll=rpgRoll;");
  const m2={exports:{}}; roll(require,m2,m2.exports,".",process,{from:()=>({})});
  const c={n:0,q1:0,q2:0,jagi:0,shin:0,bad:0}; for(let i=0;i<4000;i++){ for(const x of m2.exports.rpgRoll("boss")){ c.n++; if(/~hp[12]$/.test(x)) c.q1++; else if(/~/.test(x)) c.q2++; if(x==="casque-jagi") c.jagi++; if(/^epaulette-shin/.test(x)) c.shin++; if(!/^[a-z][a-z-]{1,23}(~(hp[123]|lg1|my1|ld1|rg1))?$/.test(x)) c.bad++; } }
  out.push("4000 boss : "+JSON.stringify(c)+" sauvegardes="+saved.length);
  Date.now=realNow; return out;
}'''
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    try:
        for l in pg.evaluate(JS,src): print(l)
    except Exception as e: print('ERREUR',str(e)[:1500])
    print('erreurs page',errs); b.close()
