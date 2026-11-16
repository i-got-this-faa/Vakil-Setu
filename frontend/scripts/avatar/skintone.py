# Shift skin pixels toward a target mean tone, soft-masked by hue/saturation so seams don't show.
# usage: python skintone.py <in> <out> <R> <G> <B> [--atlas]   (R,G,B = target mean skin albedo)
import sys, numpy as np
from PIL import Image, ImageFilter
src,dst=sys.argv[1],sys.argv[2]; tgt=np.array([float(x) for x in sys.argv[3:6]]); atlas='--atlas' in sys.argv
im=Image.open(src).convert('RGB'); a=np.asarray(im).astype(np.float32)
hsv=np.asarray(im.convert('HSV')).astype(np.float32); h=hsv[...,0]*360/255; s=hsv[...,1]/255; v=hsv[...,2]/255
ramp=lambda x,lo,hi: np.clip((x-lo)/(hi-lo),0,1)
w=ramp(h,2,10)*(1-ramp(h,40,50))*ramp(s,0.12,0.25)*ramp(v,0.10,0.22)
H,W=w.shape
if atlas: w[int(0.60*H):, :int(0.34*W)]=0          # mouth interior + eyeball atlas
w=np.asarray(Image.fromarray((w*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))).astype(np.float32)/255
core=(w>0.9)&(v>0.42); cur=a[core].mean(0)
ratio=tgt/cur; print('current mean',cur.round(1),'ratio',ratio.round(3))
out=a*(1-w[...,None])+np.clip(a*ratio,0,255)*w[...,None]
Image.fromarray(out.astype(np.uint8)).save(dst)
