/**
 * main.js — NEXUS-7 Cyberpunk Drone Lab
 * Orchestrates scene initialisation, the animation loop,
 * three camera modes, and all keyboard input.
 *
 * Camera Modes (press 1 / 2 / 3):
 *   1 — Chase    : smoothly follows the player drone
 *   2 — Free Orbit: OrbitControls for manual exploration
 *   3 — Cinematic: automatic slow sweep of the whole lab
 *
 * Keyboard Controls:
 *   W/↑  S/↓  A/←  D/→   Horizontal flight
 *   Q / E                 Ascend / Descend
 *   R / T                 Yaw left / right
 *   SPACE                 Toggle auto-hover
 *   L                     Toggle neon lights
 *   H                     Return drone to home pad
 *   1 / 2 / 3             Camera mode
 */

// ──────────────────────────────────────────────────────────────────
// MODULE-LEVEL STATE
// ──────────────────────────────────────────────────────────────────
let scene, camera, renderer, clock;
let orbitControls;
let mainDrone;
let ambientDrones = [];
let environment;
let particles;
let lighting;
let ui;

const keys = {};          // live keyboard state
let cameraMode = 1;       // 1=chase 2=free 3=cinematic
let prevCamMode = 1;

// FPS tracking
let _fpsFrames = 0, _fpsAccum = 0;

// ──────────────────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────────────────
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000510);
    scene.fog = new THREE.FogExp2(0x000510, 0.022);

    // Camera
    camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.05, 250);
    camera.position.set(0, 5.5, 13);
    camera.lookAt(0, 2, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas:           document.getElementById('scene-canvas'),
        antialias:        true,
        powerPreference:  'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled  = true;
    renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
    renderer.outputEncoding     = THREE.sRGBEncoding;
    renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.88;

    // Clock
    clock = new THREE.Clock();

    // OrbitControls (disabled until camera mode 2)
    orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.enabled     = false;
    orbitControls.maxDistance = 90;
    orbitControls.minDistance = 0.5;
    orbitControls.target.set(0, 2, 0);
    orbitControls.update();

    // Input
    _setupInput();

    // Window resize
    window.addEventListener('resize', _onResize);

    // Kick off loading (deferred so browser can paint loading screen)
    setTimeout(_loadScene, 80);
}

// ──────────────────────────────────────────────────────────────────
// SCENE LOADING  (sequential — updates progress bar)
// ──────────────────────────────────────────────────────────────────
function _loadScene() {
    _progress(10, 'GENERATING PROCEDURAL TEXTURES...');
    const textures = TextureFactory.createAll();

    _progress(28, 'CONSTRUCTING LAB ENVIRONMENT...');
    environment = new EnvironmentBuilder(scene, textures);
    environment.build();

    _progress(48, 'CALIBRATING LIGHTING ARRAY...');
    lighting = new LightingSystem(scene);
    lighting.setup();

    _progress(62, 'ASSEMBLING DRONE UNITS...');

    // ── Player drone ──────────────────────────────────────────
    mainDrone = new Drone(scene, textures, true);
    mainDrone.setPosition(0, 2.6, 0);
    mainDrone.powerUp();

    // ── Autonomous drones ─────────────────────────────────────
    const autoCfgs = [
        { pos:[ 0, 2.0,-12], offset: 0,               style: 0 },
        { pos:[-7, 2.8,  7], offset: Math.PI*2/3,     style: 1 },
        { pos:[ 8, 3.4,  4], offset: Math.PI*4/3,     style: 2 },
    ];
    autoCfgs.forEach(cfg => {
        const d = new Drone(scene, textures, false);
        d.setPosition(...cfg.pos);
        d.autoFlightOffset = cfg.offset;
        d.autoFlightStyle  = cfg.style;
        d.powerUp();
        ambientDrones.push(d);
    });

    _progress(78, 'INITIALISING PARTICLE SYSTEM...');
    particles = new ParticleSystem(scene, 700);

    _progress(91, 'LOADING TACTICAL HUD...');
    ui = new UIManager();

    _progress(100, 'ALL SYSTEMS ONLINE ✓');

    // Transition to scene
    setTimeout(() => {
        const ls = document.getElementById('loading-screen');
        ls.classList.add('fade-out');
        setTimeout(() => {
            ls.style.display = 'none';
            ui.show();
            ui.notify('WELCOME TO NEXUS-7 DRONE LAB — USE W/A/S/D TO FLY', 5000);
            _animate();
        }, 750);
    }, 500);
}

// ──────────────────────────────────────────────────────────────────
// ANIMATION LOOP
// ──────────────────────────────────────────────────────────────────
function _animate() {
    requestAnimationFrame(_animate);

    const dt   = Math.min(clock.getDelta(), 0.05);  // cap at 50 ms
    const time = clock.elapsedTime;

    // ── Update all scene objects ─────────────────────────────
    mainDrone.update(dt, time, keys);
    ambientDrones.forEach(d => d.update(dt, time, {}));

    environment.update(dt, time);
    particles.update(dt, time);
    lighting.update(dt, time);
    lighting.updateDroneFollowLight(mainDrone.root.position);

    // ── Camera ───────────────────────────────────────────────
    _updateCamera(dt, time);

    // ── UI ───────────────────────────────────────────────────
    ui.update(mainDrone, time, dt);

    // ── Render ───────────────────────────────────────────────
    renderer.render(scene, camera);
}

// ──────────────────────────────────────────────────────────────────
// CAMERA MODES
// ──────────────────────────────────────────────────────────────────
function _updateCamera(dt, time) {
    const drone = mainDrone.root.position;

    switch (cameraMode) {
        case 1: {
            // Chase — offset behind and above drone, respects yaw
            const yaw     = mainDrone.root.rotation.y;
            const dist    = 6.5;
            const height  = 2.8;

            const tgtX = drone.x - Math.sin(yaw) * dist;
            const tgtY = drone.y + height;
            const tgtZ = drone.z - Math.cos(yaw) * dist;

            const s = dt * 3.8;
            camera.position.x += (tgtX - camera.position.x) * s;
            camera.position.y += (tgtY - camera.position.y) * s;
            camera.position.z += (tgtZ - camera.position.z) * s;

            // Smooth look-at (lerp between current target and drone)
            const look = new THREE.Vector3(drone.x, drone.y + 0.3, drone.z);
            camera.lookAt(look);
            break;
        }

        case 2: {
            // Free orbit — OrbitControls handles it
            orbitControls.update();
            break;
        }

        case 3: {
            // Cinematic — slow sweep
            const radius = 20;
            const speed  = 0.1;
            camera.position.x = Math.cos(time * speed) * radius;
            camera.position.z = Math.sin(time * speed) * radius;
            camera.position.y = 7 + Math.sin(time * 0.06) * 3.5;
            camera.lookAt(0, 2.5, 0);
            break;
        }
    }
}

// ──────────────────────────────────────────────────────────────────
// INPUT
// ──────────────────────────────────────────────────────────────────
function _setupInput() {
    // Track held keys
    document.addEventListener('keydown', e => {
        if (keys[e.key]) return;   // ignore auto-repeat for actions
        keys[e.key] = true;
        _handleAction(e.key);
    });
    document.addEventListener('keyup', e => {
        keys[e.key] = false;
    });
}

function _handleAction(key) {
    // Guard: UI must exist before we can show notifications
    const notify = msg => ui && ui.notify(msg);

    switch (key) {
        // ── Camera modes ─────────────────────────────────────
        case '1':
            _setCameraMode(1, 'CAM 1: CHASE', 'CAMERA MODE: CHASE');
            break;
        case '2':
            _setCameraMode(2, 'CAM 2: FREE ORBIT', 'CAMERA MODE: FREE ORBIT');
            break;
        case '3':
            _setCameraMode(3, 'CAM 3: CINEMATIC', 'CAMERA MODE: CINEMATIC');
            break;

        // ── Neon lights toggle ────────────────────────────────
        case 'l': case 'L':
            if (lighting) {
                lighting.toggleNeonLights();
                notify(`NEON LIGHTS: ${lighting.neonEnabled ? 'ON' : 'OFF'}`);
            }
            break;

        // ── Auto-hover ────────────────────────────────────────
        case ' ':
            if (mainDrone) {
                mainDrone.toggleAutoHover();
                notify(`AUTO-HOVER: ${mainDrone.autoHover ? 'ENABLED' : 'DISABLED'}`);
            }
            break;

        // ── Return to home pad ────────────────────────────────
        case 'h': case 'H':
            if (mainDrone) {
                mainDrone.root.position.set(0, 2.6, 0);
                mainDrone.velocity.set(0, 0, 0);
                mainDrone.root.rotation.set(0, 0, 0);
                notify('RETURNING TO HOME POSITION');
            }
            break;

        // ── Power toggle ─────────────────────────────────────
        case 'p': case 'P':
            if (mainDrone) {
                if (mainDrone.targetRotorPower > 0.5) {
                    mainDrone.powerDown();
                    notify('ROTORS: POWERING DOWN');
                } else {
                    mainDrone.powerUp();
                    notify('ROTORS: POWERING UP');
                }
            }
            break;
    }
}

function _setCameraMode(mode, label, message) {
    prevCamMode = cameraMode;
    cameraMode  = mode;

    if (mode === 2) {
        orbitControls.enabled = true;
        if (mainDrone) orbitControls.target.copy(mainDrone.root.position);
        orbitControls.update();
    } else {
        orbitControls.enabled = false;
    }

    if (ui) {
        ui.setCameraMode(label);
        ui.notify(message);
    }
}

// ──────────────────────────────────────────────────────────────────
// RESIZE
// ──────────────────────────────────────────────────────────────────
function _onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ──────────────────────────────────────────────────────────────────
// LOADING BAR HELPER
// ──────────────────────────────────────────────────────────────────
function _progress(pct, status) {
    const bar = document.getElementById('loading-bar');
    const lbl = document.getElementById('loading-status');
    if (bar) bar.style.width = pct + '%';
    if (lbl) lbl.textContent = status;
}

// ──────────────────────────────────────────────────────────────────
// BOOT
// ──────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', init);
