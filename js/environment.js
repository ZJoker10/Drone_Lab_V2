/**
 * environment.js — NEXUS-7 Cyberpunk Drone Lab
 * Builds the full cyberpunk lab environment:
 *   Floor, Ceiling, Walls, Corner Columns, Landing Pad,
 *   Holographic Displays, Charging Stations, Workbenches,
 *   Ceiling Neon Strips, Floating Data Nodes.
 */

class EnvironmentBuilder {
    constructor(scene, textures) {
        this.scene    = scene;
        this.textures = textures;
        this.animated = [];  // { update(dt,t) } callbacks
    }

    build() {
        this._createFloor();
        this._createCeiling();
        this._createWalls();
        this._createColumns();
        this._createLandingPad();
        this._createChargingStations();
        this._createHoloDisplays();
        this._createWorkbenches();
        this._createCeilingNeonStrips();
        this._createDataNodes();
        this._createWarningLights();
    }

    /** Per-frame animation updates */
    update(dt, time) {
        this.animated.forEach(o => o.update(dt, time));
    }

    // ─────────────────────────────────────────────────────────────
    // FLOOR
    // ─────────────────────────────────────────────────────────────
    _createFloor() {
        const geo = new THREE.PlaneGeometry(40, 40, 1, 1);
        const mat = new THREE.MeshStandardMaterial({
            map:         this.textures.floorColor,
            normalMap:   this.textures.floorNormal,
            roughness:   0.78,
            metalness:   0.22,
            color:       0x111118,
        });
        const floor = new THREE.Mesh(geo, mat);
        floor.rotation.x = -Math.PI/2;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    // ─────────────────────────────────────────────────────────────
    // CEILING
    // ─────────────────────────────────────────────────────────────
    _createCeiling() {
        const mat = new THREE.MeshStandardMaterial({
            map:      this.textures.ceilingColor,
            roughness:1.0, metalness:0.05, color:0x060610
        });

        // Main ceiling plane
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(40,40), mat);
        ceiling.rotation.x = Math.PI/2;
        ceiling.position.y = 12;
        this.scene.add(ceiling);

        // Industrial beam grid
        const beamMat = new THREE.MeshStandardMaterial({color:0x0c0c1c, roughness:0.8, metalness:0.65});
        const beamPositions = [
            { pos:[0,11.9,0],  size:[40,0.2,0.2], rot:0 },
            { pos:[0,11.9,10], size:[40,0.2,0.2], rot:0 },
            { pos:[0,11.9,-10],size:[40,0.2,0.2], rot:0 },
            { pos:[10,11.9,0], size:[0.2,0.2,40], rot:0 },
            { pos:[-10,11.9,0],size:[0.2,0.2,40], rot:0 },
        ];
        beamPositions.forEach(b => {
            const beam = new THREE.Mesh(new THREE.BoxGeometry(...b.size), beamMat);
            beam.position.set(...b.pos);
            this.scene.add(beam);
        });

        // Light fixture boxes
        const fixMat = new THREE.MeshStandardMaterial({
            color:0xaaaacc, emissive:0x1111aa, emissiveIntensity:0.4, roughness:0.4
        });
        [[-10,11.95,-10],[10,11.95,-10],[-10,11.95,10],[10,11.95,10],[0,11.95,0]].forEach(p => {
            const fix = new THREE.Mesh(new THREE.BoxGeometry(1.0,0.1,1.0), fixMat);
            fix.position.set(...p);
            this.scene.add(fix);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // WALLS
    // ─────────────────────────────────────────────────────────────
    _createWalls() {
        const wallMat = new THREE.MeshStandardMaterial({
            map:         this.textures.wallPanel,
            normalMap:   this.textures.panelNormal,
            roughness:   0.88,
            metalness:   0.12,
            color:       0x0d0d1e,
        });

        // [position, rotationY]
        [
            [[0,6,-20], 0           ],   // back wall
            [[0,6, 20], Math.PI     ],   // front wall
            [[-20,6,0], Math.PI/2   ],   // left wall
            [[20,6,0],  -Math.PI/2  ],   // right wall
        ].forEach(([pos, ry]) => {
            const wall = new THREE.Mesh(new THREE.PlaneGeometry(40,12), wallMat.clone());
            wall.position.set(...pos);
            wall.rotation.y = ry;
            wall.receiveShadow = true;
            this.scene.add(wall);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // CORNER COLUMNS
    // ─────────────────────────────────────────────────────────────
    _createColumns() {
        const colMat  = new THREE.MeshStandardMaterial({color:0x0a0a1a,roughness:0.72,metalness:0.45});
        const neonColors = [0x00ffff, 0xff00aa, 0xff6600, 0x44ffaa];

        [[-18,-18],[18,-18],[-18,18],[18,18]].forEach((xz, i) => {
            // Column body
            const col = new THREE.Mesh(new THREE.BoxGeometry(1.0,12,1.0), colMat);
            col.position.set(xz[0], 6, xz[1]);
            col.castShadow = true;
            this.scene.add(col);

            // Vertical neon strip on column edge
            const neonMat = new THREE.MeshStandardMaterial({
                color:neonColors[i], emissive:neonColors[i], emissiveIntensity:2.2, roughness:0.15
            });
            const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06,10.5,0.06), neonMat);
            // Place on the corner edge closest to room center
            const ex = xz[0] > 0 ? xz[0]-0.52 : xz[0]+0.52;
            const ez = xz[1] > 0 ? xz[1]-0.52 : xz[1]+0.52;
            strip.position.set(ex, 6, ez);
            this.scene.add(strip);

            // Animate strip intensity
            this.animated.push({ update:(dt,t) => {
                neonMat.emissiveIntensity = 1.8 + 0.4*Math.sin(t*1.6 + i*Math.PI/2);
            }});
        });
    }

    // ─────────────────────────────────────────────────────────────
    // LANDING PAD
    // ─────────────────────────────────────────────────────────────
    _createLandingPad() {
        // Raised platform disc
        const padMat = new THREE.MeshStandardMaterial({
            map: this.textures.chargePad, roughness:0.3, metalness:0.85, color:0x0b0b1a
        });
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.2,0.04,48), padMat);
        pad.position.y = 0.02;
        pad.receiveShadow = true;
        this.scene.add(pad);

        // Outer glowing torus
        const ringMatOuter = new THREE.MeshStandardMaterial({
            color:0x00ffff, emissive:0x00aaff, emissiveIntensity:3.0, roughness:0.15
        });
        const ringOuter = new THREE.Mesh(new THREE.TorusGeometry(3.2,0.055,8,72), ringMatOuter);
        ringOuter.rotation.x = Math.PI/2;
        ringOuter.position.y = 0.055;
        this.scene.add(ringOuter);
        this.animated.push({ update:(_,t) => {
            ringMatOuter.emissiveIntensity = 2.4 + 0.6*Math.sin(t*3.2);
        }});

        // Inner ring
        const ringMatInner = new THREE.MeshStandardMaterial({
            color:0x00ffff, emissive:0x0066ff, emissiveIntensity:2.0, roughness:0.15
        });
        const ringInner = new THREE.Mesh(new THREE.TorusGeometry(1.6,0.035,8,48), ringMatInner);
        ringInner.rotation.x = Math.PI/2;
        ringInner.position.y = 0.055;
        this.scene.add(ringInner);
        this.animated.push({ update:(_,t) => {
            ringMatInner.emissiveIntensity = 1.5 + 0.5*Math.sin(t*3.2 + Math.PI);
        }});

        // Center crosshair marks
        const markMat = new THREE.MeshStandardMaterial({color:0x00ffff,emissive:0x00ffff,emissiveIntensity:1.2});
        [0, Math.PI/2].forEach(ry => {
            const mark = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.012,3.0), markMat);
            mark.rotation.y = ry;
            mark.position.y = 0.052;
            this.scene.add(mark);
        });

        // 4 directional cone arrows
        const arrowColors = [0xff5500, 0x00ffff, 0x00ffff, 0x00ffff];
        [[0,2.8,0],[0,-2.8,0],[2.8,0,0],[-2.8,0,0]].forEach(([x,z,_2], i) => {
            const arrowMat = new THREE.MeshStandardMaterial({
                color: arrowColors[i%arrowColors.length],
                emissive: arrowColors[i%arrowColors.length],
                emissiveIntensity: 1.8
            });
            // swap x and z since it's xz plane not xy
            const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.12,0.28,8), arrowMat);
            arrow.position.set(x === 0 ? z*([1,-1,1,-1][i]) : x, 0.22, x === 0 ? 0 : z*([1,-1,1,-1][i]));
            this.scene.add(arrow);
        });

        // Simpler: just 4 arrows positioned correctly
        const aData = [[0,0,2.8],[0,0,-2.8],[2.8,0,0],[-2.8,0,0]];
        aData.forEach(([ax,ay,az], i) => {
            const amat = new THREE.MeshStandardMaterial({
                color: i===0?0xff5500:0x00ffff,
                emissive: i===0?0xff5500:0x00ffff,
                emissiveIntensity:1.8
            });
            const arr = new THREE.Mesh(new THREE.ConeGeometry(0.11,0.26,8), amat);
            arr.position.set(ax, 0.2, az);
            if (i===2) arr.rotation.y = -Math.PI/2;
            if (i===3) arr.rotation.y =  Math.PI/2;
            if (i===1) arr.rotation.y =  Math.PI;
            this.scene.add(arr);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // CHARGING STATIONS
    // ─────────────────────────────────────────────────────────────
    _createChargingStations() {
        [-9, 0, 9].forEach((x, i) => {
            const grp = new THREE.Group();
            grp.position.set(x, 0, -17.5);

            // Base platform
            const baseMat = new THREE.MeshStandardMaterial({color:0x0c0c1e,roughness:0.6,metalness:0.75});
            const base = new THREE.Mesh(new THREE.BoxGeometry(2.2,0.12,2.2), baseMat);
            base.position.y = 0.06;
            grp.add(base);

            // Charge pad
            const cMat = new THREE.MeshStandardMaterial({
                map:this.textures.chargePad, roughness:0.38, metalness:0.82, color:0x0a0a1a
            });
            const cp = new THREE.Mesh(new THREE.CylinderGeometry(0.72,0.72,0.05,20), cMat);
            cp.position.y = 0.12;
            grp.add(cp);

            // Glowing ring
            const rMat = new THREE.MeshStandardMaterial({
                color:0x00ffff, emissive:0x0088ff, emissiveIntensity:2.2
            });
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78,0.03,8,36), rMat);
            ring.rotation.x = Math.PI/2;
            ring.position.y = 0.14;
            grp.add(ring);
            this.animated.push({ update:(_,t) => {
                rMat.emissiveIntensity = 1.8 + 0.4*Math.sin(t*5 + i*1.2);
            }});

            // Pole
            const poleMat = new THREE.MeshStandardMaterial({color:0x1a1a2e,roughness:0.5,metalness:0.85});
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.04,1.1,8), poleMat);
            pole.position.y = 0.67;
            grp.add(pole);

            // Mini display screen
            const dMat = new THREE.MeshStandardMaterial({
                map:this.textures.holoData, emissive:0x001133, emissiveIntensity:0.7, roughness:0.2
            });
            const disp = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.7,0.06), dMat);
            disp.position.set(0, 1.27, 0);
            grp.add(disp);

            // Screen frame
            const fMat = new THREE.MeshStandardMaterial({color:0x0a0a1a,roughness:0.5,metalness:0.9});
            const frame = new THREE.Mesh(new THREE.BoxGeometry(0.78,0.78,0.04), fMat);
            frame.position.set(0, 1.27, -0.04);
            grp.add(frame);

            this.scene.add(grp);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // HOLOGRAPHIC DISPLAY WALL
    // ─────────────────────────────────────────────────────────────
    _createHoloDisplays() {
        [[-10.5, this.textures.holoMain], [10.5, this.textures.holoData]].forEach(([x, tex]) => {
            const grp = new THREE.Group();
            grp.position.set(x, 6.5, -19.5);

            // Frame
            const fMat = new THREE.MeshStandardMaterial({color:0x0a0a1c,roughness:0.6,metalness:0.85});
            grp.add(this._mesh(new THREE.BoxGeometry(7.4,4.4,0.18), fMat));

            // Screen
            const sMat = new THREE.MeshStandardMaterial({
                map:tex, emissive:0x001133, emissiveIntensity:0.85, roughness:0.18
            });
            const screen = this._mesh(new THREE.BoxGeometry(7.0,4.0,0.06), sMat);
            screen.position.z = 0.09;
            grp.add(screen);
            this.animated.push({ update:(_,t) => {
                sMat.emissiveIntensity = 0.7 + 0.2*Math.sin(t*1.8 + x*0.1);
            }});

            // Top & bottom glow strips
            const glMat = new THREE.MeshStandardMaterial({color:0x00ffff,emissive:0x00aaff,emissiveIntensity:2.5});
            [-2.25,2.25].forEach(y => {
                const gl = this._mesh(new THREE.BoxGeometry(7.4,0.06,0.14), glMat);
                gl.position.set(0,y,0.02);
                grp.add(gl);
            });

            // Side supports
            const supMat = new THREE.MeshStandardMaterial({color:0x0a0a1a,roughness:0.5,metalness:0.9});
            const supp = this._mesh(new THREE.BoxGeometry(0.22,4,0.25), supMat);
            supp.position.set(0,-4,0);
            grp.add(supp);

            this.scene.add(grp);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // WORKBENCHES
    // ─────────────────────────────────────────────────────────────
    _createWorkbenches() {
        const configs = [
            {x:-19, z:-6, ry: Math.PI/2},
            {x:-19, z: 6, ry: Math.PI/2},
            {x: 19, z:-6, ry:-Math.PI/2},
            {x: 19, z: 6, ry:-Math.PI/2},
        ];

        const surfMat = new THREE.MeshStandardMaterial({color:0x0d0d20,roughness:0.7,metalness:0.35});
        const legMat  = new THREE.MeshStandardMaterial({color:0x1a1a30,roughness:0.5,metalness:0.82});
        const toolColors = [0x334455, 0x223344, 0x443333, 0x224433, 0x332244];
        const rng = TextureFactory._rng(88);

        configs.forEach((cfg, i) => {
            const grp = new THREE.Group();
            grp.position.set(cfg.x, 0, cfg.z);
            grp.rotation.y = cfg.ry;

            // Surface
            const surf = this._mesh(new THREE.BoxGeometry(3.0,0.09,0.95), surfMat);
            surf.position.y = 0.92;
            surf.castShadow = true;
            grp.add(surf);

            // Legs
            [-1.35,1.35].forEach(lx => {
                const leg = this._mesh(new THREE.BoxGeometry(0.06,0.92,0.06), legMat);
                leg.position.set(lx, 0.46, 0);
                grp.add(leg);
            });

            // Back panel
            const panel = this._mesh(new THREE.BoxGeometry(3.0,1.2,0.06), surfMat.clone());
            panel.position.set(0, 1.56, -0.48);
            grp.add(panel);

            // Computer terminal (first 2 benches)
            if (i < 2) {
                const tMat = new THREE.MeshStandardMaterial({
                    map: this.textures.holoData, emissive:0x001122, emissiveIntensity:0.55, roughness:0.2
                });
                const term = this._mesh(new THREE.BoxGeometry(0.55,0.45,0.1), tMat);
                term.position.set(0.5, 1.22, 0.28);
                term.rotation.x = -0.22;
                grp.add(term);
            }

            // Scattered tools
            for (let k=0; k<4; k++) {
                const tg = this._mesh(
                    new THREE.BoxGeometry(0.08+rng()*0.28, 0.02, 0.04+rng()*0.08),
                    new THREE.MeshStandardMaterial({color: toolColors[k % toolColors.length], roughness:0.6})
                );
                tg.position.set(-0.8 + k*0.45, 0.975, (rng()-0.5)*0.35);
                tg.rotation.y = rng()*0.6 - 0.3;
                grp.add(tg);
            }

            this.scene.add(grp);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // CEILING NEON STRIPS
    // ─────────────────────────────────────────────────────────────
    _createCeilingNeonStrips() {
        const strips = [
            { from:[-20,11.75,-20], to:[20,11.75,-20],  color:0x00ffff },
            { from:[-20,11.75, 20], to:[20,11.75, 20],  color:0xff00aa },
            { from:[-20,11.75,-20], to:[-20,11.75, 20], color:0xff6600 },
            { from:[ 20,11.75,-20], to:[ 20,11.75, 20], color:0x44ffaa },
        ];

        strips.forEach((s, i) => {
            const dx = s.to[0]-s.from[0], dy = s.to[1]-s.from[1], dz = s.to[2]-s.from[2];
            const len = Math.sqrt(dx*dx+dy*dy+dz*dz);
            const mx=(s.from[0]+s.to[0])/2, my=(s.from[1]+s.to[1])/2, mz=(s.from[2]+s.to[2])/2;

            const mat = new THREE.MeshStandardMaterial({
                color:s.color, emissive:s.color, emissiveIntensity:2.5, roughness:0.15
            });

            const w = Math.abs(dx) > 0 ? len : 0.05;
            const d = Math.abs(dz) > 0 ? len : 0.05;
            const strip = this._mesh(new THREE.BoxGeometry(w,0.05,d), mat);
            strip.position.set(mx,my,mz);
            this.scene.add(strip);

            this.animated.push({ update:(_,t) => {
                mat.emissiveIntensity = 2.0 + 0.5*Math.sin(t*1.4 + i*Math.PI/2);
            }});
        });

        // Floor edge accent lines
        const floorLineMat = new THREE.MeshStandardMaterial({
            color:0x003366, emissive:0x003366, emissiveIntensity:0.8, roughness:0.2
        });
        [[-20,0],[20,0]].forEach(([x,_]) => {
            const strip = this._mesh(new THREE.BoxGeometry(0.05,0.05,40), floorLineMat);
            strip.position.set(x, 0.025, 0);
            this.scene.add(strip);
        });
        [[0,-20],[0,20]].forEach(([_,z]) => {
            const strip = this._mesh(new THREE.BoxGeometry(40,0.05,0.05), floorLineMat);
            strip.position.set(0, 0.025, z);
            this.scene.add(strip);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // FLOATING DATA NODES
    // ─────────────────────────────────────────────────────────────
    _createDataNodes() {
        const nodes = [
            { pos:[-6, 5,-10], color:0x00ffff, scale:0.28 },
            { pos:[ 6, 4,-10], color:0xff00aa, scale:0.22 },
            { pos:[-9, 6,  4], color:0x4444ff, scale:0.32 },
            { pos:[ 9, 5.5, 4], color:0x44ffaa, scale:0.25 },
        ];

        nodes.forEach((cfg, i) => {
            const grp = new THREE.Group();
            grp.position.set(...cfg.pos);
            const initY = cfg.pos[1];

            const mat = new THREE.MeshStandardMaterial({
                color:cfg.color, emissive:cfg.color, emissiveIntensity:1.6, roughness:0.15
            });

            // Two torus rings (perpendicular)
            const torusGeo = new THREE.TorusGeometry(cfg.scale, 0.012, 8, 36);
            const t1 = this._mesh(torusGeo, mat); grp.add(t1);
            const t2 = this._mesh(torusGeo, mat.clone());
            t2.rotation.x = Math.PI/2; grp.add(t2);

            // Core sphere
            const coreMat = new THREE.MeshStandardMaterial({
                color:cfg.color, emissive:cfg.color, emissiveIntensity:0.5,
                transparent:true, opacity:0.45, roughness:0.1
            });
            grp.add(this._mesh(new THREE.SphereGeometry(cfg.scale*0.38, 14, 8), coreMat));

            this.scene.add(grp);

            this.animated.push({ update:(dt,t) => {
                grp.rotation.y += dt * 0.75;
                grp.rotation.x += dt * 0.28;
                grp.position.y = initY + Math.sin(t*0.65 + i)*0.32;
                mat.emissiveIntensity = 1.3 + 0.3*Math.sin(t*2.5 + i);
            }});
        });
    }

    // ─────────────────────────────────────────────────────────────
    // WARNING LIGHTS (decorative)
    // ─────────────────────────────────────────────────────────────
    _createWarningLights() {
        const positions = [[-18,3,-18],[18,3,-18],[-18,3,18],[18,3,18]];
        positions.forEach((pos, i) => {
            const grp = new THREE.Group(); grp.position.set(...pos);

            // Housing
            const housMat = new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:0.7,metalness:0.6});
            grp.add(this._mesh(new THREE.CylinderGeometry(0.08,0.08,0.25,12), housMat));

            // Beacon
            const beaconMat = new THREE.MeshStandardMaterial({
                color:0xff4400, emissive:0xff2200, emissiveIntensity:2.0, roughness:0.1
            });
            const beacon = this._mesh(new THREE.SphereGeometry(0.065,12,8), beaconMat);
            beacon.position.y = 0.12;
            grp.add(beacon);
            this.scene.add(grp);

            // Staggered blink
            this.animated.push({ update:(_,t) => {
                const on = Math.sin(t*3.5 + i*Math.PI/2) > 0.4;
                beaconMat.emissiveIntensity = on ? 3.5 : 0.1;
            }});
        });
    }

    // ─────────────────────────────────────────────────────────────
    // UTILITY
    // ─────────────────────────────────────────────────────────────
    _mesh(geo, mat) {
        const m = new THREE.Mesh(geo, mat);
        m.castShadow = true;
        m.receiveShadow = true;
        return m;
    }
}
