import sys
from PIL import Image
import numpy as np
src,dst=sys.argv[1],sys.argv[2]
a=np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
r,g,b=a[...,0],a[...,1],a[...,2]
mx=a.max(-1); mn=a.min(-1)
# shirt: bright, low saturation, bluish tint
m=(mx>120)&((mx-mn)<70)&(b>=r)
lum=(0.3*r+0.59*g+0.11*b)
w=np.clip(lum*1.08+8,0,255)
out=a.copy()
for c in range(3): out[...,c]=np.where(m,w,a[...,c])
# deepen black coat fabric (dark, unsaturated)
cm=(mx<120)&((mx-mn)<25)&~m
for c in range(3): out[...,c]=np.where(cm,a[...,c]*0.55,out[...,c])
Image.fromarray(out.astype(np.uint8)).save(dst)
print("shirt pixels",int(m.sum()))
