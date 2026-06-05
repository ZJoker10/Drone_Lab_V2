/**
 * textures.js — NEXUS-7 Cyberpunk Drone Lab
 * Procedural Texture Generator using HTML5 Canvas API.
 * All textures are generated at runtime — no external image files required.
 * Supports: Color Maps, Normal Maps, Roughness Maps (Specular equivalent in PBR)
 */

const TextureFactory = {

    /** Entry point: generates and caches all scene textures */
    createAll() {
        return {
            // ── Drone ──────────────────────────────────────────────
            droneBody:    this.createCircuitBoard(512),      // Color map
            carbonFiber:  this.createCarbonFiber(512),       // Color map (arms)
            panelNormal:  this.createPanelNormalMap(512),    // Normal map
            roughness:    this.createRoughnessMap(512),      // Roughness/Specular map
            droneEmissive:this.createDroneEmissive(512),     // Emissive map

            // ── Environment ────────────────────────────────────────
            floorColor:   this.createFloorColor(1024),       // Color map
            floorNormal:  this.createFloorNormal(512),       // Normal map
            ceilingColor: this.createCeilingColor(512),      // Color map
            wallPanel:    this.createWallPanel(512),         // Color map
            holoMain:     this.createHolographic(512,'NEXUS-7 DRONE LAB'),
            holoData:     this.createHolographic(512,'UNIT STATUS'),
            chargePad:    this.createChargePad(256),         // Color map
        };
    },

    // ─────────────────────────────────────────────────────────────
    // DRONE TEXTURES
    // ─────────────────────────────────────────────────────────────

    /** Circuit-board pattern for drone body (Color Map) */
    createCircuitBoard(size) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const c = cv.getContext('2d');
        const rng = this._rng(42);

        // Base – dark navy
        c.fillStyle = '#0d0d22';
        c.fillRect(0, 0, size, size);

        // Radial vignette
        const vg = c.createRadialGradient(size/2,size/2,0, size/2,size/2,size*0.7);
        vg.addColorStop(0, 'rgba(25,25,55,0.4)');
        vg.addColorStop(1, 'rgba(3,3,12,0.7)');
        c.fillStyle = vg;
        c.fillRect(0,0,size,size);

        // Background grid
        const gs = size/16;
        c.strokeStyle = 'rgba(0,90,140,0.18)';
        c.lineWidth = 0.5;
        for (let i=0; i<=16; i++) {
            c.beginPath(); c.moveTo(i*gs,0); c.lineTo(i*gs,size); c.stroke();
            c.beginPath(); c.moveTo(0,i*gs); c.lineTo(size,i*gs); c.stroke();
        }

        // Circuit traces
        c.strokeStyle = 'rgba(0,160,220,0.45)';
        c.lineWidth = 1.2;
        for (let i=0; i<28; i++) {
            const x1 = Math.floor(rng()*14+1)*gs, y1 = Math.floor(rng()*14+1)*gs;
            c.beginPath(); c.moveTo(x1, y1);
            let cx=x1, cy=y1;
            const steps = Math.floor(rng()*5)+2;
            for (let s=0; s<steps; s++) {
                const dir = Math.floor(rng()*4);
                const dist = (Math.floor(rng()*3)+1)*gs;
                if (dir===0) cx=Math.min(size,cx+dist);
                else if (dir===1) cy=Math.min(size,cy+dist);
                else if (dir===2) cx=Math.max(0,cx-dist);
                else cy=Math.max(0,cy-dist);
                c.lineTo(cx,cy);
            }
            c.stroke();
        }

        // Solder pads (via holes)
        c.fillStyle = 'rgba(0,210,255,0.55)';
        for (let i=0; i<45; i++) {
            const x = Math.floor(rng()*14+1)*gs, y = Math.floor(rng()*14+1)*gs;
            c.beginPath(); c.arc(x,y,2.5,0,Math.PI*2); c.fill();
        }

        // IC component outlines
        c.strokeStyle = 'rgba(0,130,190,0.35)';
        c.lineWidth = 1;
        for (let i=0; i<7; i++) {
            const x = Math.floor(rng()*10+2)*gs, y = Math.floor(rng()*10+2)*gs;
            const w = (Math.floor(rng()*2)+1)*gs, h = (Math.floor(rng()*2)+1)*gs;
            c.strokeRect(x,y,w,h);
            c.fillStyle = 'rgba(0,80,120,0.1)';
            c.fillRect(x,y,w,h);
        }

        // Cyan panel border
        c.strokeStyle = 'rgba(0,255,255,0.18)';
        c.lineWidth = 2;
        c.strokeRect(6,6,size-12,size-12);

        // Panel division lines
        c.strokeStyle = 'rgba(0,180,240,0.22)';
        c.lineWidth = 1;
        [size/4,size/2,size*3/4].forEach(p => {
            c.beginPath(); c.moveTo(p,0); c.lineTo(p,size); c.stroke();
            c.beginPath(); c.moveTo(0,p); c.lineTo(size,p); c.stroke();
        });

        const t = new THREE.CanvasTexture(cv);
        t.encoding = THREE.sRGBEncoding;
        return t;
    },

    /** Woven carbon-fibre weave pattern (Color Map) */
    createCarbonFiber(size) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const c = cv.getContext('2d');
        const cell = 14;

        for (let row=0; row<size/cell; row++) {
            for (let col=0; col<size/cell; col++) {
                const x=col*cell, y=row*cell, half=cell/2;
                const even = (row+col)%2===0;

                const draw = (x0,y0,w,h,axis) => {
                    const g = c.createLinearGradient(
                        axis==='h'?x0:x0, axis==='h'?y0:y0,
                        axis==='h'?x0:x0+w, axis==='h'?y0+h:y0
                    );
                    g.addColorStop(0,'#2e2e2e');
                    g.addColorStop(0.45,'#111111');
                    g.addColorStop(1,'#1c1c1c');
                    c.fillStyle=g; c.fillRect(x0,y0,w,h);
                };

                if (even) {
                    draw(x,y,cell,half,'h');
                    draw(x,y+half,cell,half,'h');
                } else {
                    draw(x,y,half,cell,'v');
                    draw(x+half,y,half,cell,'v');
                }

                // Cyan highlight seam
                c.strokeStyle='rgba(0,200,255,0.06)';
                c.lineWidth=0.5;
                c.strokeRect(x+0.5,y+0.5,cell-1,cell-1);
            }
        }

        const t = new THREE.CanvasTexture(cv);
        t.encoding = THREE.sRGBEncoding;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
    },

    /** Panel lines + rivet bumps (Normal Map) */
    createPanelNormalMap(size) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const c = cv.getContext('2d');
        const rng = this._rng(99);

        // Flat normal base  r=128 g=128 b=255
        c.fillStyle = 'rgb(128,128,255)'; c.fillRect(0,0,size,size);

        const ps = size/4; // panel subdivisions
        for (let i=1; i<4; i++) {
            const p = i*ps;
            // Horizontal groove: left-edge highlight, right-edge shadow
            c.fillStyle='rgb(128,75,200)';  c.fillRect(0,p-2,size,2);
            c.fillStyle='rgb(128,175,255)'; c.fillRect(0,p,size,2);
            // Vertical groove
            c.fillStyle='rgb(75,128,200)';  c.fillRect(p-2,0,2,size);
            c.fillStyle='rgb(175,128,255)'; c.fillRect(p,0,2,size);
        }

        // Rivets (hemispherical bumps)
        for (let i=0; i<22; i++) {
            const rx = Math.floor(rng()*(size-20))+10;
            const ry = Math.floor(rng()*(size-20))+10;
            const r = 5;
            const g = c.createRadialGradient(rx,ry,0,rx,ry,r);
            g.addColorStop(0,'rgb(165,165,255)');
            g.addColorStop(0.6,'rgb(142,142,255)');
            g.addColorStop(1,'rgb(128,128,255)');
            c.fillStyle=g;
            c.beginPath(); c.arc(rx,ry,r,0,Math.PI*2); c.fill();
        }

        return new THREE.CanvasTexture(cv);
        // default LinearEncoding is correct for normal maps
    },

    /** Metallic scratches (Roughness/Specular Map) */
    createRoughnessMap(size) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const c = cv.getContext('2d');
        const rng = this._rng(77);

        // Medium roughness base
        c.fillStyle = '#797979'; c.fillRect(0,0,size,size);

        // Random surface scratches
        for (let i=0; i<140; i++) {
            const x=rng()*size, y=rng()*size;
            const len=rng()*45+5;
            const angle=rng()*Math.PI;
            const b = Math.floor(rng()*80+100);
            c.strokeStyle=`rgb(${b},${b},${b})`;
            c.lineWidth = rng()*1.5+0.3;
            c.beginPath();
            c.moveTo(x,y);
            c.lineTo(x+Math.cos(angle)*len, y+Math.sin(angle)*len);
            c.stroke();
        }

        // Polished (smooth) spot areas — darker = smoother
        for (let i=0; i<10; i++) {
            const x=rng()*size, y=rng()*size, r=rng()*35+15;
            const g = c.createRadialGradient(x,y,0,x,y,r);
            g.addColorStop(0,'rgba(40,40,40,0.55)');
            g.addColorStop(1,'rgba(40,40,40,0)');
            c.fillStyle=g; c.fillRect(x-r,y-r,r*2,r*2);
        }

        return new THREE.CanvasTexture(cv);
    },

    /** LED & glow strip (Emissive Map) */
    createDroneEmissive(size) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const c = cv.getContext('2d');

        c.fillStyle='#000000'; c.fillRect(0,0,size,size);

        // Horizontal LED stripe at mid-height
        c.shadowColor='#00ffff'; c.shadowBlur=14;
        c.fillStyle='#00aaff';
        c.fillRect(0, size*0.44, size, size*0.12);

        // Vertical seam stripe
        c.fillRect(size*0.44, 0, size*0.12, size);

        // Corner accent dots
        c.fillStyle='#00ffff';
        [[0,0],[1,0],[0,1],[1,1]].forEach(([cx,cy]) => {
            c.beginPath();
            c.arc(cx*size, cy*size, size*0.05, 0, Math.PI*2);
            c.fill();
        });

        const t = new THREE.CanvasTexture(cv);
        t.encoding = THREE.sRGBEncoding;
        return t;
    },

    // ─────────────────────────────────────────────────────────────
    // ENVIRONMENT TEXTURES
    // ─────────────────────────────────────────────────────────────

    /** Neon-grid lab floor (Color Map) */
    createFloorColor(size) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const c = cv.getContext('2d');
        const rng = this._rng(55);

        c.fillStyle = '#08080f'; c.fillRect(0,0,size,size);

        // Concrete micro-texture noise
        for (let i=0; i<4000; i++) {
            const x=rng()*size, y=rng()*size, s=rng()*3+1;
            c.fillStyle=`rgba(80,100,130,${rng()*0.025+0.005})`;
            c.fillRect(x,y,s,s);
        }

        const gs = size/20;

        // Minor grid
        c.strokeStyle='rgba(0,70,110,0.28)'; c.lineWidth=0.5;
        for (let i=0; i<=20; i++) {
            c.beginPath(); c.moveTo(i*gs,0); c.lineTo(i*gs,size); c.stroke();
            c.beginPath(); c.moveTo(0,i*gs); c.lineTo(size,i*gs); c.stroke();
        }

        // Major grid (every 5)
        c.strokeStyle='rgba(0,110,165,0.38)'; c.lineWidth=1;
        for (let i=0; i<=20; i+=5) {
            c.beginPath(); c.moveTo(i*gs,0); c.lineTo(i*gs,size); c.stroke();
            c.beginPath(); c.moveTo(0,i*gs); c.lineTo(size,i*gs); c.stroke();
        }

        // Neon super-grid (every 10) — glowing cyan
        c.shadowColor='#0088ff'; c.shadowBlur=6;
        c.strokeStyle='rgba(0,200,255,0.55)'; c.lineWidth=1.5;
        for (let i=0; i<=20; i+=10) {
            c.beginPath(); c.moveTo(i*gs,0); c.lineTo(i*gs,size); c.stroke();
            c.beginPath(); c.moveTo(0,i*gs); c.lineTo(size,i*gs); c.stroke();
        }
        c.shadowBlur=0;

        // Diamond marker at center
        const cx=size/2, cy=size/2, cr=size*0.09;
        c.strokeStyle='rgba(0,160,230,0.22)'; c.lineWidth=1.5;
        c.beginPath();
        c.moveTo(cx,cy-cr); c.lineTo(cx+cr,cy);
        c.lineTo(cx,cy+cr); c.lineTo(cx-cr,cy); c.closePath();
        c.stroke();

        const t = new THREE.CanvasTexture(cv);
        t.encoding = THREE.sRGBEncoding;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(2,2);
        return t;
    },

    /** Floor panel groove (Normal Map) */
    createFloorNormal(size) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const c = cv.getContext('2d');

        c.fillStyle='rgb(128,128,255)'; c.fillRect(0,0,size,size);

        const gs = size/20;
        for (let i=0; i<=20; i++) {
            // Left edge shadow → right edge highlight
            c.fillStyle='rgb(80,128,210)';  c.fillRect(i*gs-1,0,1,size);
            c.fillStyle='rgb(172,128,255)'; c.fillRect(i*gs,0,1,size);
            // Top edge shadow → bottom edge highlight
            c.fillStyle='rgb(128,80,210)';  c.fillRect(0,i*gs-1,size,1);
            c.fillStyle='rgb(128,172,255)'; c.fillRect(0,i*gs,size,1);
        }

        const t = new THREE.CanvasTexture(cv);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(2,2);
        return t;
    },

    /** Industrial ceiling with vent circles (Color Map) */
    createCeilingColor(size) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const c = cv.getContext('2d');

        c.fillStyle='#060610'; c.fillRect(0,0,size,size);

        // Structural panel grid
        c.strokeStyle='rgba(0,50,80,0.5)'; c.lineWidth=2;
        const gs=size/6;
        for (let i=0; i<=6; i++) {
            c.beginPath(); c.moveTo(i*gs,0); c.lineTo(i*gs,size); c.stroke();
            c.beginPath(); c.moveTo(0,i*gs); c.lineTo(size,i*gs); c.stroke();
        }

        // Vent / light circles
        for (let row=0; row<3; row++) {
            for (let col=0; col<3; col++) {
                const cx=(col+0.5)*size/3, cy=(row+0.5)*size/3;
                c.strokeStyle='rgba(0,70,110,0.45)'; c.lineWidth=3;
                c.beginPath(); c.arc(cx,cy,size*0.1,0,Math.PI*2); c.stroke();
                c.strokeStyle='rgba(0,50,80,0.35)'; c.lineWidth=1.5;
                c.beginPath(); c.arc(cx,cy,size*0.05,0,Math.PI*2); c.stroke();
            }
        }

        const t = new THREE.CanvasTexture(cv);
        t.encoding = THREE.sRGBEncoding;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
    },

    /** Modular wall panels (Color Map) */
    createWallPanel(size) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const c = cv.getContext('2d');

        c.fillStyle='#0a0a1a'; c.fillRect(0,0,size,size);

        const rows=5, cols=3;
        const ph=size/rows, pw=size/cols;

        for (let r=0; r<rows; r++) {
            for (let col=0; col<cols; col++) {
                const x=col*pw, y=r*ph;
                // Panel fill gradient
                const g=c.createLinearGradient(x,y,x,y+ph);
                g.addColorStop(0,'rgba(22,22,45,0.9)');
                g.addColorStop(0.5,'rgba(14,14,30,0.9)');
                g.addColorStop(1,'rgba(9,9,22,0.9)');
                c.fillStyle=g; c.fillRect(x+1,y+1,pw-2,ph-2);
                // Panel border
                c.strokeStyle='rgba(0,90,140,0.28)'; c.lineWidth=1;
                c.strokeRect(x+0.5,y+0.5,pw-1,ph-1);
            }
        }

        // Neon accent strip top & bottom
        c.shadowColor='#00ffff'; c.shadowBlur=5;
        c.strokeStyle='rgba(0,200,255,0.35)'; c.lineWidth=2;
        c.beginPath(); c.moveTo(0,4); c.lineTo(size,4); c.stroke();
        c.beginPath(); c.moveTo(0,size-4); c.lineTo(size,size-4); c.stroke();
        c.shadowBlur=0;

        const t = new THREE.CanvasTexture(cv);
        t.encoding = THREE.sRGBEncoding;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
    },

    /** Animated holographic display content (Color Map) */
    createHolographic(size, label) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const c = cv.getContext('2d');

        // Deep background
        c.fillStyle='#000511'; c.fillRect(0,0,size,size);

        // CRT scan lines
        for (let i=0; i<size; i+=4) {
            c.fillStyle='rgba(0,255,255,0.018)';
            c.fillRect(0,i,size,2);
        }

        // Grid overlay
        c.strokeStyle='rgba(0,200,255,0.16)'; c.lineWidth=0.5;
        for (let i=0; i<=10; i++) {
            c.beginPath(); c.moveTo(i*size/10,0); c.lineTo(i*size/10,size); c.stroke();
            c.beginPath(); c.moveTo(0,i*size/10); c.lineTo(size,i*size/10); c.stroke();
        }

        // Outer border + corner brackets
        c.strokeStyle='rgba(0,255,255,0.65)'; c.lineWidth=2;
        c.strokeRect(10,10,size-20,size-20);
        const br=24;
        [[10,10,1,1],[size-10,10,-1,1],[10,size-10,1,-1],[size-10,size-10,-1,-1]].forEach(([x,y,dx,dy])=>{
            c.beginPath(); c.moveTo(x,y+dy*br); c.lineTo(x,y); c.lineTo(x+dx*br,y); c.stroke();
        });

        // Radar rings
        const rcx=size/2, rcy=size*0.56;
        [size*0.32,size*0.22,size*0.12].forEach(r=>{
            c.strokeStyle='rgba(0,200,255,0.38)'; c.lineWidth=1;
            c.beginPath(); c.arc(rcx,rcy,r,0,Math.PI*2); c.stroke();
        });

        // Radar cross
        c.strokeStyle='rgba(0,200,255,0.28)'; c.lineWidth=1;
        c.beginPath();
        c.moveTo(rcx,rcy-size*0.32); c.lineTo(rcx,rcy+size*0.32);
        c.moveTo(rcx-size*0.32,rcy); c.lineTo(rcx+size*0.32,rcy);
        c.stroke();

        // Sweep arc
        c.strokeStyle='rgba(0,255,100,0.55)'; c.lineWidth=2;
        c.beginPath(); c.moveTo(rcx,rcy);
        c.lineTo(rcx+Math.cos(-0.8)*size*0.32, rcy+Math.sin(-0.8)*size*0.32);
        c.stroke();

        // Blip dots
        c.shadowColor='#00ff88'; c.shadowBlur=8; c.fillStyle='#00ff88';
        [[0.6,0.2],[-0.75,0.55],[0.15,-0.7],[-0.3,0.45]].forEach(([rx,ry])=>{
            c.beginPath();
            c.arc(rcx+rx*size*0.25, rcy+ry*size*0.25, 4,0,Math.PI*2);
            c.fill();
        });
        c.shadowBlur=0;

        // Label text
        c.font=`bold ${Math.floor(size*0.07)}px 'Share Tech Mono', monospace`;
        c.fillStyle='#00ffff'; c.textAlign='center'; c.textBaseline='middle';
        c.shadowColor='#00ffff'; c.shadowBlur=10;
        c.fillText(label, size/2, size*0.12);
        c.shadowBlur=0;

        // Data bars
        const barData = [['SYS','▓▓▓▓▓▓▓▓░░','84%'],['PWR','▓▓▓▓▓▓░░░░','62%'],
                          ['NET','▓▓▓▓▓▓▓▓▓▓','100%'],['AI ','▓▓▓▓▓▓▓░░░','73%']];
        c.font=`${Math.floor(size*0.033)}px 'Share Tech Mono', monospace`;
        c.fillStyle='rgba(0,200,255,0.75)'; c.textAlign='left';
        barData.forEach(([label,bar,pct],i)=>{
            c.fillText(`${label} ${bar} ${pct}`, 18, size*0.84+i*size*0.038);
        });

        // Footer
        c.font=`${Math.floor(size*0.025)}px monospace`;
        c.fillStyle='rgba(0,150,200,0.5)'; c.textAlign='center';
        c.fillText('NEXUS-7 CONTROL SYS v2.47', size/2, size-14);

        const t = new THREE.CanvasTexture(cv);
        t.encoding = THREE.sRGBEncoding;
        return t;
    },

    /** Charging pad top-down symbol (Color Map) */
    createChargePad(size) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const c = cv.getContext('2d');

        c.fillStyle='#050510'; c.fillRect(0,0,size,size);

        const cx=size/2, cy=size/2;

        // Outer & inner rings
        c.strokeStyle='rgba(0,200,255,0.55)'; c.lineWidth=2;
        c.beginPath(); c.arc(cx,cy,size*0.45,0,Math.PI*2); c.stroke();
        c.strokeStyle='rgba(0,200,255,0.8)'; c.lineWidth=1.5;
        c.beginPath(); c.arc(cx,cy,size*0.28,0,Math.PI*2); c.stroke();

        // Tick marks
        c.strokeStyle='rgba(0,200,255,0.4)'; c.lineWidth=2;
        for (let i=0; i<12; i++) {
            const a=(i/12)*Math.PI*2;
            c.beginPath();
            c.moveTo(cx+Math.cos(a)*size*0.38, cy+Math.sin(a)*size*0.38);
            c.lineTo(cx+Math.cos(a)*size*0.44, cy+Math.sin(a)*size*0.44);
            c.stroke();
        }

        // Lightning bolt
        c.shadowColor='#00ffff'; c.shadowBlur=12; c.fillStyle='#00ffff';
        c.beginPath();
        c.moveTo(cx+9,cy-22); c.lineTo(cx-6,cy); c.lineTo(cx+5,cy);
        c.lineTo(cx-9,cy+22); c.lineTo(cx+6,cy+5); c.lineTo(cx-5,cy+5);
        c.closePath(); c.fill();
        c.shadowBlur=0;

        const t = new THREE.CanvasTexture(cv);
        t.encoding = THREE.sRGBEncoding;
        return t;
    },

    // ─────────────────────────────────────────────────────────────
    // UTILITY
    // ─────────────────────────────────────────────────────────────

    /** Deterministic pseudo-random (same seed → same texture) */
    _rng(seed) {
        let s = seed;
        return () => { s=(s*9301+49297)%233280; return s/233280; };
    }
};
