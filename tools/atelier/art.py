# remplace l'illustration d'un perso : <id>.webp (540x810), bust-<id>.webp, face-<id>.webp, cadrage PZ / EYES, date dans ART_AT
import sys,re,time
from PIL import Image
def put(SP,E,src=None):
    sys.path.insert(0,SP); from ed import edit
    s=open('public/index.html',encoding='utf-8').read(); src=src or {}
    blocks={k:re.search(r'const '+k+r'=\{.*?\};',s).group(0) for k in ('PZ','EYES')}; nb=dict(blocks)
    for id,(x,y,z) in E.items():
        im=Image.open(f'{SP}/clean/{src.get(id,id)}.png').convert('RGBA').resize((540,810),Image.LANCZOS)
        im.save(f'public/assets/{id}.webp','WEBP',quality=88,method=6)
        def crop(w,h,top,size):
            l=max(0,min(540-w,round(x-w/2))); t=max(0,round(y-top)); return im.crop((l,t,l+round(w),t+round(h))).resize(size,Image.LANCZOS)
        crop(2.8*z,3.5*z,1.25*z,(200,250)).save(f'public/assets/bust-{id}.webp','WEBP',quality=88,method=6)
        crop(2.0*z,2.0*z,1.0*z,(96,96)).save(f'public/assets/face-{id}.webp','WEBP',quality=88,method=6)
        for k,new in (('PZ',f'"{id}":[{x},{y},{z}]'),('EYES',f'"{id}":[{x},{y}]')):
            m=re.search(r'"'+id+r'":\[[^\]]*\]',nb[k])
            nb[k]=nb[k].replace(m.group(0),new) if m else nb[k][:-2]+','+new+'};'
    t=int(time.time()*1000); at=re.search(r'const ART_AT=\{[^}]*\};',s).group(0); na=at
    for id in E:
        m=re.search(r'\b'+id+r':\d+',na); na=na.replace(m.group(0),f'{id}:{t}') if m else na[:-2]+f',{id}:{t}'+'};'
    edit('public/index.html',[(blocks['PZ'],nb['PZ']),(blocks['EYES'],nb['EYES']),(at,na)])
