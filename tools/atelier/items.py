# illustrations d'objets de David -> public/assets/item-<id>.webp (256 px, fond retiré, rognées)
import sys,glob,os
import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageOps
SP=sys.argv[1]; sheet=[]
LOW={'item-epaulette-shin':(118,9),'item-masque-fer':(150,5)}
for f in sorted(glob.glob('D:/Doomstar/RPG/images/item-*.png')):
    src=Image.open(f); name=os.path.basename(f)[:-4]
    im=src.convert('RGBA')
    if src.mode=='RGB':   # faux fond transparent (damier gris clair incrusté)
        rgb=np.array(src).astype(int); lo,sat=LOW.get(name,(185,16))   # damier plus sombre sur certaines images : seuil au cas par cas
        bg=(rgb.min(2)>lo)&((rgb.max(2)-rgb.min(2))<sat)
        m=ImageOps.expand(Image.fromarray((bg*255).astype(np.uint8)),1,255)
        ImageDraw.floodfill(m,(0,0),128)
        grey=rgb.mean(2); a=np.array(m)   # poches de damier enfermées dans l'objet : on vide d'abord les miettes, puis on juge les grandes
        small=Image.fromarray(((a==255)*255).astype(np.uint8)).filter(ImageFilter.MinFilter(15)).filter(ImageFilter.MaxFilter(15))
        cand=np.array(small)==255
        for _ in range(60):
            ys,xs=np.nonzero(cand&(np.array(m)==255))
            if not len(ys): break
            ImageDraw.floodfill(m,(int(xs[0]),int(ys[0])),200); reg=np.array(m)[1:-1,1:-1]==200; n=int(reg.sum()); g=grey[reg]
            hit=n>1500 and g.mean()>(226 if lo>=185 else lo+15) and g.std()>9; print(name,n,round(float(g.mean())),round(float(g.std()),1),hit)
            m=m.point(lambda v:(128 if hit else 1) if v==200 else v)
        out=np.array(m)[1:-1,1:-1]==128
        outi=Image.fromarray((out*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
        al=ImageOps.invert(outi).filter(ImageFilter.GaussianBlur(1.2)).point(lambda v:0 if v<128 else min(255,(v-128)*2))
        im.putalpha(al)
    bb=im.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox(); im=im.crop(bb)
    n=max(im.size); sq=Image.new('RGBA',(n,n),(0,0,0,0)); sq.paste(im,((n-im.width)//2,(n-im.height)//2))
    sq=sq.resize((256,256),Image.LANCZOS); sq.save(f'public/assets/{name}.webp','WEBP',quality=88,method=6); sheet.append(sq)
S=Image.new("RGBA",(256*6,256*3),(40,24,60,255))
for i,s in enumerate(sheet): S.alpha_composite(s,((i%6)*256,(i//6)*256))
S.convert('RGB').save(SP+'/shots/items-sheet.png')
