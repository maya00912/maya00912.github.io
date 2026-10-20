import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = id => document.getElementById(id);
const SPDF = 'spdf';

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------
const ELEMENTS = {
  H: {
    Z: 1, A: 1, name: 'Hydrogen',
    config: '1s1', configLabel: '1s¹',
    extras: [{ key: '2s', from: '1s' }, { key: '2p', from: '1s' }],   // excited states 2s¹ and 2p¹
    visible: ['1s'], m: { '2p': 'z' },
    colors: { '1s': 0x4fb3ff, '2s': 0xffb347, '2p': 0xb48cff },
    samples: 120000, log: false, opacity: 0.75, nucScale: 0.35,   // one electron: brighter dots; a lone proton: smaller marker
    note: 'Hydrogen is the one atom where this picture is <b>exact</b>. With a single electron there is nothing to screen the nucleus (Z<sub>eff</sub> = 1), so the hydrogen-like orbitals used for every element here are the true solutions of the Schrödinger equation. The 1s cloud peaks at exactly 1 a₀ (52.9 pm), the Bohr radius. Tick 2s and 2p to see where the electron goes when it is excited: 2s has a spherical node, 2p has a nodal plane, and both are four times larger. The jumps between these levels give hydrogen\'s spectral lines (2p → 1s emits the 121.6 nm Lyman-α line). Two 1s orbitals overlap into the σ bond of H₂, as at the end of the <a href="reaction.html?rx=li-water" style="color:inherit">Li + H₂O reaction</a>.',
  },
  Li: {
    Z: 3, A: 7, name: 'Lithium',
    config: '1s2 2s1', configLabel: '1s² 2s¹',
    extras: [{ key: '2p', from: '2s' }],   // empty orbitals you can view (as the 1s² 2p¹ excited state)
    visible: ['1s', '2s'], m: { '2p': 'z' },
    colors: { '1s': 0x4fb3ff, '2s': 0xffb347, '2p': 0xb48cff },
    samples: 80000, log: false,
  },
  C: {
    Z: 6, A: 12, name: 'Carbon',
    config: '1s2 2s2 2p2', configLabel: '1s² 2s² 2p²',
    extras: [],
    visible: ['1s', '2s', '2p'], m: {},
    colors: { '1s': 0x4fb3ff, '2s': 0xffb347, '2p': 0x5fd068 },
    samples: 80000, log: false,
    note: 'Carbon\'s two 2p electrons sit in different 2p orbitals with parallel spins (Hund\'s rule), p<sub>x</sub>¹ p<sub>y</sub>¹, so free carbon has two unpaired electrons. In molecules the 2s and 2p orbitals mix into hybrids: sp³ (diamond, methane), sp² (graphite, benzene) or sp (alkynes). Pick 2px, 2py or 2pz from the menu to see the dumbbells that make π bonds. Benzene\'s aromatic ring is six overlapping 2p<sub>z</sub> orbitals, and benzyne adds a strained third bond made from in-plane sp² orbitals: see the <a href="reaction.html?rx=benzyne" style="color:inherit">benzyne reaction</a>.',
  },
  N: {
    Z: 7, A: 14, name: 'Nitrogen',
    config: '1s2 2s2 2p3', configLabel: '1s² 2s² 2p³',
    extras: [],
    visible: ['1s', '2s', '2p'], m: { '2p': 'all' },
    colors: { '1s': 0x4fb3ff, '2s': 0xffb347, '2p': 0x3fe0b0 },
    samples: 80000, log: false,
    note: 'Nitrogen\'s 2p subshell is exactly half full: p<sub>x</sub>¹ p<sub>y</sub>¹ p<sub>z</sub>¹, all with parallel spins. A half-filled subshell, like a full one, is spherically symmetric, so "all m" is the true shape of the atom here. Pick 2px, 2py or 2pz to see the individual dumbbells. Two N atoms pair those three electrons into the N≡N triple bond of N₂ (945 kJ/mol), one of the strongest bonds in chemistry. That is why nitrogen gas is so unreactive, and why gallium needs ammonia or a plasma to form <a href="reaction.html?rx=gan" style="color:inherit">gallium nitride</a>.',
  },
  O: {
    Z: 8, A: 16, name: 'Oxygen',
    config: '1s2 2s2 2p4', configLabel: '1s² 2s² 2p⁴',
    extras: [],
    visible: ['1s', '2s', '2p'], m: { '2p': 'all' },
    colors: { '1s': 0x4fb3ff, '2s': 0xffb347, '2p': 0xff5f6d },
    samples: 80000, log: false,
    note: 'Oxygen\'s four 2p electrons fill the three 2p orbitals as p<sub>x</sub>² p<sub>y</sub>¹ p<sub>z</sub>¹ (Hund\'s rule). The two unpaired electrons make O and O₂ paramagnetic. The 2p subshell starts out as "all m", the spherical average. Pick 2px, 2py or 2pz from the menu to see a single dumbbell. With Z<sub>eff</sub> ≈ 4.55, the 2p electrons are held much more tightly than lithium\'s 2s (1.30). That pull is why oxygen is so electronegative and takes electron density in the <a href="reaction.html" style="color:inherit">Li + H₂O reaction</a>.',
  },
  Ti: {
    Z: 22, A: 48, name: 'Titanium',
    config: '1s2 2s2 2p6 3s2 3p6 3d2 4s2', configLabel: '[Ar] 3d² 4s²',
    extras: [],
    visible: ['3p', '3d', '4s'], m: { '3d': 'z2' },
    samples: 70000, log: false, opacity: 0.45,
    note: 'Titanium is the second transition metal: four valence electrons, 3d² 4s². Compare the clouds: 3d is compact and sits mostly <i>inside</i> the much larger 4s, overlapping the filled 3s²3p⁶ shell. Even so, 4s fills first, because it reaches in close to the nucleus (look at its inner peaks in the radial plot). When titanium is ionised it loses the 4s electrons first, so Ti²⁺ is 3d². Its two 3d electrons are in different d orbitals with parallel spins; pick one from the menu. In the metal the 3d orbitals of neighbouring atoms overlap and join the bonding, which is why titanium is strong and melts at 1668 °C. Giving up all four valence electrons makes Ti⁴⁺, as in the white pigment TiO₂ and in <a href="reaction.html?rx=ticl4" style="color:inherit">TiCl₄, made by burning titanium in chlorine</a>.',
  },
  Ga: {
    Z: 31, A: 69, name: 'Gallium',
    config: '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p1', configLabel: '[Ar] 3d¹⁰ 4s² 4p¹',
    extras: [],
    visible: ['3d', '4s', '4p'], m: { '4p': 'z' },
    samples: 60000, log: false, opacity: 0.5,
    note: 'Gallium has three valence electrons, 4s² 4p¹, outside a filled 3d¹⁰ shell. The 3d electrons screen the nucleus poorly. That "d-block contraction" holds the 4s and 4p electrons tighter than you would expect, so Ga is smaller and less metallic than aluminium\'s trend suggests, and its oxidation state is +3. It melts at 29.8 °C, in your hand. With nitrogen it forms <b>GaN</b>, the semiconductor in blue LEDs: each Ga\'s three valence electrons and N\'s five form four tetrahedral sp³ bonds. See the <a href="reaction.html?rx=gan" style="color:inherit">GaN reaction</a>.',
  },
  I: {
    Z: 53, A: 127, name: 'Iodine',
    config: '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p5', configLabel: '[Kr] 4d¹⁰ 5s² 5p⁵',
    extras: [],
    visible: ['4d', '5s', '5p'], m: { '5p': 'all' },
    samples: 60000, log: false, opacity: 0.55,
    note: 'Iodine has seven valence electrons, 5s² 5p⁵: one short of the xenon shell. Its 5p subshell is p<sub>x</sub>² p<sub>y</sub>² p<sub>z</sub>¹, so there is one unpaired electron. Two I atoms pair those electrons into the I–I σ bond of I₂. Pick 5pz from the menu to see the half-filled orbital that makes it. The 5p cloud is large and far from the nucleus (compare with oxygen\'s compact 2p), so the bond is long (2.67 Å) and weak (151 kJ/mol). The large, easily distorted cloud is also why I₂ is coloured, and why it readily takes an electron to become iodide, I⁻, a closed 5s²5p⁶ shell. That is what happens to it in the <a href="reaction.html?rx=ce-i2" style="color:inherit">Ce + I₂ reaction</a>.',
  },
  Ce: {
    Z: 58, A: 140, name: 'Cerium',
    config: '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p6 4f1 5d1 6s2', configLabel: '[Xe] 4f¹ 5d¹ 6s²',
    extras: [],
    visible: ['4f', '5s', '5p'], m: { '4f': 'xyz', '5d': 'z2' },
    samples: 60000, log: false, opacity: 0.6,
    note: 'Cerium is the first element with an electron in a 4f orbital. Compare 4f with 5s and 5p. The 4f cloud sits inside the filled 5s²5p⁶ shells even though it is higher in energy, so it barely takes part in bonding. The chemistry runs through 5d and 6s, which is why the lanthanides are chemically so alike. The lone 4f and 5d electrons each show one representative real orbital; use the menus to pick another m. Switch on the log radial scale and "show all" to see every shell at once, from 1s (0.03 a₀) out to 6s.',
  },
};

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------
function parseConfig(str) {
  return str.trim().split(/\s+/).map(t => {
    const [, n, l, e] = t.match(/^(\d)([spdf])(\d+)$/);
    return { key: n + l, n: +n, l: SPDF.indexOf(l), e: +e };
  });
}

// Slater's screening rules. Groups: (1s)(2s,2p)(3s,3p)(3d)(4s,4p)(4d)(4f)(5s,5p)…
const groupOrder = (n, l) => n * 10 + (l <= 1 ? 0 : l - 1);
function slaterZeff(Z, n, l, config) {
  const g = groupOrder(n, l);
  let S = 0;
  for (const o of config) {
    const go = groupOrder(o.n, o.l);
    if (go > g) continue;                                  // electrons further out don't screen
    if (go === g) S += (o.e - (o.n === n && o.l === l ? 1 : 0)) * (n === 1 ? 0.30 : 0.35);
    else if (l >= 2) S += o.e;                             // d/f: everything inside screens fully
    else if (o.n === n - 1) S += o.e * 0.85;
    else if (o.n < n - 1) S += o.e;
    else S += o.e * 0.35;                                  // same n, inner group (not possible for s/p)
  }
  return Z - S;
}

// Hydrogen-like radial function (unnormalised): ρ^l e^{-ρ/2} L_{n-l-1}^{2l+1}(ρ), ρ = 2Zr/n
function laguerre(k, a, x) {
  if (k === 0) return 1;
  let l0 = 1, l1 = 1 + a - x;
  for (let i = 1; i < k; i++) [l0, l1] = [l1, ((2 * i + 1 + a - x) * l1 - (i + a) * l0) / (i + 1)];
  return l1;
}
const radial = (sub, r) => {
  const rho = (2 * sub.Z * r) / sub.n;
  return rho ** sub.l * Math.exp(-rho / 2) * laguerre(sub.n - sub.l - 1, 2 * sub.l + 1, rho);
};

// Real spherical harmonics (unnormalised polynomials of the unit vector).
const HARM = [
  [{ id: 's', label: 's', f: () => 1 }],
  [{ id: 'x', label: 'px', f: (x) => x }, { id: 'y', label: 'py', f: (x, y) => y }, { id: 'z', label: 'pz', f: (x, y, z) => z }],
  [{ id: 'xy', label: 'dxy', f: (x, y) => x * y }, { id: 'xz', label: 'dxz', f: (x, y, z) => x * z },
   { id: 'yz', label: 'dyz', f: (x, y, z) => y * z }, { id: 'x2y2', label: 'dx²−y²', f: (x, y) => x * x - y * y },
   { id: 'z2', label: 'dz²', f: (x, y, z) => 3 * z * z - 1 }],
  [{ id: 'z3', label: 'fz³', f: (x, y, z) => z * (5 * z * z - 3) }, { id: 'xz2', label: 'fxz²', f: (x, y, z) => x * (5 * z * z - 1) },
   { id: 'yz2', label: 'fyz²', f: (x, y, z) => y * (5 * z * z - 1) }, { id: 'xyz', label: 'fxyz', f: (x, y, z) => x * y * z },
   { id: 'zx2y2', label: 'fz(x²−y²)', f: (x, y, z) => z * (x * x - y * y) }, { id: 'x3', label: 'fx(x²−3y²)', f: (x, y) => x * (x * x - 3 * y * y) },
   { id: 'y3', label: 'fy(3x²−y²)', f: (x, y) => y * (3 * x * x - y * y) }],
];

function randomUnit() {
  const z = 2 * Math.random() - 1, phi = 2 * Math.PI * Math.random(), s = Math.sqrt(1 - z * z);
  return [s * Math.cos(phi), s * Math.sin(phi), z];
}
// max |Y|² over the sphere, for rejection sampling
for (const set of HARM) for (const h of set) {
  let m = 0;
  for (let i = 0; i < 40000; i++) m = Math.max(m, h.f(...randomUnit()) ** 2);
  h.max2 = m * 1.02;
}

// Tabulated radial CDF of P(r) = r² R(r)² for inverse-transform sampling
const BINS = 8000;
function buildRadial(sub) {
  const rmax = (3 * sub.n * sub.n * 3.5 + 12) / sub.Z;
  const rs = new Float64Array(BINS + 1), cdf = new Float64Array(BINS + 1);
  const dr = rmax / BINS;
  let acc = 0;
  for (let i = 0; i <= BINS; i++) {
    const r = i * dr;
    rs[i] = r;
    if (i > 0) acc += r * r * radial(sub, r) ** 2;
    cdf[i] = acc;
  }
  for (let i = 0; i <= BINS; i++) cdf[i] /= acc;
  // radial nodes: sign changes of R(r)
  const nodes = [];
  for (let i = 1; i < BINS; i++) {
    const a = radial(sub, rs[i]), b = radial(sub, rs[i + 1]);
    if (a * b < 0) nodes.push(rs[i] + dr * a / (a - b));
  }
  Object.assign(sub, { rs, cdf, norm: acc * dr, nodes });
}
const P = (sub, r) => r * r * radial(sub, r) ** 2 / sub.norm; // normalised radial probability density

function sampleRadius({ rs, cdf }) {
  const u = Math.random();
  let lo = 0, hi = cdf.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cdf[mid] < u) lo = mid; else hi = mid; }
  return rs[lo] + (u - cdf[lo]) / (cdf[hi] - cdf[lo] || 1) * (rs[hi] - rs[lo]);
}

// Display mapping of r: linear, or logarithmic so 1s (~0.02 a₀ in Ce) and 6s (~20 a₀) fit in one view
const LOG_A = 1.6, LOG_B = 0.02;
let logScale = false;
const mapR = r => (logScale ? LOG_A * Math.log1p(r / LOG_B) : r);

// Returns [x, y, z, sign] in display coordinates
function samplePoint(sub) {
  const r = sampleRadius(sub);
  const h = sub.m === 'all' ? null : HARM[sub.l].find(h => h.id === sub.m);
  let d = randomUnit();
  if (h) while (Math.random() * h.max2 > h.f(...d) ** 2) d = randomUnit();
  const sign = (Math.sign(radial(sub, r)) || 1) * (h ? Math.sign(h.f(...d)) || 1 : 1);
  const rr = mapR(r);
  return [d[0] * rr, d[1] * rr, d[2] * rr, sign];
}

function subColor(el, n, l, key) {
  if (el.colors?.[key]) return new THREE.Color(el.colors[key]);
  const hue = [215 - 15 * (n - 1), 55 + 14 * (n - 2), 355 + 10 * (n - 3), 300][l];
  return new THREE.Color().setHSL(((hue % 360) + 360) % 360 / 360, 0.85, 0.62);
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x05070d);
$('scene').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.001, 2000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6;
controls.minDistance = 0.05;
controls.maxDistance = 500;

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const keyLight = new THREE.PointLight(0xffffff, 60, 0, 2);
keyLight.position.set(2, 3, 4);
camera.add(keyLight);
scene.add(camera);

{
  const n = 1500, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = randomUnit(), r = 700 + Math.random() * 400;
    p.set([x * r, y * r, z * r], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x334466, size: 1.2, sizeAttenuation: false })));
}

const axes = new THREE.AxesHelper(1);
axes.visible = false;
scene.add(axes);

const cloudUniforms = {
  uSize: { value: 1 }, uOpacity: { value: 0.35 }, uCut: { value: 0 }, uScale: { value: 1 },
  uPixelRatio: { value: renderer.getPixelRatio() },
};
const cloudMaterial = new THREE.ShaderMaterial({
  uniforms: cloudUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */`
    attribute vec3 aColor;
    uniform float uSize, uPixelRatio, uCut, uScale;
    varying vec3 vColor;
    void main() {
      vColor = aColor;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = clamp(uSize * uPixelRatio * uScale * (40.0 / -mv.z), 1.0, 24.0);
      // cutaway: drop the half of the cloud facing the camera
      if (uCut > 0.5 && dot(position, normalize(cameraPosition)) > 0.0) gl_PointSize = 0.0;
    }`,
  fragmentShader: /* glsl */`
    uniform float uOpacity;
    varying vec3 vColor;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = smoothstep(0.5, 0.0, d) * uOpacity;
      gl_FragColor = vec4(vColor * a, a);
    }`,
});

// ---------------------------------------------------------------------------
// Atom state
// ---------------------------------------------------------------------------
let el, subs = [], samples = 80000, colorByPhase = false;
const nucleus = new THREE.Group(), nodeGroup = new THREE.Group();
scene.add(nucleus, nodeGroup);
nodeGroup.visible = false;

function buildCloud(sub) {
  const n = samples, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const neg = sub.color.clone().offsetHSL(0.5, 0, 0);
  for (let i = 0; i < n; i++) {
    const [x, y, z, s] = samplePoint(sub);
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    const c = colorByPhase && s < 0 ? neg : sub.color;
    col[i * 3] = c.r * sub.gain; col[i * 3 + 1] = c.g * sub.gain; col[i * 3 + 2] = c.b * sub.gain;
  }
  if (sub.cloud) { scene.remove(sub.cloud); sub.cloud.geometry.dispose(); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  sub.cloud = new THREE.Points(geo, cloudMaterial);
  sub.cloud.frustumCulled = false;
  scene.add(sub.cloud);
  sub.dirty = false;
}

// Clouds are built lazily (Ce has 14 subshells), only when visible.
function syncClouds() {
  for (const s of subs) {
    if (s.visible && (!s.cloud || s.dirty)) buildCloud(s);
    if (s.cloud) s.cloud.visible = s.visible;
  }
  if ($('autoZoom').checked) fitView();
  buildNodes();
  drawPlot();
}
function invalidate() { subs.forEach(s => { s.dirty = true; }); syncClouds(); }

function buildNodes() {
  nodeGroup.children.forEach(c => c.geometry.dispose());
  nodeGroup.clear();
  for (const s of subs) if (s.visible) for (const r of s.nodes) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(mapR(r), 40, 24),
      new THREE.MeshBasicMaterial({ color: s.color, wireframe: true, transparent: true, opacity: 0.16, depthWrite: false }));
    nodeGroup.add(m);
  }
}

// Nucleus: Z protons + (A−Z) neutrons packed in a ball
function buildNucleus() {
  nucleus.children.forEach(c => c.geometry?.dispose());
  nucleus.clear();
  const A = el.A, geo = new THREE.SphereGeometry(1, 16, 12);
  const pts = [], Rn = Math.cbrt(A) * 0.95;
  // greedy packing of unit spheres inside radius Rn
  for (let tries = 0; pts.length < A && tries < 200000; tries++) {
    const [x, y, z] = randomUnit(), r = Rn * Math.cbrt(Math.random());
    const p = new THREE.Vector3(x * r, y * r, z * r);
    const minD = tries < 150000 ? 1.75 : 1.2;
    if (pts.every(q => q.distanceToSquared(p) > minD * minD)) pts.push(p);
  }
  const isProton = pts.map((_, i) => i < el.Z).sort(() => Math.random() - 0.5);
  for (const [flag, color, emissive] of [[true, 0xff4a4a, 0x440000], [false, 0xb8bcc8, 0x222222]]) {
    const list = pts.filter((_, i) => isProton[i] === flag);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, emissive, roughness: 0.35 }), list.length);
    list.forEach((p, i) => im.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)));
    nucleus.add(im);
  }
  nucleus.userData.radius = Rn + 1;
}
function scaleNucleus() {
  const s1 = subs[0]; // 1s
  // keep the nucleus visible when zoomed out to large orbitals
  const target = Math.max(logScale ? 0.3 : 0.22 * mapR(s1.rmean), 0.012 * viewExt) * (el.nucScale ?? 1);
  nucleus.scale.setScalar(target / nucleus.userData.radius);
  const real = 1.2e-15 * Math.cbrt(el.A) / 5.29177e-11; // nuclear radius in a₀
  $('nucText').innerHTML = (el.A === el.Z ? `A single proton (red), no neutrons, ` : `${el.Z} protons (red) + ${el.A - el.Z} neutrons (grey), `) + `<sup>${el.A}</sup>${Object.keys(ELEMENTS).find(k => ELEMENTS[k] === el)}. ` +
    (logScale ? 'With the log scale on, the nucleus is drawn as a marker and is not to scale.'
      : `Drawn about ${Math.round(target / real).toLocaleString('en-US')}× enlarged. The real nucleus has a radius of about ${real.toExponential(1)} a₀.`);
}

// Frame the visible subshells (all occupied ones if none are visible).
// `jump` snaps the camera; otherwise it glides to the new distance.
let viewExt = 1, targetDist = null;
function fitView(jump = false) {
  const vis = subs.filter(s => s.visible);
  const list = vis.length ? vis : subs.filter(s => s.e > 0);
  const ext = mapR(Math.max(...list.map(s => s.rmean)) * 1.6);
  viewExt = ext;
  cloudUniforms.uScale.value = ext / 7.4;
  axes.scale.setScalar(ext * 1.6);
  targetDist = ext * 4;
  if (jump) {
    camera.position.set(0.55, 0.36, 0.75).setLength(targetDist);
    controls.target.set(0, 0, 0);
  }
  scaleNucleus();
}

function setElement(sym) {
  el = ELEMENTS[sym];
  location.hash = sym;
  subs.forEach(s => { if (s.cloud) { scene.remove(s.cloud); s.cloud.geometry.dispose(); } });

  const config = parseConfig(el.config);
  const make = (o, cfg, extra) => {
    const Z = slaterZeff(el.Z, o.n, o.l, cfg);
    const filled = o.e === 2 * (2 * o.l + 1);
    const sub = {
      ...o, Z, extra, rmean: (3 * o.n * o.n - o.l * (o.l + 1)) / (2 * Z),
      color: subColor(el, o.n, o.l, o.key), gain: o.key === '1s' && el.Z < 5 ? 0.55 : 1,
      m: o.l === 0 ? 'all' : el.m[o.key] || (filled || extra ? 'all' : HARM[o.l][0].id),
      visible: el.visible.includes(o.key), cloud: null, dirty: true,
    };
    buildRadial(sub);
    return sub;
  };
  subs = config.map(o => make(o, config, false));
  for (const x of el.extras) { // excited state: move one electron from `from` into this subshell for Z_eff
    const n = +x.key[0], l = SPDF.indexOf(x.key[1]);
    const cfg = config.map(o => (o.key === x.from ? { ...o, e: o.e - 1 } : o)).concat([{ key: x.key, n, l, e: 1 }]);
    subs.push(make({ key: x.key, n, l, e: 0 }, cfg, true));
  }

  document.querySelectorAll('#elements button').forEach(b => b.classList.toggle('on', b.dataset.el === sym));
  const strip = $('elements'), btn = strip.querySelector('button.on');   // keep the chosen element in view
  if (btn && (btn.offsetLeft < strip.scrollLeft || btn.offsetLeft + btn.offsetWidth > strip.scrollLeft + strip.clientWidth))
    strip.scrollTo({ left: btn.offsetLeft - strip.clientWidth / 2 + btn.offsetWidth / 2, behavior: 'smooth' });
  $('elName').textContent = `${el.name} (${sym}, Z = ${el.Z})`;
  $('elConfig').textContent = el.configLabel;
  $('elNote').innerHTML = el.note ? `<div class="note">${el.note}</div>` : '';
  document.title = `${el.name}: Atomic Orbitals`;

  samples = el.samples;
  $('count').value = samples;
  $('countVal').textContent = samples.toLocaleString('fr-FR');
  logScale = el.log;
  $('logScale').checked = logScale;
  cloudUniforms.uOpacity.value = el.opacity || 0.35;
  $('opacity').value = cloudUniforms.uOpacity.value;

  buildOrbList();
  buildTable();
  buildNucleus();
  fitView(true);
  syncClouds();
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
function buildOrbList() {
  const row = s => {
    const opts = s.l === 0 ? '' : `<select data-key="${s.key}">
      <option value="all"${s.m === 'all' ? ' selected' : ''}>all m (subshell)</option>
      ${HARM[s.l].map(h => `<option value="${h.id}"${s.m === h.id ? ' selected' : ''}>${s.n}${h.label}</option>`).join('')}
    </select>`;
    const sw = '#' + s.color.getHexString();
    return `<div class="orb"><label><input type="checkbox" data-key="${s.key}"${s.visible ? ' checked' : ''}>
      <span class="swatch" style="background:${sw}"></span>${s.key}<span class="tag">${s.e} e⁻</span></label>${opts}</div>`;
  };
  const occ = subs.filter(s => !s.extra), ext = subs.filter(s => s.extra);
  $('orbList').innerHTML = occ.map(row).join('') +
    (ext.length ? `<h2>Excited-state orbitals (empty)</h2>${ext.map(row).join('')}` : '');
  $('orbList').querySelectorAll('input').forEach(cb => cb.addEventListener('change', () => {
    subs.find(s => s.key === cb.dataset.key).visible = cb.checked;
    syncClouds();
  }));
  $('orbList').querySelectorAll('select').forEach(sel => sel.addEventListener('change', () => {
    const s = subs.find(s => s.key === sel.dataset.key);
    s.m = sel.value; s.dirty = true;
    syncClouds();
  }));
}

function setVisible(pred) {
  subs.forEach(s => { s.visible = pred(s); });
  $('orbList').querySelectorAll('input').forEach(cb => { cb.checked = subs.find(s => s.key === cb.dataset.key).visible; });
  syncClouds();
}
$('showAll').onclick = () => setVisible(s => !s.extra);
$('showNone').onclick = () => setVisible(() => false);
$('showValence').onclick = () => {
  const nmax = Math.max(...subs.filter(s => s.e).map(s => s.n));
  // valence: outermost shell plus any partly filled d/f subshells
  setVisible(s => s.e > 0 && (s.n === nmax || (s.l >= 2 && s.e < 2 * (2 * s.l + 1))));
};

function buildTable() {
  $('zTable').innerHTML = '<tr><th>subshell</th><th>e⁻</th><th>Z<sub>eff</sub></th><th>⟨r⟩ / a₀</th><th>radial nodes</th></tr>' +
    subs.map(s => `<tr><td><span class="swatch" style="background:#${s.color.getHexString()}"></span> ${s.key}${s.extra ? '*' : ''}</td>
      <td>${s.e}</td><td>${s.Z.toFixed(2)}</td><td>${s.rmean < 0.1 ? s.rmean.toFixed(3) : s.rmean.toFixed(2)}</td><td>${s.n - s.l - 1}</td></tr>`).join('') +
    (subs.some(s => s.extra) ? '<tr><td colspan="5" class="sub">* Z<sub>eff</sub> for the excited state with one electron promoted</td></tr>' : '');
}

Object.keys(ELEMENTS).forEach(sym => {
  $('elements').insertAdjacentHTML('beforeend',
    `<button data-el="${sym}"><b>${sym}</b><small>${ELEMENTS[sym].Z} · ${ELEMENTS[sym].name}</small></button>`);
});
$('elements').querySelectorAll('button').forEach(b => { b.onclick = () => setElement(b.dataset.el); });
// a vertical wheel over the element strip scrolls the strip sideways, not the whole column
$('elements').addEventListener('wheel', e => {
  if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
  e.preventDefault();
  $('elements').scrollLeft += e.deltaY;
}, { passive: false });

$('logScale').addEventListener('change', e => { logScale = e.target.checked; fitView(true); invalidate(); });
$('autoZoom').addEventListener('change', e => { if (e.target.checked) fitView(); });
$('phase').addEventListener('change', e => { colorByPhase = e.target.checked; invalidate(); });
$('cut').addEventListener('change', e => { cloudUniforms.uCut.value = e.target.checked ? 1 : 0; });
$('nodes').addEventListener('change', e => { nodeGroup.visible = e.target.checked; });
$('spin').addEventListener('change', e => { controls.autoRotate = e.target.checked; });
$('axes').addEventListener('change', e => { axes.visible = e.target.checked; });
$('size').addEventListener('input', e => { cloudUniforms.uSize.value = +e.target.value; });
$('opacity').addEventListener('input', e => { cloudUniforms.uOpacity.value = +e.target.value; });
$('count').addEventListener('input', e => { $('countVal').textContent = (+e.target.value).toLocaleString('fr-FR'); });
$('count').addEventListener('change', e => { samples = +e.target.value; invalidate(); });
$('resample').addEventListener('click', invalidate);

// ---------------------------------------------------------------------------
// Radial probability plot
// ---------------------------------------------------------------------------
function drawPlot() {
  const cv = $('plot'), dpr = devicePixelRatio || 1;
  const W = cv.clientWidth, H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  const pad = { l: 34, r: 8, t: 8, b: 24 }, N = 700;
  const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
  const shown = subs.filter(s => s.visible);
  const range = shown.length ? shown : subs.filter(s => s.e > 0);
  const rmin = Math.min(...range.map(s => s.rmean)), rmaxv = Math.max(...range.map(s => s.rmean));

  // log mode: x = log10 r, y = density per decade (r·P(r)·ln10), so areas stay honest
  const xs = logScale
    ? Array.from({ length: N + 1 }, (_, i) => 10 ** (Math.log10(rmin / 6) + (i / N) * Math.log10(rmaxv * 3.5 / (rmin / 6))))
    : Array.from({ length: N + 1 }, (_, i) => (i / N) * rmaxv * 2.6);
  const y = (s, r) => (logScale ? r * Math.LN10 : 1) * P(s, r);
  const X = logScale
    ? r => pad.l + (Math.log10(r / xs[0]) / Math.log10(xs[N] / xs[0])) * pw
    : r => pad.l + (r / xs[N]) * pw;

  const curves = shown.map(s => ({ s, d: xs.map(r => y(s, r) * Math.max(s.e, 1)) }));
  const total = xs.map((r, i) => curves.reduce((a, c) => a + (c.s.e ? c.d[i] : 0), 0));
  const ymax = Math.max(1e-9, ...total, ...curves.flatMap(c => c.d)) * 1.08;
  const Y = v => pad.t + ph - (v / ymax) * ph;

  g.font = '10px system-ui'; g.fillStyle = '#8b96b3'; g.strokeStyle = 'rgba(140,160,220,0.12)'; g.lineWidth = 1;
  const ticks = logScale
    ? [0.001, 0.01, 0.1, 1, 10, 100].filter(t => t >= xs[0] && t <= xs[N])
    : Array.from({ length: Math.floor(xs[N] / niceStep(xs[N])) + 1 }, (_, i) => i * niceStep(xs[N]));
  for (const t of ticks) {
    g.beginPath(); g.moveTo(X(t), pad.t); g.lineTo(X(t), pad.t + ph); g.stroke();
    g.fillText(String(t), X(t) - 4, H - 8);
  }
  g.textAlign = 'right';
  g.fillText(logScale ? 'r / a₀ (log scale)' : 'r / a₀', W - pad.r - 2, pad.t + 10);
  g.textAlign = 'left';

  const line = (d, color, width, dash = []) => {
    g.beginPath(); g.setLineDash(dash);
    d.forEach((v, i) => { const px = X(xs[i]), py = Y(v); i ? g.lineTo(px, py) : g.moveTo(px, py); });
    g.strokeStyle = color; g.lineWidth = width; g.stroke(); g.setLineDash([]);
  };
  if (curves.length > 1) line(total, 'rgba(232,236,247,0.85)', 1.2);
  for (const { s, d } of curves) line(d, '#' + s.color.getHexString(), 1.8, s.e ? [] : [4, 3]);

  $('plotTitle').textContent = logScale ? 'Radial probability per decade, r·P(r)' : 'Radial probability P(r) = r²|R(r)|²';
  $('legend').innerHTML = shown.map(s => `<span><i class="swatch" style="background:#${s.color.getHexString()}"></i>${s.key}${s.e ? ` ×${s.e}` : ' (empty)'}</span>`).join('')
    + (shown.length > 1 ? '<span><i class="swatch" style="background:#e8ecf7"></i>sum of shown subshells</span>' : '');
}
// minimise / restore the chart (remembered per browser)
function setPlotMin(min) {
  $('plotPanel').classList.toggle('min', min);
  document.body.classList.toggle('plot-min', min);
  $('plotToggle').textContent = min ? '+' : '–';
  $('plotToggle').title = min ? 'Show chart' : 'Minimise chart';
  $('plotToggle').setAttribute('aria-expanded', String(!min));
  try { localStorage.setItem('plotMin', min ? '1' : ''); } catch {}
  if (!min) drawPlot();
}
$('plotToggle').addEventListener('click', e => { e.stopPropagation(); setPlotMin(!$('plotPanel').classList.contains('min')); });
$('plotPanel').addEventListener('click', () => { if ($('plotPanel').classList.contains('min')) setPlotMin(false); });
try { if (localStorage.getItem('plotMin')) setPlotMin(true); } catch {}

function niceStep(range) {
  const raw = range / 6, p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map(m => m * p).find(s => s >= raw);
}

// ---------------------------------------------------------------------------
// Start + loop
// ---------------------------------------------------------------------------
setElement(ELEMENTS[location.hash.slice(1)] ? location.hash.slice(1) : 'Li');

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  drawPlot();
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  if (targetDist) { // glide to the auto-zoom distance
    const d = camera.position.distanceTo(controls.target);
    if (Math.abs(d - targetDist) / targetDist < 0.002) targetDist = null;
    else camera.position.sub(controls.target).setLength(d + (targetDist - d) * Math.min(1, dt * 4)).add(controls.target);
  }
  controls.update();
  nucleus.rotation.y += dt * 0.8;
  nucleus.rotation.x += dt * 0.3;

  renderer.render(scene, camera);
});
