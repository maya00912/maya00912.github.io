// Titanium tetrachloride: Ti + 2 Cl₂ → TiCl₄
import { V, prim, sphere, along } from './reaction-engine.js';
import { createToolkit, strip, dropper, universalColor, liquidColumn, bunsen, textSprite } from './lab-tools.js';
import { buildLab } from './lab-room.js';

// ---------------------------------------------------------------------------
// Atomic view (not mirror-symmetric: Ti sits at the centre). Two Cl₂ molecules come in
// from +x and −x, already turned so that their atoms land on the four corners of a
// tetrahedron. Ti's 4s² pair breaks the first Cl₂, then its 3d² pair breaks the second.
// ---------------------------------------------------------------------------
const X = V(1, 0, 0), Zv = V(0, 0, 1);
const TI_CL = 2.17;      // Ti–Cl in TiCl₄ (Å)
const CL_HALF = 0.995;   // half the Cl–Cl bond (1.99 Å)
const t = (x, y, z) => V(x, y, z).normalize();
const TET = { Cla: t(1, 1, 1), Clb: t(1, -1, -1), Clc: t(-1, -1, 1), Cld: t(-1, 1, -1) };
const uA = TET.Cla.clone().sub(TET.Clb).normalize(), uB = TET.Clc.clone().sub(TET.Cld).normalize();

// mol: where each Cl₂ is ({ c: centre x, h: half Cl–Cl }) or 'bonded' (its atoms on the TiCl₄ corners)
function geom(A, B) {
  const a = { Ti: V(0, 0, 0) };
  const place = (m, k1, k2, u, sign) => {
    if (m === 'bonded') { a[k1] = TET[k1].clone().multiplyScalar(TI_CL); a[k2] = TET[k2].clone().multiplyScalar(TI_CL); return; }
    const c = V(sign * m.c, 0, 0);
    a[k1] = along(c, u, m.h); a[k2] = along(c, u, -m.h);
  };
  place(A, 'Cla', 'Clb', uA, 1);
  place(B, 'Clc', 'Cld', uB, -1);
  return a;
}
const free = (c, h = CL_HALF) => ({ c, h });

const dirTo = (from, to) => to.clone().sub(from).normalize();
// three lone pairs on Cl: a donut around the bond axis plus a lobe pointing away from the partner
const clLone = (Cl, partner) => {
  const d = dirTo(partner, Cl);
  return [prim(along(Cl, d, -0.05), d, 'gauss', 0.3, 0.5, 4, 'ring'), prim(along(Cl, d, 0.3), d, 'gauss', 0.26, 0.24, 2)];
};
const allLone = (a, partners) => ['Cla', 'Clb', 'Clc', 'Cld'].flatMap(k => clLone(a[k], partners[k]));
const clSigma = (P, Q, w = 1) => [prim(P.clone().lerp(Q, 0.5), dirTo(P, Q), 'gauss', 0.55, 0.3, w)];
// σ*(Cl–Cl): node between the atoms, density mostly on the outer side of each Cl
const clSigmaStar = (P, Q) => {
  const d = dirTo(P, Q);
  return [prim(along(P, d, -0.55), d, 'gauss', 0.4, 0.42, 0.45), prim(along(Q, d, 0.55), d, 'gauss', 0.4, 0.42, 0.45),
    prim(along(P, d, 0.35), d, 'gauss', 0.22, 0.3, 0.05), prim(along(Q, d, -0.35), d, 'gauss', 0.22, 0.3, 0.05)];
};
// a polar Ti–Cl σ bond pair, centred nearer Cl (Cl is more electronegative: 3.16 vs 1.54)
const tiCl = (Ti, Cl) => prim(Ti.clone().lerp(Cl, 0.6), dirTo(Ti, Cl), 'gauss', 0.5, 0.26);

const tiCore = a => [sphere(a.Ti, 'shell', 0.09)];
const ti4s = a => [sphere(a.Ti, '2s', 0.34)];
const ti3d = a => [prim(a.Ti, Zv, 'shell', 0.15, 0.15, 1, 'dz2')];

const base = { Ti: 'Ti', Cla: 'Cl', Clb: 'Cl', Clc: 'Cl', Cld: 'Cl' };
const L = (over = {}) => ({ ...base, ...over });
const own = a => ({ Cla: a.Clb, Clb: a.Cla, Clc: a.Cld, Cld: a.Clc });   // lone pairs point away from the Cl₂ partner…
const fromTi = a => ({ Cla: a.Ti, Clb: a.Ti, Clc: a.Ti, Cld: a.Ti });   // …or away from Ti once bonded to it

const atomic = {
  mirror: false,
  camera: { pos: V(0, 3.2, 14), target: V(0, 0, 0) },
  atoms: { Ti: [0.15, 0xb8c4d6], Cla: [0.13, 0x6fdc5a], Clb: [0.13, 0x6fdc5a], Clc: [0.13, 0x6fdc5a], Cld: [0.13, 0x6fdc5a] },
  // [Ti core, Ti 4s², Ti 3d², Cl lone pairs (all four Cl), Cl–Cl σ pair of molecule A, of molecule B]
  clouds: [
    { dots: 5000, group: 0, color: 0x4fb3ff, gain: 0.4 },
    { dots: 5000, group: 1, color: 0xffb347 },
    { dots: 4000, group: 1, color: 0xffe14d },
    { dots: 16000, group: 2, color: 0x9d7bff, gain: 0.55 },
    { dots: 3500, group: 2, color: 0x3fe0b0, gain: 0.9 },
    { dots: 3500, group: 2, color: 0x2fc7d9, gain: 0.9 },
  ],
  groups: [
    { label: 'Ti [Ar] core (3s² 3p⁶ outer shell)', color: '#4fb3ff' },
    { label: 'Titanium\'s 4 valence electrons:', items: [
      { label: '4s² pair (breaks the first Cl₂)', color: '#ffb347' },
      { label: '3d² pair (breaks the second Cl₂)', color: '#ffe14d' },
    ] },
    { label: 'Chlorine valence electrons:', items: [
      { label: '3s² + 3p lone pairs (3 per Cl)', color: '#9d7bff' },
      { label: 'Cl–Cl σ bond of the first Cl₂', color: '#3fe0b0' },
      { label: 'Cl–Cl σ bond of the second Cl₂', color: '#2fc7d9' },
    ] },
  ],
  stages: [
    {
      title: '1 · Reactants: a Ti atom and two Cl₂',
      desc: 'A titanium atom ([Ar] 3d² 4s²) and two chlorine molecules. Titanium has four valence electrons: a large, loosely held 4s² pair (orange) and two compact 3d electrons (yellow). Each Cl₂ is held by one σ bond made from two 3p electrons (teal), and every Cl atom carries three lone pairs (purple). To make TiCl₄, titanium has to hand all four of its valence electrons to chlorine: two for each Cl₂.',
      hold: 2.5, trans: 4, route: 0, labels: L(),
      bonds: [['Cla', 'Clb', 1], ['Clc', 'Cld', 1]],
      build() {
        const a = geom(free(6.2), free(6.2));
        return { a, clouds: [tiCore(a), ti4s(a), ti3d(a), allLone(a, own(a)), clSigma(a.Cla, a.Clb), clSigma(a.Clc, a.Cld)] };
      },
    },
    {
      title: '2 · Approach: the 4s cloud leans toward Cl₂',
      desc: 'The first Cl₂ comes close. Chlorine is very electronegative and Cl₂ has an empty, low-lying σ* orbital, so it is a strong electron acceptor. The diffuse 4s² cloud of titanium, the most loosely held electrons it has (first ionization energy 6.83 eV), is pulled toward it.',
      hold: 2.5, trans: 3.5, route: 1, labels: L(),
      bonds: [['Cla', 'Clb', 1], ['Clc', 'Cld', 1]],
      build() {
        const a = geom(free(3.6), free(5.4));
        return { a, clouds: [tiCore(a), [prim(along(a.Ti, X, 0.55), X, '2s', 0.36, 0.3)], ti3d(a),
          allLone(a, own(a)), clSigma(a.Cla, a.Clb), clSigma(a.Clc, a.Cld)] };
      },
    },
    {
      title: '3 · The 4s² pair moves into σ*(Cl–Cl)',
      desc: 'Both 4s electrons flow into the σ* orbital of the first Cl₂. σ* has a node between the two chlorine atoms, so filling it cancels the Cl–Cl bond: the bond order drops from 1 to 0 and the molecule stretches. Titanium is now effectively Ti²⁺, with only its two 3d electrons left. The second Cl₂ is on its way in.',
      hold: 2.5, trans: 3.5, route: 2, labels: L({ Ti: 'Ti²⁺' }),
      bonds: [['Cla', 'Clb', 0.35], ['Clc', 'Cld', 1], ['Ti', 'Cla', 0.35], ['Ti', 'Clb', 0.35]],
      build() {
        const a = geom(free(2.0, 1.45), free(3.4));
        return { a, clouds: [tiCore(a), clSigmaStar(a.Cla, a.Clb), ti3d(a),
          allLone(a, own(a)), clSigma(a.Cla, a.Clb, 0.6), clSigma(a.Clc, a.Cld)] };
      },
    },
    {
      title: '4 · Two Ti–Cl bonds; the 3d² pair attacks the second Cl₂',
      desc: 'The first Cl₂ falls apart. Each Cl takes one of the two teal electrons from its old bond and pairs it with one of titanium\'s former 4s electrons, making two polar Ti–Cl σ bonds: this is TiCl₂. Now the two 3d electrons (yellow) do the same job on the second Cl₂, flowing into its σ* and breaking its bond.',
      hold: 2.5, trans: 4, route: 3, labels: L({ Ti: 'Tiᵟ⁺', Cla: 'Clᵟ⁻', Clb: 'Clᵟ⁻' }),
      bonds: [['Ti', 'Cla', 1], ['Ti', 'Clb', 1], ['Clc', 'Cld', 0.35], ['Ti', 'Clc', 0.35], ['Ti', 'Cld', 0.35]],
      build() {
        const a = geom('bonded', free(1.75, 1.45));
        const lone = { ...fromTi(a), Clc: a.Cld, Cld: a.Clc };
        return { a, clouds: [tiCore(a), [tiCl(a.Ti, a.Cla), tiCl(a.Ti, a.Clb)], clSigmaStar(a.Clc, a.Cld),
          allLone(a, lone), [tiCl(a.Ti, a.Cla), tiCl(a.Ti, a.Clb)], clSigma(a.Clc, a.Cld, 0.6)] };
      },
    },
    {
      title: '5 · Product: tetrahedral TiCl₄',
      desc: 'All four valence electrons of titanium are now in Ti–Cl σ bonds, each paired with an electron from chlorine, so titanium is in the +4 oxidation state with an empty 3d shell (d⁰). The four bonds (2.17 Å) repel each other equally and point to the corners of a tetrahedron (109.5°). They are polar but covalent, so TiCl₄ is a small, separate molecule: a colourless liquid that boils at 136 °C. The empty 3d orbitals make it a strong Lewis acid, which grabs water so violently that TiCl₄ fumes in moist air. ΔH_f(TiCl₄, l) = −804 kJ/mol.',
      hold: 6, trans: 0, route: 4, labels: L({ Ti: 'Tiᵟ⁺', Cla: 'Clᵟ⁻', Clb: 'Clᵟ⁻', Clc: 'Clᵟ⁻', Cld: 'Clᵟ⁻' }),
      bonds: [['Ti', 'Cla', 1], ['Ti', 'Clb', 1], ['Ti', 'Clc', 1], ['Ti', 'Cld', 1]],
      build() {
        const a = geom('bonded', 'bonded');
        const ab = [tiCl(a.Ti, a.Cla), tiCl(a.Ti, a.Clb)], cd = [tiCl(a.Ti, a.Clc), tiCl(a.Ti, a.Cld)];
        return { a, clouds: [tiCore(a), ab, cd, allLone(a, fromTi(a)), ab, cd] };
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Naked-eye view: titanium turnings heated in a stream of dry chlorine; TiCl₄ distils
// into an ice-cooled receiver, and the excess Cl₂ is scrubbed by NaOH
// ---------------------------------------------------------------------------
const MMOL_TI = 240 / 47.87;   // 0.24 g Ti
const M_TICL4 = 189.68, RHO_TICL4 = 1.73;

const macro = {
  camera: { pos: V(0.75, 1.55, 4.4), target: V(0.5, 0.4, 0.45), maxDist: 11 },
  setup({ THREE, scene, camera, controls, dom, $ }) {
    const rnd = (a, b) => a + Math.random() * (b - a);
    const TUBE_Y = 0.62, TUBE_R = 0.07, TUBE_X0 = -1.15, TUBE_X1 = 0.45, BOAT_X = -0.35;
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.2,
      clearcoat: 1, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false,
    });
    const steel = new THREE.MeshStandardMaterial({ color: 0x8c9099, metalness: 0.85, roughness: 0.35 });

    buildLab(scene, { u: 4, hood: { x: 0.05, w: 1.95, h: 1.3, sash: 0.75 }, bench: [-1.6, 2.2] }); // Cl₂ + TiCl₄ fumes → fume hood

    // two retort stands holding the combustion tube
    for (const x of [-0.95, 0.2]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.4), new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.6 }));
      b.position.set(x, 0.015, -0.2);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 12), steel);
      rod.position.set(x, 0.5, -0.32);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.32), steel);
      arm.position.set(x, TUBE_Y, -0.16);
      const jaw = new THREE.Mesh(new THREE.TorusGeometry(TUBE_R + 0.015, 0.012, 8, 24), steel);
      jaw.rotation.y = Math.PI / 2;
      jaw.position.set(x, TUBE_Y, 0);
      scene.add(b, rod, arm, jaw);
    }

    // combustion tube (horizontal) with the Cl₂ inside it shown as a yellow-green tint
    const tubeLen = TUBE_X1 - TUBE_X0;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(TUBE_R, TUBE_R, tubeLen, 32, 1, true), glass);
    tube.rotation.z = Math.PI / 2;
    tube.position.set((TUBE_X0 + TUBE_X1) / 2, TUBE_Y, 0);
    scene.add(tube);
    const gasMat = () => new THREE.MeshBasicMaterial({ color: 0xc8e04a, transparent: true, opacity: 0, depthWrite: false });
    const gasSeg = (x0, x1) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(TUBE_R * 0.93, TUBE_R * 0.93, x1 - x0, 24), gasMat());
      m.rotation.z = Math.PI / 2;
      m.position.set((x0 + x1) / 2, TUBE_Y, 0);
      scene.add(m);
      return m;
    };
    const gasUp = gasSeg(TUBE_X0 + 0.02, BOAT_X - 0.12), gasDown = gasSeg(BOAT_X + 0.12, TUBE_X1 - 0.02);
    const tubeLabel = textSprite('Ti turnings in Cl₂');
    tubeLabel.position.set(BOAT_X, TUBE_Y + 0.32, 0);
    tubeLabel.scale.multiplyScalar(0.7);
    scene.add(tubeLabel);

    // porcelain boat with titanium turnings
    const boat = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.07), new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.8 }));
    boat.position.set(BOAT_X, TUBE_Y - TUBE_R + 0.02, 0);
    scene.add(boat);
    const MAXT = 40;
    const tiMat = new THREE.MeshStandardMaterial({ color: 0xa9b2bd, metalness: 0.9, roughness: 0.3, emissive: 0x000000 });
    const turnings = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.25, 5, 10, 4.2), tiMat, MAXT);
    const turnData = Array.from({ length: MAXT }, () => ({
      p: new THREE.Vector3(BOAT_X + rnd(-0.09, 0.09), boat.position.y + 0.02 + rnd(0, 0.015), rnd(-0.025, 0.025)),
      q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(0, 6), rnd(0, 6), rnd(0, 6))), s: rnd(0.012, 0.02),
    }));
    scene.add(turnings);
    const burnLight = new THREE.PointLight(0xffa040, 0, 1.6, 2);
    burnLight.position.set(BOAT_X, TUBE_Y + 0.05, 0.1);
    scene.add(burnLight);

    // Bunsen burner under the boat
    const burner = bunsen(scene, BOAT_X, 0);
    burner.group.scale.set(1, 0.88, 1);

    // chlorine cylinder and gas line
    const cylMat = new THREE.MeshStandardMaterial({ color: 0xc9b23a, roughness: 0.4, metalness: 0.3 });
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.2, 28), cylMat);
    cyl.position.set(-1.75, 0.6, -0.35);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), cylMat);
    dome.position.set(-1.75, 1.2, -0.35);
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 12), steel);
    valve.position.set(-1.75, 1.38, -0.35);
    const cylLabel = textSprite('Cl₂ (dry)');
    cylLabel.position.set(-1.75, 1.6, -0.35);
    scene.add(cyl, dome, valve, cylLabel);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.6, roughness: 0.3 });
    const pipe = (pts, r = 0.015, mat = pipeMat) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, r, 8), mat); scene.add(m); return m; };
    pipe([V(-1.75, 1.42, -0.35), V(-1.75, 1.55, -0.2), V(-1.45, 1.0, 0), V(-1.3, TUBE_Y, 0), V(TUBE_X0 + 0.02, TUBE_Y, 0)]);

    // glass bend down into the receiver flask, standing in an ice bath
    const RX = 0.78, RY = 0.2, RR = 0.13;
    pipe([V(TUBE_X1 - 0.02, TUBE_Y, 0), V(0.62, TUBE_Y, 0), V(RX, 0.52, 0), V(RX, RY + RR + 0.05, 0)], 0.022, glass);
    const flask = new THREE.Mesh(new THREE.SphereGeometry(RR, 32, 20), glass);
    flask.position.set(RX, RY, 0);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 16, 1, true), glass);
    neck.position.set(RX, RY + RR + 0.03, 0);
    scene.add(flask, neck);
    const prodMat = new THREE.MeshStandardMaterial({ color: 0xfff3c2, transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false });
    const prod = new THREE.Mesh(new THREE.SphereGeometry(RR * 0.93, 28, 12, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), prodMat);
    prod.position.set(RX, RY, 0);
    scene.add(prod);
    const iceBeaker = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.3, 32, 1, true), glass);
    iceBeaker.position.set(RX, 0.15, 0);
    const iceWater = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.2, 32), new THREE.MeshStandardMaterial({ color: 0xdff1ff, transparent: true, opacity: 0.25, depthWrite: false }));
    iceWater.position.set(RX, 0.1, 0);
    scene.add(iceBeaker, iceWater);
    const ice = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, transparent: true, opacity: 0.75 }), 18);
    for (let i = 0; i < 18; i++) {
      const a = rnd(0, 6.3), r = rnd(0.16, 0.23);
      ice.setMatrixAt(i, new THREE.Matrix4().compose(V(RX + Math.cos(a) * r, rnd(0.06, 0.2), Math.sin(a) * r),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(0, 6), rnd(0, 6), 0)), V(1, 1, 1).multiplyScalar(rnd(0.03, 0.045))));
    }
    scene.add(ice);
    const rxLabel = textSprite('Ice-cooled receiver');
    rxLabel.position.set(RX, 0.62, 0);
    rxLabel.scale.multiplyScalar(0.7);
    scene.add(rxLabel);

    // side arm from the receiver to the NaOH scrubber
    const SX = 1.55;
    pipe([V(RX + 0.03, RY + RR + 0.06, 0), V(RX + 0.2, 0.5, 0), V(SX - 0.1, 0.52, 0.05), V(SX, 0.42, 0.05), V(SX, 0.08, 0.05)], 0.012);
    const scrub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 28, 1, true), glass);
    scrub.position.set(SX, 0.21, 0.05);
    const scrubLiq = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.26, 28), new THREE.MeshStandardMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.3, depthWrite: false }));
    scrubLiq.position.set(SX, 0.13, 0.05);
    const scrubLabel = textSprite('NaOH scrubber');
    scrubLabel.position.set(SX, 0.6, 0.05);
    scrubLabel.scale.multiplyScalar(0.7);
    scene.add(scrub, scrubLiq, scrubLabel);
    const MAXB = 50;
    const bubMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshPhysicalMaterial({ color: 0xf2ffd0, transparent: true, opacity: 0.6, roughness: 0 }), MAXB);
    bubMesh.frustumCulled = false;
    scene.add(bubMesh);
    const bubs = Array.from({ length: MAXB }, () => ({ life: 0, p: new THREE.Vector3(), v: 0 }));

    // white smoke puffs (TiCl₄ fuming in moist air, the hydrolysis burst, NH₄Cl from the ammonia rod)
    const smoke = Array.from({ length: 40 }, () => {   // a little grey, so the fumes show against the pale hood wall
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xaab2bc, transparent: true, opacity: 0, depthWrite: false }));
      s.visible = false; scene.add(s);
      return { s, life: 0, max: 1, v: new THREE.Vector3(), o: 0.3, g: 0.02 };
    });
    const puff = (at, { n = 1, o = 0.3, spread = 0.015, up = 0.08, life = 2.2, size = 0.03 } = {}) => {
      for (let i = 0; i < n; i++) {
        const p = smoke.find(p => p.life <= 0);
        if (!p) return;
        p.life = p.max = life * rnd(0.7, 1.2); p.o = o; p.g = size;
        p.s.position.set(at.x + rnd(-spread, spread), at.y, at.z + rnd(-spread, spread));
        p.v.set(rnd(-0.02, 0.02), up * rnd(0.7, 1.3), rnd(-0.02, 0.02));
        p.s.visible = true;
      }
    };

    // ---- test station: a test tube of the product -------------------------
    const TX = 0.3, TZ = 0.95, TT_R = 0.055, TT_BOT = 0.1, TT_TOP = 0.46, LIQ_TOP = 0.19;
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.8 });
    const stand = [new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.16), rackMat), new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.16), rackMat)];
    stand[0].position.set(TX, 0.01, TZ); stand[1].position.set(TX, 0.3, TZ);
    const standLegs = [-0.12, 0.12].map(dx => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.16), rackMat); l.position.set(TX + dx, 0.15, TZ); return l; });
    scene.add(...stand, ...standLegs);
    const ttWall = new THREE.Mesh(new THREE.CylinderGeometry(TT_R, TT_R, TT_TOP - TT_BOT, 24, 1, true), glass);
    ttWall.position.set(TX, (TT_TOP + TT_BOT) / 2, TZ);
    const ttBot = new THREE.Mesh(new THREE.SphereGeometry(TT_R, 24, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), glass);
    ttBot.position.set(TX, TT_BOT, TZ);
    scene.add(ttWall, ttBot);
    const liquid = liquidColumn(scene, { x: TX, z: TZ, r: TT_R * 0.9, bottom: TT_BOT - TT_R * 0.6, top: LIQ_TOP });
    const MOUTH = V(TX, TT_TOP + 0.01, TZ);

    // ---- simulation ---------------------------------------------------------
    const sim = {};
    let sampled = false;
    const rg = { water: 0, agno3: 0, h2o2: 0, nh3: 0 };   // when each reagent went into the test tube (s)
    function reset() {
      Object.assign(sim, { t: 0, T: 25, x: 0, y: 0, bubAcc: 0, fumeAcc: 0 });
      sampled = false;
      Object.assign(rg, { water: 0, agno3: 0, h2o2: 0, nh3: 0 });
      kit.setEnabled(false);
      paintTube();
    }
    function paintTube() {
      liquid.mesh.visible = sampled;
      if (!sampled) { liquid.setSediment(0, 0xffffff); return; }
      // neat TiCl₄: colourless, tinged pale yellow by dissolved Cl₂ → hydrolysed: milky → with H₂O₂: orange
      const c = new THREE.Color(rg.h2o2 && rg.water ? 0xf0a020 : rg.water ? 0xf4f4ee : 0xfff6cc);
      liquid.mat.color.copy(c);
      liquid.mat.opacity = rg.h2o2 && rg.water ? 0.85 : rg.water ? 0.7 : 0.28;
      liquid.setSediment(rg.agno3 && rg.water ? 0.03 : 0, 0xffffff);
    }

    const kit = createToolkit({
      scene, camera, controls, dom, container: $('testKit'), toolScale: 1.4, toastSide: 'right',
      lockedText: 'The testing kit unlocks when all the titanium has reacted.',
      intro: 'Identify the liquid in the receiver. First transfer a sample to the test tube on the bench (marked with a ring). While you drag a tool, the places it can be used light up green. <b>Neat TiCl₄ reacts violently with water</b>: the water test comes before the tests on the solution.',
      onSkip: () => { Object.assign(sim, { T: 600, x: 1, y: 1, t: Math.max(sim.t, 30) }); $('tiCl2').checked = true; },
    });
    kit.extra.innerHTML = '<button class="kit-btn" id="tiSample">🧪 Transfer 1 mL of the product to the test tube (dry syringe)</button>';
    $('tiSample').onclick = () => {
      if (sampled) return;
      sampled = true;
      paintTube();
      kit.log('About 1 mL of the product is drawn into a dry syringe and put into the test tube. It is a <b>colourless, dense liquid</b> (tinged pale yellow by a little dissolved Cl₂), and it <b>fumes</b> as soon as it meets the air.');
    };
    kit.addContainer({ x: TX, z: TZ, r: TT_R, top: TT_TOP });
    const col = { x: TX, z: TZ, y0: 0, y1: 1.0, r: 0.14 };
    kit.addZone('liq', p => sampled && Math.hypot(p.x - TX, p.z - TZ) < TT_R && p.y < LIQ_TOP + 0.01, col,
      { at: V(TX, TT_TOP + 0.02, TZ), r: 0.07, text: 'TiCl₄ sample', when: () => sampled });
    kit.addZone('mouth', p => sampled && Math.hypot(p.x - TX, p.z - TZ) < 0.1 && p.y >= TT_TOP - 0.02 && p.y < TT_TOP + 0.3, col);
    kit.addZone('inTube', p => sampled && Math.hypot(p.x - TX, p.z - TZ) < TT_R && p.y >= LIQ_TOP + 0.01 && p.y < TT_TOP - 0.02);

    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.12), rackMat);
    rack.position.set(1.25, 0.03, 1.05);
    scene.add(rack);
    const sw = c => `<span class="sw" style="background:#${new THREE.Color(c).getHexString()}"></span>`;
    const now = () => performance.now() / 1000;
    const needWater = name => kit.log(`${name} is a water-based solution, and the neat liquid would just react with its water. Run the <b>water test</b> first, then test the solution it makes.`);

    { // 1. glass rod dipped in concentrated ammonia
      const g = new THREE.Group();
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 10), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.55 }));
      const wet = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.7 }));
      wet.position.y = -0.15;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.04, 10), new THREE.MeshStandardMaterial({ color: 0x2f6fd6 }));
      cap.position.y = 0.14;
      g.add(rod, wet, cap);
      let smoked = 0;
      kit.addTool({
        name: 'Glass rod dipped in conc. ammonia', hint: 'hold it just above the mouth of the test tube', targets: ['mouth'],
        obj: g, tip: V(0, -0.15, 0), home: V(0.85, 0.2, 1.05),
        onEnter(z) {
          if (z !== 'mouth') return;
          rg.nh3 = now();
          puff(MOUTH.clone().setY(TT_TOP + 0.06), { n: 14, o: 0.55, spread: 0.04, up: 0.05, life: 3, size: 0.05 });
          if (now() - smoked > 8) kit.log(`Over the tube the ammonia makes <b>dense white smoke</b> ${sw(0xffffff)}. TiCl₄ fumes because it reacts with moisture in the air and gives off <b>HCl</b> gas; HCl meets NH₃ and forms a cloud of tiny ammonium chloride crystals: NH₃ + HCl → NH₄Cl(s). A liquid that does this on its own in air is a reactive covalent chloride.`);
          smoked = now();
        },
      });
    }
    { // 2. dropper of distilled water
      const dr = dropper(0xdff1ff, 0x5a6b7d);
      kit.addTool({
        name: 'Distilled water', hint: 'add a drop into the test tube', targets: ['mouth', 'inTube', 'liq'],
        obj: dr.obj, tip: dr.tip, home: V(1.05, 0.2, 1.05),
        onEnter(z, t, at) {
          kit.drop(at, LIQ_TOP, 0xdff1ff, () => {
            if (rg.water) { kit.log('More water: the cloudy, strongly acidic solution just gets a little more dilute.'); return; }
            rg.water = now();
            paintTube();
            puff(MOUTH, { n: 24, o: 0.6, spread: 0.03, up: 0.14, life: 3, size: 0.05 });
            kit.log(`The drop of water <b>hisses violently</b>, the tube gets hot, and a burst of <b>white fumes</b> pours out. A <b>white solid</b> appears and the liquid turns milky ${sw(0xf4f4ee)}. This is hydrolysis: TiCl₄ + 2 H₂O → TiO₂ + 4 HCl. Titanium(IV) has empty 3d orbitals and a high charge, so water molecules attack it at once. Ionic chlorides like NaCl simply dissolve; this violent reaction is the mark of a covalent metal chloride such as TiCl₄.`);
          });
        },
      });
    }
    { // 3. universal indicator paper
      const st = strip(0xf4f1e6, 0xf2b84b);
      kit.addTool({
        name: 'Universal indicator paper', hint: 'dip the pad into the solution after the water test', targets: ['liq'],
        obj: st.obj, tip: st.tip, home: V(1.25, 0.22, 1.05),
        reset: () => st.pad.material.color.set(0xf2b84b),
        onEnter(z) {
          if (z !== 'liq') return;
          if (!rg.water) {
            st.pad.material.color.set(0x7a5a3a);
            kit.log('The neat liquid <b>fumes on the paper and scorches it</b> brown: it is reacting with the water in the paper. Add water to the tube first to get a proper pH reading.');
            return;
          }
          const c = universalColor(0.5);
          st.pad.material.color.copy(c);
          kit.showPH(1);
          kit.log(`Indicator paper ${sw(c)} turns <b>deep red</b>: pH ≈ 0–1, a <b>strong acid</b>. The hydrolysis released four HCl for every TiCl₄, so 1 mL of TiCl₄ in a few mL of water gives hydrochloric acid of several mol/L.`);
        },
      });
    }
    { // 4. silver nitrate
      const dr = dropper(0xf4f4f4, 0x6b6b6b);
      kit.addTool({
        name: 'Silver nitrate solution (AgNO₃, 0.1 M)', hint: 'add a drop after the water test', targets: ['mouth', 'inTube', 'liq'],
        obj: dr.obj, tip: dr.tip, home: V(1.45, 0.2, 1.05),
        onEnter(z, t, at) {
          if (!rg.water) { needWater('Silver nitrate'); return; }
          kit.drop(at, LIQ_TOP, 0xf4f4f4, () => {
            if (rg.agno3) return;
            rg.agno3 = now();
            paintTube();
            kit.log(`A thick, <b>white, curdy precipitate</b> ${sw(0xffffff)} forms at once and settles: silver chloride, Ag⁺ + Cl⁻ → AgCl(s). It would darken to grey-violet in sunlight. The product contains <b>chloride</b>.`);
          });
        },
      });
    }
    { // 5. hydrogen peroxide (the classic test for titanium(IV))
      const dr = dropper(0xeaf6ff, 0xe0a030);
      kit.addTool({
        name: 'Hydrogen peroxide (H₂O₂, 3 %)', hint: 'add a drop after the water test', targets: ['mouth', 'inTube', 'liq'],
        obj: dr.obj, tip: dr.tip, home: V(1.65, 0.2, 1.05),
        onEnter(z, t, at) {
          if (!rg.water) { needWater('Hydrogen peroxide'); return; }
          kit.drop(at, LIQ_TOP, 0xeaf6ff, () => {
            if (rg.h2o2) return;
            rg.h2o2 = now();
            paintTube();
            kit.log(`The solution turns an intense <b>yellow-orange</b> ${sw(0xf0a020)}. This is the classic test for <b>titanium(IV)</b>: in acid, peroxide binds to Ti⁴⁺ as a peroxo complex, [Ti(O₂)(OH)(H₂O)ₓ]⁺, which absorbs blue light strongly. Together with the chloride test, the white fumes and the violent hydrolysis, this identifies the liquid as <b>titanium tetrachloride, TiCl₄</b>.`);
          });
        },
      });
    }

    // ---- update ------------------------------------------------------------
    const tmpM = new THREE.Matrix4(), tmpS = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
    const COOL = new THREE.Color(0x000000), HOT = new THREE.Color(0xff7a20);
    function update(dt, time) {
      const s = sim;
      s.t += dt;
      const heat = $('tiHeat').checked, flow = $('tiCl2').checked;
      const burning = flow && s.T > 300 && s.x < 1;
      // the Bunsen heats the boat to ~550 °C; once titanium ignites in Cl₂ its own heat keeps it glowing
      const target = (heat ? 550 : 25) + (burning ? 450 : 0);
      s.T += (target - s.T) * Math.min(1, dt * (burning ? 0.6 : 0.3));
      const rate = burning ? 0.065 * Math.pow(Math.max(0, 1 - s.x), 2 / 3) + 0.004 : 0;   // ≈ 20 s
      s.x = Math.min(1, s.x + rate * dt);
      if (s.x > 0.998) s.x = 1;
      s.y += (s.x - s.y) * Math.min(1, dt * 0.8);   // TiCl₄ vapour takes a moment to reach the receiver
      if (s.x === 1 && s.x - s.y < 0.002) s.y = 1;

      burner.group.visible = heat;
      burner.update(dt, time);
      const glow = s.x >= 1 ? 0 : burning ? Math.min(1, (s.T - 300) / 500) : Math.max(0, (s.T - 400) / 600);
      tiMat.emissive.lerpColors(COOL, HOT, glow);
      burnLight.intensity = glow * 2.5 * (0.85 + 0.15 * Math.sin(time * 19));
      const nT = Math.ceil((1 - s.x) * MAXT);
      turnData.forEach((d, i) => {
        tmpS.setScalar(i < nT ? d.s * (i === nT - 1 ? ((1 - s.x) * MAXT) % 1 || 1 : 1) : 0);
        turnings.setMatrixAt(i, tmpM.compose(d.p, d.q, tmpS));
      });
      turnings.instanceMatrix.needsUpdate = true;
      // Cl₂ colour: upstream whenever it flows; downstream only when it is not all being used up
      gasUp.material.opacity = flow ? 0.22 : Math.max(0, gasUp.material.opacity - dt * 0.2);
      gasDown.material.opacity = flow && !burning ? 0.2 : flow ? 0.04 : Math.max(0, gasDown.material.opacity - dt * 0.2);

      // receiver liquid level (≈ 0.55 mL from 0.24 g Ti)
      prod.visible = s.y > 0.01;
      prod.scale.set(1, 0.25 + 0.75 * s.y, 1);

      // scrubber bubbles: excess Cl₂ when it is not being consumed
      s.bubAcc += (flow ? (burning ? 2 : 7) : 0) * dt;
      while (s.bubAcc > 1) {
        s.bubAcc--;
        const b = bubs.find(b => b.life <= 0);
        if (!b) break;
        b.life = 2; b.v = rnd(0.2, 0.35); b.p.set(SX + rnd(-0.02, 0.02), 0.03, 0.05 + rnd(-0.02, 0.02));
      }
      bubs.forEach((b, i) => {
        if (b.life > 0) { b.life -= dt; b.p.y += b.v * dt; b.p.x += Math.sin(time * 9 + i) * 0.002; if (b.p.y > 0.26) b.life = 0; }
        tmpS.setScalar(b.life > 0 ? 0.01 : 0);
        bubMesh.setMatrixAt(i, tmpM.compose(b.p, tmpQ, tmpS));
      });
      bubMesh.instanceMatrix.needsUpdate = true;

      // test tube: steady wisps of fumes from neat TiCl₄; smoke particles drift up and fade
      ttWall.visible = ttBot.visible = stand[0].visible = kit.enabled;
      stand[1].visible = standLegs[0].visible = standLegs[1].visible = kit.enabled;
      if (sampled && !rg.water) { s.fumeAcc += dt * 2.5; while (s.fumeAcc > 1) { s.fumeAcc--; puff(MOUTH, { o: 0.22, up: 0.06, size: 0.025 }); } }
      for (const p of smoke) {
        if (p.life <= 0) { p.s.visible = false; continue; }
        p.life -= dt;
        p.s.position.addScaledVector(p.v, dt);
        const k = 1 - p.life / p.max;
        p.s.scale.setScalar(p.g * (1 + 2.5 * k));
        p.s.material.opacity = p.o * Math.min(1, k * 5) * (1 - k);
      }

      // readouts
      const status = s.x >= 1 ? (s.y >= 1 ? 'Complete: all Ti converted to TiCl₄' : 'Last TiCl₄ distilling over…')
        : burning ? 'Burning: Ti + 2 Cl₂ → TiCl₄'
        : flow && heat ? 'Heating: Ti ignites at ≈ 300 °C'
        : heat ? 'Hot: turn on the Cl₂ flow' : flow ? 'Cl₂ flowing over cold Ti: no reaction' : 'Burner off';
      $('mStatus').textContent = status;
      $('mTime').textContent = s.t.toFixed(1) + ' s';
      $('mTemp').textContent = Math.round(s.T) + ' °C';
      $('mFlow').textContent = flow ? '50 mL/min' : '0 mL/min';
      $('mTi').textContent = ((1 - s.x) * 100).toFixed(1) + ' %';
      const mg = s.y * MMOL_TI * M_TICL4;
      $('mTiCl4').textContent = `${Math.round(mg)} mg (${(mg / 1000 / RHO_TICL4).toFixed(2)} mL)`;
      $('mBar').style.width = s.x * 100 + '%';

      if (!kit.enabled && s.y >= 1) kit.setEnabled(true);
      kit.update(time);
    }
    return { reset, update };
  },
};

export default {
  ui: {
    title: 'Titanium Tetrachloride',
    heading: 'Ti + Cl₂ at the electron level',
    equation: 'Ti + 2 Cl₂ → TiCl₄',
    routeTitle: 'Where do titanium\'s 4 valence electrons go?',
    route: [
      'Ti 3d² 4s² (outer shell)',
      'The 4s cloud leans toward the first Cl₂',
      '4s² pair → σ*(Cl–Cl): the first Cl₂ breaks',
      'Two Ti–Cl bonds; 3d² pair → σ* of the second Cl₂',
      'Four polar Ti–Cl σ bonds: tetrahedral TiCl₄ (Ti⁴⁺, d⁰)',
    ],
    foot: 'The model: approximate |ψ|² shapes. The Ti 4s is a hydrogen-like s shell, the Ti 3d one representative d orbital (3d<sub>z²</sub>), and bonds and lone pairs are Gaussian lobes, morphing smoothly between stages. Real titanium metal reacts at its surface, not one atom at a time, and the step-by-step electron transfer shown here is a simplified picture of how the four Ti–Cl bonds form. Industrially TiCl₄ is made from the ore, TiO₂ + 2 C + 2 Cl₂ → TiCl₄ + 2 CO at about 1000 °C, and purified by distillation; it is then reduced with magnesium to make titanium metal (the Kroll process), or burned in oxygen to make the white pigment TiO₂.',
    macro: {
      title: 'What you\'d actually see',
      sub: 'Direct chlorination: 0.24 g of titanium turnings in a porcelain boat, inside a glass combustion tube, heated with a Bunsen burner in a slow stream of dry chlorine. The TiCl₄ vapour condenses in an ice-cooled receiver, and excess Cl₂ is absorbed by NaOH. Fume hood essential: Cl₂ is toxic and TiCl₄ fumes HCl in moist air.',
      observations: `• The tube fills with <b style="color:#c8e04a">yellow-green</b> chlorine gas.<br>
        • At about 300 °C the titanium <b style="color:#ffa040">ignites</b> and glows orange-hot as it burns in the chlorine: the reaction is strongly exothermic (−804 kJ/mol).<br>
        • Past the boat the chlorine colour fades, because it is being used up; the product leaves as a colourless vapour (TiCl₄ boils at 136 °C).<br>
        • A <b>colourless, dense, fuming liquid</b> collects in the ice-cooled receiver, slightly yellow from dissolved Cl₂.`,
      controls: `<label><input type="checkbox" id="tiHeat" checked>Bunsen burner on</label>
        <label><input type="checkbox" id="tiCl2">Dry Cl₂ flow on (50 mL/min)</label><div id="testKit"></div>`,
      measurements: [
        ['mStatus', 'Status', 'Heating…'],
        ['mTime', 'Elapsed time', '0 s'],
        ['mTemp', 'Boat temperature', '25 °C'],
        ['mFlow', 'Cl₂ flow', '0 mL/min'],
        ['mTi', 'Titanium remaining', '100 %'],
        ['mTiCl4', 'TiCl₄ collected', '0 mg'],
      ],
      foot: 'Timings are compressed: chlorinating titanium turnings takes several minutes. The apparatus must be completely dry, because any water in it would hydrolyse the TiCl₄ to TiO₂ and HCl.',
    },
  },
  atomic,
  macro,
};
