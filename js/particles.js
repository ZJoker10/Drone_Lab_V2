/**
 * particles.js — NEXUS-7 Cyberpunk Drone Lab
 * Additive-blended particle system for ambient dust,
 * floating embers, and neon micro-debris.
 * Animations are written entirely in JavaScript (no imported clips).
 */

class ParticleSystem {
    /**
     * @param {THREE.Scene} scene
     * @param {number} count  Number of particles (default 600)
     */
    constructor(scene, count = 600) {
        this.scene = scene;
        this.count = count;

        // Per-particle velocity & lifetime data stored in plain arrays
        this._vel   = new Float32Array(count * 3);
        this._life  = new Float32Array(count);
        this._maxLife = new Float32Array(count);
        this._type  = new Uint8Array(count);   // 0=dust, 1=ember, 2=spark

        this._points = null;
        this._geo    = null;
        this._create();
    }

    _create() {
        const pos   = new Float32Array(this.count * 3);
        const col   = new Float32Array(this.count * 3);
        const sizes = new Float32Array(this.count);

        // Neon colour palette  [r,g,b]
        const palette = [
            [0.0, 1.0, 1.0],   // cyan
            [1.0, 0.0, 0.67],  // magenta
            [1.0, 0.4, 0.0],   // orange
            [0.27, 1.0, 0.67], // green-cyan
            [0.5,  0.5, 1.0],  // blue-lavender
        ];

        for (let i = 0; i < this.count; i++) {
            const i3 = i * 3;
            const c  = palette[Math.floor(Math.random() * palette.length)];
            const t  = Math.floor(Math.random() * 3);

            // Random starting position inside the room
            pos[i3]   = (Math.random() - 0.5) * 38;
            pos[i3+1] = Math.random() * 11.5;
            pos[i3+2] = (Math.random() - 0.5) * 38;

            col[i3]   = c[0];
            col[i3+1] = c[1];
            col[i3+2] = c[2];

            // Velocity: mostly upward drift + small horizontal wander
            this._vel[i3]   = (Math.random() - 0.5) * 0.25;
            this._vel[i3+1] = Math.random() * 0.12 + 0.03;
            this._vel[i3+2] = (Math.random() - 0.5) * 0.25;

            // Randomise life so particles don't all reset together
            const life = Math.random() * 15 + 5;
            this._maxLife[i] = life;
            this._life[i]    = Math.random() * life; // start mid-life

            this._type[i] = t;
            sizes[i] = t === 1 ? Math.random()*0.55+0.25    // ember — medium
                     : t === 2 ? Math.random()*0.18+0.08     // spark  — tiny
                               : Math.random()*0.35+0.15;    // dust   — small
        }

        this._geo = new THREE.BufferGeometry();
        this._geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this._geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
        this._geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

        const mat = new THREE.PointsMaterial({
            size:            0.1,
            vertexColors:    true,
            transparent:     true,
            opacity:         0.55,
            sizeAttenuation: true,
            blending:        THREE.AdditiveBlending,
            depthWrite:      false,
        });

        this._points = new THREE.Points(this._geo, mat);
        this.scene.add(this._points);
        this._mat = mat;
    }

    /**
     * Per-frame update — moves particles, resets expired ones.
     * @param {number} dt   Delta time (seconds)
     * @param {number} time Elapsed time (seconds)
     */
    update(dt, time) {
        const pos = this._geo.attributes.position.array;

        for (let i = 0; i < this.count; i++) {
            const i3 = i * 3;

            // Age particle
            this._life[i] += dt;

            if (this._life[i] > this._maxLife[i]) {
                // Respawn at random floor-level position
                pos[i3]   = (Math.random() - 0.5) * 38;
                pos[i3+1] = Math.random() * 0.5;
                pos[i3+2] = (Math.random() - 0.5) * 38;
                this._vel[i3]   = (Math.random() - 0.5) * 0.25;
                this._vel[i3+1] = Math.random() * 0.12 + 0.03;
                this._vel[i3+2] = (Math.random() - 0.5) * 0.25;
                this._life[i]   = 0;
                continue;
            }

            // Type-specific movement
            switch (this._type[i]) {
                case 0: // Dust — slow drift, gentle turbulence
                    pos[i3]   += (this._vel[i3]   + Math.sin(time*0.7 + i*0.03)*0.04) * dt;
                    pos[i3+1] += this._vel[i3+1] * dt;
                    pos[i3+2] += (this._vel[i3+2] + Math.cos(time*0.5 + i*0.05)*0.04) * dt;
                    break;

                case 1: // Ember — spiral upward
                    pos[i3]   += (this._vel[i3] + Math.sin(time + i)*0.1) * dt;
                    pos[i3+1] += this._vel[i3+1] * 1.5 * dt;
                    pos[i3+2] += (this._vel[i3+2] + Math.cos(time + i)*0.1) * dt;
                    break;

                case 2: // Spark — fast burst then float
                    pos[i3]   += this._vel[i3]   * 2.5 * dt;
                    pos[i3+1] += this._vel[i3+1] * 2.5 * dt;
                    pos[i3+2] += this._vel[i3+2] * 2.5 * dt;
                    this._vel[i3+1] -= 0.3 * dt; // gravity
                    break;
            }

            // Ceiling reset for non-sparks
            if (pos[i3+1] > 11.8 && this._type[i] !== 2) {
                pos[i3+1] = 0.1;
                pos[i3]   = (Math.random() - 0.5) * 38;
                pos[i3+2] = (Math.random() - 0.5) * 38;
            }
        }

        this._geo.attributes.position.needsUpdate = true;

        // Gentle opacity breathing
        this._mat.opacity = 0.40 + 0.15 * Math.sin(time * 0.4);
    }
}
