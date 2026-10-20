// Gallium nitride: 2 Ga + N₂ → 2 GaN (atomic view) / 2 Ga + 2 NH₃ → 2 GaN + 3 H₂ (lab)
import { V, deg, prim, sphere, along } from './reaction-engine.js';
import { createToolkit, strip, dropper, textSprite } from './lab-tools.js';
import { buildLab } from './lab-room.js';

// ---------------------------------------------------------------------------
// Atomic view. N₂ sits on the mirror plane; each half owns one Ga and one N.
// ---------------------------------------------------------------------------
const X = V(1, 0, 0), Y = V(0, 1, 0), Zv = V(0, 0, 1);
const N_HALF = 0.55;     // half the N≡N bond (1.10 Å)
const N_APART = 1.6;     // |x| of each N atom once N₂ has been split
const GA_N = 1.95;       // Ga–N bond length in GaN (Å)
const atomsAt = (gaX, nX) => ({ Ga: V(-gaX, 0, 0), N: V(-nX, 0, 0) });
// tetrahedral directions at N: one toward its Ga (−x), three toward crystal neighbours
const tet = [V(-1, 0, 0), ...[90, 210, 330].map(p => X.clone().multiplyScalar(1 / 3)
  .addScaledVector(Y, Math.sqrt(8 / 9) * Math.cos(p * deg)).addScaledVector(Zv, Math.sqrt(8 / 9) * Math.sin(p * deg)))];
const bondLobe = (N, d) => prim(along(N, d, 0.62), d, 'gauss', 0.45, 0.24);

const gaCore = a => [sphere(a.Ga, 'shell', 0.06)];
const ga4s = a => [sphere(a.Ga, '2s', 0.28)];
const ga4p = a => [prim(a.Ga, X, 'shell', 0.2, 0.2, 1, 'pz')];
const nLone = (a, dir) => [prim(along(a.N, dir, 0.33), dir, 'gauss', 0.26, 0.22)];
const n2Bonds = () => [prim(V(0, 0, 0), X, 'gauss', 0.42, 0.24, 1), prim(V(0, 0, 0), X, 'gauss', 0.45, 0.42, 2, 'ring')];

const L = (ga = 'Ga', n = 'N') => ({ Ga: ga, N: n });

const atomic = {
  camera: { pos: V(0, 3.5, 13), target: V(0, 0, 0) },
  atoms: { Ga: [0.15, 0x9fb4c8], N: [0.12, 0x5f8dff] },
  // per half: [Ga core, Ga 4s², Ga 4p¹, N 2s², N 2p (3 e⁻)]
  clouds: [
    { dots: 5000, group: 0, color: 0x4fb3ff, gain: 0.4 },
    { dots: 4500, group: 1, color: 0xffb347 },
    { dots: 3500, group: 1, color: 0xffe14d },
    { dots: 3500, group: 2, color: 0x9d7bff, gain: 0.8 },
    { dots: 5000, group: 2, color: 0x3fe0b0, gain: 0.8 },
  ],
  groups: [
    { label: 'Ga [Ar] 3d¹⁰ core', color: '#4fb3ff' },
    { label: 'Gallium\'s 3 valence electrons:', items: [
      { label: '4s² pair', color: '#ffb347' },
      { label: '4p¹ electron', color: '#ffe14d' },
    ] },
    { label: 'Nitrogen\'s 5 valence electrons:', items: [
      { label: '2s² lone pair', color: '#9d7bff' },
      { label: '2p electrons (the N≡N bond in N₂)', color: '#3fe0b0' },
    ] },
  ],
  stages: [
    {
      title: '1 · Reactants: Ga atoms and N₂',
      desc: 'Two gallium atoms ([Ar] 3d¹⁰ 4s² 4p¹) and one N₂ molecule. Each Ga has three valence electrons: a 4s² pair (orange) and one 4p electron (yellow), outside a compact, filled 3d¹⁰ core. N₂ is held by a triple bond (teal): one σ bond along the axis and two π bonds as a donut around it, plus a 2s lone pair on each end (purple). At 945 kJ/mol it is one of the strongest bonds known, so molten gallium does not react with nitrogen gas at all, even at 1000 °C.',
      hold: 2.5, trans: 4, route: 0, labels: L(),
      bonds: [['N', "N'", 3]],
      build() {
        const a = atomsAt(6.2, N_HALF);
        return { a, clouds: [gaCore(a), ga4s(a), ga4p(a), nLone(a, V(-1, 0, 0)), n2Bonds()] };
      },
    },
    {
      title: '2 · Breaking N≡N: atomic nitrogen',
      desc: 'The triple bond has to be broken first. In a nitrogen plasma (molecular-beam epitaxy) electrons smash N₂ apart. In a furnace, ammonia (NH₃) cracks on the hot gallium surface instead. Either way, each N atom gets back three of the six bonding electrons as three unpaired 2p electrons. 2s² 2p³ is a half-filled, spherical shell, and the free N atom is highly reactive.',
      hold: 2.5, trans: 3.5, route: 1, labels: L(),
      bonds: [],
      build() {
        const a = atomsAt(6, N_APART);
        return { a, clouds: [gaCore(a), ga4s(a), ga4p(a), [sphere(a.N, 'gauss', 0.2)], [sphere(a.N, 'gauss', 0.42)]] };
      },
    },
    {
      title: '3 · Ga reaches for N',
      desc: 'A gallium atom approaches a nitrogen atom. Its loosely held 4p electron (yellow) leans toward the nitrogen, and the 4s² pair is pushed slightly to the back. Nitrogen is far more electronegative (3.04 vs 1.81 on the Pauling scale), so it pulls hard on gallium\'s electrons.',
      hold: 2.5, trans: 3.5, route: 2, labels: L(),
      bonds: [['Ga', 'N', 0.4]],
      build() {
        const a = atomsAt(N_APART + 2.6, N_APART);
        return { a, clouds: [gaCore(a),
          [prim(along(a.Ga, X, -0.3), X, '2s', 0.27, 0.25)],
          [prim(along(a.Ga, X, 0.7), X, 'gauss', 0.4, 0.28, 0.8), prim(along(a.Ga, X, -0.4), X, 'gauss', 0.2, 0.2, 0.2)],
          [sphere(a.N, 'gauss', 0.2)], [sphere(a.N, 'gauss', 0.42)]] };
      },
    },
    {
      title: '4 · A polar Ga–N bond',
      desc: 'The Ga 4p electron pairs with one N 2p electron in a σ bond 1.95 Å long. The shared pair sits much closer to nitrogen, so the bond is strongly polar: Gaᵟ⁺–Nᵟ⁻. Nitrogen\'s other two 2p electrons form a ring around the bond axis, and its 2s pair points away from gallium. Gallium\'s 4s² pair stays mostly on Ga for now.',
      hold: 2.5, trans: 4, route: 3, labels: L('Gaᵟ⁺', 'Nᵟ⁻'),
      bonds: [['Ga', 'N', 1]],
      build() {
        const a = atomsAt(N_APART + GA_N, N_APART);
        const bondAt = f => a.Ga.clone().lerp(a.N, f);
        return { a, clouds: [gaCore(a),
          [prim(along(a.Ga, X, -0.25), X, '2s', 0.26, 0.24)],
          [prim(bondAt(0.6), X, 'gauss', 0.45, 0.25)],
          nLone(a, X),
          [prim(bondAt(0.68), X, 'gauss', 0.4, 0.25, 1), prim(a.N, X, 'gauss', 0.38, 0.38, 2, 'ring')]] };
      },
    },
    {
      title: '5 · In the crystal: four tetrahedral bonds',
      desc: 'Solid GaN (wurtzite structure) is not made of separate molecules. Every N is bonded to four Ga, and every Ga to four N, at tetrahedral angles of 109.5°. Here N\'s orbitals are mixed into four sp³ bonds. One points to this Ga, and three point to neighbouring Ga atoms in the crystal (not drawn). The 8 electrons of a GaN pair fill four bonds: gallium\'s 4p and 4s electrons (yellow, orange), nitrogen\'s 2p electrons (teal), and its 2s pair (purple), which becomes a dative bond. All the bonds are polar toward N. That rigid, strong bonding gives GaN its 3.4 eV band gap, which is why it emits blue and ultraviolet light in LEDs.',
      hold: 6, trans: 0, route: 4, labels: L('Gaᵟ⁺', 'Nᵟ⁻'),
      bonds: [['Ga', 'N', 1]],
      build() {
        const a = atomsAt(N_APART + GA_N, N_APART);
        const lobes = tet.map(d => bondLobe(a.N, d));
        return { a, clouds: [gaCore(a), [lobes[1], lobes[2]], [lobes[0]], [lobes[3]], lobes] };
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Naked-eye view: liquid Ga in an alumina boat, nitrided under NH₃ in a tube furnace
// ---------------------------------------------------------------------------
const MMOL_GA = 500 / 69.72;   // 0.50 g Ga
const M_GAN = 83.73;

const macro = {
  camera: { pos: V(1.0, 2.4, 6.0), target: V(0.3, 0.5, 0.35), maxDist: 11 },
  setup({ THREE, scene, camera, controls, dom, $ }) {
    const rnd = (a, b) => a + Math.random() * (b - a);
    const TUBE_Y = 0.78, TUBE_R = 0.11;
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.2,
      clearcoat: 1, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false,
    });
    const steel = new THREE.MeshStandardMaterial({ color: 0x8c9099, metalness: 0.85, roughness: 0.35 });

    buildLab(scene, { u: 4, hood: { x: 0.05, w: 1.95, h: 1.3, sash: 0.75 }, bench: [-1.6, 2.2] }); // NH₃ + H₂ → fume hood

    // tube furnace, cut away at the front so the quartz tube and boat are visible
    const furnace = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.6, 48, 1, true, 0.95, Math.PI * 2 - 1.9),
      new THREE.MeshStandardMaterial({ color: 0xd9dde3, roughness: 0.5, metalness: 0.2 }));
    const linerMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.95, side: THREE.BackSide, emissive: 0x000000 });
    const liner = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 1.58, 48, 1, true, 0.95, Math.PI * 2 - 1.9), linerMat);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xbfc4cc, roughness: 0.5, side: THREE.DoubleSide });
    const caps = [-0.8, 0.8].map(y => { const c = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.42, 40), capMat); c.rotation.x = Math.PI / 2; c.position.y = y; return c; });
    const coilMat = new THREE.MeshStandardMaterial({ color: 0x6b5a4a, roughness: 0.6, emissive: 0x000000 });
    const coils = [];
    for (let i = 0; i < 10; i++) {
      const c = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 6, 40), coilMat);
      c.rotation.x = Math.PI / 2;
      c.position.y = -0.68 + i * 0.15;
      coils.push(c);
    }
    furnace.add(shell, liner, ...caps, ...coils);
    furnace.rotation.z = Math.PI / 2;
    furnace.position.set(0, TUBE_Y, 0);
    const legs = [-0.55, 0.55].map(x => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, TUBE_Y - 0.42, 0.5), steel); l.position.set(x, (TUBE_Y - 0.42) / 2, 0); return l; });
    const furnaceLabel = textSprite('Tube furnace');
    furnaceLabel.position.set(0, TUBE_Y + 0.6, 0);
    furnaceLabel.scale.multiplyScalar(0.8);
    scene.add(furnace, ...legs, furnaceLabel);
    const glowLight = new THREE.PointLight(0xff8a3d, 0, 2.5, 2);
    glowLight.position.set(0, TUBE_Y, 0.15);
    scene.add(glowLight);

    // quartz tube + flanges
    const quartz = new THREE.Mesh(new THREE.CylinderGeometry(TUBE_R, TUBE_R, 2.6, 32, 1, true), glass);
    quartz.rotation.z = Math.PI / 2;
    quartz.position.y = TUBE_Y;
    const flanges = [-1.3, 1.3].map(x => { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 28), steel); f.rotation.z = Math.PI / 2; f.position.set(x, TUBE_Y, 0); return f; });
    scene.add(quartz, ...flanges);

    // alumina boat with liquid gallium
    const boat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.12), new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.8 }));
    boat.position.set(0, TUBE_Y - TUBE_R + 0.035, 0);
    const gaMat = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.06 });
    const gaBead = new THREE.Mesh(new THREE.SphereGeometry(0.05, 24, 16), gaMat);
    gaBead.position.set(0, boat.position.y + 0.035, 0);
    scene.add(boat, gaBead);
    const MAXP = 80;
    const powderMat = new THREE.MeshStandardMaterial({ color: 0xcdbf8a, roughness: 0.95 });
    const powder = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), powderMat, MAXP);
    const powderPos = Array.from({ length: MAXP }, () => new THREE.Vector3(rnd(-0.15, 0.15), boat.position.y + 0.03 + rnd(0, 0.02), rnd(-0.045, 0.045)));
    scene.add(powder);

    // NH₃ cylinder, gas lines, exhaust bubbler
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.2, 28), new THREE.MeshStandardMaterial({ color: 0x3f6fb5, roughness: 0.4, metalness: 0.3 }));
    cyl.position.set(-1.75, 0.6, -0.35);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), cyl.material);
    dome.position.set(-1.75, 1.2, -0.35);
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 12), steel);
    valve.position.set(-1.75, 1.38, -0.35);
    const cylLabel = textSprite('NH₃');
    cylLabel.position.set(-1.75, 1.6, -0.35);
    scene.add(cyl, dome, valve, cylLabel);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.6, roughness: 0.3 });
    const pipe = pts => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.015, 8), pipeMat);
    scene.add(pipe([V(-1.75, 1.42, -0.35), V(-1.75, 1.55, -0.2), V(-1.5, 1.2, 0), V(-1.4, TUBE_Y, 0), V(-1.33, TUBE_Y, 0)]));
    scene.add(pipe([V(1.33, TUBE_Y, 0), V(1.5, TUBE_Y, 0), V(1.65, 0.7, 0.1), V(1.7, 0.42, 0.1), V(1.7, 0.12, 0.1)]));
    const bubbler = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 28, 1, true), glass);
    bubbler.position.set(1.7, 0.21, 0.1);
    const bubLiq = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.26, 28), new THREE.MeshStandardMaterial({ color: 0xdff1ff, transparent: true, opacity: 0.3, depthWrite: false }));
    bubLiq.position.set(1.7, 0.13, 0.1);
    const bubLabel = textSprite('Exhaust bubbler');
    bubLabel.position.set(1.7, 0.6, 0.1);
    bubLabel.scale.multiplyScalar(0.7);
    scene.add(bubbler, bubLiq, bubLabel);
    const MAXB = 60;
    const bubMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, roughness: 0 }), MAXB);
    bubMesh.frustumCulled = false;
    scene.add(bubMesh);
    const bubs = Array.from({ length: MAXB }, () => ({ life: 0, p: new THREE.Vector3(), v: 0 }));

    // bench samples for testing: GaN product dish and a Ga metal reference dish
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.6, side: THREE.DoubleSide });
    const dish = (x, z) => {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 8, 0, Math.PI * 2, Math.PI * 0.72, Math.PI * 0.28), dishMat);
      d.position.set(x, 0.22, z);
      scene.add(d);
      return d;
    };
    const SAMPLE = V(0.3, 0.04, 0.95), REF = V(-0.45, 0.04, 0.95);
    const sampleDish = dish(SAMPLE.x, SAMPLE.z), refDish = dish(REF.x, REF.z);
    const sampleMat = new THREE.MeshStandardMaterial({ color: 0xcdbf8a, roughness: 0.95, emissive: 0x000000 });
    const samplePile = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), sampleMat, 60);
    const pilePos = Array.from({ length: 60 }, () => { const a = rnd(0, 6.3), r = Math.sqrt(Math.random()) * 0.09; return new THREE.Vector3(SAMPLE.x + Math.cos(a) * r, 0.025 + (0.09 - r) * 0.25 + rnd(0, 0.01), SAMPLE.z + Math.sin(a) * r); });
    scene.add(samplePile);
    const refBead = new THREE.Mesh(new THREE.SphereGeometry(0.05, 24, 16), gaMat.clone());
    refBead.scale.set(1.3, 0.6, 1.3);
    refBead.position.set(REF.x, 0.045, REF.z);
    scene.add(refBead);
    const fizz = Array.from({ length: 40 }, () => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
      m.visible = false; scene.add(m);
      return { m, life: 0, v: 0 };
    });
    const vapour = Array.from({ length: 16 }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
      s.visible = false; scene.add(s);
      return { s, life: 0 };
    });

    // ---- simulation ---------------------------------------------------------
    const sim = {};
    let unloaded = false;
    const state = { sample: {}, ref: {} };   // reagents added: { hcl: t, naoh: t }
    function reset() {
      Object.assign(sim, { t: 0, T: 25, x: 0, bubAcc: 0 });
      unloaded = false;
      state.sample = {}; state.ref = {};
      kit.setEnabled(false);
    }

    const kit = createToolkit({
      scene, camera, controls, dom, container: $('testKit'), phChart: false, toolScale: 1.4, toastSide: 'right',
      lockedText: 'The testing kit unlocks when the gallium has fully reacted.',
      intro: 'Compare the <b>GaN product</b> with a <b>Ga metal reference</b>: every test is run on both dishes, which are marked with labelled rings. While you drag a tool, the spots it can be used in light up green.',
      onSkip: () => { Object.assign(sim, { T: 1000, x: 1, t: Math.max(sim.t, 40) }); $('ganNH3').checked = true; },
    });
    kit.extra.innerHTML = '<button class="kit-btn" id="unload">❄ Cool to room temperature under NH₃ and unload the boat → GaN dish</button>';
    $('unload').onclick = () => {
      if (unloaded) return;
      unloaded = true;
      kit.log(`The furnace is cooled under flowing NH₃ and the boat is unloaded. The product is a <b style="color:#cdbf8a">pale yellow-grey powder</b>, ≈ ${Math.round(MMOL_GA * M_GAN * 0.97)} mg, now in the right-hand dish marked "GaN product". The Ga metal reference is in the left-hand dish.`);
    };
    const inDish = (c, p, up = 0.11) => Math.hypot(p.x - c.x, p.z - c.z) < 0.16 && p.y < up;
    const aboveDish = (c, p) => Math.hypot(p.x - c.x, p.z - c.z) < 0.18 && p.y >= 0.11 && p.y < 0.6;
    const col = c => ({ x: c.x, z: c.z, y0: 0, y1: 1.0, r: 0.2 });
    kit.addZone('sample', p => unloaded && inDish(SAMPLE, p), col(SAMPLE), { at: V(SAMPLE.x, 0.1, SAMPLE.z + 0.02), r: 0.15, text: 'GaN product', when: () => unloaded });
    kit.addZone('sampleAbove', p => unloaded && aboveDish(SAMPLE, p), col(SAMPLE));
    kit.addZone('ref', p => inDish(REF, p), col(REF), { at: V(REF.x, 0.1, REF.z + 0.02), r: 0.15, text: 'Ga metal (reference)' });
    kit.addZone('refAbove', p => aboveDish(REF, p), col(REF));
    const which = z => (z.startsWith('sample') ? 'sample' : z.startsWith('ref') ? 'ref' : null);
    const ALL = ['sample', 'sampleAbove', 'ref', 'refAbove'];

    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.06, 0.12), new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.8 }));
    rack.position.set(1.35, 0.03, 1.05);
    scene.add(rack);
    const sw = c => `<span class="sw" style="background:#${new THREE.Color(c).getHexString()}"></span>`;
    const spawnFizz = c => fizz.forEach(f => { if (f.life <= 0 && Math.random() < 0.5) { f.life = rnd(0.5, 1.5); f.v = rnd(0.05, 0.15); f.m.position.set(c.x + rnd(-0.06, 0.06), 0.05, c.z + rnd(-0.06, 0.06)); f.m.visible = true; } });

    { // 1. UV lamp (365 nm)
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.07), new THREE.MeshStandardMaterial({ color: 0x1d1f26, roughness: 0.5 }));
      const face = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.008, 0.05), new THREE.MeshBasicMaterial({ color: 0x9a6bff }));
      face.position.y = -0.028;
      const beamMat = new THREE.MeshBasicMaterial({ color: 0x7a4dff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const beam = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 20, 1, true), beamMat);
      beam.position.y = -0.18;
      beam.userData.noGrab = true;
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 12), body.material);
      handle.position.y = 0.09;
      g.add(body, face, beam, handle);
      let litS = false, litR = false;
      kit.addTool({
        name: 'UV lamp (365 nm)', hint: 'hold it a little above a dish and look for a glow', targets: ['sampleAbove', 'refAbove', 'sample', 'ref'],
        obj: g, tip: V(0, -0.2, 0), home: V(0.95, 0.28, 1.05),
        onEnter(z) {
          const w = which(z);
          if (w === 'sample') {
            if (!litS) kit.log(`Under the UV lamp the GaN powder glows <b style="color:#ffd54a">yellow</b> ${sw(0xffd54a)}. This is photoluminescence: UV light lifts electrons across GaN's 3.4 eV band gap, and as they fall back through defect levels they emit the well-known <b>"yellow luminescence"</b> band near 550 nm. (The main band-edge emission is at 365 nm, which is invisible.) Metals cannot do this, because they have no band gap. Here it is the semiconductor GaN.`);
            litS = true;
          } else if (w === 'ref') {
            if (!litR) kit.log('Under UV the gallium metal only reflects the violet light. There is <b>no glow</b>: a metal has no band gap, so absorbed light just becomes heat.');
            litR = true;
          }
        },
        update(t) {
          const w = t.inZone && which(t.inZone);
          sampleMat.emissive.setHex(w === 'sample' ? 0xe0b020 : 0x000000);
          beamMat.opacity = t.inZone ? 0.25 : 0.12;
        },
      });
    }
    { // 2. multimeter with a probe
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.28), new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.5 }));
      body.position.set(2.05, 0.03, 0.55);
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
      const ctx = canvas.getContext('2d'), tex = new THREE.CanvasTexture(canvas);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.075), new THREE.MeshBasicMaterial({ map: tex }));
      screen.rotation.x = -Math.PI / 2 + 0.3;
      screen.position.set(2.05, 0.065, 0.5);
      scene.add(body, screen);
      let shown = '';
      const lcd = (big, small) => {
        if (shown === big + small) return;
        shown = big + small;
        ctx.fillStyle = '#a7b8a2'; ctx.fillRect(0, 0, 256, 128);
        ctx.fillStyle = '#172015'; ctx.textAlign = 'center';
        ctx.font = 'bold 54px monospace'; ctx.fillText(big, 128, 70);
        ctx.font = '20px monospace'; ctx.fillText(small, 128, 108);
        tex.needsUpdate = true;
      };
      lcd('O.L', 'Ω   open');
      const probe = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 10), new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 }));
      const tipM = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.06, 10), steel);
      tipM.rotation.x = Math.PI; tipM.position.y = -0.14;
      probe.add(stem, tipM);
      const cableGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 24 }, () => new THREE.Vector3()));
      const cable = new THREE.Line(cableGeo, new THREE.LineBasicMaterial({ color: 0xc0392b }));
      cable.frustumCulled = false;
      scene.add(cable);
      const a = new THREE.Vector3(2.05, 0.06, 0.43), b = new THREE.Vector3(), m = new THREE.Vector3();
      kit.addTool({
        name: 'Multimeter (resistance)', hint: 'touch the probe to the solid in a dish', targets: ['sample', 'ref'],
        obj: probe, tip: V(0, -0.17, 0), home: V(1.15, 0.25, 1.05),
        onEnter(z) {
          const w = which(z);
          if (w === 'sample' && z === 'sample') kit.log('Multimeter on the GaN powder: about <b>12 MΩ</b>, which is very high. GaN is a <b>semiconductor</b>: with a 3.4 eV band gap, almost no electrons are free to carry current at room temperature. (Doped GaN films conduct, and that is how LEDs are built.)');
          if (w === 'ref' && z === 'ref') kit.log('Multimeter on the gallium metal: <b>0.2 Ω</b>, essentially a short circuit. A metal is full of free electrons, so any unreacted Ga in the product would show up as low resistance.');
        },
        update(t, dt, time) {
          if (t.inZone === 'sample') lcd((12.0 + 0.3 * Math.sin(time * 2)).toFixed(1), 'MΩ  GaN');
          else if (t.inZone === 'ref') lcd('0.2', 'Ω   Ga metal');
          else lcd('O.L', 'Ω   open');
          cable.visible = probe.visible;
          b.set(0, 0.11, 0).applyMatrix4(probe.matrixWorld);
          m.lerpVectors(a, b, 0.5); m.y = Math.min(a.y, b.y) - 0.04;
          const pos = cableGeo.attributes.position;
          for (let i = 0; i < 24; i++) {
            const u = i / 23, w0 = (1 - u) ** 2, w1 = 2 * u * (1 - u), w2 = u * u;
            pos.setXYZ(i, a.x * w0 + m.x * w1 + b.x * w2, a.y * w0 + m.y * w1 + b.y * w2, a.z * w0 + m.z * w1 + b.z * w2);
          }
          pos.needsUpdate = true;
        },
      });
    }
    { // 3. dilute HCl dropper
      const dr = dropper(0xf2f2f2, 0xd94f3a);
      kit.addTool({
        name: 'Dilute hydrochloric acid (HCl, 2 M)', hint: 'add drops to a dish', targets: ALL,
        obj: dr.obj, tip: dr.tip, home: V(1.35, 0.2, 1.05),
        onEnter(z, t, at) {
          const w = which(z);
          if (!w) return;
          kit.drop(at, 0.05, 0xffffff, () => {
            if (state[w].hcl) return;
            state[w].hcl = performance.now() / 1000;
            if (w === 'sample') kit.log('HCl on the GaN: <b>no reaction</b>, no bubbles and nothing dissolves. GaN is chemically very inert, because its strong, polar Ga–N bonds resist acid attack. So the gallium has been converted completely.');
            else { spawnFizz(REF); kit.log('HCl on the gallium metal: slow <b>fizzing</b> as hydrogen bubbles off, 2 Ga + 6 HCl → 2 GaCl₃ + 3 H₂. Unreacted metal would give itself away like this.'); }
          });
        },
      });
    }
    { // 4. hot concentrated NaOH dropper
      const dr = dropper(0xf2f2f2, 0x2f6fd6);
      kit.addTool({
        name: 'Hot concentrated sodium hydroxide (NaOH, 30 %)', hint: 'add drops to a dish, then test the vapour above it with red litmus', targets: ALL,
        obj: dr.obj, tip: dr.tip, home: V(1.55, 0.2, 1.05),
        onEnter(z, t, at) {
          const w = which(z);
          if (!w) return;
          kit.drop(at, 0.05, 0xffffff, () => {
            if (state[w].naoh) return;
            state[w].naoh = performance.now() / 1000;
            if (w === 'sample') {
              vapour.forEach(v => { v.life = rnd(0, 6); });
              kit.log('Hot NaOH on the GaN: it slowly etches the nitride, and a faint smell of <b>ammonia</b> rises: GaN + NaOH + H₂O → NaGaO₂ + NH₃↑. (Hot alkali is how GaN wafers are etched.) Hold moist red litmus paper above the dish to confirm the NH₃.');
            } else {
              spawnFizz(REF);
              kit.log('Hot NaOH on the gallium metal: brisk <b>fizzing</b> of hydrogen, 2 Ga + 2 NaOH + 2 H₂O → 2 NaGaO₂ + 3 H₂. Gallium is amphoteric. This gas is H₂, not NH₃, so litmus held above will not change.');
            }
          });
        },
      });
    }
    { // 5. moist red litmus paper held above a dish
      const st = strip(0xd9534f, 0xd9534f, { padLen: 0.12 });
      kit.addTool({
        name: 'Moist red litmus paper', hint: 'hold it above a dish after adding hot NaOH', targets: ['sampleAbove', 'refAbove'],
        obj: st.obj, tip: st.tip, home: V(1.75, 0.22, 1.05),
        reset: () => st.pad.material.color.set(0xd9534f),
        onEnter(z) {
          if (z === 'sampleAbove') {
            if (state.sample.naoh) {
              st.pad.material.color.set(0x3b6fd8);
              kit.log(`Moist red litmus above the GaN + NaOH dish turns <b>blue</b> ${sw(0x3b6fd8)}. The vapour is alkaline: it is <b>ammonia, NH₃</b>, and the nitrogen in it came from the nitride. That confirms the product is a <b>nitride</b>, gallium nitride.`);
            } else kit.log('Red litmus above the GaN stays red: nothing is coming off yet. Add hot NaOH to the dish first.');
          } else if (z === 'refAbove') {
            kit.log(state.ref.naoh ? 'Red litmus above the Ga + NaOH dish <b>stays red</b>. The gas is hydrogen, which is neutral, so there is no nitrogen here.' : 'Red litmus above the gallium metal stays red: nothing is coming off.');
          }
        },
      });
    }

    // ---- update ------------------------------------------------------------
    const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();
    const COOL = new THREE.Color(0x000000), HOT = new THREE.Color(0xff6a1a);
    function update(dt, time) {
      const s = sim;
      s.t += dt;
      const on = $('ganHeat').checked, flow = $('ganNH3').checked;
      // furnace: ~4 s time constant (sped up); cooling once off
      s.T += ((on ? 1000 : 25) - s.T) * Math.min(1, dt * (on ? 0.25 : 0.08));
      // nitridation needs ≳ 750 °C and ammonia flowing; a GaN crust slows it as it thickens
      const k = s.T > 750 ? (s.T - 750) / 250 : 0;
      const rate = flow ? 0.15 * k * Math.pow(Math.max(0, 1 - s.x), 2 / 3) : 0; // ≈ 20 s at 1000 °C
      s.x = Math.min(1, s.x + rate * dt);
      if (s.x > 0.998) s.x = 1;

      // furnace glow
      const glow = Math.max(0, (s.T - 450) / 550);
      linerMat.emissive.lerpColors(COOL, HOT, glow);
      coilMat.emissive.lerpColors(COOL, HOT, Math.min(1, glow * 1.3));
      glowLight.intensity = glow * 3;

      // boat contents: Ga bead shrinks under a growing GaN crust
      gaBead.visible = s.x < 0.999 && !unloaded;
      gaBead.scale.set(1.5, 0.55, 1).multiplyScalar(Math.max(0.01, Math.cbrt(1 - s.x)));
      const nP = unloaded ? 0 : Math.round(s.x * MAXP);
      for (let i = 0; i < MAXP; i++) {
        tmpS.setScalar(i < nP ? 0.009 + (i % 4) * 0.002 : 0);
        tmpM.compose(powderPos[i], tmpQ, tmpS);
        powder.setMatrixAt(i, tmpM);
      }
      powder.instanceMatrix.needsUpdate = true;

      // exhaust bubbler: NH₃ (and H₂ while reacting) bubbling through
      s.bubAcc += (flow ? 6 + rate * 400 : 0) * dt;
      while (s.bubAcc > 1) {
        s.bubAcc--;
        const b = bubs.find(b => b.life <= 0);
        if (!b) break;
        b.life = 2; b.v = rnd(0.2, 0.35); b.p.set(1.7 + rnd(-0.02, 0.02), 0.03, 0.1 + rnd(-0.02, 0.02));
      }
      bubs.forEach((b, i) => {
        if (b.life > 0) { b.life -= dt; b.p.y += b.v * dt; b.p.x += Math.sin(time * 9 + i) * 0.002; if (b.p.y > 0.26) b.life = 0; }
        tmpS.setScalar(b.life > 0 ? 0.01 : 0);
        tmpM.compose(b.p, tmpQ, tmpS);
        bubMesh.setMatrixAt(i, tmpM);
      });
      bubMesh.instanceMatrix.needsUpdate = true;

      // bench dishes
      sampleDish.visible = refDish.visible = refBead.visible = kit.enabled;
      for (let i = 0; i < 60; i++) {
        tmpS.setScalar(unloaded ? 0.012 + (i % 4) * 0.003 : 0);
        tmpM.compose(pilePos[i], tmpQ, tmpS);
        samplePile.setMatrixAt(i, tmpM);
      }
      samplePile.instanceMatrix.needsUpdate = true;
      const now = performance.now() / 1000;
      fizz.forEach(f => {
        if (f.life > 0) { f.life -= 1 / 60; f.m.position.y += f.v / 60; } else f.m.visible = false;
      });
      if ((state.ref.hcl && now - state.ref.hcl < 12) || (state.ref.naoh && now - state.ref.naoh < 12)) if (Math.random() < 0.3) spawnFizz(REF);
      vapour.forEach(v => {
        const active = state.sample.naoh && now - state.sample.naoh < 25;
        v.s.visible = !!active;
        if (!active) return;
        v.life = (v.life + 1 / 60) % 6;
        v.s.position.set(SAMPLE.x + Math.sin(v.life * 2 + v.s.id) * 0.03, 0.06 + v.life * 0.07, SAMPLE.z);
        v.s.scale.setScalar(0.04 + v.life * 0.02);
        v.s.material.opacity = 0.18 * (1 - v.life / 6);
      });

      // readouts
      const status = s.x >= 1 ? 'Complete: Ga fully nitrided'
        : rate > 0 ? 'Nitriding: 2 Ga + 2 NH₃ → 2 GaN + 3 H₂'
        : s.T > 750 && !flow ? 'Hot: turn on the NH₃ flow'
        : on ? (flow && s.T <= 750 ? 'Too cool to react (< 750 °C)' : 'Heating…') : 'Furnace off';
      $('mStatus').textContent = status;
      $('mTime').textContent = s.t.toFixed(1) + ' s';
      $('mTemp').textContent = Math.round(s.T) + ' °C';
      $('mFlow').textContent = flow ? '100 sccm' : '0 sccm';
      $('mGa').textContent = ((1 - s.x) * 100).toFixed(1) + ' %';
      $('mGaN').textContent = Math.round(s.x * MMOL_GA * M_GAN) + ' mg';
      $('mH2').textContent = Math.round(s.x * MMOL_GA * 1.5 * 24.5) + ' mL';
      $('mBar').style.width = s.x * 100 + '%';

      if (!kit.enabled && s.x >= 1) kit.setEnabled(true);
      kit.update(time);
    }
    return { reset, update };
  },
};

export default {
  ui: {
    title: 'Gallium Nitride',
    heading: 'Ga + N at the electron level',
    equation: '2 Ga + N₂ → 2 GaN',
    routeTitle: 'Where do gallium\'s 3 valence electrons go?',
    route: [
      'Ga 4s² 4p¹ (outer shell)',
      'Waiting while N≡N is broken apart',
      'The 4p electron reaches toward N',
      'Polar Ga–N σ bond (pulled toward N)',
      'Four tetrahedral sp³ Ga–N bonds in the crystal',
    ],
    foot: 'The model: approximate |ψ|² shapes. The Ga 4s is a hydrogen-like s shell, the Ga 4p a p-lobe shape, and bonds and lone pairs are Gaussian lobes, morphing smoothly between stages. Two Ga atoms and one N₂ react together (mirror-symmetric). The first stages show a single Ga–N pair, while real GaN is a covalent–ionic crystal (wurtzite). Ga cannot break N≡N by itself: industry uses ammonia at about 1000 °C, as in the naked-eye view, or metal-organic vapour deposition (MOCVD), or a nitrogen plasma (MBE).',
    macro: {
      title: 'What you\'d actually see',
      sub: 'Direct nitridation: 0.50 g of liquid gallium in an alumina boat, inside a quartz tube in a tube furnace at 1000 °C, under flowing ammonia (N₂ gas alone would not react). The exhaust passes through a bubbler. Use a fume hood: NH₃ is toxic and corrosive, and H₂ is flammable.',
      observations: `• Gallium is a silvery <b>liquid</b> above 29.8 °C, so it sits in the boat as a shiny bead.<br>
        • Above about 750 °C, with NH₃ flowing, the bead slowly dulls as a <b>crust</b> grows over it. NH₃ cracks on the hot metal: 2 Ga + 2 NH₃ → 2 GaN + 3 H₂.<br>
        • The bead shrinks and disappears into a <b style="color:#cdbf8a">pale yellow-grey powder</b> of gallium nitride.<br>
        • Gas bubbles steadily through the exhaust bubbler: excess NH₃ plus the H₂ produced.`,
      controls: `<label><input type="checkbox" id="ganHeat" checked>Furnace on (setpoint 1000 °C)</label>
        <label><input type="checkbox" id="ganNH3">NH₃ flow on (100 sccm)</label><div id="testKit"></div>`,
      measurements: [
        ['mStatus', 'Status', 'Heating…'],
        ['mTime', 'Elapsed time', '0 s'],
        ['mTemp', 'Furnace temperature', '25 °C'],
        ['mFlow', 'NH₃ flow', '0 sccm'],
        ['mGa', 'Gallium remaining', '100 %'],
        ['mGaN', 'GaN formed', '0 mg'],
        ['mH2', 'H₂ released (25 °C)', '0 mL'],
      ],
      foot: 'Timings are compressed: real nitridation of a gallium bead takes hours, and the GaN crust can stop the reaction before it finishes. The resistance and luminescence values are typical, not measured.',
    },
  },
  atomic,
  macro,
};
