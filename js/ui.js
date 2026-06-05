/**
 * ui.js — NEXUS-7 Cyberpunk Drone Lab
 * Manages the HUD overlay: telemetry readouts, battery, FPS,
 * notification toasts, and camera-mode label.
 */

class UIManager {
    constructor() {
        this._el = {
            hud:         document.getElementById('hud'),
            alt:         document.getElementById('status-alt'),
            posX:        document.getElementById('status-x'),
            posZ:        document.getElementById('status-z'),
            rotor:       document.getElementById('status-rotor'),
            mode:        document.getElementById('status-mode'),
            batFill:     document.getElementById('battery-fill'),
            batPct:      document.getElementById('battery-pct'),
            clock:       document.getElementById('hud-time'),
            fps:         document.getElementById('tel-fps'),
            camMode:     document.getElementById('cam-mode'),
            notif:       document.getElementById('notification'),
            notifText:   document.getElementById('notification-text'),
        };

        this._battery      = 94;
        this._fps          = 60;
        this._frameCount   = 0;
        this._fpsAccum     = 0;
        this._notifTimer   = null;
        this._startEpoch   = Date.now();
    }

    /** Reveal HUD after loading is complete */
    show() {
        this._el.hud.classList.remove('hidden');
    }

    /**
     * Called every frame from the main animate() loop.
     * @param {Drone}  drone  Main (player) drone instance
     * @param {number} time   Elapsed time in seconds
     * @param {number} dt     Delta time in seconds
     */
    update(drone, time, dt = 0.016) {
        // ── FPS counter ──────────────────────────────────────────
        this._frameCount++;
        this._fpsAccum += dt;
        if (this._fpsAccum >= 1.0) {
            this._fps = Math.round(this._frameCount / this._fpsAccum);
            this._frameCount = 0;
            this._fpsAccum   = 0;
            this._el.fps.textContent = `◈ FPS: ${this._fps}`;
        }

        // ── Wall clock (starts at 22:00 for atmosphere) ──────────
        const base = 22 * 3600;
        const total = Math.floor(base + time) % 86400;
        const hh = String(Math.floor(total / 3600)).padStart(2, '0');
        const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
        const ss = String(total % 60).padStart(2, '0');
        this._el.clock.textContent = `${hh}:${mm}:${ss}`;

        // ── Drone telemetry ──────────────────────────────────────
        const p = drone.root.position;
        this._el.alt.textContent   = p.y.toFixed(2) + ' m';
        this._el.posX.textContent  = p.x.toFixed(2);
        this._el.posZ.textContent  = p.z.toFixed(2);

        const rotorActive = drone.rotorPower > 0.05;
        this._el.rotor.textContent  = rotorActive ? 'ACTIVE' : 'IDLE';
        this._el.rotor.style.color  = rotorActive ? '#00ffff' : '#ff4400';
        this._el.mode.textContent   = drone.autoHover ? 'AUTO-HOVER' : 'MANUAL';

        // ── Battery (slow drain; charges faster when near y≈0) ───
        const drainRate   = p.y < 0.5 ? -0.004 : 0.0015; // charge on pad, drain in flight
        this._battery     = Math.max(5, Math.min(100, this._battery - drainRate));
        const pct         = Math.floor(this._battery);
        this._el.batFill.style.width        = pct + '%';
        this._el.batPct.textContent         = pct + '%';

        if (pct < 20) {
            this._el.batFill.style.background = 'linear-gradient(90deg,#ff0000,#ff4400)';
        } else if (pct < 40) {
            this._el.batFill.style.background = 'linear-gradient(90deg,#ff8800,#ffbb00)';
        } else {
            this._el.batFill.style.background = 'linear-gradient(90deg,var(--neon-cyan),#00ff88)';
        }

        // Low battery warning
        if (pct === 19 || pct === 9) {
            this.notify(`⚠ BATTERY LOW: ${pct}%`, 4000);
        }
    }

    /** Update FPS value externally (optional) */
    updateFPS(fps) { this._fps = fps; }

    /**
     * Show a toast notification.
     * @param {string} msg      Message text
     * @param {number} duration Milliseconds to display (default 3000)
     */
    notify(msg, duration = 3000) {
        this._el.notifText.textContent = msg;
        this._el.notif.classList.remove('hidden');
        if (this._notifTimer) clearTimeout(this._notifTimer);
        this._notifTimer = setTimeout(() => {
            this._el.notif.classList.add('hidden');
        }, duration);
    }

    /**
     * Update the camera-mode label in the lower-center HUD.
     * @param {string} label e.g. "CAM 1: CHASE"
     */
    setCameraMode(label) {
        this._el.camMode.textContent = label;
    }
}
