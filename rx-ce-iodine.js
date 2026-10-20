// 2 Ce + 3 I₂ → 2 CeI₃
import { V, deg, prim, along, mirror } from './reaction-engine.js';
import { createToolkit, strip, dropper, flameLoop, universalColor, liquidColumn } from './lab-tools.js';
import { buildLab } from './lab-room.js';

// ---------------------------------------------------------------------------
// Atomic view. Three I₂ molecules lie along x, arranged around the x axis.
// The left Ce gives one electron to each molecule, and so does its mirror
// image on the right: every I₂ receives two electrons into σ* and falls
// apart into 2 I⁻, one going to each Ce³⁺.
// ---------------------------------------------------------------------------
const X = V(1, 0, 0), Y = V(0, 1, 0);
const RHO = 2.8;          // distance of each I₂ from the x axis (Å)
const I2_HALF = 1.335;    // half the I–I bond length (2.67 Å)
const I_FINAL = 2.0;      // |x| of I⁻ in the product; Ce–I = √(0.93² + 2.8²) ≈ 2.95 Å
const molCenter = k => { const phi = (90 + 120 * k) * deg; return V(0, RHO * Math.sin(phi), RHO * Math.cos(phi)); };
const geom = (ceX, h) => ({
  Ce: V(-ceX, 0, 0),
  Ia: molCenter(0).add(V(-h[0], 0, 0)),
  Ib: molCenter(1).add(V(-h[1], 0, 0)),
  Ic: molCenter(2).add(V(-h[2], 0, 0)),
});
const H0 = I2_HALF;

// Cerium (sizes approximate Hartree–Fock radii: 4f ≈ 0.6 Å inside the 5s5p core ≈ 0.9 Å; 6s ≈ 2.4 Å)
const ceCore = a => [prim(a.Ce, X, 'shell', 0.13, 0.13)];
const ce4f = a => [prim(a.Ce, Y, '4f', 0.067, 0.067, 1, 'fz3')];
const ce6s = a => [prim(a.Ce, X, '2s', 0.4, 0.4)];
const ce6sPol = a => [prim(along(a.Ce, X, 0.7), X, '2s', 0.42, 0.36)];
const ce5d = a => [prim(a.Ce, X, 'shell', 0.17, 0.17, 1, 'dz2')];
const ce5dPol = a => [prim(along(a.Ce, X, 0.3), X, 'shell', 0.19, 0.16, 1, 'dz2')];

// Iodine: 5s² + two 5p π lone pairs (a donut around the bond axis) + half of the σ bond
const lonePairs = I => [prim(I, X, 'gauss', 0.38, 0.62, 4, 'ring'), prim(I, X, 'gauss', 0.33, 0.33, 2)];
const sigma = I => [prim(V(0, I.y, I.z), X, 'gauss', 0.62, 0.42)];
// σ*(5p): node at the bond midpoint, density mostly on the outer sides of both atoms
const sigmaStar = I => {
  const Rt = mirror(I);
  return [
    prim(along(I, X, -0.6), X, 'gauss', 0.45, 0.5, 0.4), prim(along(Rt, X, 0.6), X, 'gauss', 0.45, 0.5, 0.4),
    prim(along(I, X, 0.45), X, 'gauss', 0.25, 0.35, 0.1), prim(along(Rt, X, -0.45), X, 'gauss', 0.25, 0.35, 0.1),
  ];
};
// I⁻: closed 5s²5p⁶ shell, slightly polarized toward Ce³⁺
const iodide = (I, Ce) => {
  const d = Ce.clone().sub(I).normalize();
  return [prim(along(I, d, 0.12), d, 'gauss', 0.72, 0.68)];
};

const atomic = {
  camera: { pos: V(0, 6, 15), target: V(0, 0.4, 0) },
  atoms: { Ce: [0.16, 0xffd479], Ia: [0.14, 0xb48cff], Ib: [0.14, 0xb48cff], Ic: [0.14, 0xb48cff] },
  // per half: [Ce core, Ce 4f, 6s e⁻ #1, 6s e⁻ #2, 5d e⁻, I lone pairs ×3, I–I σ halves ×3]
  clouds: [
    { dots: 6000, group: 0, color: 0x4fb3ff, gain: 0.35 },
    { dots: 3500, group: 1, color: 0xff5fd2 },
    { dots: 4500, group: 2, color: 0xffb347 },
    { dots: 4500, group: 2, color: 0xff8c42 },
    { dots: 4500, group: 2, color: 0xffe14d },
    { dots: 5000, group: 3, color: 0x9d7bff, gain: 0.6 },
    { dots: 5000, group: 3, color: 0x9d7bff, gain: 0.6 },
    { dots: 5000, group: 3, color: 0x9d7bff, gain: 0.6 },
    { dots: 2500, group: 3, color: 0x3fe0b0, gain: 0.9 },
    { dots: 2500, group: 3, color: 0x3fe0b0, gain: 0.9 },
    { dots: 2500, group: 3, color: 0x3fe0b0, gain: 0.9 },
  ],
  groups: [
    { label: 'Ce [Xe] core (5s² 5p⁶ outer shell)', color: '#4fb3ff' },
    { label: 'Ce 4f¹ electron (spectator)', color: '#ff5fd2' },
    { label: 'Ce valence electrons (transferred):', items: [
      { label: '6s electron #1', color: '#ffb347' },
      { label: '6s electron #2', color: '#ff8c42' },
      { label: '5d electron', color: '#ffe14d' },
    ] },
    { label: 'Iodine valence electrons:', items: [
      { label: '5s² + 5p lone pairs', color: '#9d7bff' },
      { label: 'I–I σ bond pair', color: '#3fe0b0' },
    ] },
  ],
  stages: [
    {
      title: '1 · Reactants',
      desc: 'Two cerium atoms ([Xe] 4f¹ 5d¹ 6s²) and three I₂ molecules. Cerium\'s three outer electrons, two in 6s and one in 5d, are loosely bound (first ionization energy 5.5 eV) and spread far out. The single 4f electron (magenta) is buried inside the 5s²5p⁶ shell of the [Xe] core. Each I₂ is held by one σ bond made from two 5p electrons (teal). Each iodine also carries three lone pairs.',
      hold: 2.5, trans: 4, route: 0,
      labels: { Ce: 'Ce', Ia: 'I', Ib: 'I', Ic: 'I' },
      bonds: [['Ia', "Ia'", 1], ['Ib', "Ib'", 1], ['Ic', "Ic'", 1]],
      build() {
        const a = geom(7.0, [H0, H0, H0]);
        return { a, clouds: [ceCore(a), ce4f(a), ce6s(a), ce6s(a), ce5d(a),
          lonePairs(a.Ia), lonePairs(a.Ib), lonePairs(a.Ic), sigma(a.Ia), sigma(a.Ib), sigma(a.Ic)] };
      },
    },
    {
      title: '2 · Approach: donor meets acceptor',
      desc: 'As the atoms approach, the diffuse 6s and 5d clouds distort toward the iodine molecules. I₂ has a low-lying empty σ* orbital and a large electron affinity (≈ 2.5 eV), so it is a strong electron acceptor. Cerium is a strong electron donor.',
      hold: 2.5, trans: 3.5, route: 1,
      labels: { Ce: 'Ce', Ia: 'I', Ib: 'I', Ic: 'I' },
      bonds: [['Ia', "Ia'", 1], ['Ib', "Ib'", 1], ['Ic', "Ic'", 1]],
      build() {
        const a = geom(5.2, [H0, H0, H0]);
        return { a, clouds: [ceCore(a), ce4f(a), ce6sPol(a), ce6sPol(a), ce5dPol(a),
          lonePairs(a.Ia), lonePairs(a.Ib), lonePairs(a.Ic), sigma(a.Ia), sigma(a.Ib), sigma(a.Ic)] };
      },
    },
    {
      title: '3 · Harpoon: the 6s electrons jump',
      desc: 'Before the atoms touch, each 6s electron jumps across the gap into the σ* orbital of an I₂. This is the "harpoon mechanism", first described for alkali metals reacting with halogens. σ* has a node between the iodine atoms, so filling it cancels the bond. Each of these I₂ molecules receives one electron from each Ce, its bond order drops from 1 to 0, and the I–I distance stretches. Each Ce is now Ce²⁺.',
      hold: 2.5, trans: 3.5, route: 2,
      labels: { Ce: 'Ce²⁺', Ia: 'I', Ib: 'I', Ic: 'I' },
      bonds: [['Ia', "Ia'", 0.3], ['Ib', "Ib'", 0.3], ['Ic', "Ic'", 1]],
      build() {
        const a = geom(4.4, [1.75, 1.75, H0]);
        return { a, clouds: [ceCore(a), ce4f(a), sigmaStar(a.Ia), sigmaStar(a.Ib), ce5dPol(a),
          lonePairs(a.Ia), lonePairs(a.Ib), lonePairs(a.Ic), sigma(a.Ia), sigma(a.Ib), sigma(a.Ic)] };
      },
    },
    {
      title: '4 · I–I bonds break; the 5d electron follows',
      desc: 'The two attacked molecules fall apart into iodide ions. Each I⁻ keeps the electron it received (orange) and its half of the old bond pair (teal), which completes a closed 5s²5p⁶ shell like xenon\'s. Coulomb attraction pulls the I⁻ ions toward the cerium. Meanwhile the 5d electron jumps into the σ* of the third I₂. Ce is now Ce³⁺.',
      hold: 2.5, trans: 4, route: 3,
      labels: { Ce: 'Ce³⁺', Ia: 'I⁻', Ib: 'I⁻', Ic: 'I' },
      bonds: [['Ic', "Ic'", 0.5], ['Ce', 'Ia', 0.8], ['Ce', 'Ib', 0.8]],
      build() {
        const a = geom(3.6, [I_FINAL, I_FINAL, 1.75]);
        return { a, clouds: [ceCore(a), ce4f(a), iodide(a.Ia, a.Ce), iodide(a.Ib, a.Ce), sigmaStar(a.Ic),
          iodide(a.Ia, a.Ce), iodide(a.Ib, a.Ce), lonePairs(a.Ic), iodide(a.Ia, a.Ce), iodide(a.Ib, a.Ce), sigma(a.Ic)] };
      },
    },
    {
      title: '5 · Products: 2 CeI₃',
      desc: 'Each Ce³⁺ ([Xe] 4f¹) is surrounded by three I⁻ ions in a pyramidal CeI₃ unit (Ce–I ≈ 2.95 Å), bonded mostly ionically. The 4f electron never moved. Removing it (fourth ionization energy 36.8 eV) costs far more than iodine can repay, so iodine stops at cerium(III). Only strong oxidants such as O₂ or F₂ reach Ce⁴⁺. ΔH_f(CeI₃) ≈ −670 kJ/mol.',
      hold: 6, trans: 0, route: 4,
      labels: { Ce: 'Ce³⁺', Ia: 'I⁻', Ib: 'I⁻', Ic: 'I⁻' },
      bonds: [['Ce', 'Ia', 0.8], ['Ce', 'Ib', 0.8], ['Ce', 'Ic', 0.8]],
      build() {
        const a = geom(I_FINAL + 0.93, [I_FINAL, I_FINAL, I_FINAL]);
        const io = [iodide(a.Ia, a.Ce), iodide(a.Ib, a.Ce), iodide(a.Ic, a.Ce)];
        return { a, clouds: [ceCore(a), ce4f(a), io[0], io[1], io[2], io[0], io[1], io[2], io[0], io[1], io[2]] };
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Naked-eye view: cerium turnings + iodine crystals heated in a test tube
// ---------------------------------------------------------------------------
const MMOL_CE = 100 / 140.12;   // 0.10 g Ce
const MMOL_I2 = 300 / 253.81;   // 0.30 g I₂ (slight excess over the 1.07 mmol needed)

const macro = {
  camera: { pos: V(2.3, 2.3, 5.2), target: V(0.1, 1.2, 0), maxDist: 20 },
  setup({ THREE, scene, camera, controls, dom, $ }) {
    const TUBE_R = 0.22, TUBE_H = 2.0, BASE_Y = 0.92; // BASE_Y = centre of the rounded bottom
    const rnd = (a, b) => a + Math.random() * (b - a);

    // bench, stand and clamp
    buildLab(scene, { u: 12, hood: { x: 0, w: 1.4, sash: 0.5 } }); // iodine vapour → fume hood
    const steel = new THREE.MeshStandardMaterial({ color: 0x8c9099, metalness: 0.85, roughness: 0.35 });
    const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.55), new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.6 }));
    standBase.position.set(-0.75, 0.025, 0);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.2, 16), steel);
    rod.position.set(-0.95, 1.6, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 0.04), steel);
    arm.position.set(-0.6, BASE_Y + 1.45, 0);
    const jaw = new THREE.Mesh(new THREE.TorusGeometry(TUBE_R + 0.03, 0.02, 8, 32), steel);
    jaw.rotation.x = Math.PI / 2;
    jaw.position.set(0, BASE_Y + 1.45, 0);
    scene.add(standBase, rod, arm, jaw);

    // test tube
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.18,
      clearcoat: 1, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false,
    });
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(TUBE_R, TUBE_R, TUBE_H, 48, 1, true), glass);
    wall.position.y = BASE_Y + TUBE_H / 2;
    const bottom = new THREE.Mesh(new THREE.SphereGeometry(TUBE_R, 48, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), glass);
    bottom.position.y = BASE_Y;
    const lip = new THREE.Mesh(new THREE.TorusGeometry(TUBE_R + 0.008, 0.012, 8, 48), glass.clone());
    lip.material.opacity = 0.4;
    lip.rotation.x = Math.PI / 2;
    lip.position.y = BASE_Y + TUBE_H;
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.2, 32), new THREE.MeshStandardMaterial({ color: 0x9b6b3d, roughness: 0.95 }));
    cork.position.y = BASE_Y + TUBE_H + 0.03;
    scene.add(wall, bottom, lip, cork);

    // Bunsen burner + flame
    const burner = new THREE.Group();
    const bBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.06, 32), new THREE.MeshStandardMaterial({ color: 0x1d1f24, roughness: 0.5 }));
    bBase.position.y = 0.03;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.42, 24), steel);
    barrel.position.y = 0.27;
    burner.add(bBase, barrel);
    const flameOuter = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.45, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x3d6dff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    flameOuter.position.y = 0.48 + 0.225;
    const flameInner = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    flameInner.position.y = 0.48 + 0.09;
    burner.add(flameOuter, flameInner);
    scene.add(burner);

    // contents: cerium turnings + iodine crystals in the rounded bottom
    const floorY = BASE_Y - TUBE_R;
    const ceMat = new THREE.MeshStandardMaterial({ color: 0x9a9a92, metalness: 0.9, roughness: 0.35, emissive: 0x000000 });
    const cePieces = Array.from({ length: 7 }, (_, i) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), ceMat);
      const a = i * 2.4, r = i ? rnd(0.04, 0.1) : 0;
      m.position.set(Math.cos(a) * r, floorY + 0.04 + r * 0.45 + rnd(0, 0.02), Math.sin(a) * r);
      m.scale.set(rnd(1.2, 1.8), rnd(0.4, 0.6), rnd(0.8, 1.2));
      m.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
      scene.add(m);
      return m;
    });
    const i2Mat = new THREE.MeshStandardMaterial({ color: 0x2b2433, metalness: 0.75, roughness: 0.22, emissive: 0x1a0826 });
    const i2Crystals = Array.from({ length: 12 }, (_, i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.03), i2Mat);
      const a = i * 1.7 + 0.5, r = rnd(0.02, 0.12);
      m.position.set(Math.cos(a) * r, floorY + 0.09 + r * 0.5 + rnd(0, 0.04), Math.sin(a) * r);
      m.rotation.set(rnd(-0.6, 0.6), rnd(0, 3), rnd(-0.6, 0.6));
      m.userData.base = m.position.clone();
      scene.add(m);
      return m;
    });

    // yellow CeI₃ powder that grows over the turnings
    const MAXPOW = 90;
    const powder = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xe8c547, roughness: 0.9 }), MAXPOW);
    const powderPos = Array.from({ length: MAXPOW }, () => {
      const a = rnd(0, Math.PI * 2), r = Math.sqrt(Math.random()) * 0.15;
      return new THREE.Vector3(Math.cos(a) * r, floorY + 0.025 + (TUBE_R - Math.sqrt(Math.max(0, TUBE_R ** 2 - r * r))) + rnd(0, 0.05), Math.sin(a) * r);
    });
    scene.add(powder);

    // iodine re-deposited as dark crystals on the cool upper wall
    const MAXDEP = 160;
    const deposit = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x2a1f35, metalness: 0.7, roughness: 0.3 }), MAXDEP);
    const depData = Array.from({ length: MAXDEP }, () => {
      const a = rnd(0, Math.PI * 2), y = BASE_Y + rnd(1.15, 1.9);
      return { p: new THREE.Vector3(Math.cos(a) * (TUBE_R - 0.006), y, Math.sin(a) * (TUBE_R - 0.006)), a, s: rnd(0.006, 0.014) };
    });
    scene.add(deposit);

    // violet iodine vapour: a tinted column + drifting soft puffs
    const vapourMat = new THREE.MeshBasicMaterial({ color: 0x9b30d0, transparent: true, opacity: 0, depthWrite: false });
    const vapourCol = new THREE.Mesh(new THREE.CylinderGeometry(TUBE_R * 0.96, TUBE_R * 0.96, 1, 32), vapourMat);
    scene.add(vapourCol);
    const puffTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    const puffs = Array.from({ length: 70 }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0xa040e0, transparent: true, depthWrite: false, opacity: 0 }));
      s.userData = { a: rnd(0, 6.3), r: rnd(0, TUBE_R * 0.7), h: Math.random(), w: rnd(0.3, 1.2), sz: rnd(0.12, 0.26) };
      scene.add(s);
      return s;
    });

    // reaction glow + sparks
    const glowLight = new THREE.PointLight(0xff8a3d, 0, 3, 2);
    glowLight.position.set(0, floorY + 0.08, 0);
    scene.add(glowLight);
    const MAXS = 220;
    const sparkPos = new Float32Array(MAXS * 3), sparkCol = new Float32Array(MAXS * 3);
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3));
    const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
      size: 0.045, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, map: puffTex,
    }));
    sparks.frustumCulled = false;
    scene.add(sparks);
    const sp = Array.from({ length: MAXS }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3() }));

    // ---- testing kit (unlocks when the cerium has fully reacted) -----------
    const sw = c => `<span class="sw" style="background:#${new THREE.Color(c).getHexString()}"></span>`;
    const kit = createToolkit({
      scene, camera, controls, dom, container: $('testKit'),
      lockedText: 'The testing kit unlocks when the cerium has fully reacted.',
      intro: 'The cork is off. First dissolve the yellow product in water. Then drag tools into the three test tubes on the right, into the reaction tube, or into the burner flame.',
      onSkip: () => { Object.assign(sim, { ce: 0, i2s: 0, i2v: 0.04, dep: 0.1, cei3: MMOL_CE, ignited: true, rate: 0, vapH: 1, T: Math.min(sim.T, 180), t: Math.max(sim.t, 40) }); },
    });

    // rack of three test tubes for the dissolved product
    const TT_R = 0.06, TT_BOT = 0.14, TT_TOP = 0.7, LIQ_TOP = 0.42;
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.8 });
    const rackBase = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.2), rackMat);
    rackBase.position.set(0.95, 0.015, 0.2);
    const rackTop = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.2), rackMat);
    rackTop.position.set(0.95, 0.5, 0.2);
    const legs = [-0.3, 0.3].map(dx => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.2), rackMat); l.position.set(0.95 + dx, 0.25, 0.2); return l; });
    scene.add(rackBase, rackTop, ...legs);
    const tubes = [0.77, 0.95, 1.13].map((x, k) => {
      const wallT = new THREE.Mesh(new THREE.CylinderGeometry(TT_R, TT_R, TT_TOP - TT_BOT, 24, 1, true), glass);
      wallT.position.set(x, (TT_TOP + TT_BOT) / 2, 0.2);
      const botT = new THREE.Mesh(new THREE.SphereGeometry(TT_R, 24, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), glass);
      botT.position.set(x, TT_BOT, 0.2);
      scene.add(wallT, botT);
      const liquid = liquidColumn(scene, { x, z: 0.2, r: TT_R * 0.92, bottom: TT_BOT - TT_R * 0.6, top: LIQ_TOP });
      const tb = { k, x, z: 0.2, liquid, reagents: {}, label: 'ABC'[k] };
      kit.addZone('liq' + k, p => dissolved && Math.hypot(p.x - x, p.z - 0.2) < TT_R && p.y < LIQ_TOP, { x, z: 0.2, y0: 0.1, y1: 1.1, r: 0.09 },
        { at: V(x, TT_TOP + 0.06, 0.2), r: 0.055, text: 'ABC'[k], when: () => dissolved });
      kit.addZone('tube' + k, p => dissolved && Math.hypot(p.x - x, p.z - 0.2) < TT_R && p.y >= LIQ_TOP && p.y < TT_TOP + 0.05);
      return tb;
    });
    const tubeOf = z => (/^(liq|tube)(\d)$/.test(z) ? tubes[+z.at(-1)] : null);
    kit.addZone('rxtube', p => Math.hypot(p.x, p.z) < TUBE_R - 0.02 && p.y > BASE_Y && p.y < BASE_Y + TUBE_H + 0.05, { x: 0, z: 0, y0: 0.3, y1: BASE_Y + TUBE_H + 0.6, r: 0.3 },
      { at: V(0, BASE_Y + 0.9, TUBE_R + 0.02), r: 0.1, text: 'Reaction tube' });
    // the whole visible flame, including the part that licks around the bottom of the reaction tube
    // (the reaction-tube zone starts at BASE_Y, so the two don't overlap)
    kit.addZone('flame', p => Math.hypot(p.x, p.z) < 0.13 && p.y > 0.38 && p.y < BASE_Y, null,
      { at: V(0, 0.6, 0.14), r: 0.08, text: 'Burner flame' });

    let dissolved = false;
    kit.extra.innerHTML = '<button class="kit-btn" id="dissolve">💧 Dissolve the CeI₃ in water and fill test tubes A, B and C</button>';
    $('dissolve').onclick = () => {
      if (dissolved) return;
      dissolved = true;
      kit.log('The yellow CeI₃ dissolves readily, giving a nearly colourless solution of Ce³⁺(aq) and I⁻(aq). It is split into tubes <b>A, B and C</b>.');
    };
    const tubePH = tb => (tb.reagents.OH != null ? 12.5 : 5.4);

    const rack2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.12), rackMat);
    rack2.position.set(0.05, 0.03, 0.8);
    scene.add(rack2);

    { // universal indicator paper
      const st = strip(0xf4f1e6, 0xf2b84b);
      kit.addTool({
        name: 'Universal indicator paper', hint: 'dip the pad into a test tube', targets: ['liq0', 'liq1', 'liq2'], obj: st.obj, tip: st.tip, home: V(-0.40, 0.22, 0.8),
        reset: () => st.pad.material.color.set(0xf2b84b),
        onEnter(z) {
          const tb = tubeOf(z);
          if (!tb || !z.startsWith('liq')) return;
          const ph = tubePH(tb), c = universalColor(ph);
          st.pad.material.color.copy(c);
          kit.showPH(ph);
          kit.log(tb.reagents.OH != null
            ? `Tube ${tb.label}: indicator paper ${sw(c)} shows pH ≈ ${Math.round(ph)}, from the excess NaOH that was added.`
            : `Tube ${tb.label}: indicator paper ${sw(c)} turns <b>yellow</b>: pH ≈ ${Math.round(ph)}, <b>weakly acidic</b>. Hydrated Ce³⁺ is a weak acid: [Ce(H₂O)ₙ]³⁺ ⇌ [Ce(OH)(H₂O)ₙ₋₁]²⁺ + H⁺.`);
        },
      });
    }
    const addReagent = (tb, key, at, color, onFirst) => {
      kit.drop(at, LIQ_TOP, color, () => {
        if (tb.reagents[key] != null) { kit.log(`Tube ${tb.label}: more drops, no further change.`); return; }
        tb.reagents[key] = performance.now() / 1000;
        onFirst();
      });
    };
    { // silver nitrate dropper: test for iodide
      const dr = dropper(0xf2f2f2, 0x5b5f66);
      kit.addTool({
        name: 'Silver nitrate dropper (AgNO₃, 0.1 M)', hint: 'add drops to a test tube: a halide test', targets: ['liq0', 'liq1', 'liq2'], obj: dr.obj, tip: dr.tip, home: V(-0.20, 0.2, 0.8),
        onEnter(z, t, at) {
          const tb = tubeOf(z);
          if (!tb) return;
          addReagent(tb, 'Ag', at, 0xffffff, () => kit.log(`Tube ${tb.label}: a <b style="color:#efe08a">pale-yellow precipitate</b> forms. It is silver iodide: Ag⁺ + I⁻ → AgI↓, which confirms <b>iodide ions</b>. (AgI does not dissolve in ammonia, unlike AgCl.)`));
        },
      });
    }
    { // sodium hydroxide dropper: test for Ce³⁺
      const dr = dropper(0xf2f2f2, 0x2f6fd6);
      kit.addTool({
        name: 'Sodium hydroxide dropper (NaOH, 2 M)', hint: 'add drops to a test tube: a metal-ion test', targets: ['liq0', 'liq1', 'liq2'], obj: dr.obj, tip: dr.tip, home: V(-0.02, 0.2, 0.8),
        onEnter(z, t, at) {
          const tb = tubeOf(z);
          if (!tb) return;
          addReagent(tb, 'OH', at, 0xffffff, () => kit.log(`Tube ${tb.label}: a <b>white, gelatinous precipitate</b> of cerium(III) hydroxide forms: Ce³⁺ + 3 OH⁻ → Ce(OH)₃↓. Watch it: on standing in air it slowly turns <b style="color:#c99a4a">yellow-brown</b> as Ce(III) is oxidised to Ce(IV). That colour change is characteristic of cerium.`));
        },
      });
    }
    { // starch paper: test for free iodine
      const st = strip(0xf7f7f2, 0xf7f7f2, { padLen: 0.1 });
      kit.addTool({
        name: 'Moist starch paper', hint: 'turns blue-black with free I₂: try the reaction tube and a test tube', targets: ['rxtube', 'liq0', 'liq1', 'liq2'], obj: st.obj, tip: st.tip, home: V(0.16, 0.22, 0.8),
        reset: () => st.pad.material.color.set(0xf7f7f2),
        onEnter(z) {
          if (z === 'rxtube') {
            if (sim.i2v > 0.003 || sim.dep > 0.002) {
              st.pad.material.color.set(0x1b1640);
              kit.log(`Reaction tube: starch paper ${sw(0x1b1640)} turns <b>blue-black</b>, so free I₂ is present. The small excess of iodine, and the dark crystals on the wall, never reacted.`);
            } else kit.log('Reaction tube: starch paper stays white. No free iodine is left.');
          } else if (tubeOf(z) && z.startsWith('liq')) {
            kit.log(`Tube ${tubeOf(z).label}: starch paper <b>stays white</b>. The solution holds no free I₂, because all the iodine is present as colourless iodide, I⁻.`);
          }
        },
      });
    }
    { // flame-test loop: clean → wet (dipped) → residue (after heating); "Clean all tools" resets it
      const lp = flameLoop();
      let state = 'clean';
      const setState = st => { state = st; lp.setState(st); };
      kit.addTool({
        name: 'Flame-test wire loop', hint: 'dip in a test tube, then hold it in the burner flame (under the reaction tube)', targets: ['liq0', 'liq1', 'liq2', 'flame'], obj: lp.obj, tip: lp.tip, home: V(0.36, 0.28, 0.8),
        reset: () => setState('clean'),
        onEnter(z) {
          if (tubeOf(z) && z.startsWith('liq')) {
            setState('wet');
            kit.log(`The wire loop picks up a film of solution from tube ${tubeOf(z).label}. Now hold it in the burner flame.`);
          }
          if (z !== 'flame') return;
          if (!$('burner').checked) { kit.log('The burner is off. Tick <b>Bunsen burner on</b> to do a flame test.'); return; }
          if (state === 'wet') {
            flameFlare = 1.2;
            setState('residue');
            kit.log('Flame test: the water sputters off, but there is <b>no distinctive colour</b>, and the flame stays blue. Ce³⁺ cannot be identified by a flame test. Lanthanide ions give no useful flame colour, so cerium is confirmed chemically with the <b>NaOH test</b> instead.');
          } else if (state === 'residue') {
            kit.log('Only the dried residue is left on the loop, and still no colour. Press <b>🧼 Clean all tools</b> before testing another sample.');
          } else kit.log('Clean loop in the flame: the wire glows orange, but the flame colour doesn\'t change. Dip it in a test tube first.');
        },
        update(t) { lp.wireMat.emissive.setHex(t.inZone === 'flame' && $('burner').checked ? 0xff6a00 : 0x000000); },
      });
    }
    let flameFlare = 0;

    const GREY = new THREE.Color(0x9a9a92), YELLOW = new THREE.Color(0xe8c547), ORANGE = new THREE.Color(0xff7a2a);
    const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpE = new THREE.Euler();
    const sim = {};
    function reset() {
      Object.assign(sim, { t: 0, T: 20, ce: MMOL_CE, i2s: MMOL_I2, i2v: 0, dep: 0, cei3: 0, rate: 0, ignited: false, vapH: 0, sparkAcc: 0 });
      sp.forEach(s => { s.life = 0; });
      dissolved = false;
      tubes.forEach(tb => { tb.reagents = {}; });
      kit.setEnabled(false);
    }

    function update(dt, time) {
      const s = sim;
      s.t += dt;
      const burnerOn = $('burner').checked;
      flameOuter.visible = flameInner.visible = burnerOn;

      // tube temperature: burner heating vs. losses to the air
      s.T += ((burnerOn ? 42 * (1 - (s.T - 20) / 560) : 0) - 0.03 * (s.T - 20)) * dt;
      // iodine sublimes (m.p. 114 °C, but it has a high vapour pressure well below that)
      if (s.T > 45 && s.i2s > 0) {
        const d = Math.min(s.i2s, 0.05 * MMOL_I2 * ((s.T - 45) / 100) * dt);
        s.i2s -= d; s.i2v += d;
      }
      // some vapour condenses on the cool upper wall
      const dDep = Math.min(s.i2v, 0.012 * s.i2v * dt);
      s.i2v -= dDep; s.dep += dDep;
      // ignition once the metal is hot and there is iodine vapour around it
      if (!s.ignited && s.T > 230 && s.i2v > 0.12) s.ignited = true;
      s.rate = 0;
      if (s.ignited && s.ce > 1e-4 && s.i2v > 1e-4) {
        s.rate = 0.11 * MMOL_CE * Math.pow(s.ce / MMOL_CE, 2 / 3) * (s.i2v / (s.i2v + 0.15)); // mmol Ce/s
        const d = Math.min(s.rate * dt, s.ce, s.i2v / 1.5);
        s.ce -= d; s.i2v -= 1.5 * d; s.cei3 += d;
        s.T += d * 45; // reaction heat warms the tube
      }
      const conv = 1 - s.ce / MMOL_CE;
      const zoneT = s.T + s.rate * 9000; // the reacting metal is far hotter than the glass
      const glow = Math.min(1, Math.max(0, (zoneT - 380) / 350));

      // cerium turnings: grey metal → glowing → yellow CeI₃ crust
      ceMat.color.lerpColors(GREY, YELLOW, conv);
      ceMat.metalness = 0.9 * (1 - conv);
      ceMat.roughness = 0.35 + 0.55 * conv;
      ceMat.emissive.copy(ORANGE).multiplyScalar(glow * (0.8 + 0.2 * Math.sin(time * 37)));
      glowLight.intensity = glow * 10;
      cePieces.forEach(m => { m.scale.y = 0.5 + 0.25 * conv; });

      // iodine crystals shrink as they sublime
      const left = s.i2s / MMOL_I2;
      i2Crystals.forEach((m, i) => {
        const k = Math.max(0, Math.min(1, left * 12 - i)); // crystals vanish one after another
        m.visible = k > 0.02;
        m.scale.setScalar(0.4 + 0.6 * k);
      });

      // CeI₃ powder appears with conversion
      const nPow = Math.round(conv * MAXPOW);
      for (let i = 0; i < MAXPOW; i++) {
        tmpS.setScalar(i < nPow ? 0.012 + (i % 5) * 0.002 : 0);
        tmpM.compose(powderPos[i], tmpQ, tmpS);
        powder.setMatrixAt(i, tmpM);
      }
      powder.instanceMatrix.needsUpdate = true;

      // wall deposit
      const nDep = Math.round(Math.min(1, s.dep / (0.12 * MMOL_I2)) * MAXDEP);
      for (let i = 0; i < MAXDEP; i++) {
        const d = depData[i];
        tmpE.set(0, -d.a, 0); tmpQ.setFromEuler(tmpE);
        tmpS.set(i < nDep ? d.s * 0.4 : 0, i < nDep ? d.s : 0, i < nDep ? d.s : 0);
        tmpM.compose(d.p, tmpQ, tmpS);
        deposit.setMatrixAt(i, tmpM);
      }
      tmpQ.identity();
      deposit.instanceMatrix.needsUpdate = true;

      // vapour fills the tube from the bottom up; colour strength tracks the amount of I₂ gas
      if (s.i2v > 0.005) s.vapH = Math.min(1, s.vapH + dt * 0.1);
      const dens = Math.min(1, s.i2v / (0.5 * MMOL_I2));
      const colH = 0.15 + s.vapH * (TUBE_H - 0.15);
      vapourCol.scale.y = colH;
      vapourCol.position.y = BASE_Y - TUBE_R * 0.5 + colH / 2;
      vapourMat.opacity = 0.42 * dens;
      puffs.forEach(p => {
        const u = p.userData;
        u.a += dt * u.w * (1 + 3 * s.rate);
        u.h = (u.h + dt * 0.04 * u.w * (1 + 4 * glow)) % 1;
        const y = BASE_Y - TUBE_R * 0.4 + u.h * colH;
        p.position.set(Math.cos(u.a) * u.r, y, Math.sin(u.a) * u.r);
        p.scale.setScalar(u.sz);
        p.material.opacity = 0.22 * dens * Math.sin(Math.PI * u.h);
      });

      // sparks fly while the reaction runs hot
      s.sparkAcc += glow * 160 * dt;
      while (s.sparkAcc > 1) {
        s.sparkAcc--;
        const k = sp.find(k => k.life <= 0);
        if (!k) break;
        k.life = rnd(0.2, 0.6);
        k.p.set(rnd(-0.08, 0.08), floorY + 0.06, rnd(-0.08, 0.08));
        k.v.set(rnd(-0.4, 0.4), rnd(0.6, 1.6), rnd(-0.4, 0.4));
      }
      sp.forEach((k, i) => {
        if (k.life > 0) {
          k.life -= dt;
          k.v.y -= 2.5 * dt;
          k.p.addScaledVector(k.v, dt);
          const rr = Math.hypot(k.p.x, k.p.z);
          if (rr > TUBE_R * 0.9) { k.p.x *= TUBE_R * 0.9 / rr; k.p.z *= TUBE_R * 0.9 / rr; k.v.x *= -0.4; k.v.z *= -0.4; }
          if (k.p.y < floorY + 0.03) k.life = 0;
        }
        const b = Math.max(0, k.life) * 2;
        sparkPos.set(k.life > 0 ? [k.p.x, k.p.y, k.p.z] : [0, -10, 0], i * 3);
        sparkCol.set([1 * b, 0.65 * b, 0.25 * b], i * 3);
      });
      sparkGeo.attributes.position.needsUpdate = true;
      sparkGeo.attributes.color.needsUpdate = true;

      // flame flicker
      // brief sputter when a wet loop goes into the flame
      flameFlare = Math.max(0, flameFlare - 1 / 60);
      const fl = Math.min(1, flameFlare) * (0.7 + 0.3 * Math.sin(time * 61));
      flameOuter.material.color.setHex(0x3d6dff).lerp(new THREE.Color(0xd8e4ff), fl * 0.6);
      flameOuter.material.opacity = 0.35 + 0.35 * fl;
      flameOuter.scale.set(1 + 0.05 * Math.sin(time * 23) + 0.35 * fl, 1 + 0.08 * Math.sin(time * 17 + 1) + 0.3 * fl, 1 + 0.35 * fl);
      flameInner.scale.y = 1 + 0.06 * Math.sin(time * 29);

      // readouts
      const status = s.ce < 0.002 * MMOL_CE ? 'Complete: yellow CeI₃'
        : s.rate > 0.004 ? 'Burning! Ce + I₂ vapour'
        : s.ignited ? (s.i2v < 0.01 ? 'Starved of iodine vapour' : 'Reacting')
        : s.i2v > 0.03 ? 'Iodine subliming (violet)'
        : burnerOn ? 'Heating…' : 'Burner off';
      $('mStatus').textContent = status;
      $('mTime').textContent = s.t.toFixed(1) + ' s';
      $('mTemp').textContent = Math.round(s.T) + ' °C';
      $('mZone').textContent = Math.round(zoneT) + ' °C';
      $('mI2').textContent = `${Math.round(s.i2s / MMOL_I2 * 100)} % / ${Math.round(s.i2v / MMOL_I2 * 100)} %`;
      $('mCe').textContent = (s.ce / MMOL_CE * 100).toFixed(1) + ' %';
      $('mCeI3').textContent = Math.round(s.cei3 * 520.83) + ' mg';
      $('mBar').style.width = conv * 100 + '%';

      // testing phase
      if (!kit.enabled && s.ce < 0.002 * MMOL_CE) kit.setEnabled(true);
      cork.visible = !kit.enabled;
      powder.visible = !dissolved;
      cePieces.forEach(m => { m.visible = !dissolved; });
      const now = performance.now() / 1000;
      for (const tb of tubes) {
        const L = tb.liquid;
        L.mesh.visible = dissolved;
        if (!dissolved) { L.setSediment(0, 0xffffff); continue; }
        const ag = tb.reagents.Ag, oh = tb.reagents.OH;
        if (ag == null && oh == null) { L.mat.color.set(0xeef6ff); L.mat.opacity = 0.14; L.setSediment(0, 0xffffff); continue; }
        const cAg = new THREE.Color(0xefe08a);
        const cOH = new THREE.Color(0xf4f4f0).lerp(new THREE.Color(0xc99a4a), Math.min(1, oh != null ? (now - oh) / 30 : 0));
        const col = ag != null && oh != null ? cAg.clone().lerp(cOH, 0.5) : ag != null ? cAg : cOH;
        const age = now - Math.min(ag ?? Infinity, oh ?? Infinity);
        const settle = Math.min(1, age / 20);
        L.mat.color.copy(col);
        L.mat.opacity = 0.9 - 0.5 * settle * settle;
        L.setSediment(0.06 * settle, col);
      }
      kit.update(time);
    }
    return { reset, update };
  },
};

export default {
  ui: {
    title: 'Cerium + Iodine',
    heading: 'Ce + I₂ at the electron level',
    equation: '2 Ce + 3 I₂ → 2 CeI₃',
    routeTitle: 'Where do cerium\'s valence electrons go?',
    route: [
      'Ce 6s² 5d¹ (outer valence shell)',
      'Polarized toward I₂',
      'I₂ σ* antibonding orbital ("harpoon")',
      'Localized on one I → iodide I⁻',
      'I⁻ 5p⁶ closed shell: ionic Ce³⁺–I⁻',
    ],
    foot: 'The model: approximate |ψ|² shapes. The Ce shells are sized after Hartree–Fock radii: 4f ≈ 0.6 Å, inside the 5s5p core shell ≈ 0.9 Å, while 6s ≈ 2.4 Å. Bonds and lone pairs are Gaussian lobes, and the stages morph smoothly. Two Ce atoms and three I₂ react together, so each I₂ takes one electron from each Ce. Simplifications: the real order in which Ce loses its electrons is tangled (the ground state of Ce²⁺ is 4f², for example), and it is shown here as 6s first, then 5d. Bulk cerium metal reacts at its surface and CeI₃ forms an ionic crystal, while this view shows a single molecular-scale encounter.',
    macro: {
      title: 'What you\'d actually see',
      sub: '0.10 g of cerium turnings and 0.30 g of iodine crystals in a loosely stoppered test tube, heated with a Bunsen burner. Do this in a fume hood: iodine vapour is toxic.',
      observations: `• The grey-black, metallic-looking iodine crystals <b>sublime</b> on heating, and the tube fills with <b style="color:#b26be8">violet</b> vapour.<br>
        • Some iodine re-deposits as dark crystals on the cooler upper wall.<br>
        • Once the metal is hot enough, the cerium <b>ignites</b>. It glows orange with sparks as the strongly exothermic reaction runs through the vapour.<br>
        • The violet colour fades as the I₂ is used up, leaving <b style="color:#e8c547">yellow</b> cerium(III) iodide, CeI₃.<br>
        • CeI₃ is hygroscopic: it picks up moisture from air and must be kept dry.`,
      controls: '<label><input type="checkbox" id="burner" checked>Bunsen burner on</label><div id="testKit"></div>',
      measurements: [
        ['mStatus', 'Status', 'Heating…'],
        ['mTime', 'Elapsed time', '0 s'],
        ['mTemp', 'Tube temperature', '20 °C'],
        ['mZone', 'Reaction-zone temperature', '20 °C'],
        ['mI2', 'Iodine: crystals / vapour', '100 % / 0 %'],
        ['mCe', 'Cerium remaining', '100 %'],
        ['mCeI3', 'CeI₃ formed', '0 mg'],
      ],
      foot: 'Timings and temperatures are illustrative. The tube is idealised, and the ignition point depends on the metal\'s surface and particle size. The 0.30 g of I₂ is a slight excess over the 0.27 g needed, so a faint violet tint remains at the end.',
    },
  },
  atomic,
  macro,
};
