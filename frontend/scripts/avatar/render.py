import bpy,sys,math
from mathutils import Vector
glb,outdir=sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
sc=bpy.context.scene
try: sc.render.engine='BLENDER_EEVEE'
except: sc.render.engine='BLENDER_EEVEE_NEXT'
sc.render.resolution_x,sc.render.resolution_y=800,1000
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(0.55,0.55,0.6,1); w.node_tree.nodes['Background'].inputs[1].default_value=0.35
def light(loc,e):
    l=bpy.data.lights.new('l','AREA'); l.energy=e; l.size=1.5; o=bpy.data.objects.new('l',l); sc.collection.objects.link(o); o.location=loc
    o.rotation_euler=(Vector((0,0,1.4))-Vector(loc)).to_track_quat('-Z','Y').to_euler()
light((1.2,-2,2.2),110); light((-1.5,-1.5,1.6),50); light((0,2,2.5),90)
cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera=cam
body=[o for o in bpy.data.objects if o.type=='MESH' and o.data.shape_keys][0]
def shot(name,loc,tgt,lens,keys={}):
    for kb in body.data.shape_keys.key_blocks[1:]: kb.value=keys.get(kb.name,0)
    cam.location=loc; cam.data.lens=lens
    cam.rotation_euler=(Vector(tgt)-Vector(loc)).to_track_quat('-Z','Y').to_euler()
    sc.render.filepath=f"{outdir}/{name}.png"; bpy.ops.render.render(write_still=True)
shot('hand',(0.85,-0.7,0.95),(0.62,0,0.85),60)
shot('full',(0,-4.2,1.0),(0,0,0.9),50)
shot('bust',(0.35,-1.4,1.5),(0,0,1.45),60)
shot('talk',(0,-0.75,1.55),(0,0,1.53),60,{'viseme_aa':1.0,'browInnerUp':0.3})
shot('chest',(0.12,-0.6,1.45),(0,0,1.40),60)
shot('smile',(0,-0.75,1.55),(0,0,1.53),60,{'mouthSmileLeft':0.7,'mouthSmileRight':0.7,'eyeBlinkLeft':1,'eyeBlinkRight':1})
