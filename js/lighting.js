/**
 * lighting.js — NEXUS-7 Cyberpunk Drone Lab
 * Full lighting system:
 *   • AmbientLight       — minimal dark ambient fill
 *   • HemisphereLight    — sky/ground gradient
 *   • DirectionalLight   — faint overhead fill
 *   • PointLight × 6    — neon corner + accent lights
 *   • SpotLight          — main landing-pad spotlight (casts shadows)
 *   • PointLight (drone) — follows main drone (engine glow)
 */

class LightingSystem {
    constructor(scene) {
        this.scene = scene;
        this.neonEnabled = true;
        this.neonLights = [];       // { light, baseIntensity, phaseOffset }
        this.droneFollowLight = null;
        this.mainSpot = null;
        this._time = 0;
    }

    /** Creates and adds all lights to the scene */
    setup() {
        // ── 1. Ambient (very dark blue-black) ──────────────────────
        const ambient = new THREE.AmbientLight(0x06060e, 0.45);
        this.scene.add(ambient);

        // ── 2. Hemisphere (sky haze / ground reflection) ──────────
        const hemi = new THREE.HemisphereLight(0x0a0a2a, 0x000008, 0.35);
        this.scene.add(hemi);

        // ── 3. Directional (faint overhead structural fill) ────────
        const dir = new THREE.DirectionalLight(0x151535, 0.4);
        dir.position.set(5, 20, 5);
        this.scene.add(dir);

        // ── 4. Main SpotLight — landing pad (shadow caster) ────────
        this.mainSpot = new THREE.SpotLight(0x8888cc, 2.2, 40, Math.PI/7, 0.35, 1.5);
        this.mainSpot.position.set(0, 11.5, 0);
        this.mainSpot.target.position.set(0, 0, 0);
        this.mainSpot.castShadow = true;
        this.mainSpot.shadow.mapSize.set(2048, 2048);
        this.mainSpot.shadow.camera.near = 1;
        this.mainSpot.shadow.camera.far = 25;
        this.mainSpot.shadow.bias = -0.002;
        this.scene.add(this.mainSpot);
        this.scene.add(this.mainSpot.target);

        // ── 5. Corner Neon PointLights ─────────────────────────────
        const corners = [
            { pos:[-16,6,-16], color:0x00ffff, intensity:1.8, dist:22 },  // Back-Left  — Cyan
            { pos:[ 16,6,-16], color:0xff00aa, intensity:1.8, dist:22 },  // Back-Right — Magenta
            { pos:[-16,6, 16], color:0xff6600, intensity:1.6, dist:22 },  // Front-Left — Orange
            { pos:[ 16,6, 16], color:0x44ffaa, intensity:1.6, dist:22 },  // Front-Right— Green
        ];
        corners.forEach((cfg, i) => {
            const pl = new THREE.PointLight(cfg.color, cfg.intensity, cfg.dist, 1.5);
            pl.position.set(...cfg.pos);
            this.scene.add(pl);
            this.neonLights.push({ light:pl, base:cfg.intensity, phase: i * Math.PI/2 });
        });

        // ── 6. Wall accent PointLights ─────────────────────────────
        const accents = [
            { pos:[0, 5, -19.5], color:0x0044ff, intensity:2.2, dist:28 },  // back wall
            { pos:[0, 5,  19.5], color:0x002200, intensity:1.5, dist:25 },  // front wall
            { pos:[-19,5, 0],    color:0x660022, intensity:1.2, dist:20 },  // left wall
            { pos:[ 19,5, 0],    color:0x003366, intensity:1.2, dist:20 },  // right wall
        ];
        accents.forEach((cfg, i) => {
            const pl = new THREE.PointLight(cfg.color, cfg.intensity, cfg.dist, 1.8);
            pl.position.set(...cfg.pos);
            this.scene.add(pl);
            this.neonLights.push({ light:pl, base:cfg.intensity, phase: i * Math.PI/3 + 1 });
        });

        // ── 7. Drone follow light (engine glow, cyan) ─────────────
        this.droneFollowLight = new THREE.PointLight(0x00bbff, 1.8, 5, 2.0);
        this.droneFollowLight.position.set(0, 2.5, 0);
        this.scene.add(this.droneFollowLight);

        // ── 8. SpotLight on holo display wall ─────────────────────
        const holoSpot = new THREE.SpotLight(0x0033ff, 1.0, 30, Math.PI/8, 0.5);
        holoSpot.position.set(0, 10, 18);
        holoSpot.target.position.set(0, 5, -20);
        this.scene.add(holoSpot);
        this.scene.add(holoSpot.target);
    }

    /**
     * Per-frame update — pulses neon lights and flickers main spot.
     * @param {number} dt   Delta time in seconds
     * @param {number} time Elapsed time in seconds
     */
    update(dt, time) {
        this._time = time;

        // Pulse each neon light individually
        this.neonLights.forEach(nl => {
            if (!this.neonEnabled) return;
            const pulse = 0.78 + 0.22 * Math.sin(time * 1.8 + nl.phase);
            nl.light.intensity = nl.base * pulse;
        });

        // Subtle main spot flicker
        if (this.mainSpot) {
            this.mainSpot.intensity = 2.2 + 0.08 * Math.sin(time * 7.1) + 0.04 * Math.sin(time * 13.7);
        }

        // Engine glow breathe
        if (this.droneFollowLight) {
            this.droneFollowLight.intensity = 1.4 + 0.4 * Math.sin(time * 4.5);
        }
    }

    /**
     * Moves the engine-glow follow light to the drone's position.
     * @param {THREE.Vector3} pos
     */
    updateDroneFollowLight(pos) {
        if (this.droneFollowLight) {
            this.droneFollowLight.position.copy(pos);
        }
    }

    /** Toggle all neon PointLights on/off */
    toggleNeonLights() {
        this.neonEnabled = !this.neonEnabled;
        this.neonLights.forEach(nl => {
            nl.light.intensity = this.neonEnabled ? nl.base : 0;
        });
    }
}
