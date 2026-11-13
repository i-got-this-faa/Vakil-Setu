import bpy, bmesh, sys, os, re
from mathutils import Vector, kdtree
args=sys.argv[sys.argv.index('--')+1:]
# usage: blender -b -P build.py -- <Business_Female_01_facial.fbx> <Textures dir> <body.png> <head.png> <out.glb>
fbx, texdir, body_png, head_png, out = args
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=fbx)
arm=bpy.data.objects['Bip01']; body=[o for o in bpy.data.objects if o.type=='MESH'][0]
arm.name='Armature'; arm.data.name='Armature'; body.name='VakilBody'

# apply transforms (drop FBX take animation first, it re-keys scale 0.01)
for o in bpy.data.objects: o.animation_data_clear()
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active=arm
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

# --- shape keys: rename to TalkingHead / ARKit names, drop the rest
vis={'Sil':'sil','PP':'PP','FF':'FF','TH':'TH','DD':'DD','KK':'kk','CH':'CH','SS':'SS','nn':'nn','RR':'RR','aa':'aa','E':'E','I':'I','O':'O','U':'U'}
keep=0
for kb in list(body.data.shape_keys.key_blocks):
    if kb.name=='Basis': continue
    m=re.match(r'AA_VI_\d+_(\w+)$',kb.name); a=re.match(r'AK_\d+_(\w+)$',kb.name)
    if m and m.group(1) in vis: kb.name='viseme_'+vis[m.group(1)]; keep+=1
    elif a: n=a.group(1); kb.name=n[0].lower()+n[1:]; keep+=1
    else: body.shape_key_remove(kb)
print("kept shape keys",keep); print('scales',arm.scale[:],body.scale[:],body.dimensions[:])

# --- materials: rebuild clean PBR, downscale textures
def img(name, path=None, size=1024):
    im=bpy.data.images.load(path or os.path.join(texdir,name)); im.scale(size,size); return im
def mat(m, color, normal, alpha=False):
    m.use_nodes=True; nt=m.node_tree; nt.nodes.clear()
    o=nt.nodes.new('ShaderNodeOutputMaterial'); p=nt.nodes.new('ShaderNodeBsdfPrincipled')
    p.inputs['Roughness'].default_value=0.75
    nt.links.new(p.outputs[0],o.inputs[0])
    t=nt.nodes.new('ShaderNodeTexImage'); t.image=color; nt.links.new(t.outputs['Color'],p.inputs['Base Color'])
    if alpha: nt.links.new(t.outputs['Alpha'],p.inputs['Alpha'])
    if normal:
        n=nt.nodes.new('ShaderNodeTexImage'); n.image=normal; n.image.colorspace_settings.name='Non-Color'
        nm=nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(n.outputs['Color'],nm.inputs['Color']); nt.links.new(nm.outputs[0],p.inputs['Normal'])
    return p
mats={m.name:m for m in body.data.materials}
pbd=mat(mats['f014_body'], img(None,body_png), img('f014_body_normal.tga')); pbd.inputs['Roughness'].default_value=0.9; pbd.inputs['Specular IOR Level'].default_value=0.15
ph=mat(mats['f014_head'], img(None,head_png), img('f014_head_normal.tga')); ph.inputs['Roughness'].default_value=0.6; ph.inputs['Specular IOR Level'].default_value=0.3
mat(mats['f014_opacity'], img('f014_opacity_color.tga'), None, alpha=True)
for m in body.data.materials: m.name=m.name.replace('f014_','vakil_')

# --- advocate bands (two white tabs joined at the collar)
W,G,L,TOP=0.024,0.007,0.105,1.455
bm=bmesh.new()
def strip(x0,x1,z0,z1,nx=3,nz=10):
    vs=[[bm.verts.new((x0+(x1-x0)*i/nx,-0.25,z1-(z1-z0)*j/nz)) for i in range(nx+1)] for j in range(nz+1)]
    for j in range(nz):
        for i in range(nx): bm.faces.new((vs[j][i],vs[j][i+1],vs[j+1][i+1],vs[j+1][i]))
strip(-G/2-W,-G/2,TOP-L,TOP); strip(G/2,G/2+W,TOP-L,TOP)
strip(-G/2-W,G/2+W,TOP-0.012,TOP+0.004,nx=8,nz=2)   # collar band
bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=1e-5)
me=bpy.data.meshes.new('AdvocateBands'); bm.to_mesh(me); bm.free()
bands=bpy.data.objects.new('AdvocateBands',me); bpy.context.collection.objects.link(bands)
# project onto chest: raycast each vertex from the front onto the rest-pose body
from mathutils.bvhtree import BVHTree
dg=bpy.context.evaluated_depsgraph_get()
bvh=BVHTree.FromObject(body,dg); inv=body.matrix_world.inverted()
miss=0
for v in me.vertices:
    o=inv@Vector((v.co.x,-1.0,v.co.z)); hit,n,_,_=bvh.ray_cast(o,Vector((0,1,0)))
    if hit is None: miss+=1; continue
    w=body.matrix_world@hit; v.co=Vector((v.co.x,w.y-0.006,w.z))
# bridge the open-collar V: each horizontal row takes its most forward y
rows={}
for v in me.vertices: rows.setdefault(round(v.co.z,4),[]).append(v)
for vs in rows.values():
    y=min(v.co.y for v in vs)
    for v in vs: v.co.y=y
print("band raycast misses",miss)
bpy.context.view_layer.objects.active=bands; bands.select_set(True)
sol=bands.modifiers.new('sol','SOLIDIFY'); sol.thickness=0.003; sol.offset=1
bpy.ops.object.modifier_apply(modifier='sol')
bm_=bpy.data.materials.new('vakil_bands'); bm_.use_nodes=True
pb=bm_.node_tree.nodes['Principled BSDF']; pb.inputs['Base Color'].default_value=(0.93,0.93,0.92,1); pb.inputs['Roughness'].default_value=0.6
me.materials.append(bm_)
# copy skin weights from nearest body vertex
bw=[body.matrix_world@v.co for v in body.data.vertices]
kd=kdtree.KDTree(len(bw)); [kd.insert(c,i) for i,c in enumerate(bw)]; kd.balance()
gname={g.index:g.name for g in body.vertex_groups}
for v in me.vertices:
    _,i,_=kd.find(bands.matrix_world@v.co)
    for g in body.data.vertices[i].groups:
        n=gname[g.group]; vg=bands.vertex_groups.get(n) or bands.vertex_groups.new(name=n); vg.add([v.index],g.weight,'REPLACE')
bands.parent=arm; bands.matrix_parent_inverse=arm.matrix_world.inverted(); am=bands.modifiers.new('Armature','ARMATURE'); am.object=arm
for o in bpy.context.selected_objects: o.select_set(False)

bpy.ops.wm.save_as_mainfile(filepath=out.replace('.glb','.blend'))
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=85,
    export_morph=True, export_morph_normal=False, export_skins=True, export_animations=False, export_apply=False,
    export_yup=True)
print("EXPORTED",out,os.path.getsize(out))
