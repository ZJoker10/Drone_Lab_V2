# NEXUS-7 — Cyberpunk Drone Lab
### Interactive Graphics Course Project · Sapienza University of Rome

![Three.js](https://img.shields.io/badge/Three.js-r128-00ffff?style=flat-square&logo=threedotjs)
![WebGL](https://img.shields.io/badge/WebGL-2.0-ff00aa?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-44ffaa?style=flat-square)

> A real-time 3D cyberpunk drone testing facility rendered entirely in the browser with Three.js.  
> No pre-built 3D assets — every model, texture, and animation is procedurally generated or hand-coded in JavaScript.


---

## Features

| Category | Details |
|----------|---------|
| **Hierarchical 3D Model** | Quadcopter with 5-level deep scene graph (body → cockpit → arms → motors → rotors) |
| **Texture Types** | Color Maps, Normal Maps, Roughness/Specular Maps, Emissive Maps — all procedural (Canvas API) |
| **PBR Shading** | `MeshStandardMaterial` with ACES Filmic tone-mapping |
| **Lighting** | Ambient, Hemisphere, Directional, 6× Point (neon), 2× SpotLight |
| **Shadow Mapping** | PCFSoft shadows cast by SpotLight onto floor/drone |
| **Animations** | Rotor spin, hover bob, auto-flight paths, LED blink, particle drift — all JS-coded |
| **User Interaction** | 6-DOF keyboard flight, 3 camera modes, light toggle, auto-hover, home recall |
| **Particle System** | 700 additive-blended dust / ember / spark particles |
| **Environment** | Full lab: columns, neon strips, holo displays, charging stations, workbenches, data nodes |
| **HUD** | Live telemetry (altitude, position, battery), FPS counter, notification toasts |

---

## Controls

### Flight
| Key | Action |
|-----|--------|
| `W` / `↑` | Fly forward (-Z) |
| `S` / `↓` | Fly backward (+Z) |
| `A` / `←` | Strafe left (-X) |
| `D` / `→` | Strafe right (+X) |
| `Q` | Ascend (+Y) |
| `E` | Descend (-Y) |
| `R` | Yaw left |
| `T` | Yaw right |

### System
| Key | Action |
|-----|--------|
| `Space` | Toggle auto-hover |
| `H` | Return to home pad |
| `L` | Toggle neon lights |
| `P` | Power rotors on/off |

### Camera
| Key | Mode |
|-----|------|
| `1` | Chase camera (follows drone) |
| `2` | Free orbit (mouse drag + scroll) |
| `3` | Cinematic sweep |

---

## Project Structure

```
nexus7-drone-lab/
├── index.html              Main entry point + HUD markup
├── css/
│   └── style.css           Cyberpunk HUD styling
├── js/
│   ├── textures.js         Procedural texture generator (Canvas API)
│   ├── lighting.js         Full lighting system (7 light types)
│   ├── drone.js            Drone class — hierarchical 3D model + physics
│   ├── environment.js      Lab environment (floor, walls, props, FX)
│   ├── particles.js        Ambient particle system
│   ├── ui.js               HUD manager (telemetry, battery, FPS)
│   └── main.js             Scene init, animation loop, input handling
├── README.md
└── TECHNICAL_REPORT.md
```

### Dependencies (CDN — no npm required)
```html
<script src="https://unpkg.com/three@0.128.0/build/three.min.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
```

## Technical Highlights

### Hierarchical Model Depth
```
DroneRoot (Group)
 ├─ bodyGroup
 │   ├─ mainBody (BoxGeometry)          ← Color + Normal + Roughness maps
 │   ├─ topPlate (BoxGeometry)
 │   ├─ cockpitGroup
 │   │   ├─ cockpitFrame (SphereGeometry)
 │   │   └─ cockpitLens  (CylinderGeometry)
 │   └─ LEDs × 5 (SphereGeometry)
 ├─ armGroup × 4 (each rotated ±45°/±135°)
 │   ├─ armTube   (CylinderGeometry)
 │   ├─ armBrace  (BoxGeometry)
 │   └─ motorGroup
 │       ├─ motorBase     (CylinderGeometry)
 │       ├─ motorBell     (CylinderGeometry)
 │       ├─ thrusterGlow  (CircleGeometry)
 │       ├─ motorLEDRing × 4
 │       └─ rotorAssembly ← SPINS
 │           ├─ rotorHub  (CylinderGeometry)
 │           ├─ blade × 2 pair A (BoxGeometry)
 │           └─ blade × 2 pair B (BoxGeometry)
 └─ landingGearGroup
     ├─ crossBar × 2 (CylinderGeometry)
     ├─ strut × 4
     └─ foot × 4 (BoxGeometry)
```

### Procedural Textures
All textures are generated using the HTML5 Canvas 2D API at startup:
- **Circuit board** pattern with traces, solder pads, and IC outlines
- **Carbon-fibre weave** using interlocking gradient rectangles
- **Panel normal map** with groove shadows and rivet bumps
- **Scratched roughness map** for metallic PBR surfaces
- **Holographic display** with radar, scan-lines, and data bars

### Animation System
All animations are pure JavaScript — no imported keyframe data:
- `rotorAssembly.rotation.y += dir * 22 * rotorPower * dt`  — rotor spin
- `Math.sin(hoverPhase) * hoverAmp`                          — hover bob
- Parametric `cos/sin` paths for auto-flight drones
- Per-material `emissiveIntensity` flicker for LEDs and neon strips
- BufferAttribute updates for particle drift

---

## Author

**Zeyad Kandil**  
MSc Machine Learning — Sapienza University of Rome  
BSc Mechatronics Engineering — Tanta University  
