// A chemistry-lab room for the naked-eye views: floor, walls, a bench with cabinets and
// a sink, a reagent shelf, posters, ceiling lights and (optionally) a fume hood around
// the experiment. Dimensions are in metres and scaled by `u` scene units per metre,
// with the bench top at y = 0 and the experiment centred at the origin.
import * as THREE from 'three';

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const tileTexture = (cols, light, dark, grout) => canvasTexture(256, 256, (g, w, h) => {
  g.fillStyle = grout; g.fillRect(0, 0, w, h);
  const s = w / cols;
  for (let i = 0; i < cols; i++) for (let j = 0; j < cols; j++) {
    g.fillStyle = (i + j) % 2 ? light : dark;
    g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
  }
});

const periodicPoster = () => canvasTexture(900, 560, (g, w, h) => {
  g.fillStyle = '#f7f5ef'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1d2a44'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center';
  g.fillText('PERIODIC TABLE OF THE ELEMENTS', w / 2, 46);
  // [row, col, category] for the 118 elements in the standard 18-column layout
  const cat = ['#f4a3a3', '#f7c98b', '#f3e28a', '#a8d8a0', '#9fcbe8', '#c7b4e6', '#e6b4d6', '#cfcfcf'];
  const cell = 46, x0 = 36, y0 = 70;
  const put = (r, c, k) => { g.fillStyle = cat[k]; g.fillRect(x0 + c * cell, y0 + r * cell, cell - 3, cell - 3); };
  put(0, 0, 4); put(0, 17, 6);
  for (const r of [1, 2]) { put(r, 0, 0); put(r, 1, 1); for (let c = 12; c < 18; c++) put(r, c, c === 17 ? 6 : c === 16 ? 5 : c < 14 ? 3 : 4); }
  for (const r of [3, 4, 5, 6]) { put(r, 0, 0); put(r, 1, 1); for (let c = 2; c < 12; c++) put(r, c, 2); for (let c = 12; c < 18; c++) put(r, c, c === 17 ? 6 : c === 16 ? 5 : 3); }
  for (const r of [8, 9]) for (let c = 3; c < 17; c++) put(r - 0.6, c, 7);
});

const safetySign = () => canvasTexture(300, 400, (g, w, h) => {
  g.fillStyle = '#1f5fbf'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(w / 2, 150, 95, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1f5fbf'; g.font = 'bold 110px sans-serif'; g.textAlign = 'center'; g.fillText('👓', w / 2, 190);
  g.fillStyle = '#ffffff'; g.font = 'bold 34px sans-serif';
  g.fillText('SAFETY', w / 2, 300); g.fillText('GLASSES', w / 2, 340); g.fillText('REQUIRED', w / 2, 380);
});

const hoodSign = () => canvasTexture(512, 96, (g, w, h) => {
  g.fillStyle = '#2b2f36'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffffff'; g.font = 'bold 40px sans-serif'; g.textBaseline = 'middle';
  g.fillText('FUME HOOD', 20, h / 2);
  g.fillStyle = '#0b1a0b'; g.fillRect(300, 14, 196, 68);
  g.fillStyle = '#5dff7a'; g.font = 'bold 30px monospace'; g.fillText('0.50 m/s', 312, h / 2);
});

// clear: [x0, x1] metres of bench kept free of bottles behind the experiment
export function buildLab(scene, { u, hood = null, bench = [-1.6, 1.6], sink = true, clear = null }) {
  const M = v => v * u;
  const group = new THREE.Group();
  scene.add(group);
  // room surfaces take only a little of the scene's environment light, so walls don't wash out to white
  const std = (color, roughness = 0.7, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity: 0.3, ...extra });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(M(x), M(y), M(z)); group.add(m); return m; };
  const box = (w, h, d, mat, x, y, z) => add(new THREE.BoxGeometry(M(w), M(h), M(d)), mat, x, y, z);
  const plane = (w, h, mat, x, y, z, ry = 0, rx = 0) => { const m = add(new THREE.PlaneGeometry(M(w), M(h)), mat, x, y, z); m.rotation.set(rx, ry, 0); return m; };

  // ---- room shell ----------------------------------------------------------
  const R = { x0: -3.4, x1: 3.4, z0: -0.52, z1: 4.6, y0: -0.9, y1: 2.9 };
  const W = R.x1 - R.x0, D = R.z1 - R.z0, H = R.y1 - R.y0, cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2, cy = (R.y0 + R.y1) / 2;
  const floorTex = tileTexture(4, '#9ea4ab', '#8d939a', '#7c8187');
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(W / 1.2, D / 1.2);
  plane(W, D, std(0xffffff, 0.85, 0, { map: floorTex }), cx, R.y0, cz, 0, -Math.PI / 2);
  const wallMat = std(0xbfc6cc, 0.95);
  plane(W, H, wallMat, cx, cy, R.z0);
  plane(W, H, wallMat, cx, cy, R.z1, Math.PI);
  plane(D, H, wallMat, R.x0, cy, cz, Math.PI / 2);
  plane(D, H, wallMat, R.x1, cy, cz, -Math.PI / 2);
  plane(W, D, std(0xf2f3f4, 0.95), cx, R.y1, cz, 0, Math.PI / 2);
  for (const x of [-1.6, 0, 1.6]) for (const z of [0.4, 2.4]) {
    box(1.2, 0.02, 0.6, std(0xffffff, 0.3, 0, { emissive: 0xfff8ec, emissiveIntensity: 1 }), x, R.y1 - 0.011, z);
  }
  group.add(new THREE.HemisphereLight(0xf4f6ff, 0x4a4840, 0.35));

  // ---- bench: epoxy worktop, cabinets, backsplash, sink ------------------------
  const [b0, b1] = bench, bw = b1 - b0, bx = (b0 + b1) / 2;
  box(bw, 0.035, 0.87, std(0x1c1f23, 0.35), bx, -0.0176, -0.085);
  const cabMat = std(0xcfc9bb, 0.6);
  box(bw - 0.02, 0.8, 0.8, cabMat, bx, -0.035 - 0.4, -0.11);
  box(bw - 0.02, 0.06, 0.76, std(0x3a3d42, 0.8), bx, R.y0 + 0.03, -0.1);
  const steel = std(0xb8bdc4, 0.3, 0.9);
  const doors = Math.round(bw / 0.6);
  for (let i = 0; i < doors; i++) {
    const x = b0 + (i + 0.5) * (bw / doors);
    box(0.006, 0.72, 0.005, std(0xb9b3a6, 0.7), b0 + i * (bw / doors), -0.43, 0.292);
    box(0.12, 0.014, 0.02, steel, x, -0.12, 0.3);
  }
  const splashTex = tileTexture(6, '#f4f5f2', '#eceee9', '#c9ccc6');
  splashTex.wrapS = splashTex.wrapT = THREE.RepeatWrapping;
  splashTex.repeat.set(bw / 0.6, 0.5 / 0.6);
  plane(bw, 0.5, std(0xffffff, 0.4, 0, { map: splashTex }), bx, 0.25, R.z0 + 0.005);
  if (sink) {
    const sx = b1 - 0.4;
    box(0.5, 0.004, 0.38, std(0x2a2c30, 0.3, 0.8), sx, 0.002, -0.12);
    box(0.44, 0.003, 0.32, std(0x0d0e10, 0.6, 0.5), sx, 0.004, -0.12);
    const tap = new THREE.CatmullRomCurve3([[sx, 0, -0.42], [sx, 0.32, -0.42], [sx, 0.38, -0.34], [sx, 0.3, -0.24]].map(p => new THREE.Vector3(M(p[0]), M(p[1]), M(p[2]))));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(tap, 30, M(0.012), 10), steel));
  }

  // ---- shelf with reagent bottles, posters, extinguisher --------------------
  const hx = hood ? [hood.x - hood.w / 2 - 0.12, hood.x + hood.w / 2 + 0.12] : null;
  const outsideHood = (x, half) => !hx || x + half < hx[0] || x - half > hx[1];
  const shelfSegs = hx ? [[b0, hx[0]], [hx[1], b1]] : [[b0, b1]];
  const bottleMats = [
    std(0x7a4a1a, 0.15, 0, { transparent: true, opacity: 0.85 }), std(0xe8eef2, 0.1, 0, { transparent: true, opacity: 0.55 }),
    std(0xf2f2ee, 0.6), std(0x2f6fd6, 0.4),
  ];
  const capMats = [std(0x1d4fa8, 0.5), std(0xc0392b, 0.5), std(0x222222, 0.5), std(0xf2c230, 0.5)];
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const [s0, s1] of shelfSegs) {
    if (s1 - s0 < 0.25) continue;
    box(s1 - s0, 0.025, 0.2, std(0xcfc8b8, 0.7), (s0 + s1) / 2, 0.62, R.z0 + 0.1);
    for (const sy of [0.62]) {
      for (let x = s0 + 0.08; x < s1 - 0.06; x += 0.08 + rand() * 0.06) {
        const hgt = 0.12 + rand() * 0.12, r = 0.03 + rand() * 0.02, k = Math.floor(rand() * 4);
        add(new THREE.CylinderGeometry(M(r), M(r), M(hgt), 16), bottleMats[k], x, sy + 0.0125 + hgt / 2, R.z0 + 0.1);
        add(new THREE.CylinderGeometry(M(r * 0.45), M(r * 0.45), M(0.03), 12), capMats[Math.floor(rand() * 4)], x, sy + 0.0125 + hgt + 0.015, R.z0 + 0.1);
        add(new THREE.CylinderGeometry(M(r * 1.01), M(r * 1.01), M(hgt * 0.35), 16), std(0xffffff, 0.8), x, sy + 0.0125 + hgt * 0.5, R.z0 + 0.1);
      }
    }
  }
  // reagent bottles standing along the back of the bench (outside the fume hood, clear of the sink)
  for (let x = b0 + 0.12; x < b1 - (sink ? 0.75 : 0.12); x += 0.1 + rand() * 0.12) {
    if (!outsideHood(x, 0.06) || (clear && x > clear[0] - 0.06 && x < clear[1] + 0.06)) continue;
    const hgt = 0.14 + rand() * 0.14, r = 0.035 + rand() * 0.025, z = R.z0 + 0.09 + rand() * 0.05;
    add(new THREE.CylinderGeometry(M(r), M(r), M(hgt), 18), bottleMats[Math.floor(rand() * 4)], x, hgt / 2, z);
    add(new THREE.CylinderGeometry(M(r * 0.45), M(r * 0.5), M(0.03), 12), capMats[Math.floor(rand() * 4)], x, hgt + 0.015, z);
    add(new THREE.CylinderGeometry(M(r * 1.01), M(r * 1.01), M(hgt * 0.35), 18), std(0xffffff, 0.8), x, hgt * 0.5, z);
  }
  const posterX = !hx ? -0.6 : (hx[0] - R.x0 > R.x1 - hx[1] ? (R.x0 + hx[0]) / 2 : (hx[1] + R.x1) / 2);
  plane(0.9, 0.56, std(0xffffff, 0.8, 0, { map: periodicPoster() }), posterX, 1.25, R.z0 + 0.006);
  const signX = !hx ? 0.6 : (posterX < 0 ? Math.min(R.x1 - 0.4, hx[1] + 0.35) : Math.max(R.x0 + 0.4, hx[0] - 0.35));
  if (outsideHood(signX, 0.15)) plane(0.3, 0.4, std(0xffffff, 0.8, 0, { map: safetySign() }), signX, 1.2, R.z0 + 0.006);
  const ext = std(0xc0201a, 0.4);
  add(new THREE.CylinderGeometry(M(0.08), M(0.08), M(0.5), 20), ext, R.x0 + 0.3, R.y0 + 0.25, R.z0 + 0.3);
  add(new THREE.CylinderGeometry(M(0.03), M(0.03), M(0.08), 12), std(0x222222, 0.5), R.x0 + 0.3, R.y0 + 0.54, R.z0 + 0.3);

  // ---- fume hood ---------------------------------------------------------
  if (hood) {
    const { x, w, h = 1.3, sash = 0.5 } = hood;
    const zb = R.z0 + 0.02, zf = 0.32, dd = zf - zb, zc = (zb + zf) / 2;
    const body = std(0xd5d9de, 0.5);
    for (const s of [-1, 1]) box(0.09, h + 0.35, dd + 0.04, body, x + s * (w / 2 + 0.045), (h + 0.35) / 2, zc);
    box(w + 0.18, 0.35, dd + 0.04, body, x, h + 0.175, zc);                     // roof + front fascia
    const signM = plane(0.62, 0.116, std(0xffffff, 0.6, 0, { map: hoodSign(), emissive: 0x222222 }), x, h + 0.17, zf + 0.021);
    signM.material.emissiveMap = signM.material.map;
    const baffleTex = canvasTexture(256, 256, (g, cw, ch) => {
      g.fillStyle = '#aab1b8'; g.fillRect(0, 0, cw, ch);
      g.fillStyle = '#5a6066';
      for (const y of [0.12, 0.5, 0.88]) g.fillRect(cw * 0.06, ch * y, cw * 0.88, ch * 0.03);
    });
    plane(w, h, std(0xffffff, 0.8, 0, { map: baffleTex }), x, h / 2, zb + 0.002);
    for (const s of [-1, 1]) plane(dd, h, std(0xc4cad0, 0.8), x + s * (w / 2), h / 2, zc, -s * Math.PI / 2);
    plane(w, dd, std(0xe8eaec, 0.8), x, h - 0.001, zc, 0, Math.PI / 2);
    box(w * 0.85, 0.015, 0.05, std(0xffffff, 0.3, 0, { emissive: 0xfffbf0, emissiveIntensity: 1.2 }), x, h - 0.01, zc);
    const hoodLight = new THREE.PointLight(0xfff6e8, 0.9 * M(1) ** 2, 0, 2);
    hoodLight.position.set(M(x), M(h - 0.1), M(zc));
    group.add(hoodLight);
    // raised glass sash in an aluminium frame, with a handle bar along the bottom
    const glassTop = h + 0.32, gh = glassTop - sash;
    box(w - 0.02, gh, 0.008, new THREE.MeshPhysicalMaterial({ color: 0xcfe6ff, roughness: 0.03, transparent: true, opacity: 0.2, depthWrite: false, envMapIntensity: 2, clearcoat: 1 }),
      x, sash + gh / 2, zf + 0.04);
    const alu = std(0xc5cad1, 0.35, 0.8);
    box(w, 0.035, 0.03, alu, x, sash, zf + 0.04);
    box(w * 0.9, 0.018, 0.018, alu, x, sash - 0.025, zf + 0.065);
    for (const s of [-1, 1]) box(0.025, gh, 0.03, alu, x + s * (w / 2 - 0.0125), sash + gh / 2, zf + 0.04);
    box(w, 0.025, 0.07, alu, x, 0.012, zf + 0.01);                                     // airfoil sill
  }
  return group;
}
