"""Detach the doll's own heart from Heart_Voodoo-3d.glb into public/assets/heart.glb.
Run from the project root: python3 scripts/extract-heart.py  (needs numpy, djpeg, ffmpeg)
Steps: load mesh -> classify vertices red by base-color texture -> grow + keep chest-region
components -> repack the heart UV islands into a 2048 atlas -> write a standalone GLB."""
import os; W=os.path.join(os.environ.get("TMPDIR","/tmp"),"heart-extract"); os.makedirs(W,exist_ok=True); SRC=os.path.abspath("Heart_Voodoo-3d.glb"); OUT=os.path.abspath("public/assets/heart.glb"); os.chdir(W)
import json,struct,numpy as np,sys
f=SRC
d=open(f,'rb').read()
n=struct.unpack('<I',d[12:16])[0]
j=json.loads(d[20:20+n]); b0=20+n+8
bv=j['bufferViews']
def acc(i,dt,w):
  a=j['accessors'][i]; v=bv[a['bufferView']]
  o=b0+v.get('byteOffset',0)+a.get('byteOffset',0)
  return np.frombuffer(d,dt,a['count']*w,o).reshape(-1,w) if w>1 else np.frombuffer(d,dt,a['count'],o)
pos=acc(0,np.float32,3); uv=acc(1,np.float32,2); nor=acc(2,np.float32,3); idx=acc(3,np.uint32,1)
np.savez('mesh.npz',pos=pos,uv=uv,nor=nor,idx=idx)
for k,i in enumerate([4,5,6]):
  v=bv[i]; open(f'tex{k}.jpg','wb').write(d[b0+v.get('byteOffset',0):b0+v.get('byteOffset',0)+v['byteLength']])
print(pos.shape, idx.shape)
import subprocess
for k in (0,2): subprocess.run(f"djpeg -pnm tex{k}.jpg > tex{k}.ppm",shell=True,check=True)
import numpy as np
m=np.load('mesh.npz'); pos=m['pos']; uv=m['uv']; idx=m['idx'].reshape(-1,3)
def ppm(f):
  d=open(f,'rb').read(); parts=d.split(b'\n',3); w,h=map(int,parts[1].split()); return np.frombuffer(parts[3],np.uint8).reshape(h,w,3)
img=ppm('tex0.ppm').astype(np.float32); H,W,_=img.shape
x=np.clip((uv[:,0]*W).astype(int),0,W-1); y=np.clip((uv[:,1]*H).astype(int),0,H-1)  # glTF uv: origin top-left
c=img[y,x]; r,g,b=c[:,0],c[:,1],c[:,2]
red=(r>g*1.35)&(r>b*1.35)&(r>60)
print('red verts',red.sum())
P=pos[red]; print('red bbox',P.min(0),P.max(0))
np.save('red.npy',red)
# histogram of red verts by y,z
print(np.percentile(P,[1,5,50,95,99],axis=0))
import numpy as np
m=np.load('mesh.npz'); pos=m['pos']; uv=m['uv']; idx=m['idx'].reshape(-1,3)
red=np.load('red.npy')
lo=np.array([-0.014,0.025,-0.010]); hi=np.array([0.015,0.060,0.013])
inbox=np.all((pos>lo)&(pos<hi),axis=1)
cnt=red[idx].sum(1)
tri=(cnt>=2)&inbox[idx].all(1)
print('heart tris',tri.sum())
# dilation: add tris sharing 2 verts... grow via vertex adjacency 3 rings within box, only if non-cloth (not light beige)
def ppm(f):
  d=open(f,'rb').read(); p=d.split(b'\n',3); w,h=map(int,p[1].split()); return np.frombuffer(p[3],np.uint8).reshape(h,w,3)
img=ppm('tex0.ppm').astype(np.float32); H,W,_=img.shape
c=img[np.clip((uv[:,1]*H).astype(int),0,H-1),np.clip((uv[:,0]*W).astype(int),0,W-1)]
lum=c.mean(1); sat=c.max(1)-c.min(1)
cloth=(sat<35)&(lum>70)
for it in range(4):
  hv=np.zeros(len(pos),bool); hv[idx[tri].ravel()]=True
  add=hv[idx].any(1)&inbox[idx].all(1)&~cloth[idx].any(1)&~tri
  tri|=add; print('grow',it,add.sum())
# connected components by shared verts (union-find)
T=np.where(tri)[0]; sub=idx[T]
par=np.arange(len(pos))
def find(a):
  while par[a]!=a: par[a]=par[par[a]]; a=par[a]
  return a
for a,b,c2 in sub:
  for u,v in((a,b),(b,c2)):
    ru,rv=find(u),find(v)
    if ru!=rv: par[ru]=rv
roots=np.array([find(a) for a in sub[:,0]])
u,k=np.unique(roots,return_counts=True); order=np.argsort(-k); print('components',k[order][:8])
keep=np.isin(roots,u[order][k[order]>200])
T=T[keep]; print('final tris',len(T))
P=pos[np.unique(idx[T])]; print(P.min(0),P.max(0))
np.save('hearttris.npy',T)
import numpy as np, json, struct, subprocess
m=np.load('mesh.npz'); pos=m['pos']; uv=m['uv']; nor=m['nor']; idx=m['idx'].reshape(-1,3)
T=np.load('hearttris.npy'); sub=idx[T]
verts,inv=np.unique(sub.ravel(),return_inverse=True); faces=inv.reshape(-1,3).astype(np.uint32)
P=pos[verts].astype(np.float32); N=nor[verts].astype(np.float32); UV=uv[verts].astype(np.float64)
def ppm(f):
  d=open(f,'rb').read(); p=d.split(b'\n',3); w,h=map(int,p[1].split()); return np.frombuffer(p[3],np.uint8).reshape(h,w,3)
base=ppm('tex0.ppm'); nrm=ppm('tex2.ppm'); S=base.shape[0]
# components over local verts
par=np.arange(len(verts))
def find(a):
  r=a
  while par[r]!=r: r=par[r]
  while par[a]!=r: par[a],a=r,par[a]
  return r
for a,b,c in faces:
  for u,v in((a,b),(b,c)):
    ru,rv=find(u),find(v)
    if ru!=rv: par[ru]=rv
root=np.array([find(i) for i in range(len(verts))])
comps=np.unique(root)
pad=6
boxes=[]
for r in comps:
  sel=root==r; px=UV[sel]*S
  x0,y0=np.floor(px.min(0)).astype(int)-pad; x1,y1=np.ceil(px.max(0)).astype(int)+pad
  x0,y0=max(x0,0),max(y0,0); x1,y1=min(x1,S),min(y1,S)
  boxes.append((r,x0,y0,x1-x0,y1-y0))
area=sum(b[3]*b[4] for b in boxes); print('islands',len(boxes),'area px',area, 'sqrt',area**.5)
A=2048
while True:
  boxes.sort(key=lambda b:-b[4]); x=y=rowh=0; place={}; ok=True
  for r,bx,by,w,h in boxes:
    if x+w>A: x=0;y+=rowh;rowh=0
    if y+h>A: ok=False;break
    place[r]=(x,y); x+=w; rowh=max(rowh,h)
  if ok: break
  A*=2
print('atlas',A)
outB=np.zeros((A,A,3),np.uint8); outB[:]=(60,8,10); outN=np.zeros((A,A,3),np.uint8); outN[:]=(128,128,255)
newUV=np.zeros_like(UV)
for r,bx,by,w,h in boxes:
  ox,oy=place[r]
  outB[oy:oy+h,ox:ox+w]=base[by:by+h,bx:bx+w]; outN[oy:oy+h,ox:ox+w]=nrm[by:by+h,bx:bx+w]
  sel=root==r; newUV[sel]=(UV[sel]*S-[bx,by]+[ox,oy])/A
for name,arr in(('hb',outB),('hn',outN)):
  open(name+'.ppm','wb').write(b'P6\n%d %d\n255\n'%(A,A)+arr.tobytes())
  subprocess.run(['ffmpeg','-loglevel','error','-y','-i',name+'.ppm','-q:v','2',name+'.jpg'],check=True)
np.savez('heart.npz',P=P,N=N,UV=newUV.astype(np.float32),F=faces)
print('verts',len(P),'faces',len(faces))
import numpy as np, json, struct
h=np.load('heart.npz'); P,N,UV,F=h['P'],h['N'],h['UV'],h['F']
N=N/np.linalg.norm(N,axis=1,keepdims=True)
blobs=[F.astype(np.uint32).tobytes(),P.tobytes(),N.astype(np.float32).tobytes(),UV.tobytes(),open('hb.jpg','rb').read(),open('hn.jpg','rb').read()]
bin=b''; views=[]
for i,bl in enumerate(blobs):
  while len(bin)%4: bin+=b'\0'
  v={'buffer':0,'byteOffset':len(bin),'byteLength':len(bl)}
  if i==0: v['target']=34963
  elif i<4: v['target']=34962
  views.append(v); bin+=bl
while len(bin)%4: bin+=b'\0'
j={'asset':{'version':'2.0','generator':'rr-heart-extract'},'scene':0,'scenes':[{'nodes':[0]}],
 'nodes':[{'mesh':0,'name':'Heart'}],
 'meshes':[{'name':'Heart','primitives':[{'attributes':{'POSITION':1,'NORMAL':2,'TEXCOORD_0':3},'indices':0,'material':0}]}],
 'materials':[{'name':'HeartFlesh','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':0.4},'normalTexture':{'index':1},'doubleSided':True}],
 'textures':[{'source':0,'sampler':0},{'source':1,'sampler':0}],'samplers':[{'magFilter':9729,'minFilter':9987}],
 'images':[{'bufferView':4,'mimeType':'image/jpeg'},{'bufferView':5,'mimeType':'image/jpeg'}],
 'accessors':[{'bufferView':0,'componentType':5125,'count':int(F.size),'type':'SCALAR'},
  {'bufferView':1,'componentType':5126,'count':len(P),'type':'VEC3','min':P.min(0).tolist(),'max':P.max(0).tolist()},
  {'bufferView':2,'componentType':5126,'count':len(P),'type':'VEC3'},
  {'bufferView':3,'componentType':5126,'count':len(P),'type':'VEC2'}],
 'bufferViews':views,'buffers':[{'byteLength':len(bin)}]}
js=json.dumps(j).encode()
while len(js)%4: js+=b' '
out=struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(bin))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(bin),0x004E4942)+bin
open(OUT,'wb').write(out)
print(len(out), 'centroid', P.mean(0).tolist(), P.min(0).tolist(), P.max(0).tolist())
