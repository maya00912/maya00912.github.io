// Benzyne formation: benzenediazonium-2-carboxylate → C₆H₄ (o-benzyne) + CO₂ + N₂
import { V, deg, prim, along } from './reaction-engine.js';
import { createToolkit, strip } from './lab-tools.js';
import { buildLab } from './lab-room.js';

// ---------------------------------------------------------------------------
// Atomic view (not mirror-symmetric: the whole molecule is built each stage).
// Ring in the xy plane; C1–C2 on top. C1 carries CO₂⁻, C2 carries N₂⁺.
// ---------------------------------------------------------------------------
const X = V(1, 0, 0), Y = V(0, 1, 0), Z = V(0, 0, 1);
const R6 = 1.39;
const ANG = [120, 60, 0, -60, -120, 180].map(a => a * deg);   // C1…C6
const radial = i => V(Math.cos(ANG[i]), Math.sin(ANG[i]), 0);
const rot = (v, a) => V(v.x * Math.cos(a) - v.y * Math.sin(a), v.x * Math.sin(a) + v.y * Math.cos(a), 0);

// c1c7: C1–C(carboxyl) length; c2n: C2–N length; co2Out / n2Out: how far the leaving groups have
// drifted away; linear: 0 bent carboxylate → 1 linear CO₂; bz: 0 benzene ring → 1 benzyne (C1–C2 1.24 Å)
function geo({ c1c7 = 1.5, c2n = 1.4, co2Out = 0, n2Out = 0, linear = 0, bz = 0 }) {
  const C = ANG.map((a, i) => V(R6 * Math.cos(a), R6 * Math.sin(a), 0));
  C[0].x += 0.075 * bz; C[1].x -= 0.075 * bz;          // 1.39 → 1.24 Å
  const a = { C1: C[0], C2: C[1], C3: C[2], C4: C[3], C5: C[4], C6: C[5] };
  for (const i of [2, 3, 4, 5]) a['H' + (i + 1)] = along(C[i], radial(i), 1.08);
  const r1 = radial(0), r2 = radial(1);
  a.C7 = along(C[0], r1, c1c7 + co2Out);
  const oa = (62.5 + 27.5 * linear) * deg, ol = 1.25 - 0.09 * linear;
  a.O1 = along(a.C7, rot(r1, oa), ol);
  a.O2 = along(a.C7, rot(r1, -oa), ol);
  a.Na = along(C[1], r2, c2n + n2Out);
  a.Nb = along(a.Na, r2, 1.10);
  return a;
}

const bond = (A, B, f = 0.5, sPar = 0.32, sPerp = 0.15) => prim(A.clone().lerp(B, f), B.clone().sub(A), 'gauss', sPar, sPerp);
// σ framework: six ring C–C bonds and four C–H bonds
const sigmaFrame = a => {
  const ring = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
  return [
    ...ring.map((k, i) => bond(a[k], a[ring[(i + 1) % 6]], 0.5, 0.34, 0.15)),
    ...[3, 4, 5, 6].map(i => bond(a['C' + i], a['H' + i], 0.55, 0.28, 0.13)),
  ];
};
// aromatic π sextet drawn in the Kekulé structure: three π bonds (C1=C2, C3=C4, C5=C6),
// each a pair of lobes above and below the bond made from overlapping 2p_z orbitals
const piSystem = a => [['C1', 'C2'], ['C3', 'C4'], ['C5', 'C6']].flatMap(([p, q]) => {
  const mid = a[p].clone().lerp(a[q], 0.5), d = a[q].clone().sub(a[p]);
  return [prim(along(mid, Z, 0.4), d, 'gauss', 0.5, 0.22), prim(along(mid, Z, -0.4), d, 'gauss', 0.5, 0.22)];
});
// bond orders for the stick model (Kekulé: C1=C2, C3=C4, C5=C6)
const ringBonds = (c12 = 2) => [
  ['C1', 'C2', c12], ['C2', 'C3', 1], ['C3', 'C4', 2], ['C4', 'C5', 1], ['C5', 'C6', 2], ['C6', 'C1', 1],
  ['C3', 'H3', 1], ['C4', 'H4', 1], ['C5', 'H5', 1], ['C6', 'H6', 1],
];
// carboxylate / CO₂: oxygen lone pairs + C–O bonds
const co2Cloud = a => [
  prim(a.O1, X, 'gauss', 0.36, 0.36, 2), prim(a.O2, X, 'gauss', 0.36, 0.36, 2),
  bond(a.C7, a.O1, 0.5, 0.3, 0.2), bond(a.C7, a.O2, 0.5, 0.3, 0.2),
];
// diazonium / N₂: N≡N triple bond + lone pair on the outer N
const n2Cloud = a => {
  const d = a.Nb.clone().sub(a.Na).normalize();
  return [prim(a.Na.clone().lerp(a.Nb, 0.5), d, 'gauss', 0.32, 0.3, 3), prim(along(a.Nb, d, 0.34), d, 'gauss', 0.26, 0.2, 1)];
};
// in-plane sp² lone pair on C1 (aryl anion)
const c1LonePair = a => [prim(along(a.C1, radial(0), 0.42), radial(0), 'gauss', 0.3, 0.22)];
// benzyne's third bond: in-plane overlap of the sp² orbitals on C1 and C2, outside the ring
const inPlanePi = a => [
  prim(along(a.C1, radial(0), 0.3), radial(0), 'gauss', 0.26, 0.22, 0.35),
  prim(along(a.C2, radial(1), 0.3), radial(1), 'gauss', 0.26, 0.22, 0.35),
  prim(a.C1.clone().lerp(a.C2, 0.5).addScaledVector(Y, 0.36), X, 'gauss', 0.42, 0.18, 0.3),
];
// the old C2–N bond pair, now the lone pair on the N that was attached to the ring
const nLonePair = a => {
  const d = a.Na.clone().sub(a.Nb).normalize();
  return [prim(along(a.Na, d, 0.34), d, 'gauss', 0.26, 0.2)];
};

const base = { C1: 'C', C2: 'C', C3: 'C', C4: 'C', C5: 'C', C6: 'C', H3: 'H', H4: 'H', H5: 'H', H6: 'H', C7: 'C', O1: 'O', O2: 'O⁻', Na: 'N⁺', Nb: 'N' };
const L = (over = {}) => ({ ...base, ...over });

const atomic = {
  mirror: false,
  camera: { pos: V(0, -6.5, 11.5), target: V(0, 2.2, 0) },
  atoms: {
    C1: [0.11, 0xb0b6c0], C2: [0.11, 0xb0b6c0], C3: [0.11, 0xb0b6c0], C4: [0.11, 0xb0b6c0], C5: [0.11, 0xb0b6c0], C6: [0.11, 0xb0b6c0],
    H3: [0.07, 0xffffff], H4: [0.07, 0xffffff], H5: [0.07, 0xffffff], H6: [0.07, 0xffffff],
    C7: [0.11, 0xb0b6c0], O1: [0.12, 0xff4a4a], O2: [0.12, 0xff4a4a], Na: [0.12, 0x5f8dff], Nb: [0.12, 0x5f8dff],
  },
  // [σ framework, π sextet, C1–CO₂ bond pair, C2–N bond pair, CO₂ electrons, N₂ electrons]
  clouds: [
    { dots: 14000, group: 0, color: 0x4fb3ff, gain: 0.45 },
    { dots: 8000, group: 1, color: 0x5fd068, gain: 0.8 },
    { dots: 4500, group: 2, color: 0xffb347 },
    { dots: 4500, group: 2, color: 0xff5fd2 },
    { dots: 7000, group: 3, color: 0x9d7bff, gain: 0.6 },
    { dots: 5000, group: 3, color: 0x3fe0b0, gain: 0.7 },
  ],
  groups: [
    { label: 'Ring σ framework (C–C, C–H bonds)', color: '#4fb3ff' },
    { label: 'Aromatic π sextet: 3 π bonds C1=C2, C3=C4, C5=C6', color: '#5fd068' },
    { label: 'Bonds that break and form:', items: [
      { label: 'C1–CO₂⁻ bond pair → benzyne\'s third bond', color: '#ffb347' },
      { label: 'C2–N₂⁺ bond pair → leaves with N₂', color: '#ff5fd2' },
    ] },
    { label: 'Leaving groups:', items: [
      { label: 'CO₂ electrons', color: '#9d7bff' },
      { label: 'N₂ electrons', color: '#3fe0b0' },
    ] },
  ],
  stages: [
    {
      title: '1 · The precursor',
      desc: 'Benzenediazonium-2-carboxylate is a zwitterion with CO₂⁻ on C1 and N≡N⁺ on C2, next to each other on a benzene ring. It is made from anthranilic acid (2-aminobenzoic acid) and a nitrite ester. The ring is drawn in its Kekulé form with alternating double bonds C1=C2, C3=C4 and C5=C6. Each green cloud pair above and below the ring is one π bond, made from 2p_z orbitals. Together they are the aromatic sextet. In reality these 6 electrons are spread evenly around the ring. The two bonds to watch are C1–CO₂⁻ (orange) and C2–N₂⁺ (magenta).',
      hold: 2.5, trans: 3.5, route: 0, labels: L(),
      bonds: [...ringBonds(2), ['C1', 'C7', 1], ['C7', 'O1', 2], ['C7', 'O2', 1], ['C2', 'Na', 1], ['Na', 'Nb', 3]],
      build() {
        const a = geo({});
        return { a, clouds: [sigmaFrame(a), piSystem(a), [bond(a.C1, a.C7, 0.45)], [bond(a.C2, a.Na, 0.42)], co2Cloud(a), n2Cloud(a)] };
      },
    },
    {
      title: '2 · Warming: the two bonds weaken',
      desc: 'On gentle heating the molecule wants to lose two very stable small molecules, CO₂ and N₂. That makes it a powerful (and shock-sensitive) source of benzyne. The C1–C bond stretches with its electron pair staying close to C1, and the C2–N bond stretches with its pair shifting toward nitrogen.',
      hold: 2.5, trans: 3.5, route: 1, labels: L(),
      bonds: [...ringBonds(2), ['C1', 'C7', 0.5], ['C7', 'O1', 2], ['C7', 'O2', 1], ['C2', 'Na', 0.5], ['Na', 'Nb', 3]],
      build() {
        const a = geo({ c1c7: 1.75, c2n: 1.62 });
        return { a, clouds: [sigmaFrame(a), piSystem(a), [bond(a.C1, a.C7, 0.32)], [bond(a.C2, a.Na, 0.62)], co2Cloud(a), n2Cloud(a)] };
      },
    },
    {
      title: '3 · CO₂ leaves',
      desc: 'Carbon dioxide breaks away and straightens out to linear O=C=O. The C1–C bond pair (orange) stays behind on C1 as an in-plane sp² lone pair, so C1 is now an aryl carbanion (C⁻). That pair sits in the plane of the ring, at right angles to the aromatic π system, so it does not disturb the sextet.',
      hold: 2.5, trans: 3.5, route: 2, labels: L({ C1: 'C⁻', O2: 'O' }),
      bonds: [...ringBonds(2), ['C7', 'O1', 2], ['C7', 'O2', 2], ['C2', 'Na', 0.5], ['Na', 'Nb', 3]],
      build() {
        const a = geo({ c1c7: 1.5, co2Out: 2.4, linear: 1, c2n: 1.62 });
        return { a, clouds: [sigmaFrame(a), piSystem(a), c1LonePair(a), [bond(a.C2, a.Na, 0.62)], co2Cloud(a), n2Cloud(a)] };
      },
    },
    {
      title: '4 · N₂ leaves: the third bond forms',
      desc: 'Nitrogen leaves and takes the C2–N bond pair with it as its lone pair (magenta), leaving an empty in-plane sp² orbital on C2. The lone pair on C1 swings over into that empty orbital, and the two in-plane sp² orbitals overlap side-on. That overlap is benzyne\'s third bond. C1=C2 becomes C1≡C2 (σ + π + in-plane π) and shortens from 1.39 to about 1.24 Å.',
      hold: 2.5, trans: 4, route: 3, labels: L({ O2: 'O', Na: 'N' }),
      bonds: [...ringBonds(3), ['C7', 'O1', 2], ['C7', 'O2', 2], ['Na', 'Nb', 3]],
      build() {
        const a = geo({ c1c7: 1.5, co2Out: 3.4, linear: 1, c2n: 1.4, n2Out: 2.4, bz: 1 });
        return { a, clouds: [sigmaFrame(a), piSystem(a), inPlanePi(a), nLonePair(a), co2Cloud(a), n2Cloud(a)] };
      },
    },
    {
      title: '5 · o-Benzyne (C₆H₄)',
      desc: 'Benzyne in its Kekulé form: a C1≡C2 triple bond plus two ring double bonds, C3=C4 and C5=C6, with single bonds between. The three green π bonds are still the aromatic sextet, and the orange in-plane overlap is the extra, weak and strained third bond. The extra bond is not a normal π bond: the two sp² lobes point about 60° away from each other, so they overlap poorly. Its empty partner orbital (LUMO) sits very low, which makes benzyne an aggressive electrophile and dienophile. It lives for well under a second in solution. It cannot be bottled, so chemists make it in the presence of a trap: furan, anthracene or tetraphenylcyclopentadienone (see the naked-eye view).',
      hold: 6, trans: 0, route: 4, labels: L({ O2: 'O', Na: 'N' }),
      bonds: [...ringBonds(3), ['C7', 'O1', 2], ['C7', 'O2', 2], ['Na', 'Nb', 3]],
      build() {
        const a = geo({ c1c7: 1.5, co2Out: 4.4, linear: 1, c2n: 1.4, n2Out: 3.6, bz: 1 });
        return { a, clouds: [sigmaFrame(a), piSystem(a), inPlanePi(a), nLonePair(a), co2Cloud(a), n2Cloud(a)] };
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Naked-eye view: generate benzyne under reflux and trap it with tetracyclone
// (anthranilic acid + isoamyl nitrite → [benzenediazonium-2-carboxylate] → benzyne
//  + tetraphenylcyclopentadienone → 1,2,3,4-tetraphenylnaphthalene + CO)
// ---------------------------------------------------------------------------
const MMOL_TC = 1.30;   // 0.50 g tetraphenylcyclopentadienone (deep purple)
const MMOL_AA = 1.53;   // 0.21 g anthranilic acid (benzyne source, slight excess)
const M_PRODUCT = 432.6;

const macro = {
  camera: { pos: V(1.9, 2.5, 5.8), target: V(0.15, 1.2, 0), maxDist: 16 },
  setup({ THREE, scene, camera, controls, dom, $ }) {
    const rnd = (a, b) => a + Math.random() * (b - a);
    const FLASK_Y = 0.52, FLASK_R = 0.4, LIQ_Y = FLASK_Y + 0.04;   // liquid surface height
    const TAP = new THREE.Vector3(0.16, 2.36, 0.15);              // gas-sampling tap outlet

    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.18,
      clearcoat: 1, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false,
    });
    const steel = new THREE.MeshStandardMaterial({ color: 0x8c9099, metalness: 0.85, roughness: 0.35 });
    const tube = (r, h, x, y, z, rx = 0, rz = 0) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24, 1, true), glass);
      m.position.set(x, y, z); m.rotation.set(rx, 0, rz);
      scene.add(m);
      return m;
    };

    // bench, stand, heating mantle
    buildLab(scene, { u: 8, hood: { x: 0, w: 1.4, sash: 0.5 } }); // CO and solvent vapours → fume hood
    const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.5), new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.6 }));
    standBase.position.set(-0.75, 0.025, -0.1);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.8, 16), steel);
    rod.position.set(-0.75, 1.4, -0.1);
    const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.035, 0.035), steel); arm1.position.set(-0.38, 1.0, -0.05);
    const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.035, 0.035), steel); arm2.position.set(-0.38, 1.75, -0.05);
    const mantleMat = new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 0.7, emissive: 0x000000 });
    const mantle = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.44, 0.26, 40), mantleMat);
    mantle.position.y = 0.13;
    const mantleTopMat = new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.9, emissive: 0x000000 });
    const mantleTop = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.47, 40), mantleTopMat);
    mantleTop.rotation.x = -Math.PI / 2; mantleTop.position.y = 0.262;
    scene.add(standBase, rod, arm1, arm2, mantle, mantleTop);

    // round-bottom flask, condenser, gas syringe
    const flask = new THREE.Mesh(new THREE.SphereGeometry(FLASK_R, 40, 24), glass);
    flask.position.y = FLASK_Y;
    scene.add(flask);
    tube(0.07, 0.3, 0, FLASK_Y + FLASK_R + 0.1, 0);                 // neck
    const jacket = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.0, 28, 1, true),
      new THREE.MeshPhysicalMaterial({ color: 0xbfe3ff, roughness: 0.05, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    jacket.position.y = 1.62;
    scene.add(jacket);
    tube(0.04, 1.16, 0, 1.62, 0);                                   // condenser inner tube
    tube(0.025, 0.12, 0.14, 1.25, 0, 0, Math.PI / 2);                // water in
    tube(0.025, 0.12, -0.14, 1.98, 0, 0, Math.PI / 2);               // water out
    tube(0.035, 0.2, 0, 2.26, 0);                                   // adapter up
    tube(0.03, 0.42, 0.21, 2.36, 0, 0, Math.PI / 2);                 // over to the syringe
    // gas-sampling tap: a solid blue stopcock with its nozzle pointing toward the viewer
    const tapMat = new THREE.MeshStandardMaterial({ color: 0x2f6fd6, roughness: 0.35 });
    const tapBody = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 20), tapMat);
    tapBody.position.set(TAP.x, TAP.y, 0);
    const tapNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.16, 16), tapMat);
    tapNozzle.rotation.x = Math.PI / 2;
    tapNozzle.position.set(TAP.x, TAP.y, 0.09);
    const tapKey = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.035), new THREE.MeshStandardMaterial({ color: 0x1d4fa8, roughness: 0.4 }));
    tapKey.position.set(TAP.x, TAP.y + 0.07, 0);
    scene.add(tapBody, tapNozzle, tapKey);
    const barrel = tube(0.09, 1.0, 0.92, 2.36, 0, 0, Math.PI / 2);   // gas syringe barrel, 150 mL
    const marks = new THREE.Group();
    for (let i = 0; i <= 15; i++) {
      const mk = new THREE.Mesh(new THREE.PlaneGeometry(0.004, i % 5 ? 0.04 : 0.07), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
      mk.position.set(0.47 + i * 0.06, 2.36 + 0.06, 0.09);
      marks.add(mk);
    }
    scene.add(marks);
    const plunger = new THREE.Group();
    const plDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 24), new THREE.MeshStandardMaterial({ color: 0x333840 }));
    plDisc.rotation.z = Math.PI / 2;
    const plRod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 12), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
    plRod.rotation.z = Math.PI / 2; plRod.position.x = 0.5;
    plunger.add(plDisc, plRod);
    plunger.position.set(0.45, 2.36, 0);
    scene.add(plunger);

    // liquid: deep purple tetracyclone in DME → pale yellow-brown
    const liqMat = new THREE.MeshStandardMaterial({ color: 0x4a1466, transparent: true, opacity: 0.88, roughness: 0.15, side: THREE.DoubleSide, depthWrite: false });
    const theta0 = Math.acos((LIQ_Y - FLASK_Y) / (FLASK_R * 0.96));
    const liquid = new THREE.Mesh(new THREE.SphereGeometry(FLASK_R * 0.96, 36, 20, 0, Math.PI * 2, theta0, Math.PI - theta0), liqMat);
    liquid.position.y = FLASK_Y;
    const surf = new THREE.Mesh(new THREE.CircleGeometry(Math.sqrt((FLASK_R * 0.96) ** 2 - (LIQ_Y - FLASK_Y) ** 2), 36), liqMat);
    surf.rotation.x = -Math.PI / 2; surf.position.y = LIQ_Y;
    scene.add(liquid, surf);

    // bubbles in the flask, reflux drips in the condenser, falling nitrite drops
    const MAXB = 260;
    const bubbleMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, roughness: 0 }), MAXB);
    bubbleMesh.frustumCulled = false;
    scene.add(bubbleMesh);
    const bub = Array.from({ length: MAXB }, () => ({ life: 0, p: new THREE.Vector3(), v: 0, r: 0 }));
    const MAXD = 40;
    const dripMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshPhysicalMaterial({ color: 0xf6f0c8, transparent: true, opacity: 0.8, roughness: 0 }), MAXD);
    dripMesh.frustumCulled = false;
    scene.add(dripMesh);
    const drips = Array.from({ length: MAXD }, () => ({ life: 0, p: new THREE.Vector3(), v: 0, kind: 'reflux' }));

    // work-up products: watch glass with crystals; melting-point apparatus
    const watch = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 8, 0, Math.PI * 2, Math.PI * 0.82, Math.PI * 0.18), glass);
    watch.position.set(1.0, 0.405, 0.55); // bottom of the shallow cap rests on the bench
    scene.add(watch);
    const MAXC = 70;
    const crystals = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.35, 0.6), new THREE.MeshStandardMaterial({ color: 0xf3efe2, roughness: 0.5 }), MAXC);
    scene.add(crystals);
    const crystalPos = Array.from({ length: MAXC }, () => {
      const a = rnd(0, 6.3), r = Math.sqrt(Math.random()) * 0.11;
      return { p: new THREE.Vector3(1.0 + Math.cos(a) * r, 0.018 + r * r * 0.9 + rnd(0, 0.01), 0.55 + Math.sin(a) * r), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(0, 3), rnd(0, 3), rnd(0, 3))), s: rnd(0.012, 0.022) };
    });
    const mpBody = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.26), new THREE.MeshStandardMaterial({ color: 0xd9dde3, roughness: 0.5 }));
    mpBody.position.set(-1.15, 0.15, 0.6);
    const mpPort = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    mpPort.position.set(-1.15, 0.305, 0.62);
    const mpCanvas = document.createElement('canvas'); mpCanvas.width = 256; mpCanvas.height = 128;
    const mpCtx = mpCanvas.getContext('2d'), mpTex = new THREE.CanvasTexture(mpCanvas);
    const mpScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.12), new THREE.MeshBasicMaterial({ map: mpTex }));
    mpScreen.position.set(-1.15, 0.17, 0.732);
    scene.add(mpBody, mpPort, mpScreen);
    let mpShown = '';
    const mpLcd = (big, small) => {
      if (mpShown === big + small) return;
      mpShown = big + small;
      mpCtx.fillStyle = '#16242e'; mpCtx.fillRect(0, 0, 256, 128);
      mpCtx.fillStyle = '#7fe0ff'; mpCtx.textAlign = 'center';
      mpCtx.font = 'bold 50px monospace'; mpCtx.fillText(big, 128, 68);
      mpCtx.font = '20px monospace'; mpCtx.fillText(small, 128, 106);
      mpTex.needsUpdate = true;
    };
    mpLcd('25 °C', 'melting point');

    // ---- simulation ---------------------------------------------------------
    const PURPLE = new THREE.Color(0x4a1466), AMBER = new THREE.Color(0xc99a45);
    const sim = {};
    let workedUp = false, mpRun = null;
    function reset() {
      Object.assign(sim, { t: 0, T: 20, add: 0, adding: false, g: 0, p: 0, rate: 0, bubAcc: 0, dripAcc: 0, addAcc: 0 });
      workedUp = false; mpRun = null;
      kit.setEnabled(false);
      mpLcd('25 °C', 'melting point');
    }
    $('bzAdd').onclick = () => { sim.adding = true; };

    // ---- testing kit ---------------------------------------------------------
    const kit = createToolkit({
      scene, camera, controls, dom, container: $('testKit'), phChart: false, toolScale: 1.4, toastSide: 'right',
      lockedText: 'The testing kit unlocks when the reaction is complete.',
      intro: 'Benzyne lives for less than a second, so it is never tested directly. Each test looks for its fingerprints instead: the gases it releases, the reagents it uses up, and the product it is trapped as. Glowing labelled rings mark every test spot. The <b>gas-sampling tap</b> is the blue stopcock at the top, between the condenser and the gas syringe. While you drag a tool, the spots it can be used in light up green.',
      onSkip: () => { Object.assign(sim, { T: 85, add: 1, adding: true, g: 1, p: 1, t: Math.max(sim.t, 40) }); },
    });
    const gasML = () => (2 * MMOL_AA * sim.g + MMOL_TC * sim.p) * 24.5;
    kit.addZone('gas', p => p.distanceTo(TAP) < 0.12, { x: TAP.x, z: TAP.z, y0: TAP.y - 0.3, y1: TAP.y + 0.6, r: 0.18 },
      { at: TAP.clone().add(V(0, 0, 0.04)), r: 0.1, text: 'Gas-sampling tap' });
    kit.addZone('mixture', p => p.distanceTo(new THREE.Vector3(0, FLASK_Y, 0)) < FLASK_R * 0.92 && p.y < LIQ_Y, { x: 0, z: 0, y0: 0.15, y1: 1.4, r: 0.42 },
      { at: V(0, FLASK_Y - 0.05, FLASK_R + 0.02), r: 0.12, text: 'Reaction flask' });
    kit.addZone('crystals', p => workedUp && Math.hypot(p.x - 1.0, p.z - 0.55) < 0.16 && p.y < 0.2, { x: 1.0, z: 0.55, y0: 0, y1: 0.9, r: 0.18 },
      { at: V(1.0, 0.1, 0.55), r: 0.14, text: 'Product crystals', when: () => workedUp });
    kit.addZone('mp', p => Math.hypot(p.x + 1.15, p.z - 0.62) < 0.07 && p.y < 0.42, { x: -1.15, z: 0.62, y0: 0.25, y1: 1.0, r: 0.12 },
      { at: V(-1.15, 0.36, 0.62), r: 0.06, text: 'Melting-point apparatus' });

    kit.extra.innerHTML = '<button class="kit-btn" id="workup">❄ Work-up: cool, add methanol, filter → crystals on the watch glass</button>';
    $('workup').onclick = () => {
      if (workedUp) return;
      workedUp = true;
      kit.log(`Work-up: the mixture is cooled and methanol is added. Off-white crystals of <b>1,2,3,4-tetraphenylnaphthalene</b> come out and are filtered onto the watch glass (≈ ${Math.round(MMOL_TC * 0.85 * M_PRODUCT)} mg, about 85 %).`);
    };

    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 0.12), new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.8 }));
    rack.position.set(0, 0.03, 1.0);
    scene.add(rack);
    const sw = c => `<span class="sw" style="background:#${new THREE.Color(c).getHexString()}"></span>`;

    { // 1. limewater
      const g = new THREE.Group();
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.24, 16, 1, true), glass);
      const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), glass);
      bottom.position.y = -0.12;
      const lwMat = new THREE.MeshStandardMaterial({ color: 0xeef6ff, transparent: true, opacity: 0.3 });
      const lw = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.12, 16), lwMat);
      lw.position.y = -0.07;
      g.add(t, bottom, lw);
      kit.addTool({
        name: 'Limewater, Ca(OH)₂(aq)', hint: 'hold the mouth of the tube at the blue gas-sampling tap (top)', targets: ['gas'], obj: g, tip: V(0, 0.12, 0), home: V(-0.44, 0.28, 1.0),
        reset: () => { lwMat.color.set(0xeef6ff); lwMat.opacity = 0.3; },
        onEnter(z) {
          if (z !== 'gas') return;
          if (gasML() < 5) { kit.log('Limewater: no gas has been collected yet.'); return; }
          lwMat.color.set(0xf4f4f0); lwMat.opacity = 0.9;
          kit.log(`Limewater ${sw(0xf4f4f0)} turns <b>milky</b>. The gas contains <b>CO₂</b>: Ca(OH)₂ + CO₂ → CaCO₃↓ + H₂O. That CO₂ is the carboxylate group that broke off as benzyne formed (step 3 of the atomic view).`);
        },
      });
    }
    { // 2. burning splint
      const g = new THREE.Group();
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0xc8a165, roughness: 0.9 }));
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 12), flameMat);
      flame.position.y = 0.18;
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), new THREE.MeshBasicMaterial({ color: 0x331a0a }));
      ember.position.y = 0.15;
      g.add(stick, flame, ember);
      kit.addTool({
        name: 'Burning wooden splint', hint: 'hold the flame at the blue gas-sampling tap (top)', targets: ['gas'], obj: g, tip: V(0, 0.16, 0), home: V(-0.22, 0.29, 1.0),
        reset: () => { flame.visible = true; },
        onEnter(z) {
          if (z !== 'gas') return;
          if (!flame.visible) { kit.log('The splint is already out. Clean the tools to light a fresh one.'); return; }
          if (gasML() < 5) { kit.log('Splint: no gas has been collected yet.'); return; }
          flame.visible = false;
          kit.log('The burning splint <b>goes out</b>, with no squeaky pop. The gas does not support combustion and contains no H₂: it is mostly <b>N₂ and CO₂</b>, the two small molecules benzyne\'s precursor throws away. (There is also some CO from the trapping step, which is toxic, so work in a fume hood.)');
        },
        update(t, dt, time) { flame.scale.set(1, 1 + 0.15 * Math.sin(time * 31), 1); },
      });
    }
    { // 3. starch–iodide paper
      const st = strip(0xf7f7f2, 0xf7f7f2, { padLen: 0.08 });
      kit.addTool({
        name: 'Starch–iodide paper (moist)', hint: 'dip into the reaction flask', targets: ['mixture'], obj: st.obj, tip: st.tip, home: V(0, 0.22, 1.0),
        reset: () => st.pad.material.color.set(0xf7f7f2),
        onEnter(z) {
          if (z !== 'mixture') return;
          if (sim.add > 0.85) {
            st.pad.material.color.set(0x1b1640);
            kit.log(`Starch–iodide paper ${sw(0x1b1640)} turns <b>blue-black</b>. Excess <b>isoamyl nitrite</b> is still present: nitrite oxidises I⁻ to I₂, which colours the starch. It was added in excess so that all the anthranilic acid was converted into the benzyne precursor.`);
          } else kit.log('Starch–iodide paper stays white: no nitrite oxidant is present yet.');
        },
      });
    }
    { // 4. TLC plate
      const g = new THREE.Group();
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.004), new THREE.MeshStandardMaterial({ color: 0xf2f4ee, roughness: 0.9 }));
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.222, 0.002), new THREE.MeshStandardMaterial({ color: 0x9aa7a0, metalness: 0.6, roughness: 0.4 }));
      back.position.z = -0.003;
      const spotMat = new THREE.MeshBasicMaterial({ color: 0x5b4a8a, transparent: true, opacity: 0 });
      const spots = [-0.016, 0.016].map(x => { const s = new THREE.Mesh(new THREE.CircleGeometry(0.008, 12), spotMat.clone()); s.position.set(x, 0.02, 0.0025); g.add(s); return s; });
      g.add(plate, back);
      const svg = (pSM, pRM) => {
        // pSM/pRM: intensity of the tetracyclone spot in lane SM / RM; pRM2: product spot in lane RM
        return `<svg width="120" height="120" viewBox="0 0 120 120" style="display:block;margin:6px 0">
          <rect x="20" y="4" width="80" height="112" rx="3" fill="#f2f4ee"/>
          <rect x="20" y="4" width="80" height="112" rx="3" fill="#3d5cff" opacity="0.12"/>
          <line x1="26" y1="100" x2="94" y2="100" stroke="#777" stroke-width="0.6" stroke-dasharray="2 2"/>
          <line x1="26" y1="14" x2="94" y2="14" stroke="#777" stroke-width="0.6"/>
          <circle cx="45" cy="58" r="6" fill="#6b2a91" opacity="${pSM}"/>
          <circle cx="75" cy="58" r="6" fill="#6b2a91" opacity="${pRM}"/>
          <circle cx="75" cy="40" r="6.5" fill="#24315e" opacity="${1 - pRM}"/>
          <text x="45" y="112" font-size="8" text-anchor="middle" fill="#333">SM</text>
          <text x="75" y="112" font-size="8" text-anchor="middle" fill="#333">RM</text>
        </svg>`;
      };
      kit.addTool({
        name: 'TLC plate (silica, view under UV 254 nm)', hint: 'dip into the reaction flask', targets: ['mixture'], obj: g, tip: V(0, -0.1, 0), home: V(0.22, 0.2, 1.0),
        reset: () => spots.forEach(s => { s.material.opacity = 0; }),
        onEnter(z) {
          if (z !== 'mixture') return;
          const left = 1 - sim.p;
          spots[0].material.opacity = 0.9; spots[1].material.opacity = 0.9;
          spots[1].material.color.set(left > 0.1 ? 0x5b2a80 : 0x24315e);
          kit.log(`TLC (hexane/ethyl acetate, UV lamp). SM = tetracyclone starting material, RM = reaction mixture.${svg(1, left.toFixed(2))}` +
            (left < 0.05
              ? 'The purple tetracyclone spot has <b>gone</b> from the RM lane, and a new UV-dark spot runs higher (less polar): the Diels–Alder adduct after loss of CO, <b>1,2,3,4-tetraphenylnaphthalene</b>. Benzyne must have formed to consume the tetracyclone.'
              : `About ${Math.round(left * 100)} % of the tetracyclone is still there. The reaction is not finished.`));
        },
      });
    }
    { // 5. melting-point capillary
      const g = new THREE.Group();
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.26, 8), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, roughness: 0.05 }));
      const fillMat = new THREE.MeshStandardMaterial({ color: 0xf3efe2 });
      const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.03, 8), fillMat);
      fill.position.y = -0.11;
      fill.visible = false;
      g.add(cap, fill);
      kit.addTool({
        name: 'Melting-point capillary', hint: 'touch it to the product crystals, then into the melting-point apparatus', targets: ['crystals', 'mp'], obj: g, tip: V(0, -0.12, 0), home: V(0.44, 0.22, 1.0),
        reset: () => { fill.visible = false; },
        onEnter(z) {
          if (z === 'crystals') { fill.visible = true; kit.log('A few crystals are packed into the capillary.'); }
          if (z === 'mp') {
            if (!fill.visible) { kit.log('The capillary is empty. Load it with crystals from the watch glass first (after the work-up).'); return; }
            mpRun = { start: performance.now() };
            kit.log('Melting-point apparatus heating at 10 °C/min (sped up)…');
          }
        },
      });
    }

    // ---- update ------------------------------------------------------------
    const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();
    function update(dt, time) {
      const s = sim;
      s.t += dt;
      const heat = $('bzHeat').checked;
      s.T += ((heat ? 22 * (1 - (s.T - 20) / 90) : 0) - 0.02 * (s.T - 20)) * dt;
      const reflux = s.T >= 85;
      if (reflux) s.T = 85; // DME boils at 85 °C
      if (s.adding && s.add < 1) s.add = Math.min(1, s.add + dt / 20);
      // diazotisation + loss of CO₂/N₂ need heat; benzyne is trapped by tetracyclone at once
      const k = s.T > 55 ? Math.min(1, (s.T - 55) / 30) : 0;
      const g0 = s.g;
      s.g += Math.max(0, Math.min(1, s.add * 1.2) - s.g) * Math.min(1, 0.9 * k * dt);
      s.rate = (s.g - g0) / Math.max(dt, 1e-6);
      s.p += (Math.min(1, s.g * MMOL_AA / MMOL_TC) - s.p) * Math.min(1, 2 * dt);
      if (s.g > 0.995 && s.add >= 1) { s.g = 1; s.p = 1; }
      const complete = s.add >= 1 && s.p > 0.995;

      // colours
      liqMat.color.lerpColors(PURPLE, AMBER, s.p);
      liqMat.opacity = 0.88 - 0.2 * s.p - (workedUp ? 0.3 : 0);
      const glow = heat ? Math.min(1, (s.T - 20) / 65) : 0;
      mantleTopMat.emissive.setRGB(0.45 * glow, 0.12 * glow, 0.02 * glow);

      // bubbles: boiling at reflux + gas evolution
      s.bubAcc += ((reflux ? 25 : 0) + Math.min(400, s.rate * 3000)) * dt;
      while (s.bubAcc > 1) {
        s.bubAcc--;
        const b = bub.find(b => b.life <= 0);
        if (!b) break;
        const a = rnd(0, 6.3), r = Math.sqrt(Math.random()) * 0.25;
        b.p.set(Math.cos(a) * r, FLASK_Y - 0.3 + rnd(0, 0.1), Math.sin(a) * r);
        b.v = rnd(0.2, 0.45); b.r = rnd(0.006, 0.016); b.life = 3;
      }
      bub.forEach((b, i) => {
        if (b.life > 0) { b.life -= dt; b.p.y += b.v * dt; if (b.p.y > LIQ_Y) b.life = 0; }
        tmpS.setScalar(b.life > 0 ? b.r : 0);
        tmpM.compose(b.p, tmpQ, tmpS);
        bubbleMesh.setMatrixAt(i, tmpM);
      });
      bubbleMesh.instanceMatrix.needsUpdate = true;

      // reflux drips run back down the condenser; nitrite drops fall in during the addition
      s.dripAcc += (reflux ? 3 : 0) * dt;
      s.addAcc += (s.adding && s.add < 1 ? 2.5 : 0) * dt;
      const spawnDrip = (kind, y) => {
        const d = drips.find(d => d.life <= 0);
        if (!d) return;
        d.kind = kind; d.life = 4; d.v = kind === 'reflux' ? 0.25 : 0.1;
        d.p.set(rnd(-0.02, 0.02), y, rnd(-0.02, 0.02));
      };
      while (s.dripAcc > 1) { s.dripAcc--; spawnDrip('reflux', rnd(1.55, 1.9)); }
      while (s.addAcc > 1) { s.addAcc--; spawnDrip('add', 2.2); }
      drips.forEach((d, i) => {
        if (d.life > 0) {
          d.life -= dt;
          d.v += (d.kind === 'add' ? 4 : 0.6) * dt;
          d.p.y -= d.v * dt;
          if (d.p.y < LIQ_Y) d.life = 0;
        }
        tmpS.setScalar(d.life > 0 ? (d.kind === 'add' ? 0.013 : 0.009) : 0);
        tmpM.compose(d.p, tmpQ, tmpS);
        dripMesh.setMatrixAt(i, tmpM);
      });
      dripMesh.instanceMatrix.needsUpdate = true;

      // gas syringe plunger (150 mL over 0.9 units of travel)
      plunger.position.x = 0.45 + Math.min(150, gasML()) / 150 * 0.9;

      // crystals after the work-up
      for (let i = 0; i < MAXC; i++) {
        const c = crystalPos[i];
        tmpS.setScalar(workedUp ? c.s : 0);
        tmpM.compose(c.p, c.q, tmpS);
        crystals.setMatrixAt(i, tmpM);
      }
      crystals.instanceMatrix.needsUpdate = true;

      // melting-point run: ramps up, then the sample melts at 196–199 °C
      if (mpRun) {
        const temp = Math.min(199, 150 + (performance.now() - mpRun.start) / 1000 * 18); // real time
        if (temp < 196) mpLcd(`${Math.round(temp)} °C`, 'heating…');
        else if (temp < 199) mpLcd(`${Math.round(temp)} °C`, 'sample melting');
        else {
          mpLcd('196–199 °C', 'melted');
          if (!mpRun.done) {
            mpRun.done = true;
            kit.log('Melting point <b>196–199 °C</b>, a sharp range that matches 1,2,3,4-tetraphenylnaphthalene (lit. ≈ 196–199 °C). The product of benzyne + tetracyclone is confirmed, so benzyne must have been made and trapped.');
          }
        }
      }

      // readouts
      $('mStatus').textContent = complete ? 'Complete: purple colour gone'
        : s.adding && k < 0.2 ? 'Too cool: heat to reflux'
        : s.adding ? 'Benzyne forming and being trapped'
        : reflux ? 'Refluxing: add the isoamyl nitrite' : heat ? 'Heating…' : 'Mantle off';
      $('mTime').textContent = s.t.toFixed(1) + ' s';
      $('mTemp').textContent = Math.round(s.T) + ' °C';
      $('mAdd').textContent = Math.round(s.add * 100) + ' %';
      $('mTc').textContent = Math.round((1 - s.p) * 100) + ' %';
      $('mGas').textContent = gasML().toFixed(0) + ' mL';
      $('mProd').textContent = Math.round(s.p * MMOL_TC * M_PRODUCT) + ' mg';
      $('mBar').style.width = s.p * 100 + '%';

      if (!kit.enabled && complete) kit.setEnabled(true);
      kit.update(time);
    }
    return { reset, update };
  },
};

export default {
  ui: {
    title: 'Benzyne Formation',
    heading: 'Making benzyne: the electron level',
    equation: 'C₆H₄(N₂⁺)(CO₂⁻) → C₆H₄ + CO₂ + N₂',
    routeTitle: 'Where do the electrons of the two breaking bonds go?',
    route: [
      'C1–CO₂⁻ and C2–N₂⁺ σ bonds',
      'Both bonds stretch (heterolysis begins)',
      'C1 keeps its pair: in-plane sp² lone pair (CO₂ leaves)',
      'N₂ leaves with its pair; C2 is left with an empty sp² orbital',
      'In-plane sp²–sp² overlap: benzyne\'s third bond',
    ],
    foot: 'The model: approximate |ψ|² shapes, with Gaussian lobes for bonds, lone pairs and the 2p_z π lobes, morphing smoothly between stages. Simplification: the loss of CO₂ and N₂ is very fast and close to concerted. It is shown here one step at a time so you can follow each electron pair. Benzyne\'s third bond is often drawn as a triple bond, but it is a weak in-plane overlap, roughly 10× weaker than a real alkyne π bond.',
    macro: {
      title: 'What you\'d actually see',
      sub: 'Benzyne generated and trapped in one flask. 0.21 g of anthranilic acid and 0.50 g of tetraphenylcyclopentadienone ("tetracyclone", deep purple) in 1,2-dimethoxyethane (DME), at reflux under a condenser. Isoamyl nitrite is added dropwise, and the gas is collected in a syringe. Fume hood: CO is released.',
      observations: `• At reflux the solution is a deep <b style="color:#b26be8">purple</b>, the colour of tetracyclone.<br>
        • While the isoamyl nitrite goes in, the anthranilic acid becomes benzenediazonium-2-carboxylate, which falls apart into benzyne, <b>CO₂ and N₂</b>. Steady gas bubbling pushes out the syringe plunger.<br>
        • Each benzyne is caught at once by tetracyclone in a Diels–Alder reaction. The adduct loses CO, which gives off more gas.<br>
        • As the tetracyclone is used up, the purple fades to a <b style="color:#c99a45">pale yellow-brown</b>.<br>
        • On work-up, off-white crystals of 1,2,3,4-tetraphenylnaphthalene form.`,
      controls: `<label><input type="checkbox" id="bzHeat" checked>Heating mantle on</label>
        <button id="bzAdd" class="kit-btn">💧 Add isoamyl nitrite (dropwise)</button><div id="testKit"></div>`,
      measurements: [
        ['mStatus', 'Status', 'Heating…'],
        ['mTime', 'Elapsed time', '0 s'],
        ['mTemp', 'Flask temperature', '20 °C'],
        ['mAdd', 'Isoamyl nitrite added', '0 %'],
        ['mTc', 'Tetracyclone remaining', '100 %'],
        ['mGas', 'Gas collected (N₂ + CO₂ + CO)', '0 mL'],
        ['mProd', 'Tetraphenylnaphthalene formed', '0 mg'],
      ],
      foot: 'Timings are compressed. The gas volume is the ideal value at 25 °C, ignoring solvent vapour. Never isolate benzenediazonium-2-carboxylate when dry: it is shock-sensitive and can explode. It is always made and used in solution.',
    },
  },
  atomic,
  macro,
};
