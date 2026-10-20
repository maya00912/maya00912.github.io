import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const $ = id => document.getElementById(id);
const NA = 6.02214076e23;

// ---------------------------------------------------------------------------
// Structures. Lattice: a, b, c in Å and α, β, γ in degrees. Each site is a fractional
// position f; molecules (and Ga₂ dimers) are a centre plus Cartesian offsets in Å, so a
// molecule is never cut in half at the cell boundary.
// bonds: [{ max, order, faint }] by distance; coord: cutoff for the neighbour highlight.
// ---------------------------------------------------------------------------
const cubic = a => ({ a, b: a, c: a, al: 90, be: 90, ga: 90 });
const FCC = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]];
const atoms = fs => fs.map(f => ({ f }));
const mol = (f, v) => ({ f, off: [v, v.map(x => -x)] });
const along = (dir, half) => { const l = Math.hypot(...dir); return dir.map(x => x / l * half); };

const ELEMENTS = {
  H: {
    name: 'Hydrogen', Z: 1, M: 1.008, color: 0xe8ecf7, state: 'Gas at room temperature; solid below −259.2 °C (14 K)',
    structures: [{
      id: 'h2', name: 'Solid H₂ (hexagonal close-packed)', short: 'Below 14 K (−259 °C)', cold: true,
      system: 'Hexagonal', sg: 'P6₃/mmc (No. 194)', lat: { a: 3.776, b: 3.776, c: 6.162, al: 90, be: 90, ga: 120 },
      // H₂ molecules (0.741 Å) on hcp sites; they spin freely, so each is drawn frozen at a random angle
      sites: [{ f: [1 / 3, 2 / 3, 0.25], spin: 0.3705 }, { f: [2 / 3, 1 / 3, 0.75], spin: 0.3705 }],
      bonds: [{ max: 0.9, order: 1 }], bondLabel: 'H–H bonds', coord: null,
      ball: 0.2, fill: 'vdw', vdw: 1.2,
      note: 'Solid hydrogen is the simplest molecular crystal. Each H₂ molecule keeps its σ bond (0.741 Å), made from two overlapping 1s orbitals, and the molecules stack like oranges in hexagonal close packing. The forces between them are so weak that it melts at 14 K, and the molecules are so light that they keep <b>rotating freely</b> even in the solid, so each one behaves almost like a sphere (they are frozen at random angles here). It is the least dense solid there is, 0.088 g/cm³. Squeezed to several million atmospheres, hydrogen is predicted to become a metal; inside Jupiter and Saturn it is.',
    }],
  },
  Li: {
    name: 'Lithium', Z: 3, M: 6.94, color: 0xc58cff, state: 'Solid metal at room temperature (melts at 180.5 °C)',
    structures: [{
      id: 'bcc', name: 'Body-centred cubic (bcc)', short: 'Room temperature',
      system: 'Cubic', sg: 'Im3̄m (No. 229)', lat: cubic(3.510), sites: atoms([[0, 0, 0], [0.5, 0.5, 0.5]]),
      bonds: [{ max: 3.1, order: 1, faint: true }], bondLabel: 'Nearest-neighbour contacts', coord: 3.1,
      ball: 0.42, fill: 'half-nn', pack: true,
      note: 'Each Li atom gives its single 2s electron to a shared "sea" of electrons that holds the metal together. One electron per atom makes for weak metallic bonding, which is why lithium is soft enough to cut with a knife and melts at only 180 °C. Each atom touches 8 neighbours along the body diagonals. bcc fills only 68% of space, less than the 74% of close packing. Below about 77 K lithium slowly rearranges into a close-packed stacking (9R).',
    }],
  },
  C: {
    name: 'Carbon', Z: 6, M: 12.011, color: 0x9aa3b5, state: 'Solid; graphite is the stable form at room conditions',
    structures: [
      {
        id: 'diamond', name: 'Diamond', short: 'sp³, metastable at room conditions',
        system: 'Cubic', sg: 'Fd3̄m (No. 227)', lat: cubic(3.567),
        sites: atoms([...FCC, ...FCC.map(f => f.map(x => x + 0.25))]),
        bonds: [{ max: 1.7, order: 1 }], bondLabel: 'C–C σ bonds', coord: 1.7,
        ball: 0.26, fill: 'half-nn', pack: true,
        note: 'Every carbon uses all four of its valence electrons in sp³ hybrids: four σ bonds, 1.545 Å long, at the tetrahedral angle of 109.5°. The result is one giant covalent molecule with no free electrons, so diamond is the hardest natural material and an electrical insulator (band gap 5.5 eV). It is surprisingly open, filling only 34% of space, yet it is the denser form of carbon, because its bonds are short. Diamond is only metastable at room conditions; it turns to graphite only when heated above about 1500 °C without air.',
      },
      {
        id: 'graphite', name: 'Graphite (hexagonal, AB stacking)', short: 'sp², the stable form',
        system: 'Hexagonal', sg: 'P6₃/mmc (No. 194)', lat: { a: 2.464, b: 2.464, c: 6.711, al: 90, be: 90, ga: 120 },
        sites: atoms([[0, 0, 0.25], [0, 0, 0.75], [1 / 3, 2 / 3, 0.25], [2 / 3, 1 / 3, 0.75]]),
        bonds: [{ max: 1.6, order: 1 }], bondLabel: 'C–C bonds in each layer', coord: 1.6,
        ball: 0.24, fill: 'vdw', vdw: 1.70,
        note: 'Each carbon uses three sp² hybrids for σ bonds to three neighbours in a flat hexagonal sheet (1.42 Å). The fourth electron sits in a 2p<sub>z</sub> orbital and joins one delocalised π system across the whole sheet, like an endless benzene ring. Those π electrons make graphite conduct along its layers. The layers are 3.35 Å apart and held only by weak van der Waals forces, so they slide over each other: that is why graphite is soft, and how a pencil writes. Alternate layers are shifted (ABAB stacking).',
      },
    ],
  },
  N: {
    name: 'Nitrogen', Z: 7, M: 14.007, color: 0x4f7dff, state: 'Gas at room temperature; solid below −210 °C (63 K)',
    structures: [{
      id: 'alpha', name: 'α-N₂ (cubic molecular crystal)', short: 'Below 35.6 K (−237.6 °C)', cold: true,
      system: 'Cubic', sg: 'Pa3̄ (No. 205)', lat: cubic(5.661),
      // N₂ molecules on fcc sites, each axis along a different body diagonal (bond 1.098 Å)
      sites: [mol([0, 0, 0], along([1, 1, 1], 0.549)), mol([0.5, 0.5, 0], along([1, -1, -1], 0.549)),
        mol([0.5, 0, 0.5], along([-1, -1, 1], 0.549)), mol([0, 0.5, 0.5], along([-1, 1, -1], 0.549))],
      bonds: [{ max: 1.3, order: 3 }], bondLabel: 'N≡N triple bonds', coord: null,
      ball: 0.27, fill: 'vdw', vdw: 1.55,
      note: 'Solid nitrogen is a <b>molecular crystal</b>. The N₂ molecules keep their N≡N triple bond and are held to each other only by weak van der Waals forces, which is why it melts at 63 K. The molecules sit on a face-centred cubic lattice, and each of the four in a cell points along a different body diagonal of the cube. Between 35.6 K and 63 K the molecules spin freely and pack hexagonally (β-N₂).',
    }],
  },
  O: {
    name: 'Oxygen', Z: 8, M: 15.999, color: 0xff4a4a, state: 'Gas at room temperature; solid below −218.8 °C (54 K)',
    structures: [{
      id: 'alpha', name: 'α-O₂ (monoclinic molecular crystal)', short: 'Below 23.9 K (−249.3 °C)', cold: true,
      system: 'Monoclinic', sg: 'C2/m (No. 12)', lat: { a: 5.403, b: 3.429, c: 5.086, al: 90, be: 132.53, ga: 90 },
      sites: [{ f: [0, 0, 0], perp: 0.6035 }, { f: [0.5, 0.5, 0], perp: 0.6035 }],   // O=O axes ⟂ to the ab plane
      bonds: [{ max: 1.4, order: 2 }], bondLabel: 'O=O double bonds', coord: null,
      ball: 0.27, fill: 'vdw', vdw: 1.52,
      note: 'Like nitrogen, solid oxygen is a molecular crystal of intact O₂ molecules held by van der Waals forces. O₂ has two unpaired electrons in its π* orbitals (the two unpaired 2p electrons of each O atom, from the orbital view), so it is magnetic. In α-O₂ all the molecules stand parallel in layers, and neighbouring molecules point their spins in opposite directions: solid oxygen is an <b>antiferromagnet</b>. It is pale blue, and liquid oxygen sticks to a magnet.',
    }],
  },
  Ti: {
    name: 'Titanium', Z: 22, M: 47.867, color: 0xb8c4d6, state: 'Solid metal at room temperature (melts at 1668 °C)',
    structures: [
      {
        id: 'alpha', name: 'α-Ti, hexagonal close-packed (hcp)', short: 'Room temperature, up to 882 °C',
        system: 'Hexagonal', sg: 'P6₃/mmc (No. 194)', lat: { a: 2.9508, b: 2.9508, c: 4.6855, al: 90, be: 90, ga: 120 },
        sites: atoms([[1 / 3, 2 / 3, 0.25], [2 / 3, 1 / 3, 0.75]]),
        bonds: [{ max: 3.0, order: 1, faint: true }], bondLabel: 'Nearest-neighbour contacts', coord: 3.0,
        ball: 0.42, fill: 'half-nn', pack: true,
        note: 'Titanium atoms stack in hexagonal close packing, ABAB: each layer sits in the hollows of the one below, and every atom touches 12 neighbours (switch on the highlight to see them: 6 in its own layer, 3 above, 3 below). Titanium\'s layers are slightly squashed together: c/a = 1.588, against 1.633 for perfect spheres, so the 6 neighbours in the layers above and below (2.90 Å) are a little closer than the 6 in the same layer (2.95 Å), and the packing fraction comes out at 72% rather than the ideal 74%. Four valence electrons per atom, including the two 3d electrons, make strong metallic bonds. With a density of only 4.5 g/cm³, that gives titanium the best strength-to-weight ratio of any common metal, which is why it is used in aircraft and implants.',
      },
      {
        id: 'beta', name: 'β-Ti, body-centred cubic (bcc)', short: 'Above 882 °C (to the melting point, 1668 °C)',
        system: 'Cubic', sg: 'Im3̄m (No. 229)', lat: cubic(3.306), sites: atoms([[0, 0, 0], [0.5, 0.5, 0.5]]),
        bonds: [{ max: 2.95, order: 1, faint: true }], bondLabel: 'Nearest-neighbour contacts', coord: 2.95,
        ball: 0.42, fill: 'half-nn', pack: true,
        note: 'Above 882 °C titanium rearranges into the more open body-centred cubic structure, with 8 nearest neighbours instead of 12 (lattice constant measured at about 900 °C). bcc is easier to deform, so titanium is hot-forged in this range. Adding vanadium or molybdenum keeps some β-Ti stable at room temperature. The most widely used titanium alloy, Ti-6Al-4V, is a mixture of α and β grains, which makes it both strong and tough.',
      },
    ],
  },
  Ga: {
    name: 'Gallium', Z: 31, M: 69.723, color: 0x7fd6c8, state: 'Solid metal; melts at 29.8 °C, in your hand',
    structures: [{
      id: 'alpha', name: 'α-Ga (orthorhombic, Ga₂ dimers)', short: 'Room temperature',
      system: 'Orthorhombic', sg: 'Cmce (No. 64)', lat: { a: 4.5197, b: 7.6633, c: 4.5260, al: 90, be: 90, ga: 90 },
      // site 8f (0, y, z), y = 0.1549, z = 0.0810, written as 4 dimers centred on (0,0,0), (0,½,½) + C-centring
      sites: (() => {
        const v1 = [0, 0.1549 * 7.6633, 0.0810 * 4.5260], v2 = [0, 0.1549 * 7.6633, -0.0810 * 4.5260];
        return [mol([0, 0, 0], v1), mol([0, 0.5, 0.5], v2), mol([0.5, 0.5, 0], v1), mol([0.5, 0, 0.5], v2)];
      })(),
      bonds: [{ max: 2.55, order: 1 }, { max: 2.85, order: 1, faint: true }],
      bondLabel: 'Ga–Ga bonds (dimer bond bright)', coord: 2.85,
      ball: 0.36, fill: 'half-nn',
      note: 'Gallium has one of the strangest structures of any metal. Each atom has <b>one</b> very close neighbour (2.48 Å), forming Ga₂ pairs with a partly covalent bond, plus six more neighbours 2.70–2.79 Å away. That half-metallic, half-molecular bonding is easy to break, so gallium melts at 29.8 °C. The open dimer structure is less dense than the liquid, so like water, gallium <b>expands when it freezes</b> (by 3.1%).',
    }],
  },
  I: {
    name: 'Iodine', Z: 53, M: 126.904, color: 0x9d6bd8, state: 'Solid at room temperature; melts at 113.7 °C and sublimes easily',
    structures: [{
      id: 'i2', name: 'Solid I₂ (orthorhombic molecular crystal)', short: 'Room temperature',
      system: 'Orthorhombic', sg: 'Cmce (No. 64)', lat: { a: 7.27, b: 4.79, c: 9.79, al: 90, be: 90, ga: 90 },
      // site 8f (0, y, z), y = 0.1543, z = 0.1174: the same space group as α-Ga, but here the pairs are real I₂ molecules
      sites: (() => {
        const v1 = [0, 0.1543 * 4.79, 0.1174 * 9.79], v2 = [0, 0.1543 * 4.79, -0.1174 * 9.79];
        return [mol([0, 0, 0], v1), mol([0, 0.5, 0.5], v2), mol([0.5, 0.5, 0], v1), mol([0.5, 0, 0.5], v2)];
      })(),
      bonds: [{ max: 2.9, order: 1 }, { max: 3.6, order: 1, faint: true }],
      bondLabel: 'I–I bonds (short contacts faint)', coord: null,
      ball: 0.42, fill: 'vdw', vdw: 1.98,
      note: 'Solid iodine is a molecular crystal of I₂ molecules, but an unusual one. Within each molecule the I–I bond is 2.73 Å, a little longer than in the gas (2.67 Å). Neighbouring molecules in the same layer come as close as 3.5 Å, much less than the 3.96 Å you would expect from two iodine atoms just touching (the faint sticks). Those short contacts let electrons spread a little between molecules, so the layers (the bc planes) give iodine its <b>metallic, blue-black shine</b> and make it a semiconductor. The forces between layers are weak, so iodine is soft and sublimes into a violet vapour when warmed. Under high pressure (about 21 GPa) the molecules break up and iodine becomes a true metal.',
    }],
  },
  Ce: {
    name: 'Cerium', Z: 58, M: 140.116, color: 0xffd479, state: 'Solid metal at room temperature (melts at 795 °C)',
    structures: [
      {
        id: 'gamma', name: 'γ-Ce, face-centred cubic (fcc)', short: 'Room temperature',
        system: 'Cubic', sg: 'Fm3̄m (No. 225)', lat: cubic(5.161), sites: atoms(FCC),
        bonds: [{ max: 3.8, order: 1, faint: true }], bondLabel: 'Nearest-neighbour contacts', coord: 3.8,
        ball: 0.5, fill: 'half-nn', pack: true,
        note: 'Cerium is cubic close-packed: each atom touches 12 neighbours and the atoms fill 74% of space, the densest way to stack equal spheres. Three electrons per atom (6s² 5d¹) join the metallic bonding. The fourth valence electron, 4f¹, stays localised on its own atom, tucked inside the 5s²5p⁶ shell, just as in the orbital view.',
      },
      {
        id: 'alpha', name: 'α-Ce, collapsed fcc', short: 'Under pressure (≈ 0.8 GPa) or cooled below ≈ 100 K',
        system: 'Cubic', sg: 'Fm3̄m (No. 225)', lat: cubic(4.85), sites: atoms(FCC),
        bonds: [{ max: 3.6, order: 1, faint: true }], bondLabel: 'Nearest-neighbour contacts', coord: 3.6,
        ball: 0.5, fill: 'half-nn', pack: true,
        note: 'The same face-centred cubic arrangement, but <b>17% smaller in volume</b>. Compare it with γ-Ce: the structure does not change, only the size. Under pressure the 4f electron stops being locked onto its own atom and partly joins the bonding, which pulls the atoms closer together. This "isostructural volume collapse" is almost unique to cerium, and it ends at a critical point, like the boiling of a liquid.',
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x05070d);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
$('scene').appendChild(renderer.domElement);
const labels = new CSS2DRenderer();
labels.setSize(innerWidth, innerHeight);
Object.assign(labels.domElement.style, { position: 'fixed', inset: '0', pointerEvents: 'none' });
$('scene').appendChild(labels.domElement);

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const key = new THREE.DirectionalLight(0xffffff, 1.4);
key.position.set(5, 8, 6);
scene.add(key, new THREE.AmbientLight(0xffffff, 0.25));
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.8;

{ // starfield, as on the orbitals page
  const n = 1200, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const z = 2 * Math.random() - 1, ph = 2 * Math.PI * Math.random(), q = Math.sqrt(1 - z * z), r = 150 + 100 * Math.random();
    p.set([r * q * Math.cos(ph), r * z, r * q * Math.sin(ph)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x8090b0, size: 0.6, sizeAttenuation: false })));
}

const root = new THREE.Group();
scene.add(root);

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
function latticeVectors({ a, b, c, al, be, ga }) {
  const r = Math.PI / 180, ca = Math.cos(al * r), cb = Math.cos(be * r), cg = Math.cos(ga * r), sg = Math.sin(ga * r);
  const cy = (ca - cb * cg) / sg;
  return [
    new THREE.Vector3(a, 0, 0),
    new THREE.Vector3(b * cg, b * sg, 0),
    new THREE.Vector3(c * cb, c * cy, c * Math.sqrt(Math.max(0, 1 - cb * cb - cy * cy))),
  ];
}
const cellVolume = L => Math.abs(L[0].dot(new THREE.Vector3().crossVectors(L[1], L[2])));
const toCart = (L, f) => L[0].clone().multiplyScalar(f[0]).addScaledVector(L[1], f[1]).addScaledVector(L[2], f[2]);

// All atoms whose site centre lies in fractional range [lo, hi] (inclusive, so cell corners and faces are filled)
function generate(S, L, lo, hi) {
  const out = [], eps = 1e-6;
  const perp = new THREE.Vector3().crossVectors(L[0], L[1]).normalize();
  for (let i = Math.floor(lo) - 1; i <= Math.ceil(hi); i++)
    for (let j = Math.floor(lo) - 1; j <= Math.ceil(hi); j++)
      for (let k = Math.floor(lo) - 1; k <= Math.ceil(hi); k++)
        for (const s of S.sites) {
          const f = [s.f[0] + i, s.f[1] + j, s.f[2] + k];
          if (f.some(x => x < lo - eps || x > hi + eps)) continue;
          const c = toCart(L, f);
          const offs = s.spin ? spinPair(s.spin, i, j, k, s.f)
            : s.off ? s.off.map(o => new THREE.Vector3(...o))
            : s.perp ? [perp.clone().multiplyScalar(s.perp), perp.clone().multiplyScalar(-s.perp)] : [new THREE.Vector3()];
          for (const o of offs) out.push({ p: c.clone().add(o), f });
        }
  // dedupe (sites on cell faces can be reached twice)
  return out.filter((a, i) => out.findIndex(b => b.p.distanceToSquared(a.p) < 1e-6) === i);
}

// a freely rotating molecule, frozen at a random (but repeatable) orientation for its lattice position
function spinPair(half, i, j, k, f) {
  let h = Math.sin(i * 127.1 + j * 311.7 + k * 74.7 + f[0] * 53.3 + f[2] * 19.9) * 43758.5453;
  const rnd = () => (h = (h * 9301 + 49297) % 233280) / 233280;
  h = Math.abs(h) % 233280;
  const z = 2 * rnd() - 1, ph = 2 * Math.PI * rnd(), r = Math.sqrt(1 - z * z);
  const v = new THREE.Vector3(r * Math.cos(ph), r * Math.sin(ph), z).multiplyScalar(half);
  return [v, v.clone().negate()];
}

function nearestNeighbour(S, L) {
  const pts = generate(S, L, -1, 2), c = toCart(L, [0.5, 0.5, 0.5]);
  const a0 = pts.reduce((m, p) => (p.p.distanceTo(c) < m.p.distanceTo(c) ? p : m));
  let d = Infinity;
  for (const p of pts) { const x = p.p.distanceTo(a0.p); if (x > 1e-3) d = Math.min(d, x); }
  return d;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
const sphereGeo = new THREE.SphereGeometry(1, 32, 20);
const stickGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
const UP = new THREE.Vector3(0, 1, 0);
const state = { el: 'Li', sid: null, n: 2 };
let current = null;   // { bonds, center } for per-frame bond updates

function build(refit = true) {
  root.clear();
  for (const o of [...labels.domElement.children]) o.remove();
  const E = ELEMENTS[state.el];
  const S = E.structures.find(s => s.id === state.sid) || E.structures[0];
  state.sid = S.id;
  const L = latticeVectors(S.lat), n = state.n;
  const nn = nearestNeighbour(S, L);

  // centre everything on the middle of the block of cells
  const mid = toCart(L, [n / 2, n / 2, n / 2]);
  root.position.copy(mid).multiplyScalar(-1);

  let pts = generate(S, L, 0, n);
  // neighbour highlight: the atom nearest the centre, plus every neighbour within the cutoff (added if outside the block)
  const coordOn = $('coord').checked && S.coord;
  let center = null, neigh = new Set();
  if (coordOn) {
    center = pts.reduce((m, p) => (p.p.distanceTo(mid) < m.p.distanceTo(mid) ? p : m));
    for (const p of generate(S, L, -1, n + 1)) {
      const d = p.p.distanceTo(center.p);
      if (d > 1e-3 && d <= S.coord) {
        let q = pts.find(x => x.p.distanceToSquared(p.p) < 1e-6);
        if (!q) { q = p; pts.push(q); }
        neigh.add(q);
      }
    }
  }

  // atoms
  const fill = $('fill').checked;
  const r = (fill ? (S.fill === 'vdw' ? S.vdw : nn / 2) : S.ball) * (+$('size').value);
  const mat = new THREE.MeshPhysicalMaterial({ roughness: 0.35, metalness: 0.1, clearcoat: 0.4, envMapIntensity: 0.8 });
  // with the highlight on, everything except the chosen atom and its neighbours becomes a faint ghost
  const base = new THREE.Color(E.color), m4 = new THREE.Matrix4();
  const lit = pts.filter(p => !coordOn || p === center || neigh.has(p)), ghosts = pts.filter(p => !lit.includes(p));
  const addAtoms = (list, material, colorOf) => {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(sphereGeo, material, list.length);
    list.forEach((p, i) => {
      mesh.setMatrixAt(i, m4.compose(p.p, new THREE.Quaternion(), new THREE.Vector3(r, r, r)));
      mesh.setColorAt(i, colorOf(p));
    });
    root.add(mesh);
  };
  addAtoms(lit, mat, p => (p === center ? new THREE.Color(0xff5fa2) : base));
  addAtoms(ghosts, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.12, depthWrite: false }), () => base);

  // bonds (instanced cylinders; multiple bonds are re-oriented to face the camera every frame)
  const bonds = [];
  if ($('bonds').checked) {
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const d = pts[i].p.distanceTo(pts[j].p);
      const rule = S.bonds.find(b => d <= b.max);
      if (!rule || d < 0.5) continue;
      const lit = !coordOn || ((pts[i] === center || pts[j] === center));
      bonds.push({ A: pts[i].p, B: pts[j].p, order: rule.order, faint: rule.faint, lit });
    }
  }
  const groups = { bright: [], faint: [], dim: [] };
  for (const b of bonds) groups[!b.lit ? 'dim' : b.faint ? 'faint' : 'bright'].push(b);
  const stickMats = {
    bright: new THREE.MeshStandardMaterial({ color: 0xe8ecf7, roughness: 0.5 }),
    faint: new THREE.MeshBasicMaterial({ color: 0xc8d2ea, transparent: true, opacity: 0.35, depthWrite: false }),
    dim: new THREE.MeshBasicMaterial({ color: 0x8090b0, transparent: true, opacity: 0.08, depthWrite: false }),
  };
  const stickMeshes = Object.entries(groups).filter(([, g]) => g.length).map(([k, g]) => {
    const m = new THREE.InstancedMesh(stickGeo, stickMats[k], g.reduce((s, b) => s + b.order, 0));
    root.add(m);
    return { m, g };
  });

  // coordination polyhedron
  if (coordOn && neigh.size >= 4) {
    try {
      const poly = new ConvexGeometry([...neigh].map(p => p.p));
      root.add(new THREE.Mesh(poly, new THREE.MeshBasicMaterial({ color: E.color, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })));
      root.add(new THREE.LineSegments(new THREE.EdgesGeometry(poly, 1), new THREE.LineBasicMaterial({ color: E.color, transparent: true, opacity: 0.6 })));
    } catch { /* coplanar neighbours: no polyhedron */ }
  }

  // unit cell and the repeated block
  if ($('cell').checked) {
    const box = (scale, color, opacity) => {
      const c = [0, 1].flatMap(i => [0, 1].flatMap(j => [0, 1].map(k => toCart(L, [i * scale, j * scale, k * scale]))));
      const E2 = [[0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]];
      const g = new THREE.BufferGeometry().setFromPoints(E2.flatMap(([a, b]) => [c[a], c[b]]));
      root.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity })));
    };
    box(1, 0x4fb3ff, 0.95);
    if (n > 1) box(n, 0x8b96b3, 0.35);
    ['a', 'b', 'c'].forEach((t, i) => {
      const d = document.createElement('div');
      d.className = 'axis-label';
      d.textContent = t;
      const o = new CSS2DObject(d);
      o.position.copy(L[i]).multiplyScalar(1.08);
      root.add(o);
    });
  }

  current = { stickMeshes };
  updateSticks(true);
  if (refit) fitCamera(L, n);
  updateInfo(E, S, L, nn, center ? neigh.size : null);
  history.replaceState(null, '', '#' + state.el + (E.structures.length > 1 ? '/' + S.id : ''));
}

const tmpD = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpC = new THREE.Vector3(), q = new THREE.Quaternion(),
  camLocal = new THREE.Vector3(), m4 = new THREE.Matrix4(), sc = new THREE.Vector3();
let lastCam = new THREE.Vector3(Infinity);
function updateSticks(force) {
  if (!current) return;
  if (!force && camera.position.distanceToSquared(lastCam) < 1e-6) return;
  lastCam.copy(camera.position);
  camLocal.copy(camera.position).sub(root.position);
  const w = 0.055 * Math.min(1.4, +$('size').value);
  for (const { m, g } of current.stickMeshes) {
    let k = 0;
    for (const b of g) {
      tmpD.subVectors(b.B, b.A);
      const len = tmpD.length();
      tmpD.normalize();
      q.setFromUnitVectors(UP, tmpD);
      tmpP.crossVectors(tmpD, tmpC.copy(camLocal).sub(b.A)).normalize();
      const offs = b.order === 3 ? [0, -0.13, 0.13] : b.order === 2 ? [-0.075, 0.075] : [0];
      const ww = b.order > 1 ? w * 0.7 : w;
      for (const o of offs) {
        tmpC.addVectors(b.A, b.B).multiplyScalar(0.5).addScaledVector(tmpP, o);
        m4.compose(tmpC, q, sc.set(ww, len, ww));
        m.setMatrixAt(k++, m4);
      }
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }
}

let fitDist = null;
function fitCamera(L, n) {
  const corners = [0, 1].flatMap(i => [0, 1].flatMap(j => [0, 1].map(k => toCart(L, [i * n, j * n, k * n]))));
  const mid = toCart(L, [n / 2, n / 2, n / 2]);
  const R = Math.max(...corners.map(c => c.distanceTo(mid))) + 1;
  const dist = R / Math.sin((camera.fov / 2) * Math.PI / 180) * 1.1;   // a little slack so the side panels do not hide the edges
  controls.target.set(0, 0, 0);
  if (fitDist === null) camera.position.set(0.55, 0.42, 1).normalize().multiplyScalar(dist);
  fitDist = dist;
  controls.minDistance = dist * 0.15;
  controls.maxDistance = dist * 4;
}

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------
const fmt = (x, d = 3) => x.toFixed(d);
function updateInfo(E, S, L, nn, cn) {
  $('elName').textContent = `${E.name} (Z = ${E.Z})`;
  $('elSub').textContent = E.state;
  $('variants').innerHTML = E.structures.map(s =>
    `<button data-sid="${s.id}" class="${s.id === S.id ? 'on' : ''}">${s.name}<small>${s.short}</small></button>`).join('');
  $('variants').querySelectorAll('button').forEach(b => { b.onclick = () => { state.sid = b.dataset.sid; build(); }; });
  document.querySelectorAll('#elements button').forEach(b => b.classList.toggle('on', b.dataset.el === state.el));
  document.querySelectorAll('#repeat button').forEach(b => b.classList.toggle('on', +b.dataset.n === state.n));
  $('coordRow').classList.toggle('disabled', !S.coord);
  $('coordRow').title = S.coord ? '' : 'Molecular crystal: each atom is bonded only to its partner in the molecule';
  $('bondsLabel').textContent = S.bondLabel;

  const V = cellVolume(L);
  const Zc = S.sites.reduce((n, s) => n + (s.off ? s.off.length : s.perp || s.spin ? 2 : 1), 0);   // atoms per conventional cell
  const rho = Zc * E.M / (NA * V * 1e-24);
  const pack = S.pack ? Zc * (4 / 3) * Math.PI * (nn / 2) ** 3 / V : null;
  const { a, b, c, al, be, ga } = S.lat;
  const cubicCell = a === b && b === c && al === 90 && be === 90 && ga === 90;
  const rows = [
    ['Crystal system', S.system],
    ['Space group', S.sg],
    cubicCell ? ['Lattice constant', `a = ${fmt(a)} Å`]
      : ['Lattice constants', `a = ${fmt(a)}, b = ${fmt(b)}, c = ${fmt(c)} Å`],
    ...(cubicCell ? [] : [['Angles', `α = ${al}°, β = ${be}°, γ = ${ga}°`]]),
    ['Atoms per unit cell', Zc],
    ['Cell volume', `${fmt(V, 1)} Å³`],
    ['Nearest neighbour', `${fmt(nn)} Å`],
    ...(S.coord ? [['Coordination number', cn ?? countNeighbours(S, L)]] : []),
    ...(pack ? [['Packing fraction', `${(pack * 100).toFixed(1)}%`]] : []),
    ['Density (calculated)', `${rho.toFixed(rho < 1 ? 3 : 2)} g/cm³`],
  ];
  $('sName').textContent = S.name;
  $('sBadge').innerHTML = `<span class="badge${S.cold ? ' cold' : ''}">${S.cold ? '❄ ' : ''}${S.short}</span>`;
  $('facts').innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  const sw = '#' + new THREE.Color(E.color).getHexString();
  $('legend').innerHTML = `<span><i class="swatch" style="background:${sw}"></i>${E.name} atom</span>`
    + `<span><i class="swatch" style="background:#4fb3ff;border-radius:1px"></i>unit cell</span>`
    + ($('coord').checked && S.coord ? '<span><i class="swatch" style="background:#ff5fa2"></i>highlighted atom</span>' : '');
  $('sNote').innerHTML = S.note;
}
function countNeighbours(S, L) {
  const pts = generate(S, L, -1, 2), c = toCart(L, [0.5, 0.5, 0.5]);
  const a0 = pts.reduce((m, p) => (p.p.distanceTo(c) < m.p.distanceTo(c) ? p : m));
  return pts.filter(p => { const d = p.p.distanceTo(a0.p); return d > 1e-3 && d <= S.coord; }).length;
}

// element strip
$('elements').innerHTML = Object.entries(ELEMENTS).map(([sym, E]) =>
  `<button data-el="${sym}"><b>${sym}</b><small>${E.Z} · ${E.name}</small></button>`).join('');
$('elements').querySelectorAll('button').forEach(b => {
  b.onclick = () => { state.el = b.dataset.el; state.sid = null; build(); scrollStrip(); };
});
$('elements').addEventListener('wheel', e => {
  if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
  e.preventDefault();
  $('elements').scrollLeft += e.deltaY;
}, { passive: false });
function scrollStrip() {
  const strip = $('elements'), btn = strip.querySelector('button.on');
  if (btn && (btn.offsetLeft < strip.scrollLeft || btn.offsetLeft + btn.offsetWidth > strip.scrollLeft + strip.clientWidth))
    strip.scrollTo({ left: btn.offsetLeft - strip.clientWidth / 2 + btn.offsetWidth / 2, behavior: 'smooth' });
}

document.querySelectorAll('#repeat button').forEach(b => { b.onclick = () => { state.n = +b.dataset.n; build(); }; });
for (const id of ['cell', 'bonds', 'coord', 'fill']) $(id).addEventListener('change', () => build(false));
$('size').addEventListener('input', () => build(false));
$('spin').addEventListener('change', e => { controls.autoRotate = e.target.checked; });

// ---------------------------------------------------------------------------
// Start + loop
// ---------------------------------------------------------------------------
{
  const [sym, sid] = location.hash.slice(1).split('/');
  if (ELEMENTS[sym]) { state.el = sym; state.sid = sid || null; }
}
build();
scrollStrip();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labels.setSize(innerWidth, innerHeight);
});
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  // ease the zoom toward the fitted distance after a structure change
  if (fitDist) {
    const d = camera.position.distanceTo(controls.target);
    if (Math.abs(d - fitDist) < 0.01) fitDist = null;
    else camera.position.setLength(d + (fitDist - d) * Math.min(1, dt * 4));
  }
  controls.update();
  updateSticks(false);
  renderer.render(scene, camera);
  labels.render(scene, camera);
});
controls.addEventListener('start', () => { fitDist = null; });
