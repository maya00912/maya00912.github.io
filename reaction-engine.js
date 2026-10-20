// Shared engine for the reaction pages: an atomic view (morphing electron clouds
// driven by keyframed stages) and a naked-eye view (a lab scene supplied by the
// reaction module). Reaction modules default-export { ui, atomic, macro }.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const REACTIONS = {
  'li-water': { name: '2 Li + 2 H₂O → 2 LiOH + H₂', file: './rx-li-water.js' },
  'ce-i2': { name: '2 Ce + 3 I₂ → 2 CeI₃', file: './rx-ce-iodine.js' },
  'benzyne': { name: 'Benzyne formation: C₆H₄ + CO₂ + N₂', file: './rx-benzyne.js' },
  'gan': { name: 'Gallium nitride: 2 Ga + N₂ → 2 GaN', file: './rx-gan.js' },
  'ticl4': { name: 'Titanium tetrachloride: Ti + 2 Cl₂ → TiCl₄', file: './rx-ticl4.js' },
};

const $ = id => document.getElementById(id);
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const deg = Math.PI / 180;
export const A0 = 0.529; // Bohr radius in Å
const smooth = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// ---------------------------------------------------------------------------
// Cloud shapes. Lengths in Å. Each shape is a weighted mixture of "primitives":
// a radial profile scaled anisotropically along an axis, optionally with an
// angular profile around that axis. Every dot keeps the same random numbers at
// all keyframes, so interpolating between keyframes morphs the cloud smoothly
// and density visibly flows from one orbital to another.
// ---------------------------------------------------------------------------
function makeInverseCDF(pdf, lo, hi, N = 4096) {
  const B = 8000, cdf = new Float64Array(B + 1);
  for (let i = 1; i <= B; i++) cdf[i] = cdf[i - 1] + pdf(lo + (i / B) * (hi - lo));
  const total = cdf[B], inv = new Float32Array(N + 1);
  let j = 0;
  for (let k = 0; k <= N; k++) {
    const u = (k / N) * total;
    while (j < B - 1 && cdf[j + 1] < u) j++;
    const c0 = cdf[j], c1 = cdf[j + 1];
    inv[k] = lo + ((j + (c1 > c0 ? (u - c0) / (c1 - c0) : 0)) / B) * (hi - lo);
  }
  return u => { const x = u * N, k = Math.min(N - 1, x | 0); return inv[k] + (inv[k + 1] - inv[k]) * (x - k); };
}

// Radial distributions P(r) in reduced units (multiplied by the primitive's scale)
const PROFILE = {
  '1s': makeInverseCDF(r => r * r * Math.exp(-2 * r), 0, 12),             // hydrogenic 1s, ⟨r⟩ = 1.5
  '2s': makeInverseCDF(r => r * r * (2 - r) ** 2 * Math.exp(-r), 0, 30),  // hydrogenic 2s with radial node, ⟨r⟩ = 6
  gauss: makeInverseCDF(r => r * r * Math.exp(-r * r / 2), 0, 6),         // Gaussian lobe, ⟨r⟩ ≈ 1.6
  shell: makeInverseCDF(r => r ** 6 * Math.exp(-r), 0, 40),               // nodeless d-like shell, ⟨r⟩ = 7
  '4f': makeInverseCDF(r => r ** 8 * Math.exp(-r), 0, 50),                // hydrogenic 4f, ⟨r⟩ = 9
};
// Angular distributions in z = cos θ about the primitive's axis
const ANGULAR = {
  ring: makeInverseCDF(z => 1 - z * z, -1, 1),                  // π-type donut around the axis
  dz2: makeInverseCDF(z => (3 * z * z - 1) ** 2, -1, 1),        // d_z²: two lobes + collar
  fz3: makeInverseCDF(z => (5 * z ** 3 - 3 * z) ** 2, -1, 1),   // f_z³: two lobes + two cones
  pz: makeInverseCDF(z => z * z, -1, 1),                       // p orbital: two lobes along the axis
};

export const prim = (c, d, prof, sPar, sPerp, w = 1, ang = null) =>
  ({ c: c.clone(), d: d.clone().normalize(), prof, s: [sPar, sPerp], w, ang });
export const sphere = (c, prof, a, w = 1) => prim(c, V(1, 0, 0), prof, a, a, w);
export const along = (P, d, s) => P.clone().addScaledVector(d, s);
export const mirror = v => V(-v.x, v.y, v.z);
const mirrorPrim = p => ({ ...p, c: mirror(p.c), d: mirror(p.d) });

// ---------------------------------------------------------------------------
export async function start() {
  const id = new URLSearchParams(location.search).get('rx');
  const key = REACTIONS[id] ? id : 'li-water';
  const sel = $('rxSelect');
  sel.innerHTML = Object.entries(REACTIONS)
    .map(([k, r]) => `<option value="${k}"${k === key ? ' selected' : ''}>${r.name}</option>`).join('');
  sel.onchange = () => { location.search = '?rx=' + sel.value; };
  const mod = await import(REACTIONS[key].file);
  runReaction(mod.default);
}

function runReaction(rx) {
  const { ui, atomic: AX, macro: MX } = rx;

  // ---------- panels
  document.title = ui.title;
  $('rxTitle').textContent = ui.heading;
  $('rxEq').textContent = ui.equation;
  $('routeTitle').textContent = ui.routeTitle;
  $('route').innerHTML = ui.route.map(r => `<li>${r}</li>`).join('');
  $('rxFoot').innerHTML = ui.foot;
  $('legend').innerHTML = AX.groups.map((g, gi) =>
    `<label><input type="checkbox" data-group="${gi}" checked>` +
    (g.color ? `<span class="swatch" style="background:${g.color}"></span>` : '') + `${g.label}</label>` +
    (g.items || []).map(it => `<div class="legend-item"><span class="swatch" style="background:${it.color}"></span>${it.label}</div>`).join('')
  ).join('');
  const M = ui.macro;
  $('mxTitle').textContent = M.title;
  $('mxSub').innerHTML = M.sub;
  $('mxObs').innerHTML = M.observations;
  $('mxControls').innerHTML = M.controls;
  $('mxTable').innerHTML = M.measurements.map(([id, label, init]) => `<tr><td>${label}</td><td id="${id}">${init}</td></tr>`).join('');
  $('mxFoot').innerHTML = M.foot;

  // ---------- renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  $('scene').appendChild(renderer.domElement);
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(innerWidth, innerHeight);
  Object.assign(labelRenderer.domElement.style, { position: 'fixed', inset: '0', pointerEvents: 'none' });
  document.body.appendChild(labelRenderer.domElement);

  // =========================================================================
  // ATOMIC VIEW
  // =========================================================================
  const { clouds: CLOUDS, stages: STAGES } = AX;
  const ATOM_KEYS = Object.keys(AX.atoms);
  let acc = 0;
  STAGES.forEach(s => { s.t = acc; acc += s.hold + s.trans; });
  const TOTAL = acc;

  // symmetric reactions build the left half and mirror it; `mirror: false` builds the whole system
  const SIDES = AX.mirror === false ? [0] : [0, 1];
  const halfCount = CLOUDS.reduce((s, c) => s + c.dots, 0);
  const N = halfCount * SIDES.length;
  const [uR, uZ, uP, uS] = Array.from({ length: 4 }, () => Float32Array.from({ length: N }, Math.random));

  function sampleInto(out, start, n, prims) {
    const total = prims.reduce((s, p) => s + p.w, 0);
    const bases = prims.map(p => {
      const up = Math.abs(p.d.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
      const e1 = new THREE.Vector3().crossVectors(p.d, up).normalize();
      return { e1, e2: new THREE.Vector3().crossVectors(p.d, e1) };
    });
    for (let i = start; i < start + n; i++) {
      let s = uS[i] * total, k = 0;
      while (k < prims.length - 1 && s > prims[k].w) { s -= prims[k].w; k++; }
      const p = prims[k], { e1, e2 } = bases[k];
      const r = PROFILE[p.prof](uR[i]);
      const z = p.ang ? ANGULAR[p.ang](uZ[i]) : 2 * uZ[i] - 1;
      const ph = 2 * Math.PI * uP[i], q = Math.sqrt(Math.max(0, 1 - z * z));
      const a = r * z * p.s[0], b1 = r * q * Math.cos(ph) * p.s[1], b2 = r * q * Math.sin(ph) * p.s[1];
      out[i * 3]     = p.c.x + p.d.x * a + e1.x * b1 + e2.x * b2;
      out[i * 3 + 1] = p.c.y + p.d.y * a + e1.y * b1 + e2.y * b2;
      out[i * 3 + 2] = p.c.z + p.d.z * a + e1.z * b1 + e2.z * b2;
    }
  }

  // Each stage builds the left half; the right half is its mirror image (x → −x).
  const keyframes = STAGES.map(stage => {
    const { a, clouds } = stage.build();
    const pos = new Float32Array(N * 3);
    for (const side of SIDES) {
      let start = side * halfCount;
      clouds.forEach((prims, ci) => {
        sampleInto(pos, start, CLOUDS[ci].dots, side ? prims.map(mirrorPrim) : prims);
        start += CLOUDS[ci].dots;
      });
    }
    const atoms = SIDES.flatMap(side => ATOM_KEYS.map(k => (side ? mirror(a[k]) : a[k])));
    return { attr: new THREE.BufferAttribute(pos, 3), atoms };
  });

  const color = new Float32Array(N * 3), groupAttr = new Float32Array(N), seed = Float32Array.from({ length: N }, Math.random);
  for (const side of SIDES) {
    let i = side * halfCount;
    CLOUDS.forEach(c => {
      const col = new THREE.Color(c.color).multiplyScalar(c.gain ?? 1);
      for (let j = 0; j < c.dots; j++, i++) { color.set([col.r, col.g, col.b], i * 3); groupAttr[i] = c.group; }
    });
  }

  const atomic = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.01, 500) };
  atomic.scene.background = new THREE.Color(0x05070d);
  atomic.camera.position.copy(AX.camera.pos);
  atomic.controls = new OrbitControls(atomic.camera, renderer.domElement);
  atomic.controls.target.copy(AX.camera.target);
  atomic.controls.enableDamping = true;
  atomic.controls.autoRotateSpeed = 0.5;

  const cloudUniforms = {
    uMix: { value: 0 }, uTime: { value: 0 }, uSize: { value: 1.6 }, uOpacity: { value: 0.55 },
    uPixelRatio: { value: renderer.getPixelRatio() }, uShow: { value: new THREE.Vector4(1, 1, 1, 1) },
  };
  const cloudGeo = new THREE.BufferGeometry();
  cloudGeo.setAttribute('position', keyframes[0].attr);
  cloudGeo.setAttribute('posB', keyframes[1].attr);
  cloudGeo.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
  cloudGeo.setAttribute('aGroup', new THREE.BufferAttribute(groupAttr, 1));
  cloudGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const cloud = new THREE.Points(cloudGeo, new THREE.ShaderMaterial({
    uniforms: cloudUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: /* glsl */`
      attribute vec3 posB, aColor; attribute float aGroup, aSeed;
      uniform float uMix, uTime, uSize, uPixelRatio; uniform vec4 uShow;
      varying vec3 vColor;
      void main() {
        vec3 p = mix(position, posB, uMix);
        // gentle shimmer so the clouds read as fluctuating densities, not solids
        p += 0.02 * sin(vec3(uTime * 2.3 + aSeed * 91.7, uTime * 1.7 + aSeed * 47.3, uTime * 2.9 + aSeed * 13.1));
        float show = aGroup < 0.5 ? uShow.x : aGroup < 1.5 ? uShow.y : aGroup < 2.5 ? uShow.z : uShow.w;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = show * clamp(uSize * uPixelRatio * (28.0 / -mv.z), 1.0, 20.0);
        vColor = aColor;
      }`,
    fragmentShader: /* glsl */`
      uniform float uOpacity; varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d) * uOpacity;
        gl_FragColor = vec4(vColor * a, a);
      }`,
  }));
  cloud.frustumCulled = false;
  atomic.scene.add(cloud);

  // Nuclei + labels
  const nuclei = [];
  for (const side of SIDES) for (const k of ATOM_KEYS) {
    const [r, c] = AX.atoms[k];
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshBasicMaterial({ color: c }));
    const div = document.createElement('div');
    div.className = 'atom-label';
    m.add(new CSS2DObject(div));
    atomic.scene.add(m);
    nuclei.push({ mesh: m, key: k, div });
  }

  // Optional bond sticks. A stage may list bonds: [[atomA, atomB, order], ...]; order 1/2/3
  // draws 1/2/3 lines, and fractional orders (bonds breaking or forming) draw faded lines.
  const sticks = [];
  const hasBonds = STAGES.some(st => st.bonds);
  if (hasBonds) {
    const pairs = new Map();
    STAGES.forEach((st, si) => (st.bonds || []).forEach(([a, b, o]) => {
      const key = a + '|' + b;
      if (!pairs.has(key)) pairs.set(key, { a, b, orders: STAGES.map(() => 0) });
      pairs.get(key).orders[si] = o;
    }));
    const geo = new THREE.CylinderGeometry(1, 1, 1, 8);
    for (const side of SIDES) for (const bd of pairs.values()) {
      // a key ending in ' means "that atom in the mirrored half" (e.g. N–N' across the mirror plane)
      const cross = bd.b.endsWith("'");
      if (cross && side === 1) continue;
      const ia = side * ATOM_KEYS.length + ATOM_KEYS.indexOf(bd.a);
      const ib = (cross ? 1 - side : side) * ATOM_KEYS.length + ATOM_KEYS.indexOf(cross ? bd.b.slice(0, -1) : bd.b);
      const lines = [0, 1, 2].map(() => {
        const l = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xe8ecf7, transparent: true, opacity: 0.85, depthWrite: false }));
        atomic.scene.add(l);
        return l;
      });
      sticks.push({ ia, ib, orders: bd.orders, lines });
    }
  }
  $('sticksRow').style.display = hasBonds ? '' : 'none';
  const UP = V(0, 1, 0), tmpD = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpC = new THREE.Vector3();
  function updateSticks(k, kNext, m) {
    const on = $('sticks').checked;
    for (const st of sticks) {
      const o = st.orders[k] + (st.orders[kNext] - st.orders[k]) * m;
      const A = nuclei[st.ia].mesh.position, B = nuclei[st.ib].mesh.position;
      tmpD.subVectors(B, A);
      const len = tmpD.length();
      tmpD.normalize();
      // offset parallel lines sideways in the plane facing the viewer
      tmpP.crossVectors(tmpD, atomic.camera.position.clone().sub(A)).normalize();
      const n = on ? Math.max(0, Math.ceil(o - 0.05)) : 0;
      const frac = o - (n - 1);
      const offs = n === 3 ? [0, -0.11, 0.11] : n === 2 ? [-0.06, 0.06] : [0];
      st.lines.forEach((l, i) => {
        l.visible = i < n;
        if (!l.visible) return;
        tmpC.addVectors(A, B).multiplyScalar(0.5).addScaledVector(tmpP, offs[i]);
        l.position.copy(tmpC);
        l.quaternion.setFromUnitVectors(UP, tmpD);
        l.scale.set(0.022, Math.max(0.01, len - 0.22), 0.022);
        l.material.opacity = 0.85 * (i === n - 1 ? Math.min(1, Math.max(0.2, frac)) : 1);
      });
    }
  }

  {
    const n = 1200, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const z = 2 * Math.random() - 1, ph = 2 * Math.PI * Math.random(), q = Math.sqrt(1 - z * z), r = 120 + 80 * Math.random();
      p.set([q * Math.cos(ph) * r, q * Math.sin(ph) * r, z * r], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    atomic.scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x334466, size: 0.6 })));
  }

  $('scrub').max = TOTAL;
  STAGES.forEach((s, i) => {
    const pct = (s.t / TOTAL) * 100;
    $('ticks').insertAdjacentHTML('beforeend', `<i style="left:${pct}%"></i><span style="left:${pct}%">${i + 1}</span>`);
  });

  let atomicT = 0, currentSeg = -1;
  const routeItems = [...document.querySelectorAll('#route li')];

  function updateAtomic(t) {
    let k = STAGES.length - 1;
    while (k > 0 && t < STAGES[k].t) k--;
    const s = STAGES[k], last = k === STAGES.length - 1;
    const m = last ? 0 : smooth((t - s.t - s.hold) / s.trans);
    if (k !== currentSeg) {
      currentSeg = k;
      cloudGeo.setAttribute('position', keyframes[k].attr);
      cloudGeo.setAttribute('posB', keyframes[last ? k : k + 1].attr);
    }
    cloudUniforms.uMix.value = m;

    const A = keyframes[k].atoms, B = keyframes[last ? k : k + 1].atoms;
    const shown = m > 0.5 && !last ? STAGES[k + 1] : s;
    nuclei.forEach((n, i) => { n.mesh.position.lerpVectors(A[i], B[i], m); });
    if (hasBonds) updateSticks(k, last ? k : k + 1, m);
    nuclei.forEach(n => {
      const txt = shown.labels[n.key];
      if (n.div.textContent !== txt) {
        n.div.textContent = txt;
        n.div.classList.toggle('ion', /[⁺⁻•]/.test(txt));
      }
    });
    if ($('stageTitle').textContent !== shown.title) {
      $('stageTitle').textContent = shown.title;
      $('stageDesc').textContent = shown.desc;
    }
    routeItems.forEach((li, i) => {
      li.classList.toggle('active', i === shown.route);
      li.classList.toggle('done', i < shown.route);
    });
    $('scrub').value = t;
  }

  // =========================================================================
  // NAKED-EYE VIEW (contents supplied by the reaction module)
  // =========================================================================
  const macro = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.01, 800) };
  macro.scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  macro.scene.background = new THREE.Color(0x14171e);
  macro.camera.position.copy(MX.camera.pos);
  macro.controls = new OrbitControls(macro.camera, renderer.domElement);
  macro.controls.target.copy(MX.camera.target);
  macro.controls.enableDamping = true;
  macro.controls.minDistance = 0.5;
  macro.controls.maxDistance = MX.camera.maxDist ?? 12;
  macro.controls.enabled = false;
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(2.5, 5, 2);
  macro.scene.add(sun, new THREE.AmbientLight(0xffffff, 0.15));
  const lab = MX.setup({ THREE, scene: macro.scene, camera: macro.camera, controls: macro.controls, dom: renderer.domElement, $ });
  lab.reset();

  // =========================================================================
  // UI + main loop
  // =========================================================================
  let mode = 'atomic', playing = true, speed = 1;
  function setMode(m) {
    mode = m;
    const isAtomic = m === 'atomic';
    $('modeAtomic').classList.toggle('on', isAtomic);
    $('modeMacro').classList.toggle('on', !isAtomic);
    $('stagePanel').style.display = isAtomic ? '' : 'none';
    $('timeline').classList.toggle('compact', !isAtomic);   // naked-eye: playback buttons only, no stage track
    $('macroPanel').style.display = isAtomic ? 'none' : 'block';
    labelRenderer.domElement.style.display = isAtomic && $('labels').checked ? '' : 'none';
    atomic.controls.enabled = isAtomic;
    macro.controls.enabled = !isAtomic;
    renderer.toneMapping = isAtomic ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  }
  $('modeAtomic').onclick = () => setMode('atomic');
  $('modeMacro').onclick = () => setMode('macro');
  $('play').onclick = () => { playing = !playing; $('play').textContent = playing ? '❚❚' : '▶'; };
  $('restart').onclick = () => { if (mode === 'atomic') atomicT = 0; else lab.reset(); };
  $('speed').oninput = e => { speed = +e.target.value; $('speedVal').textContent = speed.toFixed(1) + '×'; };
  $('scrub').oninput = e => { atomicT = +e.target.value; };
  $('spin').onchange = e => { atomic.controls.autoRotate = e.target.checked; };
  $('labels').onchange = e => { labelRenderer.domElement.style.display = e.target.checked ? '' : 'none'; };
  $('opacity').oninput = e => { cloudUniforms.uOpacity.value = +e.target.value; };
  $('size').oninput = e => { cloudUniforms.uSize.value = +e.target.value; };
  const show = cloudUniforms.uShow.value;
  $('legend').querySelectorAll('input[data-group]').forEach(cb => {
    cb.onchange = () => { show.setComponent(+cb.dataset.group, cb.checked ? 1 : 0); };
  });
  setMode(new URLSearchParams(location.search).get('view') === 'macro' ? 'macro' : 'atomic');

  function fitCameras() {
    const panelW = innerWidth > 900 ? 370 : 0;
    for (const v of [atomic, macro]) {
      v.camera.aspect = innerWidth / innerHeight;
      v.camera.setViewOffset(innerWidth, innerHeight, -panelW / 2, 0, innerWidth, innerHeight);
    }
  }
  fitCameras();
  addEventListener('resize', () => {
    fitCameras();
    renderer.setSize(innerWidth, innerHeight);
    labelRenderer.setSize(innerWidth, innerHeight);
  });

  const clock = new THREE.Clock();
  let time = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;
    const sdt = playing ? dt * speed : 0;
    if (mode === 'atomic') {
      atomicT += sdt;
      if (atomicT > TOTAL + 1.5) atomicT = 0; // loop with a short pause on the products
      updateAtomic(Math.min(atomicT, TOTAL));
      cloudUniforms.uTime.value = time;
      atomic.controls.update();
      renderer.render(atomic.scene, atomic.camera);
      labelRenderer.render(atomic.scene, atomic.camera);
    } else {
      lab.update(sdt, time);
      macro.controls.update();
      renderer.render(macro.scene, macro.camera);
    }
  });
}
