// 2 Li + 2 H₂O → 2 LiOH + H₂
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { V, deg, A0, prim, sphere, along } from './reaction-engine.js';
import { createToolkit, strip, dropper, flameLoop, bunsen, universalColor } from './lab-tools.js';
import { buildLab } from './lab-room.js';

// ---------------------------------------------------------------------------
// Atomic view. Geometry of the left half; the engine mirrors it (x → −x).
// ---------------------------------------------------------------------------
const bond = (A, B, f = 0.42) => prim(A.clone().lerp(B, f), B.clone().sub(A), 'gauss', 0.3, 0.17);
const lonePair = (O, dir) => prim(along(O, dir.clone().normalize(), 0.32), dir, 'gauss', 0.23, 0.19);

const X = V(1, 0, 0), Zh = V(0, 0, 1);
const O = V(-2.6, 0, 0);
const dHa = V(Math.cos(104.5 * deg), Math.sin(104.5 * deg), 0); // H–O–H = 104.5°
const bis = X.clone().add(dHa).normalize();       // H–O–H bisector
const nb = bis.clone().negate();                  // lone-pair side: Li approaches from here
const lpDir = s => nb.clone().multiplyScalar(0.577).addScaledVector(Zh, 0.816 * s);
const perp = V(-bis.y, bis.x, 0);
// OH⁻ with H along `bis`: three lone pairs at the tetrahedral angle from O–H
const tet = phi => bis.clone().multiplyScalar(-1 / 3)
  .addScaledVector(perp, Math.sqrt(8 / 9) * Math.cos(phi * deg))
  .addScaledVector(Zh, Math.sqrt(8 / 9) * Math.sin(phi * deg));

const atomsAt = (liDist, hb, ha = along(O, dHa, 0.96)) => ({ Li: along(O, nb, liDist), O: O.clone(), Ha: ha, Hb: hb });

const atomic = {
  camera: { pos: V(0, -1.6, 12.5), target: V(0, -1.6, 0) },
  atoms: { Li: [0.13, 0xc58cff], O: [0.12, 0xff4a4a], Ha: [0.07, 0xffffff], Hb: [0.07, 0xffffff] },
  // per half: [Li core, Li 2s valence, O–Ha bond, O–Hb bond, lone pair 1, lone pair 2]
  clouds: [
    { dots: 4800, group: 0, color: 0x4fb3ff, gain: 0.45 },
    { dots: 7200, group: 1, color: 0xffb347 },
    { dots: 4800, group: 2, color: 0x3fe0b0, gain: 0.8 },
    { dots: 4800, group: 2, color: 0xff5fa2, gain: 0.8 },
    { dots: 4800, group: 2, color: 0x9be15d, gain: 0.7 },
    { dots: 4800, group: 2, color: 0x9be15d, gain: 0.7 },
  ],
  groups: [
    { label: 'Li 1s² core (stays on Li⁺)', color: '#4fb3ff' },
    { label: 'Li 2s valence electron', color: '#ffb347' },
    { label: 'Water\'s 8 valence electrons:', items: [
      { label: 'O–H bond that survives', color: '#3fe0b0' },
      { label: 'O–H bond that breaks → O lone pair', color: '#ff5fa2' },
      { label: 'O lone pairs', color: '#9be15d' },
    ] },
  ],
  stages: [
    {
      title: '1 · Reactants approach',
      desc: 'A lithium atom (1s² 2s¹) approaches a water molecule. Li holds its single 2s electron loosely: the ionization energy is only 5.39 eV, and the cloud is huge and diffuse (⟨r⟩ ≈ 2.5 Å). Water\'s 8 valence electrons sit in two O–H σ bonds and two lone pairs on oxygen.',
      hold: 2.5, trans: 4, route: 0,
      labels: { Li: 'Li', O: 'O', Ha: 'H', Hb: 'H' },
      bonds: [['O', 'Ha', 1], ['O', 'Hb', 1]],
      build() {
        const a = atomsAt(5.2, along(O, X, 0.96));
        return { a, clouds: [
          [sphere(a.Li, '1s', A0 / 2.69)],
          [sphere(a.Li, '2s', A0 / 1.28)],
          [bond(a.O, a.Ha)], [bond(a.O, a.Hb)],
          [lonePair(a.O, lpDir(1))], [lonePair(a.O, lpDir(-1))],
        ] };
      },
    },
    {
      title: '2 · Li···OH₂ complex forms',
      desc: 'Li is drawn to an oxygen lone pair and forms a Li···OH₂ complex (Li–O ≈ 2 Å). Pauli repulsion from the lone pairs pushes the 2s cloud to the far side of Li. The orbital polarizes as 2s mixes with 2p.',
      hold: 2.5, trans: 3.5, route: 1,
      labels: { Li: 'Li', O: 'O', Ha: 'H', Hb: 'H' },
      bonds: [['O', 'Ha', 1], ['O', 'Hb', 1], ['Li', 'O', 0.3]],
      build() {
        const a = atomsAt(2.0, along(O, X, 0.96));
        return { a, clouds: [
          [sphere(a.Li, '1s', A0 / 2.69)],
          [prim(along(a.Li, nb, 0.55), nb, '2s', 0.48, 0.38)],
          [bond(a.O, a.Ha)], [bond(a.O, a.Hb)],
          [lonePair(a.O, lpDir(1))], [lonePair(a.O, lpDir(-1))],
        ] };
      },
    },
    {
      title: '3 · Electron transfer into σ*(O–H)',
      desc: 'The 2s electron moves into water\'s lowest empty orbital, the antibonding σ*(O–H). σ* has a node between O and H and holds most of its density on the outer side of H. Li becomes Li⁺, with only its compact 1s² core left. An electron in an antibonding orbital weakens the O–H bond, which starts to stretch.',
      hold: 2.5, trans: 3.5, route: 2,
      labels: { Li: 'Li⁺', O: 'O', Ha: 'H', Hb: 'H' },
      bonds: [['O', 'Ha', 1], ['O', 'Hb', 0.5], ['Li', 'O', 0.6]],
      build() {
        const a = atomsAt(1.85, along(O, X, 1.2));
        return { a, clouds: [
          [sphere(a.Li, '1s', A0 / 2.69)],
          [prim(along(a.Li, nb, 0.6), nb, '2s', 0.42, 0.34, 0.3),   // remnant still on Li
            prim(along(a.Hb, X, 0.3), X, 'gauss', 0.36, 0.32, 0.55), // σ* big lobe beyond H
            prim(along(a.O, X, -0.3), X, 'gauss', 0.26, 0.26, 0.15)], // σ* small lobe behind O
          [bond(a.O, a.Ha)], [bond(a.O, a.Hb, 0.33)],
          [lonePair(a.O, lpDir(1))], [lonePair(a.O, lpDir(-1))],
        ] };
      },
    },
    {
      title: '4 · O–H bond breaks: OH⁻ + H•',
      desc: 'With a bond order of only ½, the O–H bond breaks. The bonding pair (magenta) collapses onto oxygen as a new lone pair, which makes hydroxide, OH⁻. The transferred electron leaves on the hydrogen in a 1s orbital: a hydrogen radical H•. Li⁺ and OH⁻ stay together by electrostatic attraction.',
      hold: 2.5, trans: 4, route: 3,
      labels: { Li: 'Li⁺', O: 'OH⁻', Ha: 'H', Hb: 'H•' },
      bonds: [['O', 'Ha', 1], ['Li', 'O', 0.8]],
      build() {
        const a = atomsAt(1.7, along(O, X, 1.75));
        return { a, clouds: [
          [sphere(a.Li, '1s', A0 / 2.69)],
          [sphere(a.Hb, '1s', A0)],
          [bond(a.O, a.Ha)], [lonePair(a.O, X)],
          [lonePair(a.O, lpDir(1))], [lonePair(a.O, lpDir(-1))],
        ] };
      },
    },
    {
      title: '5 · Products: 2 LiOH + H₂',
      desc: 'The two H• radicals overlap their 1s orbitals into one bonding σ orbital: H₂. It holds both electrons that came from the lithium atoms (orange). Each OH⁻ rearranges into one O–H bond and three lone pairs and pairs up with Li⁺ as linear Li–O–H. Overall ΔH ≈ −222 kJ per mol of Li.',
      hold: 6, trans: 0, route: 4,
      labels: { Li: 'Li⁺', O: 'OH⁻', Ha: 'H', Hb: 'H' },
      bonds: [['O', 'Ha', 1], ['Li', 'O', 0.8], ['Hb', "Hb'", 1]],
      build() {
        const a = atomsAt(1.6, V(-0.37, 0, 0), along(O, bis, 0.96));
        return { a, clouds: [
          [sphere(a.Li, '1s', A0 / 2.69)],
          [prim(V(0, 0, 0), X, 'gauss', 0.34, 0.27)],
          [bond(a.O, a.Ha)], [lonePair(a.O, tet(150))],
          [lonePair(a.O, tet(30))], [lonePair(a.O, tet(270))],
        ] };
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Naked-eye view: a chip of lithium in a beaker of water
// ---------------------------------------------------------------------------
const macro = {
  camera: { pos: V(0, 2.1, 4.8), target: V(0, 1.0, 0), maxDist: 22 },
  setup({ THREE, scene, camera, controls, dom, $ }) {
    const R = 0.9, BEAKER_H = 1.5, WATER_TOP = 1.0, GLASS_BOTTOM = 0.06;
    {
      buildLab(scene, { u: 20, bench: [-1.3, 1.6], clear: [-0.45, 0.45] }); // open bench: water + Li needs no fume hood

      const glass = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.16,
        clearcoat: 1, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false,
      });
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, BEAKER_H, 72, 1, true), glass);
      wall.position.y = BEAKER_H / 2;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.012, 8, 72), glass.clone());
      rim.material.opacity = 0.45;
      rim.rotation.x = Math.PI / 2;
      rim.position.y = BEAKER_H;
      const bottom = new THREE.Mesh(new THREE.CylinderGeometry(R, R, GLASS_BOTTOM, 72), glass.clone());
      bottom.material.opacity = 0.3;
      bottom.position.y = GLASS_BOTTOM / 2;
      // graduation marks
      const marks = new THREE.Group();
      const markMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
      for (let i = 1; i <= 6; i++) {
        const w = i % 2 ? 0.08 : 0.14;
        const mk = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.006), markMat);
        mk.position.set(-w / 2 + 0.02, GLASS_BOTTOM + i * 0.2, R + 0.002);
        marks.add(mk);
      }
      marks.rotation.y = -0.5;
      scene.add(wall, rim, bottom, marks);
    }

    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transmission: 1, roughness: 0.04, metalness: 0, ior: 1.333, thickness: 1.2,
      attenuationColor: new THREE.Color(0xe3f3ff), attenuationDistance: 5, side: THREE.DoubleSide,
      depthWrite: false, // so tools dipped into the solution stay visible through it
    });
    const waterSide = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.012, R - 0.012, WATER_TOP - GLASS_BOTTOM, 72, 1, true), waterMat);
    waterSide.position.y = (WATER_TOP + GLASS_BOTTOM) / 2;
    const surfGeo = new THREE.RingGeometry(0.001, R - 0.012, 96, 28);
    surfGeo.rotateX(-Math.PI / 2);
    const surfBase = surfGeo.attributes.position.array.slice();
    const surface = new THREE.Mesh(surfGeo, waterMat);
    surface.position.y = WATER_TOP;
    scene.add(waterSide, surface);

    // Lithium chip
    const LI_W = 0.26, LI_H = 0.11, LI_D = 0.19;
    const liMat = new THREE.MeshStandardMaterial({ color: 0xd2d2cb, metalness: 0.95, roughness: 0.25 });
    const liMesh = new THREE.Mesh(new RoundedBoxGeometry(LI_W, LI_H, LI_D, 3, 0.03), liMat);
    scene.add(liMesh);
    const FRESH = new THREE.Color(0xd2d2cb), TARNISHED = new THREE.Color(0x7a7a72);

    // Bubbles (instanced)
    const MAXB = 700;
    const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0, metalness: 0, transparent: true, opacity: 0.55, clearcoat: 1, envMapIntensity: 2.2,
    }), MAXB);
    bubbles.frustumCulled = false;
    scene.add(bubbles);
    const bub = Array.from({ length: MAXB }, () => ({ alive: false, p: new THREE.Vector3(), v: new THREE.Vector3(), r: 0, life: 0, onSurface: false }));

    // Phenolphthalein plume (sinking pink streaks of LiOH solution)
    const plumeTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    const plume = Array.from({ length: 180 }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: plumeTex, color: 0xff2f92, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false;
      scene.add(s);
      return { s, v: new THREE.Vector3(), life: 0, max: 1 };
    });

    // ---- testing kit (unlocks when the lithium is used up) ------------------
    const solutionPH = () => { const oh = (molLi * sim.f) / VOL; return oh > 1e-7 ? Math.max(7, 14 + Math.log10(oh)) : 7; };
    const solutionT = () => 20 + (molLi * sim.f * 222000) / (VOL * 1000 * 4.18);
    const sw = c => `<span class="sw" style="background:#${c.getHexString()}"></span>`;
    const kit = createToolkit({
      scene, camera, controls, dom, container: $('testKit'),
      lockedText: 'The testing kit unlocks when the lithium has fully reacted.',
      intro: 'Drag a tool with the mouse into the beaker, or into the Bunsen flame on the left. Tools return to the rack when you let go.',
      onSkip: () => { Object.assign(sim, { drop: 0, f: 1, mixed: 1, inWater: 30, t: Math.max(sim.t, 50) }); },
    });
    kit.addZone('solution', p => Math.hypot(p.x, p.z) < R - 0.03 && p.y < WATER_TOP, { x: 0, z: 0, y0: 0, y1: 1.8, r: 1.0 },
      { at: V(0, WATER_TOP - 0.25, R + 0.02), r: 0.13, text: 'LiOH solution' });
    kit.addZone('beaker', p => Math.hypot(p.x, p.z) < R && p.y > GLASS_BOTTOM && p.y < BEAKER_H + 0.05);
    kit.addContainer({ x: 0, z: 0, r: R, top: BEAKER_H }); // tools go in and out over the rim, never through the glass
    const burner = bunsen(scene, -1.2, 0.45);
    kit.addZone('flame', burner.contains, { x: -1.2, z: 0.45, y0: 0.3, y1: 1.3, r: 0.3 },
      { at: V(-1.2, 0.62, 0.53), r: 0.1, text: 'Bunsen flame' });

    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.12), new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.8, transparent: true }));
    rack.position.set(-0.05, 0.03, 1.2);
    scene.add(rack);

    { // universal indicator paper
      const st = strip(0xf4f1e6, 0xf2b84b);
      kit.addTool({
        name: 'Universal indicator paper', hint: 'dip the pad into the solution', targets: ['solution'], obj: st.obj, tip: st.tip, home: V(-0.7, 0.22, 1.2),
        reset: () => st.pad.material.color.set(0xf2b84b),
        onEnter(z) {
          if (z !== 'solution') return;
          const ph = solutionPH(), c = universalColor(ph);
          st.pad.material.color.copy(c);
          kit.showPH(ph);
          kit.log(`Universal indicator paper ${sw(c)} turns <b>dark blue-violet</b>: pH ≈ ${Math.round(ph)}. The solution is <b>strongly basic</b>, which is lithium hydroxide, LiOH(aq).`);
        },
      });
    }
    { // red litmus
      const st = strip(0xd9534f, 0xd9534f, { padLen: 0.12 });
      kit.addTool({
        name: 'Red litmus paper', hint: 'turns blue in a base', targets: ['solution'], obj: st.obj, tip: st.tip, home: V(-0.52, 0.22, 1.2),
        reset: () => st.pad.material.color.set(0xd9534f),
        onEnter(z) {
          if (z !== 'solution') return;
          const basic = solutionPH() > 8.3;
          st.pad.material.color.set(basic ? 0x3b6fd8 : 0xd9534f);
          kit.log(basic ? `Red litmus ${sw(st.pad.material.color)} turns <b>blue</b>, so the solution is alkaline.` : 'Red litmus stays red, so the solution is not alkaline.');
        },
      });
    }
    { // blue litmus
      const st = strip(0x3b6fd8, 0x3b6fd8, { padLen: 0.12 });
      kit.addTool({
        name: 'Blue litmus paper', hint: 'turns red in an acid', targets: ['solution'], obj: st.obj, tip: st.tip, home: V(-0.36, 0.22, 1.2),
        reset: () => st.pad.material.color.set(0x3b6fd8),
        onEnter(z) {
          if (z !== 'solution') return;
          kit.log(`Blue litmus ${sw(st.pad.material.color)} <b>stays blue</b>, so the solution is not acidic.`);
        },
      });
    }
    { // pH meter: fixed body with an LCD, draggable probe on a cable
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.18), new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.5 }));
      body.position.set(1.15, 0.035, 1.0);
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
      const ctx = canvas.getContext('2d'), tex = new THREE.CanvasTexture(canvas);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshBasicMaterial({ map: tex }));
      screen.rotation.x = -Math.PI / 2 + 0.5;
      screen.position.set(1.15, 0.085, 1.01);
      scene.add(body, screen);
      let shown = '';
      const lcd = (big, small) => {
        if (shown === big + small) return;
        shown = big + small;
        ctx.fillStyle = '#9fb59a'; ctx.fillRect(0, 0, 256, 128);
        ctx.fillStyle = '#1d2a1b'; ctx.font = 'bold 58px monospace'; ctx.textAlign = 'center';
        ctx.fillText(big, 128, 72);
        ctx.font = '22px monospace'; ctx.fillText(small, 128, 110);
        tex.needsUpdate = true;
      };
      lcd('-.--', 'pH   probe in air');
      const probe = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 0.4 }));
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), new THREE.MeshPhysicalMaterial({ color: 0xdfefff, roughness: 0.05, transparent: true, opacity: 0.6 }));
      bulb.position.y = -0.155;
      probe.add(stem, bulb);
      const cableGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 24 }, () => new THREE.Vector3()));
      const cable = new THREE.Line(cableGeo, new THREE.LineBasicMaterial({ color: 0x111111 }));
      cable.frustumCulled = false;
      scene.add(cable);
      const a = new THREE.Vector3(1.15, 0.07, 0.93), b = new THREE.Vector3(), m = new THREE.Vector3();
      kit.addTool({
        name: 'pH meter probe', hint: 'dip into the solution and read the display', targets: ['solution'], obj: probe, tip: V(0, -0.15, 0), home: V(0.62, 0.22, 1.2),
        onEnter(z) {
          if (z !== 'solution') return;
          kit.showPH(solutionPH());
          kit.log(`pH meter reads <b>${solutionPH().toFixed(2)}</b> at ${solutionT().toFixed(1)} °C. That matches [OH⁻] ≈ ${((molLi * sim.f) / VOL).toFixed(3)} mol/L from 50 mg of Li in 100 mL.`);
        },
        update(t, dt, time) {
          if (t.inZone === 'solution') lcd((solutionPH() + 0.005 * Math.sin(time * 1.7)).toFixed(2), `pH   ${solutionT().toFixed(1)} °C`);
          else lcd('-.--', 'pH   probe in air');
          cable.visible = probe.visible;
          b.set(0, 0.15, 0).applyMatrix4(probe.matrixWorld);
          m.lerpVectors(a, b, 0.5); m.y = Math.min(a.y, b.y) - 0.05;
          const pos = cableGeo.attributes.position;
          for (let i = 0; i < 24; i++) {
            const u = i / 23, w0 = (1 - u) ** 2, w1 = 2 * u * (1 - u), w2 = u * u;
            pos.setXYZ(i, a.x * w0 + m.x * w1 + b.x * w2, a.y * w0 + m.y * w1 + b.y * w2, a.z * w0 + m.z * w1 + b.z * w2);
          }
          pos.needsUpdate = true;
        },
      });
    }
    { // flame-test loop: clean → wet (dipped) → residue (after heating); "Clean all tools" resets it
      const lp = flameLoop();
      let state = 'clean';
      const setState = st => { state = st; lp.setState(st); };
      kit.addTool({
        name: 'Flame-test wire loop', hint: 'dip in the solution, then hold it in the Bunsen flame', targets: ['solution', 'flame'], obj: lp.obj, tip: lp.tip, home: V(0.2, 0.28, 1.2),
        reset: () => setState('clean'),
        onEnter(z) {
          if (z === 'solution') {
            setState('wet');
            kit.log('The wire loop picks up a film of the solution. Now hold it in the flame.');
          }
          if (z !== 'flame') return;
          if (state === 'wet') {
            burner.flash(0xff1530, 3.5);
            setState('residue');
            kit.log('Flame test: a <b style="color:#ff3355">crimson-red</b> flame, so <b>lithium ions (Li⁺)</b> are present (Li emission line at 670.8 nm). A salt residue is left on the loop. Clean it before testing another sample.');
          } else if (state === 'residue') {
            burner.flash(0xff1530, 1.5);
            kit.log('The dried residue still colours the flame <b style="color:#ff3355">red</b>. The loop is contaminated: press <b>🧼 Clean all tools</b> before the next test.');
          } else kit.log('Clean loop in the flame: the wire glows, but the flame colour doesn\'t change. Dip it in the solution first.');
        },
        update(t) { lp.wireMat.emissive.setHex(t.inZone === 'flame' ? 0xff6a00 : 0x000000); },
      });
    }
    { // phenolphthalein dropper
      const dr = dropper(0xf4f4f4);
      kit.addTool({
        name: 'Phenolphthalein dropper', hint: 'hold over the beaker to add a few drops', targets: ['solution'], obj: dr.obj, tip: dr.tip, home: V(0.42, 0.2, 1.2),
        onEnter(z, t, at) {
          if (z !== 'beaker' && z !== 'solution') return;
          kit.drop(at, WATER_TOP, 0xffffff, () => {
            const was = $('indicator').checked;
            $('indicator').checked = true;
            sim.mixed = Math.max(sim.mixed, sim.f * 0.6);
            if (!was) kit.log('Phenolphthalein turns the water <b style="color:#ff5fa2">pink-magenta</b>, so the pH is above about 8.2. The solution is basic.');
          });
        },
      });
    }

    const PINK = new THREE.Color(0xff6fb5), PINK_ATT = new THREE.Color(0xff2f8f), CLEAR_ATT = new THREE.Color(0xe3f3ff);
    const WHITE = new THREE.Color(0xffffff);
    const sim = {};
    function reset() {
      Object.assign(sim, {
        t: 0, f: 0, mixed: 0, drop: 0.9, // seconds until the chip touches the water
        pos: new THREE.Vector3((Math.random() - 0.5) * 0.4, 1.7, (Math.random() - 0.5) * 0.4),
        vel: new THREE.Vector3(), yaw: Math.random() * 6, yawV: 0, bubbleAcc: 0, plumeAcc: 0, inWater: 0,
      });
      bub.forEach(b => { b.alive = false; });
      plume.forEach(p => { p.s.visible = false; p.life = 0; });
      liMat.color.copy(FRESH); liMat.roughness = 0.25;
      liMesh.visible = true;
      kit.setEnabled(false);
    }
    $('drop').onclick = reset;

    const K_RATE = 0.06; // df/dt = k (1-f)^(2/3) → completes in 3/k = 50 s
    const M_LI = 0.05, VOL = 0.1; // 50 mg Li in 100 mL
    const molLi = M_LI / 6.94;
    const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();

    function spawnBubble(onSurface, scale) {
      const b = bub.find(b => !b.alive);
      if (!b) return;
      const ang = Math.random() * Math.PI * 2;
      const ex = LI_W * 0.5 * scale, ez = LI_D * 0.5 * scale;
      b.alive = true;
      b.onSurface = onSurface;
      b.r = 0.004 + Math.random() * (onSurface ? 0.008 : 0.012);
      if (onSurface) { // fizz ring at the waterline around the chip
        b.p.set(sim.pos.x + Math.cos(ang) * ex * 1.1, WATER_TOP, sim.pos.z + Math.sin(ang) * ez * 1.1);
        b.v.set(Math.cos(ang), 0, Math.sin(ang)).multiplyScalar(0.03 + Math.random() * 0.05);
        b.life = 0.2 + Math.random() * 0.8;
      } else { // nucleate on the submerged faces, rise to the surface
        b.p.set(sim.pos.x + (Math.random() - 0.5) * 2 * ex, WATER_TOP - LI_H * 0.5 * scale - Math.random() * 0.01,
          sim.pos.z + (Math.random() - 0.5) * 2 * ez);
        b.v.set((Math.random() - 0.5) * 0.04, 0.08 + Math.random() * 0.12, (Math.random() - 0.5) * 0.04);
        b.life = 5;
      }
    }

    function update(dt, time) {
      const s = sim;
      s.t += dt;
      let scale = Math.cbrt(1 - s.f);
      let activity = 0;

      if (s.drop > 0) { // falling in
        s.drop -= dt;
        s.pos.y = WATER_TOP + 0.7 * Math.max(0, s.drop / 0.9) ** 2;
        if (s.drop <= 0) for (let i = 0; i < 40; i++) spawnBubble(true, scale); // splash
      } else if (s.f < 1) {
        s.inWater += dt;
        s.f = Math.min(1, s.f + K_RATE * Math.pow(1 - s.f, 2 / 3) * dt);
        if (s.f > 0.9995) s.f = 1;
        scale = Math.cbrt(1 - s.f);
        activity = scale * scale;

        // Gas jets push the chip around in a slow random walk
        s.vel.x += (Math.random() - 0.5) * 1.2 * dt * activity;
        s.vel.z += (Math.random() - 0.5) * 1.2 * dt * activity;
        s.vel.multiplyScalar(Math.exp(-1.2 * dt));
        s.yawV += (Math.random() - 0.5) * 3 * dt * activity;
        s.yawV *= Math.exp(-1.5 * dt);
        s.yaw += s.yawV * dt;
        s.pos.x += s.vel.x * dt; s.pos.z += s.vel.z * dt;
        const rr = Math.hypot(s.pos.x, s.pos.z), lim = R - 0.2;
        if (rr > lim) { // bounce off the glass
          const nx = s.pos.x / rr, nz = s.pos.z / rr, vn = s.vel.x * nx + s.vel.z * nz;
          if (vn > 0) { s.vel.x -= 2 * vn * nx; s.vel.z -= 2 * vn * nz; }
          s.pos.x = nx * lim; s.pos.z = nz * lim;
        }
        // ~53% submerged (density 0.534) + bobbing from the fizz
        s.pos.y = WATER_TOP + (0.5 - 0.534) * LI_H * scale + 0.003 * Math.sin(time * 9) * activity;

        s.bubbleAcc += 320 * activity * dt;
        while (s.bubbleAcc > 1) { s.bubbleAcc--; spawnBubble(Math.random() < 0.45, scale); }

        if ($('indicator').checked) {
          s.plumeAcc += 9 * activity * dt;
          while (s.plumeAcc > 1) {
            s.plumeAcc--;
            const p = plume.find(p => p.life <= 0);
            if (p) {
              p.life = p.max = 6 + Math.random() * 4;
              p.s.position.set(s.pos.x + (Math.random() - 0.5) * 0.1, WATER_TOP - 0.06, s.pos.z + (Math.random() - 0.5) * 0.1);
              p.v.set((Math.random() - 0.5) * 0.03, -0.05 - Math.random() * 0.05, (Math.random() - 0.5) * 0.03);
              p.s.visible = true;
            }
          }
        }
        // tarnish (oxide/nitride layer) over the first ~10 s
        const tar = 1 - Math.exp(-s.inWater / 6);
        liMat.color.lerpColors(FRESH, TARNISHED, tar);
        liMat.roughness = 0.25 + 0.4 * tar;
      }

      liMesh.visible = s.f < 1;
      liMesh.scale.setScalar(Math.max(scale, 0.001));
      liMesh.position.copy(s.pos);
      liMesh.rotation.set(0.04 * Math.sin(time * 5) * activity, s.yaw, 0.04 * Math.cos(time * 6) * activity);

      for (let i = 0; i < MAXB; i++) {
        const b = bub[i];
        if (b.alive) {
          b.life -= dt;
          if (b.onSurface) {
            b.p.addScaledVector(b.v, dt);
            b.p.y = WATER_TOP + 0.002;
          } else {
            b.v.y += 0.15 * dt; // buoyancy
            b.p.addScaledVector(b.v, dt);
            if (b.p.y >= WATER_TOP) { b.onSurface = true; b.life = 0.1 + Math.random() * 0.5; b.v.set(b.v.x, 0, b.v.z); }
          }
          if (b.life <= 0 || Math.hypot(b.p.x, b.p.z) > R - 0.02) b.alive = false;
        }
        tmpS.setScalar(b.alive ? b.r : 0);
        tmpM.compose(b.p, tmpQ, tmpS);
        bubbles.setMatrixAt(i, tmpM);
      }
      bubbles.instanceMatrix.needsUpdate = true;

      // Plume streaks sink, spread and fade
      for (const p of plume) {
        if (p.life <= 0) { p.s.visible = false; continue; }
        p.life -= dt;
        const age = 1 - p.life / p.max;
        p.s.position.addScaledVector(p.v, dt);
        p.v.multiplyScalar(Math.exp(-0.15 * dt));
        if (p.s.position.y < GLASS_BOTTOM + 0.1) { p.s.position.y = GLASS_BOTTOM + 0.1; p.v.y = 0; }
        const rr = Math.hypot(p.s.position.x, p.s.position.z);
        if (rr > R - 0.15) p.s.position.multiplyScalar((R - 0.15) / rr);
        p.s.scale.setScalar(0.06 + age * 0.45);
        p.s.material.opacity = 0.32 * Math.sin(Math.PI * Math.min(1, age * 1.2)) * (1 - age);
        if (!$('indicator').checked) p.life = 0;
      }

      // Global tint: LiOH mixes through the beaker over several seconds (plumes show it first);
      // phenolphthalein turns pink above pH ~8.2
      s.mixed += (s.f - s.mixed) * Math.min(1, dt / 10);
      const tint = $('indicator').checked ? 1 - Math.exp(-5 * s.mixed) : 0;
      waterMat.color.lerpColors(WHITE, PINK, tint * 0.8);
      waterMat.attenuationColor.lerpColors(CLEAR_ATT, PINK_ATT, tint);
      waterMat.attenuationDistance = 5 - 4.2 * tint;

      // Ripples spreading from the chip
      const pos = surfGeo.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        const x = surfBase[i], z = surfBase[i + 2];
        const d = Math.hypot(x - s.pos.x, z - s.pos.z);
        pos[i + 1] = 0.004 * activity * Math.sin(40 * d - 14 * time) * Math.exp(-4 * d)
          + 0.0008 * Math.sin(7 * x + time * 1.3) * Math.sin(6 * z - time);
      }
      surfGeo.attributes.position.needsUpdate = true;
      surfGeo.computeVertexNormals();

      const oh = (molLi * s.f) / VOL;
      $('mTime').textContent = s.t.toFixed(1) + ' s';
      $('mLi').textContent = ((1 - s.f) * 100).toFixed(1) + ' %';
      $('mH2').textContent = (molLi * s.f / 2 * 24465).toFixed(1) + ' mL';
      $('mPH').textContent = (oh > 1e-7 ? Math.max(7, 14 + Math.log10(oh)) : 7).toFixed(2);
      $('mT').textContent = (20 + (molLi * s.f * 222000) / (VOL * 1000 * 4.18)).toFixed(1) + ' °C';
      $('mBar').style.width = s.f * 100 + '%';

      if (!kit.enabled && s.f >= 1) kit.setEnabled(true);
      burner.group.visible = kit.enabled;
      burner.update(1 / 60, time);
      kit.update(time);
    }
    return { reset, update };
  },
};

export default {
  ui: {
    title: 'Lithium + Water',
    heading: 'Li + H₂O at the electron level',
    equation: '2 Li + 2 H₂O → 2 LiOH + H₂',
    routeTitle: 'Where is lithium\'s 2s electron?',
    route: [
      'Li 2s (diffuse, spherical)',
      'Li 2s polarized (2s–2p mixing)',
      'H₂O σ*(O–H) antibonding orbital',
      'H 1s (hydrogen radical H•)',
      'H–H σ bonding orbital (H₂)',
    ],
    foot: 'The model: each cloud is drawn from approximate |ψ|² shapes (hydrogen-like orbitals with Slater effective charges, and Gaussian lobes for bonds and lone pairs), with smooth morphing between stages of the reaction. Dots keep their identity, so you can watch the electron density flow. Two Li + H₂O pairs react side by side so that two H• can pair up into H₂. In liquid water the 2s electron first becomes a hydrated electron e⁻(aq) before it reduces water. This page shows the simpler electron-transfer picture.',
    macro: {
      title: 'What you\'d actually see',
      sub: 'A ~50 mg chip of lithium dropped into 100 mL of water.',
      observations: `• Lithium <b>floats</b> (density 0.53 g/cm³) and drifts slowly around the surface.<br>
        • Steady <b>fizzing</b>: colourless, odourless H₂ gas. It's gentler than Na or K, and Li doesn't melt (m.p. 180 °C) or catch fire.<br>
        • The silvery metal <b>dulls</b> to grey and the chip shrinks until it's gone.<br>
        • The water stays clear, but it is now LiOH solution, a strong base. Add phenolphthalein and it turns <b style="color:#ff5fa2">pink</b>.`,
      controls: `<label><input type="checkbox" id="indicator">Add phenolphthalein indicator</label>
        <button id="drop" style="margin-top:6px;width:100%">Drop a new piece of Li</button>
        <div id="testKit"></div>`,
      measurements: [
        ['mTime', 'Elapsed time', '0 s'],
        ['mLi', 'Lithium remaining', '100 %'],
        ['mH2', 'H₂ released (25 °C)', '0 mL'],
        ['mPH', 'Solution pH', '7.0'],
        ['mT', 'Water temperature', '20.0 °C'],
      ],
      foot: 'A real 50 mg piece takes about a minute. ΔH ≈ −222 kJ per mol of Li, so the temperature rise assumes no heat is lost.',
    },
  },
  atomic,
  macro,
};
