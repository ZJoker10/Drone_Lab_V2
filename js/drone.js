/**
 * drone.js — NEXUS-7 Cyberpunk Drone Lab
 *
 * Hierarchical Model Structure (the "complex object" required):
 *
 * DroneRoot  (THREE.Group)
 *  ├─ bodyGroup  (THREE.Group)
 *  │   ├─ mainBody        Mesh  BoxGeometry   — circuit-board texture, normal+roughness maps
 *  │   ├─ topPlate        Mesh  BoxGeometry   — metallic top panel
 *  │   ├─ underbelly      Mesh  BoxGeometry   — bottom hull
 *  │   ├─ cockpitGroup  (THREE.Group)         — can pitch (gimbal)
 *  │   │   ├─ cockpitFrame  Mesh  SphereGeometry   — glass dome frame
 *  │   │   └─ cockpitLens   Mesh  CylinderGeometry — camera lens
 *  │   ├─ frontLED  Mesh  SphereGeometry  — orange forward indicator
 *  │   ├─ backLEDs[2]     Mesh SphereGeometry — cyan rear indicators
 *  │   └─ emblem          Mesh  CylinderGeometry — hex top badge
 *  │
 *  ├─ armGroups[0..3]  (THREE.Group × 4 — rotated ±45°, ±135°)
 *  │   ├─ armTube     Mesh  CylinderGeometry  — carbon-fibre arm
 *  │   ├─ armBrace    Mesh  BoxGeometry       — structural brace
 *  │   └─ motorGroup  (THREE.Group)
 *  │       ├─ motorBase   Mesh  CylinderGeometry — motor housing
 *  │       ├─ motorBell   Mesh  CylinderGeometry — spinning motor bell
 *  │       ├─ thrusterGlow Mesh CircleGeometry   — engine disc glow
 *  │       ├─ motorLEDRing (THREE.Group)
 *  │       │   └─ motorLED[0..3]  Mesh  SphereGeometry × 4
 *  │       └─ rotorAssembly  (THREE.Group)  ← SPINS EACH FRAME
 *  │           ├─ rotorHub   Mesh  CylinderGeometry
 *  │           ├─ blade0     Mesh  BoxGeometry
 *  │           └─ blade1     Mesh  BoxGeometry  (90° offset)
 *  │
 *  └─ landingGearGroup  (THREE.Group)
 *      ├─ crossBarFront   Mesh  CylinderGeometry
 *      ├─ crossBarBack    Mesh  CylinderGeometry
 *      ├─ strut[0..3]     Mesh  CylinderGeometry × 4
 *      └─ foot[0..3]      Mesh  BoxGeometry × 4
 */

class Drone {
    /**
     * @param {THREE.Scene} scene
     * @param {Object}      textures   Texture cache from TextureFactory
     * @param {boolean}     isMain     true = player-controlled
     */
    constructor(scene, textures, isMain = false) {
        this.scene    = scene;
        this.textures = textures;
        this.isMain   = isMain;

        // ── Physics state ──────────────────────────────────────────
        this.velocity       = new THREE.Vector3();
        this.targetVelocity = new THREE.Vector3();
        this.rotorPower     = 0;
        this.targetRotorPower = 0;
        this.yaw            = 0;

        // ── Hover bob ─────────────────────────────────────────────
        this.hoverPhase     = Math.random() * Math.PI * 2;
        this.hoverAmp       = 0.04;
        this.hoverFreq      = 1.4;

        // ── Auto-flight ───────────────────────────────────────────
        this.autoHover      = false;
        this.autoFlightOffset = 0;
        this.autoFlightStyle  = 0;   // 0=circle, 1=figure8, 2=patrol

        // ── Animation bookkeeping ─────────────────────────────────
        this.rotorAssemblies = [];   // { group, dir }  — one per arm
        this.thrusterGlows   = [];   // material refs for glow opacity
        this.ledMaterials    = [];   // { mat, base }   — all LED mats
        this.ledBlinkTime    = 0;

        // ── Build scene-graph ─────────────────────────────────────
        this.root = new THREE.Group();
        const mats = this._createMaterials();
        this._buildBody(mats);
        this._buildArms(mats);
        this._buildLandingGear(mats);
        scene.add(this.root);
    }

    // ═══════════════════════════════════════════════════════════════
    // MATERIALS
    // ═══════════════════════════════════════════════════════════════

    _createMaterials() {
        const T = this.textures;

        return {
            // PBR body — uses Color + Normal + Roughness maps
            body: new THREE.MeshStandardMaterial({
                map:          T.droneBody,
                normalMap:    T.panelNormal,   // Normal map
                roughnessMap: T.roughness,     // Roughness / Specular map
                emissiveMap:  T.droneEmissive,
                roughness:    0.45,
                metalness:    0.85,
                color:        0x1a1a30,
                emissive:     0x001133,
                emissiveIntensity: 0.6,
            }),

            // Arms — carbon-fibre with normal
            arm: new THREE.MeshStandardMaterial({
                map:          T.carbonFiber,
                normalMap:    T.panelNormal,
                roughnessMap: T.roughness,
                roughness:    0.6,
                metalness:    0.3,
                color:        0x0d0d1c,
            }),

            // Motor housings — polished metal
            motor: new THREE.MeshStandardMaterial({
                roughness: 0.28,
                metalness: 0.92,
                color:     0x252540,
            }),

            // Propeller blades — semi-transparent carbon
            blade: new THREE.MeshStandardMaterial({
                roughness:   0.65,
                metalness:   0.1,
                color:       0x0e0e22,
                transparent: true,
                opacity:     0.92,
                side:        THREE.DoubleSide,
            }),

            // LED — cyan emissive
            led: new THREE.MeshStandardMaterial({
                color:            0x00ffff,
                emissive:         0x00ffff,
                emissiveIntensity: 2.2,
                roughness: 0.1, metalness: 0,
            }),

            // Orange front marker LED
            ledOrange: new THREE.MeshStandardMaterial({
                color:            0xff5500,
                emissive:         0xff5500,
                emissiveIntensity: 2.5,
                roughness: 0.1, metalness: 0,
            }),

            // Cockpit glass
            glass: new THREE.MeshStandardMaterial({
                color:       0x001133,
                transparent: true,
                opacity:     0.65,
                roughness:   0.02,
                metalness:   0.0,
                side:        THREE.FrontSide,
            }),

            // Thruster glow disc
            glow: new THREE.MeshBasicMaterial({
                color:       0x0066ff,
                transparent: true,
                opacity:     0.0,
                side:        THREE.DoubleSide,
                depthWrite:  false,
                blending:    THREE.AdditiveBlending,
            }),
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // BODY CONSTRUCTION
    // ═══════════════════════════════════════════════════════════════

    _buildBody(mats) {
        const bodyGroup = new THREE.Group();
        bodyGroup.name = 'bodyGroup';

        // ── Main body ─────────────────────────────────────────────
        const mainBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.52, 0.09, 0.52),
            mats.body
        );
        mainBody.name = 'mainBody';
        mainBody.castShadow = true;
        mainBody.receiveShadow = true;
        bodyGroup.add(mainBody);

        // ── Top armour plate ──────────────────────────────────────
        const topPlate = new THREE.Mesh(
            new THREE.BoxGeometry(0.38, 0.028, 0.38),
            mats.motor
        );
        topPlate.name = 'topPlate';
        topPlate.position.y = 0.059;
        bodyGroup.add(topPlate);

        // ── Hex emblem on top ─────────────────────────────────────
        const emblem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.09, 0.09, 0.005, 6),
            new THREE.MeshStandardMaterial({
                color:0x003366, emissive:0x003366,
                emissiveIntensity:0.7, roughness:0.15, metalness:0.9
            })
        );
        emblem.name = 'emblem';
        emblem.position.y = 0.074;
        bodyGroup.add(emblem);

        // ── Underbelly panel ─────────────────────────────────────
        const underbelly = new THREE.Mesh(
            new THREE.BoxGeometry(0.44, 0.016, 0.44),
            mats.motor
        );
        underbelly.name = 'underbelly';
        underbelly.position.y = -0.053;
        bodyGroup.add(underbelly);

        // ── Cockpit group (camera gimbal) ─────────────────────────
        const cockpitGroup = new THREE.Group();
        cockpitGroup.name = 'cockpitGroup';
        cockpitGroup.position.set(0, -0.04, 0.12);

        // Dome frame
        const cockpitFrame = new THREE.Mesh(
            new THREE.SphereGeometry(0.072, 18, 10, 0, Math.PI*2, 0, Math.PI*0.6),
            mats.motor
        );
        cockpitFrame.name = 'cockpitFrame';
        cockpitFrame.rotation.x = Math.PI;
        cockpitGroup.add(cockpitFrame);

        // Glass dome
        const cockpitGlass = new THREE.Mesh(
            new THREE.SphereGeometry(0.065, 18, 10, 0, Math.PI*2, 0, Math.PI*0.55),
            mats.glass
        );
        cockpitGlass.name = 'cockpitGlass';
        cockpitGlass.rotation.x = Math.PI;
        cockpitGroup.add(cockpitGlass);

        // Camera lens barrel
        const cockpitLens = new THREE.Mesh(
            new THREE.CylinderGeometry(0.022, 0.028, 0.04, 14),
            mats.motor
        );
        cockpitLens.name = 'cockpitLens';
        cockpitLens.position.set(0, -0.075, 0);
        cockpitGroup.add(cockpitLens);

        bodyGroup.add(cockpitGroup);
        this.cockpitGroup = cockpitGroup;

        // ── LEDs ─────────────────────────────────────────────────
        // Front orange marker
        const frontLED = this._makeLED(0.016, mats.ledOrange);
        frontLED.name = 'frontLED';
        frontLED.position.set(0, 0, 0.28);
        bodyGroup.add(frontLED);
        this.ledMaterials.push({ mat: frontLED.material, base: 2.5 });

        // Rear cyan markers
        [[-0.14,0,-0.27],[0.14,0,-0.27]].forEach((p, i) => {
            const led = this._makeLED(0.014, mats.led);
            led.name = `rearLED_${i}`;
            led.position.set(...p);
            bodyGroup.add(led);
            this.ledMaterials.push({ mat: led.material, base: 2.2 });
        });

        // Side indicator strips (tiny box LEDs)
        [[-0.27,0,0],[0.27,0,0]].forEach((p, i) => {
            const m = new THREE.MeshStandardMaterial({
                color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1.8
            });
            const led = new THREE.Mesh(new THREE.BoxGeometry(0.022,0.012,0.06), m);
            led.name = `sideLED_${i}`;
            led.position.set(...p);
            bodyGroup.add(led);
            this.ledMaterials.push({ mat: m, base: 1.8 });
        });

        this.root.add(bodyGroup);
    }

    // ═══════════════════════════════════════════════════════════════
    // ARMS + MOTORS + ROTORS
    // ═══════════════════════════════════════════════════════════════

    _buildArms(mats) {
        /**
         * Arms in X-configuration:
         *   0 = Front-Right  (+X,-Z)  angle =  135°  rotor CW
         *   1 = Front-Left   (-X,-Z)  angle = -135°  rotor CCW
         *   2 = Back-Left    (-X,+Z)  angle =  -45°  rotor CW
         *   3 = Back-Right   (+X,+Z)  angle =   45°  rotor CCW
         */
        const configs = [
            { angle:  3*Math.PI/4, dir:  1 },
            { angle: -3*Math.PI/4, dir: -1 },
            { angle: -1*Math.PI/4, dir:  1 },
            { angle:  1*Math.PI/4, dir: -1 },
        ];

        configs.forEach((cfg, i) => {
            const armGroup = new THREE.Group();
            armGroup.name = `armGroup_${i}`;
            armGroup.rotation.y = cfg.angle;

            const armLength = 0.52;
            const armStart  = 0.14; // gap between body edge and arm root

            // ── Arm tube (carbon-fibre CylinderGeometry, rotated to lie along Z) ──
            const armTube = new THREE.Mesh(
                new THREE.CylinderGeometry(0.022, 0.028, armLength, 8),
                mats.arm
            );
            armTube.name = 'armTube';
            armTube.rotation.x = Math.PI/2;
            armTube.position.z = armStart + armLength/2;
            armTube.castShadow = true;
            armGroup.add(armTube);

            // ── Reinforcement brace ──────────────────────────────
            const armBrace = new THREE.Mesh(
                new THREE.BoxGeometry(0.04, 0.012, armLength*0.5),
                mats.motor
            );
            armBrace.name = 'armBrace';
            armBrace.position.set(0.032, -0.008, armStart + armLength*0.55);
            armGroup.add(armBrace);

            // ── Motor group (at tip of arm) ───────────────────────
            const motorGroup = new THREE.Group();
            motorGroup.name = 'motorGroup';
            motorGroup.position.z = armStart + armLength;
            armGroup.add(motorGroup);

            // Motor housing (base)
            const motorBase = new THREE.Mesh(
                new THREE.CylinderGeometry(0.075, 0.068, 0.065, 16),
                mats.motor
            );
            motorBase.name = 'motorBase';
            motorBase.castShadow = true;
            motorGroup.add(motorBase);

            // Motor bell (top spinning cap — visual only)
            const motorBell = new THREE.Mesh(
                new THREE.CylinderGeometry(0.058, 0.058, 0.038, 16),
                mats.arm
            );
            motorBell.name = 'motorBell';
            motorBell.position.y = 0.048;
            motorGroup.add(motorBell);

            // Thruster glow disc (under motor)
            const glowMat = mats.glow.clone();
            const thrusterGlow = new THREE.Mesh(
                new THREE.CircleGeometry(0.068, 20),
                glowMat
            );
            thrusterGlow.name = 'thrusterGlow';
            thrusterGlow.rotation.x = Math.PI/2;
            thrusterGlow.position.y = -0.04;
            motorGroup.add(thrusterGlow);
            this.thrusterGlows.push(glowMat);

            // ── Motor LED ring ────────────────────────────────────
            const ledRingGroup = new THREE.Group();
            ledRingGroup.name = 'motorLEDRing';
            const ledColor = (i % 2 === 0) ? 0x00ffff : 0xff00aa;
            for (let k=0; k<4; k++) {
                const a = (k/4)*Math.PI*2;
                const ledMat = new THREE.MeshStandardMaterial({
                    color: ledColor, emissive: ledColor, emissiveIntensity: 1.6,
                    roughness:0.1, metalness:0
                });
                const motorLED = this._makeLED(0.009, { color:ledColor, emissive:ledColor, emissiveIntensity:1.6, roughness:0.1, metalness:0 });
                motorLED.name = `motorLED_${k}`;
                motorLED.material = ledMat;
                motorLED.position.set(Math.cos(a)*0.072, 0, Math.sin(a)*0.072);
                ledRingGroup.add(motorLED);
                this.ledMaterials.push({ mat: ledMat, base: 1.6 });
            }
            motorGroup.add(ledRingGroup);

            // ── Rotor assembly (THIS GROUP SPINS) ─────────────────
            const rotorAssembly = new THREE.Group();
            rotorAssembly.name = 'rotorAssembly';
            rotorAssembly.position.y = 0.075;

            // Rotor hub
            const rotorHub = new THREE.Mesh(
                new THREE.CylinderGeometry(0.026, 0.026, 0.016, 12),
                mats.motor
            );
            rotorHub.name = 'rotorHub';
            rotorAssembly.add(rotorHub);

            // Blade pair (2 symmetric blades = + or × cross shape)
            const bladeLength = 0.175; // half-span per side
            const bladeMat = mats.blade.clone();

            [0, Math.PI/2].forEach((bAngle, bi) => {
                const pivotGroup = new THREE.Group();
                pivotGroup.rotation.y = bAngle;

                // Blade A (+X half)
                const bladeA = new THREE.Mesh(
                    new THREE.BoxGeometry(bladeLength, 0.0035, 0.04),
                    bladeMat
                );
                bladeA.name = `bladeA_${bi}`;
                bladeA.position.x = bladeLength/2;
                bladeA.rotation.z = 0.12 * cfg.dir; // pitch angle
                pivotGroup.add(bladeA);

                // Blade B (-X half, slightly tapered look via scale)
                const bladeB = new THREE.Mesh(
                    new THREE.BoxGeometry(bladeLength, 0.003, 0.035),
                    bladeMat
                );
                bladeB.name = `bladeB_${bi}`;
                bladeB.position.x = -bladeLength/2;
                bladeB.rotation.z = 0.12 * cfg.dir;
                pivotGroup.add(bladeB);

                rotorAssembly.add(pivotGroup);
            });

            motorGroup.add(rotorAssembly);
            this.rotorAssemblies.push({ group: rotorAssembly, dir: cfg.dir });

            this.root.add(armGroup);
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // LANDING GEAR
    // ═══════════════════════════════════════════════════════════════

    _buildLandingGear(mats) {
        const gearGroup = new THREE.Group();
        gearGroup.name = 'landingGearGroup';

        const strutMat = new THREE.MeshStandardMaterial({
            color:0x1a1a35, roughness:0.65, metalness:0.75
        });

        // Cross skids (2 parallel bars)
        const skidGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.34, 8);
        ['crossBarFront','crossBarBack'].forEach((name, i) => {
            const skid = new THREE.Mesh(skidGeo, strutMat);
            skid.name = name;
            skid.rotation.z = Math.PI/2;
            skid.position.set(0, -0.19, (i === 0 ? 1 : -1) * 0.12);
            gearGroup.add(skid);
        });

        // 4 vertical struts
        const sp2 = [[0.14,0.12],[-0.14,0.12],[0.14,-0.12],[-0.14,-0.12]];
        sp2.forEach((pos, i) => {
            // Diagonal strut
            const strut = new THREE.Mesh(
                new THREE.CylinderGeometry(0.007, 0.008, 0.14, 8),
                strutMat
            );
            strut.name = `strut_${i}`;
            strut.position.set(pos[0], -0.12, pos[1]);
            strut.rotation.x = (i < 2 ? 0.1 : -0.1);
            gearGroup.add(strut);

            // Foot pad
            const foot = new THREE.Mesh(
                new THREE.BoxGeometry(0.04, 0.01, 0.05),
                strutMat
            );
            foot.name = `foot_${i}`;
            foot.position.set(pos[0], -0.195, pos[1]);
            gearGroup.add(foot);
        });

        this.root.add(gearGroup);
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════

    _makeLED(radius, matOrConfig) {
        const mat = (matOrConfig && matOrConfig.isMaterial)
            ? matOrConfig
            : new THREE.MeshStandardMaterial(matOrConfig || {});
        return new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), mat);
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════

    setPosition(x, y, z) { this.root.position.set(x, y, z); }

    powerUp()   { this.targetRotorPower = 1.0; }
    powerDown() { this.targetRotorPower = 0.0; }

    toggleAutoHover() {
        this.autoHover = !this.autoHover;
        if (this.autoHover) {
            this.velocity.set(0,0,0);
            this.targetVelocity.set(0,0,0);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // MAIN UPDATE
    // ═══════════════════════════════════════════════════════════════

    /**
     * @param {number}  dt    Delta time (seconds)
     * @param {number}  time  Elapsed time
     * @param {Object}  keys  Keyboard state map { key: bool }
     */
    update(dt, time, keys) {
        // ── Rotor power ramp ────────────────────────────────────
        this.rotorPower += (this.targetRotorPower - this.rotorPower) * dt * 4;

        // ── Spin rotors ─────────────────────────────────────────
        const spinSpeed = 22 * this.rotorPower;
        this.rotorAssemblies.forEach(r => {
            r.group.rotation.y += r.dir * spinSpeed * dt;
        });

        // ── Thruster glow intensity ──────────────────────────────
        const glowOpacity = this.rotorPower * 0.45;
        this.thrusterGlows.forEach(mat => { mat.opacity = glowOpacity; });

        // ── Movement ────────────────────────────────────────────
        if (this.isMain) {
            this._updatePlayerMovement(dt, keys);
        } else {
            this._updateAutoFlight(dt, time);
        }

        // ── Hover bob ───────────────────────────────────────────
        this.hoverPhase += dt * this.hoverFreq;
        this.root.position.y += Math.sin(this.hoverPhase) * this.hoverAmp * dt;

        // ── Tilt based on velocity ───────────────────────────────
        const tgtTiltX = -this.velocity.z * 0.18;
        const tgtTiltZ =  this.velocity.x * 0.18;
        this.root.rotation.x += (tgtTiltX - this.root.rotation.x) * dt * 6;
        this.root.rotation.z += (tgtTiltZ - this.root.rotation.z) * dt * 6;

        // ── Cockpit gimbal (level horizon) ───────────────────────
        if (this.cockpitGroup) {
            this.cockpitGroup.rotation.x += (-this.root.rotation.x - this.cockpitGroup.rotation.x) * dt * 8;
        }

        // ── LED blink ────────────────────────────────────────────
        this.ledBlinkTime += dt;
        const blinkOn = Math.sin(this.ledBlinkTime * 4.5) > 0.3;
        this.ledMaterials.forEach(l => {
            l.mat.emissiveIntensity = blinkOn ? l.base : l.base * 0.2;
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // MOVEMENT IMPLEMENTATIONS
    // ═══════════════════════════════════════════════════════════════

    _updatePlayerMovement(dt, keys) {
        if (this.autoHover) {
            // Dampen velocity to hover in place
            this.velocity.multiplyScalar(Math.pow(0.05, dt));
            this.root.position.addScaledVector(this.velocity, dt);
            return;
        }

        const speed = 4.5;
        this.targetVelocity.set(0,0,0);

        if (keys['ArrowLeft']  || keys['a'] || keys['A']) this.targetVelocity.x = -speed;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) this.targetVelocity.x =  speed;
        if (keys['ArrowUp']    || keys['w'] || keys['W']) this.targetVelocity.z = -speed;
        if (keys['ArrowDown']  || keys['s'] || keys['S']) this.targetVelocity.z =  speed;
        if (keys['q'] || keys['Q']) this.targetVelocity.y =  speed;
        if (keys['e'] || keys['E']) this.targetVelocity.y = -speed;

        // Yaw control
        if (keys['r'] || keys['R']) this.root.rotation.y += dt * 1.5;
        if (keys['t'] || keys['T']) this.root.rotation.y -= dt * 1.5;

        // Lerp toward target velocity
        this.velocity.lerp(this.targetVelocity, dt * 6);
        // Drag
        this.velocity.multiplyScalar(Math.pow(0.18, dt));

        // Apply movement
        this.root.position.addScaledVector(this.velocity, dt);

        // World boundary clamp
        this.root.position.x = Math.max(-18, Math.min(18, this.root.position.x));
        this.root.position.y = Math.max(0.25, Math.min(11, this.root.position.y));
        this.root.position.z = Math.max(-18, Math.min(18, this.root.position.z));
    }

    _updateAutoFlight(dt, time) {
        const t = time + this.autoFlightOffset;

        switch (this.autoFlightStyle) {
            case 0: { // Circular orbit
                const r = 5.5 + Math.sin(t * 0.28) * 1.8;
                this.root.position.x = Math.cos(t * 0.38) * r;
                this.root.position.z = Math.sin(t * 0.38) * r;
                this.root.position.y = 2.8 + Math.sin(t * 0.9) * 0.5;
                // Face direction of travel
                const nx = Math.cos((t+0.1) * 0.38) * r;
                const nz = Math.sin((t+0.1) * 0.38) * r;
                this.root.rotation.y = Math.atan2(nx - this.root.position.x, nz - this.root.position.z);
                break;
            }
            case 1: { // Figure-8
                const r = 5;
                this.root.position.x = Math.cos(t * 0.42) * r;
                this.root.position.z = Math.sin(t * 0.84) * r * 0.55;
                this.root.position.y = 3.5 + Math.sin(t * 1.1) * 0.4;
                const nx = Math.cos((t+0.12)*0.42)*r;
                const nz = Math.sin((t+0.12)*0.84)*r*0.55;
                this.root.rotation.y = Math.atan2(nx - this.root.position.x, nz - this.root.position.z);
                break;
            }
            case 2: { // Slow patrol (wide ellipse)
                const rx=7, rz=4;
                this.root.position.x = Math.cos(t * 0.25) * rx;
                this.root.position.z = Math.sin(t * 0.25) * rz;
                this.root.position.y = 4.0 + Math.sin(t * 0.6) * 0.7;
                const nx = Math.cos((t+0.08)*0.25)*rx;
                const nz = Math.sin((t+0.08)*0.25)*rz;
                this.root.rotation.y = Math.atan2(nx - this.root.position.x, nz - this.root.position.z);
                break;
            }
        }
    }
}
