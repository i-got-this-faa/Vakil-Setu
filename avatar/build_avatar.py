"""Procedurally builds the Vakil Setu advocate avatar in Blender.

Run headless from the repo root:
    blender -b -P avatar/build_avatar.py

Outputs:
    avatar/vakil_avatar.blend              editable source scene
    frontend/public/avatar/vakil.glb       3D model (for future three.js use)
    frontend/public/avatar/vakil-idle.png  mouth closed, eyes open
    frontend/public/avatar/vakil-talk.png  mouth open
    frontend/public/avatar/vakil-blink.png eyes closed
"""

import math
import os

import bmesh
import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PUBLIC_DIR = os.path.join(ROOT, "frontend", "public", "avatar")
os.makedirs(PUBLIC_DIR, exist_ok=True)


# ---------------------------------------------------------------- helpers

def hex_to_linear(hex_color, alpha=1.0):
    hex_color = hex_color.lstrip("#")
    srgb = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, alpha)


def material(name, hex_color, roughness=0.5, metallic=0.0, sss=0.0, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    color = hex_to_linear(hex_color)
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if sss:
        bsdf.inputs["Subsurface Weight"].default_value = sss
        bsdf.inputs["Subsurface Radius"].default_value = (0.4, 0.15, 0.08)
        bsdf.inputs["Subsurface Scale"].default_value = 0.05
    if emission:
        bsdf.inputs["Emission Color"].default_value = color
        bsdf.inputs["Emission Strength"].default_value = emission
    return mat


def finish(obj, mat, subsurf=2, smooth=True, parent=None):
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    if smooth and obj.type == "MESH":
        for poly in obj.data.polygons:
            poly.use_smooth = True
    if subsurf:
        mod = obj.modifiers.new("Subsurf", "SUBSURF")
        mod.levels = 1
        mod.render_levels = subsurf
    if parent:
        obj.parent = parent
    return obj


def sphere(name, loc, radius, scale=(1, 1, 1), rot=(0, 0, 0), segments=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, radius=radius, location=loc, rotation=rot
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    return obj


def cylinder_between(name, p1, p2, radius, verts=24):
    p1, p2 = Vector(p1), Vector(p2)
    d = p2 - p1
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=d.length,
                                        location=(p1 + p2) / 2)
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = d.to_track_quat("Z", "Y")
    return obj


def surface_point(obj, x, z):
    """Where a ray fired from the camera side at (x, z) hits obj, plus the normal."""
    hit, loc, normal, _ = obj.ray_cast(Vector((x, -5, z)), Vector((0, 1, 0)))
    assert hit, f"no surface at {x}, {z}"
    return obj.matrix_world @ loc, normal


def deform(obj, fn):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    for v in bm.verts:
        v.co = fn(v.co)
    bm.to_mesh(obj.data)
    bm.free()


def coat_material():
    """Advocate's outfit painted procedurally from object-space coordinates:
    black coat, glossier gown lapels, a pale shirt V and the two white bands."""
    mat = material("Outfit", "#0F1116", roughness=0.6)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes["Principled BSDF"]
    xyz = nodes.new("ShaderNodeSeparateXYZ")
    links.new(nodes.new("ShaderNodeTexCoord").outputs["Object"], xyz.inputs[0])

    def math(op, a, b=0.0, c=0.0):
        node = nodes.new("ShaderNodeMath")
        node.operation = op
        for i, val in enumerate((a, b, c)):
            if hasattr(val, "is_output"):
                links.new(val, node.inputs[i])
            else:
                node.inputs[i].default_value = val
        return node.outputs[0]

    ax = math("ABSOLUTE", xyz.outputs["X"])
    front = math("LESS_THAN", xyz.outputs["Y"], 0.0)
    v_half = math("MULTIPLY_ADD", xyz.outputs["Z"], 0.42, -0.42 * 0.42)  # V opens upward from z=0.42
    shirt = math("MULTIPLY", math("LESS_THAN", ax, v_half), front)
    lapel = math("MULTIPLY", math("LESS_THAN", ax, math("ADD", v_half, 0.14)), front)
    band = math("MULTIPLY", math("MULTIPLY", math("GREATER_THAN", ax, 0.009),
                                 math("LESS_THAN", ax, 0.075)),
                math("MULTIPLY", math("GREATER_THAN", xyz.outputs["Z"], 0.68), front))

    color = None
    for mask, hex_color in ((lapel, "#050608"), (shirt, "#C8D5E6"), (band, "#FFFFFF")):
        mix = nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        links.new(mask, mix.inputs["Factor"])
        if color is None:
            mix.inputs["A"].default_value = hex_to_linear("#0F1116")
        else:
            links.new(color, mix.inputs["A"])
        mix.inputs["B"].default_value = hex_to_linear(hex_color)
        color = mix.outputs["Result"]
    links.new(color, bsdf.inputs["Base Color"])
    return mat


def curve_tube(name, points, bevel):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.bevel_depth = bevel
    data.bevel_resolution = 4
    data.use_fill_caps = True
    spline = data.splines.new("NURBS")
    spline.points.add(len(points) - 1)
    for pt, co in zip(spline.points, points):
        pt.co = (*co, 1)
    spline.use_endpoint_u = True
    spline.order_u = 3
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return obj


# ---------------------------------------------------------------- scene

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

M = {
    "skin": material("Skin", "#C4875E", roughness=0.55, sss=0.15),
    "skin_dark": material("SkinShade", "#A86C47", roughness=0.6),
    "hair": material("Hair", "#1D1917", roughness=0.45),
    "coat": material("Coat", "#16181E", roughness=0.7),
    "gown": material("Gown", "#0D0E12", roughness=0.35),
    "shirt": material("Shirt", "#F5F5F2", roughness=0.6),
    "eye_white": material("EyeWhite", "#FBFBF8", roughness=0.15),
    "iris": material("Iris", "#3A2416", roughness=0.1),
    "pupil": material("Pupil", "#0A0706", roughness=0.05),
    "shine": material("Shine", "#FFFFFF", emission=4.0),
    "mouth": material("Mouth", "#5A1E1E", roughness=0.5),
    "lip": material("Lip", "#8E4A3C", roughness=0.4),
    "teeth": material("Teeth", "#F3EEE6", roughness=0.3),
    "tongue": material("Tongue", "#C0565A", roughness=0.4),
    "frame": material("GlassFrame", "#2A211C", roughness=0.3, metallic=0.4),
    "gold": material("Gold", "#D9A93D", roughness=0.25, metallic=1.0),
    "blush": material("Blush", "#D97A6C", roughness=0.6),
}

root = bpy.data.objects.new("VakilAvatar", None)
scene.collection.objects.link(root)

# Head ----------------------------------------------------------------------
HEAD_Z = 1.62
head = sphere("Head", (0, 0, HEAD_Z), 0.5, scale=(0.95, 0.92, 1.1), segments=48, rings=24)
deform(head, lambda co: Vector((co.x * (1 - 0.2 * max(-co.z / 0.5, 0) ** 2), co.y, co.z)))
finish(head, M["skin"], parent=root)

for side in (-1, 1):
    ear = finish(sphere(f"Ear.{side}", (side * 0.47, 0.02, HEAD_Z - 0.02), 0.1,
                        scale=(0.45, 0.75, 1.0)), M["skin"], parent=root)
    finish(sphere(f"EarInner.{side}", (side * 0.505, 0.0, HEAD_Z - 0.02), 0.06,
                  scale=(0.3, 0.6, 0.85)), M["skin_dark"], parent=root)

nose = finish(sphere("Nose", (0, -0.47, HEAD_Z - 0.1), 0.065, scale=(0.85, 0.9, 1.15)), M["skin"],
              parent=root)

# Hair: a cap cut from a sphere, with a side-swept fringe line.
hair = sphere("Hair", (0, 0.03, HEAD_Z + 0.04), 0.53, scale=(0.97, 0.97, 1.05), segments=48, rings=24)
bm = bmesh.new()
bm.from_mesh(hair.data)
doomed = []
for v in bm.verts:
    x, y, z = v.co
    front = y < -0.1
    # fringe dips lower on the left side of the face and rises toward the right part
    fringe = 0.22 + 0.10 * (x / 0.53)
    if z < -0.05 or (front and z < fringe) or (y < 0.15 and z < -0.02 and abs(x) < 0.45):
        doomed.append(v)
bmesh.ops.delete(bm, geom=doomed, context="VERTS")
bm.to_mesh(hair.data)
bm.free()
sol = hair.modifiers.new("Solidify", "SOLIDIFY")
sol.thickness = 0.06
sol.offset = 1
finish(hair, M["hair"], parent=root)
# Volume on top + sideburns
finish(sphere("HairTop", (-0.05, 0.02, HEAD_Z + 0.36), 0.38, scale=(1.25, 1.2, 0.55)), M["hair"],
       parent=root)
for side in (-1, 1):
    finish(sphere(f"Sideburn.{side}", (side * 0.44, -0.08, HEAD_Z - 0.02), 0.09,
                  scale=(0.35, 0.6, 1.3)), M["hair"], parent=root)

# Eyes ----------------------------------------------------------------------
EYE_Z = HEAD_Z + 0.02
eyes_open, eyes_closed = [], []
for side in (-1, 1):
    x = side * 0.17
    eyes_open.append(finish(sphere(f"EyeWhite.{side}", (x, -0.405, EYE_Z), 0.085,
                                   scale=(1.0, 0.55, 1.1)), M["eye_white"], parent=root))
    eyes_open.append(finish(sphere(f"Iris.{side}", (x, -0.445, EYE_Z - 0.005), 0.055,
                                   scale=(1.0, 0.45, 1.05)), M["iris"], parent=root))
    eyes_open.append(finish(sphere(f"Pupil.{side}", (x, -0.462, EYE_Z - 0.005), 0.028,
                                   scale=(1.0, 0.4, 1.0)), M["pupil"], parent=root))
    eyes_open.append(finish(sphere(f"Shine.{side}", (x + 0.02, -0.475, EYE_Z + 0.02), 0.012),
                            M["shine"], subsurf=0, parent=root))
    lid = curve_tube(f"ClosedLid.{side}",
                     [(x - 0.08, -0.43, EYE_Z), (x, -0.465, EYE_Z - 0.03), (x + 0.08, -0.43, EYE_Z)],
                     0.011)
    lid.data.materials.append(M["hair"])
    lid.parent = root
    eyes_closed.append(lid)
    brow = curve_tube(f"Brow.{side}",
                      [(x - side * 0.08, -0.44, EYE_Z + 0.135),
                       (x, -0.455, EYE_Z + 0.155),
                       (x + side * 0.09, -0.42, EYE_Z + 0.12)], 0.019)
    brow.data.materials.append(M["hair"])
    brow.parent = root
    finish(sphere(f"Blush.{side}", (side * 0.27, -0.37, HEAD_Z - 0.16), 0.07,
                  scale=(1.0, 0.3, 0.6)), M["blush"], parent=root)

# Glasses
for side in (-1, 1):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.115, minor_radius=0.012,
                                     location=(side * 0.17, -0.5, EYE_Z),
                                     rotation=(math.radians(90), 0, 0))
    rim = bpy.context.active_object
    rim.name = f"GlassRim.{side}"
    rim.scale = (1.0, 0.85, 1.0)
    finish(rim, M["frame"], subsurf=1, parent=root)
    finish(cylinder_between(f"GlassArm.{side}", (side * 0.285, -0.49, EYE_Z + 0.02),
                            (side * 0.45, -0.05, EYE_Z + 0.02), 0.01, verts=8),
           M["frame"], subsurf=0, parent=root)
bridge = curve_tube("GlassBridge", [(-0.06, -0.5, EYE_Z + 0.01), (0, -0.52, EYE_Z + 0.04),
                                    (0.06, -0.5, EYE_Z + 0.01)], 0.011)
bridge.data.materials.append(M["frame"])
bridge.parent = root

# Mouth ---------------------------------------------------------------------
MOUTH_Z = HEAD_Z - 0.27
smile = curve_tube("MouthSmile", [(-0.11, -0.39, MOUTH_Z + 0.03), (0, -0.425, MOUTH_Z - 0.02),
                                  (0.11, -0.39, MOUTH_Z + 0.03)], 0.014)
smile.data.materials.append(M["lip"])
smile.parent = root
mouth_closed = [smile]

mouth_open = [
    finish(sphere("MouthOpen", (0, -0.385, MOUTH_Z - 0.01), 0.075, scale=(1.25, 0.45, 0.8)),
           M["mouth"], parent=root),
    finish(sphere("Teeth", (0, -0.405, MOUTH_Z + 0.03), 0.06, scale=(1.15, 0.3, 0.3)),
           M["teeth"], parent=root),
    finish(sphere("Tongue", (0, -0.4, MOUTH_Z - 0.04), 0.05, scale=(1.2, 0.35, 0.45)),
           M["tongue"], parent=root),
]

# Body ----------------------------------------------------------------------
neck = finish(cylinder_between("Neck", (0, 0.0, 0.9), (0, 0.0, 1.35), 0.15, verts=48), M["skin"], subsurf=0,
              parent=root)

# Bust: a dense sphere reshaped so it widens into shoulders and flattens on top.
# Vertices are written in world space (object at the origin) so the outfit shader
# can use object coordinates directly.
TORSO_Z = 0.35
torso = sphere("Torso", (0, 0, 0), 1.0, segments=64, rings=32)


def bust_shape(co):
    up = max(co.z, 0.0)
    x = co.x * 0.72 * (1 + 0.35 * up - 0.25 * up ** 4)
    y = co.y * 0.42 * (1 - 0.25 * up)
    z = co.z * (0.62 if co.z > 0 else 0.8)
    return Vector((x, y + 0.04, z + TORSO_Z))


deform(torso, bust_shape)
finish(torso, coat_material(), parent=root)

bpy.ops.mesh.primitive_torus_add(major_radius=0.16, minor_radius=0.04, location=(0, 0.0, 0.95))
collar = bpy.context.active_object
collar.name = "Collar"
collar.scale = (1.0, 0.95, 0.8)
finish(collar, M["shirt"], parent=root)

loc, normal = surface_point(torso, 0.34, 0.6)
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.07, depth=0.02, location=loc + normal * 0.012)
badge = bpy.context.active_object
badge.name = "ScalesBadge"
badge.rotation_mode = "QUATERNION"
badge.rotation_quaternion = normal.to_track_quat("Z", "Y")
bevel = badge.modifiers.new("Bevel", "BEVEL")
bevel.width = 0.006
bevel.segments = 3
finish(badge, M["gold"], subsurf=0, parent=root)

# ---------------------------------------------------------------- camera & lights

cam_data = bpy.data.cameras.new("Camera")
cam_data.lens = 85
cam = bpy.data.objects.new("Camera", cam_data)
scene.collection.objects.link(cam)
cam.location = (0.35, -6.2, 1.55)
direction = Vector((0, 0, 1.2)) - cam.location
cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
scene.camera = cam


def area_light(name, loc, energy, size, color="#FFFFFF"):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.size = size
    data.color = hex_to_linear(color)[:3]
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = (Vector((0, 0, 1.3)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()


area_light("Key", (-2.5, -4.0, 3.2), 900, 2.5, "#FFF1E0")
area_light("Fill", (3.0, -3.5, 1.5), 300, 3.0, "#DDE8FF")
area_light("Rim", (1.5, 3.0, 3.0), 700, 1.5, "#BFD6FF")

world = bpy.data.worlds.new("World")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = hex_to_linear("#E8ECF2")
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
scene.world = world

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = int(os.environ.get("AVATAR_SAMPLES", "96"))
scene.cycles.use_denoising = True
scene.render.film_transparent = True
scene.render.resolution_x = 600
scene.render.resolution_y = 800
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"


# ---------------------------------------------------------------- outputs

def set_visible(objs, visible):
    for obj in objs:
        obj.hide_render = not visible
        obj.hide_viewport = not visible


def render(filename, eyes="open", mouth="closed"):
    set_visible(eyes_open, eyes == "open")
    set_visible(eyes_closed, eyes != "open")
    set_visible(mouth_closed, mouth == "closed")
    set_visible(mouth_open, mouth != "closed")
    scene.render.filepath = os.path.join(PUBLIC_DIR, filename)
    bpy.ops.render.render(write_still=True)


render("vakil-idle.png")
render("vakil-talk.png", mouth="open")
render("vakil-blink.png", eyes="closed")

# Leave the default expression visible in the saved/exported scene.
set_visible(eyes_open + mouth_closed, True)
set_visible(eyes_closed + mouth_open, False)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "avatar", "vakil_avatar.blend"))
bpy.ops.export_scene.gltf(
    filepath=os.path.join(PUBLIC_DIR, "vakil.glb"),
    export_format="GLB",
    export_apply=True,
    use_visible=True,
    export_cameras=False,
    export_lights=False,
)
print("Avatar build complete ->", PUBLIC_DIR)
