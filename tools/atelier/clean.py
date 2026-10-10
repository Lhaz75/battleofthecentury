# retire le faux fond transparent (damier gris neutre incrusté) des illustrations : remplissage depuis les bords + poches enfermées qui ont les deux tons du damier
import sys,os
import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageOps
def clean(src,log=None,faded=False):   # faded : damier délavé (presque blanc) dans les poches, cas de soldat-cassandra
    rgb=np.array(src.convert('RGB')).astype(int); grey=rgb.mean(2)
    bg=(rgb.min(2)>198)&((rgb.max(2)-rgb.min(2))<8)
    m=ImageOps.expand(Image.fromarray((bg*255).astype(np.uint8)),1,255)
    ImageDraw.floodfill(m,(0,0),128)
    a=np.array(m)
    cand=np.array(Image.fromarray(((a==255)*255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)))==255
    for _ in range(3000):
        ys,xs=np.nonzero(cand&(np.array(m)==255))
        if not len(ys): break
        ImageDraw.floodfill(m,(int(xs[0]),int(ys[0])),200); reg=np.array(m)[1:-1,1:-1]==200; n=int(reg.sum()); g=grey[reg]
        dark=((g>202)&(g<228)).mean(); light=(g>244).mean(); mid=((g>=228)&(g<=244)).mean(); hit=n>50 and ((dark>.2 and light>.2 and dark+light>.8) or (faded and n>1500 and mid>.35))
        if log is not None and n>250: log.append((n,round(float(dark),2),round(float(light),2),hit))
        m=m.point(lambda v:(128 if hit else 1) if v==200 else v)
    out=np.array(m)[1:-1,1:-1]==128
    outi=Image.fromarray((out*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
    al=ImageOps.invert(outi).filter(ImageFilter.GaussianBlur(1.1)).point(lambda v:0 if v<128 else min(255,(v-128)*2))
    im=src.convert('RGBA'); im.putalpha(al); return im
if __name__=='__main__':
    SP=sys.argv[1]; names=sys.argv[2:]; T=(400,600); cols=5
    S=Image.new('RGBA',(T[0]*cols,T[1]*((len(names)+cols-1)//cols)),(46,20,70,255))
    for i,n in enumerate(names):
        log=[]; im=clean(Image.open(f'D:/Doomstar/{n}.png'),log,n=='soldat-cassandra'); im.save(f'{SP}/clean/{n}.png')
        print(n,'poches:',log)
        t=im.copy(); t.thumbnail(T); S.alpha_composite(t,((i%cols)*T[0]+(T[0]-t.width)//2,(i//cols)*T[1]))
    S.convert('RGB').save(SP+'/shots/clean-sheet.png')
