// Draggable lab tools for the naked-eye views. A toolkit owns a set of tools
// (3D objects you drag with the mouse) and zones (regions of the scene such as
// "the solution" or "the flame"). When a tool's tip enters a zone, the tool's
// onEnter(zoneId) runs; reactions use this to show test results.
import * as THREE from 'three';

// Universal indicator colours, pH 1–14
const UNIVERSAL = ['#e8202a', '#ee4423', '#f5761f', '#f9a11b', '#fcc917', '#e6e21a', '#8dc63f',
  '#3fb54a', '#129a7f', '#1a75bb', '#2a4fa0', '#3b3593', '#4d2a85', '#5b1f72'];
export function universalColor(ph) {
  const x = Math.min(13, Math.max(0, ph - 1)), i = Math.floor(x), t = x - i;
  return new THREE.Color(UNIVERSAL[i]).lerp(new THREE.Color(UNIVERSAL[Math.min(13, i + 1)]), t);
}

// --- small geometry helpers for building tools -----------------------------
export function strip(paperColor, padColor, { len = 0.32, padLen = 0.05 } = {}) {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.026, len, 0.003), new THREE.MeshStandardMaterial({ color: paperColor, roughness: 0.9 }));
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.03, padLen, 0.006), new THREE.MeshStandardMaterial({ color: padColor, roughness: 0.8 }));
  pad.position.y = -len / 2 + padLen / 2;
  g.add(paper, pad);
  g.userData.pad = pad;
  return { obj: g, tip: new THREE.Vector3(0, -len / 2 + 0.01, 0), pad };
}
export function dropper(liquidColor, bulbColor = 0xc0392b) {
  const g = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.006, 0.26, 16), glass);
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.006, 0.12, 12), new THREE.MeshStandardMaterial({ color: liquidColor, transparent: true, opacity: 0.8 }));
  liquid.position.y = -0.06;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), new THREE.MeshStandardMaterial({ color: bulbColor, roughness: 0.6 }));
  bulb.scale.y = 1.5;
  bulb.position.y = 0.16;
  g.add(tube, liquid, bulb);
  return { obj: g, tip: new THREE.Vector3(0, -0.13, 0) };
}
export function flameLoop() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 12), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 }));
  handle.position.y = 0.1;
  const wireMat = new THREE.MeshStandardMaterial({ color: 0xb8b8b8, metalness: 0.9, roughness: 0.3, emissive: 0x000000 });
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.22, 6), wireMat);
  wire.position.y = -0.09;
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0025, 6, 16), wireMat);
  loop.position.y = -0.21;
  const filmMat = new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.6, roughness: 0.2, side: THREE.DoubleSide });
  const film = new THREE.Mesh(new THREE.CircleGeometry(0.0115, 16), filmMat);
  film.position.y = -0.21;
  film.visible = false;
  g.add(handle, wire, loop, film);
  // state: 'clean' | 'wet' (sample picked up) | 'residue' (dried salt left after heating)
  const setState = state => {
    film.visible = state !== 'clean';
    if (state === 'wet') { filmMat.color.set(0xcfe8ff); filmMat.opacity = 0.55; }
    if (state === 'residue') { filmMat.color.set(0xf2efe6); filmMat.opacity = 0.95; }
  };
  return { obj: g, tip: new THREE.Vector3(0, -0.21, 0), wireMat, setState };
}
export function bunsen(scene, x, z) {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x8c9099, metalness: 0.85, roughness: 0.35 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.05, 32), new THREE.MeshStandardMaterial({ color: 0x1d1f24, roughness: 0.5 }));
  base.position.y = 0.025;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.36, 20), steel);
  barrel.position.y = 0.23;
  const outerMat = new THREE.MeshBasicMaterial({ color: 0x3d6dff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const outer = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.38, 24, 1, true), outerMat);
  outer.position.y = 0.41 + 0.19;
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  inner.position.y = 0.41 + 0.075;
  g.add(base, barrel, outer, inner);
  g.position.set(x, 0, z);
  scene.add(g);
  const BLUE = new THREE.Color(0x3d6dff);
  let colourT = 0, colour = new THREE.Color();
  return {
    group: g,
    // region of the flame, for a zone test
    contains: p => Math.hypot(p.x - x, p.z - z) < 0.11 && p.y > 0.3 && p.y < 0.9,
    flash(hex, seconds = 3) { colour.set(hex); colourT = seconds; },
    update(dt, time) {
      colourT = Math.max(0, colourT - dt);
      const k = Math.min(1, colourT);
      outerMat.color.copy(BLUE).lerp(colour, k);
      outerMat.opacity = 0.35 + 0.4 * k;
      outer.scale.set(1 + 0.05 * Math.sin(time * 23) + 0.3 * k, 1 + 0.08 * Math.sin(time * 17) + 0.4 * k, 1 + 0.3 * k);
      inner.scale.y = 1 + 0.06 * Math.sin(time * 29);
    },
  };
}
// Liquid in a container that can go cloudy and drop a sediment
export function liquidColumn(scene, { x, z, r, bottom, top }) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xeef6ff, transparent: true, opacity: 0.14, roughness: 0.2, depthWrite: false });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, top - bottom, 24), mat);
  m.position.set(x, (top + bottom) / 2, z);
  const sedMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const sed = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.98, r * 0.98, 1, 24), sedMat);
  sed.visible = false;
  scene.add(m, sed);
  return {
    mesh: m, mat, sed, x, z, r, bottom, top,
    setSediment(h, color) {
      sed.visible = h > 0.001;
      sed.scale.y = Math.max(h, 0.001);
      sed.position.set(x, bottom + h / 2, z);
      sedMat.color.set(color);
    },
  };
}

// floating text label (always drawn on top)
export function textSprite(text) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = 'bold 44px system-ui, sans-serif';
  const w = Math.ceil(g.measureText(text).width) + 44;
  c.width = w; c.height = 76;
  g.font = 'bold 44px system-ui, sans-serif';
  g.fillStyle = 'rgba(10,14,24,0.85)'; g.strokeStyle = '#4fd1ff'; g.lineWidth = 4;
  g.beginPath(); g.roundRect(2, 2, w - 4, 72, 18); g.fill(); g.stroke();
  g.fillStyle = '#ffffff'; g.textBaseline = 'middle'; g.fillText(text, 22, 40);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, transparent: true }));
  sp.scale.set(0.11 * w / 76, 0.11, 1);
  sp.renderOrder = 999;
  return sp;
}

// ---------------------------------------------------------------------------
export function createToolkit({ scene, camera, controls, dom, container, lockedText, intro, onSkip, phChart = true, toolScale = 1.6, toastSide = 'top' }) {
  const tools = [], zones = [], drops = [], containers = [];
  let enabled = false, drag = null, last = performance.now();
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane();
  const hit = new THREE.Vector3(), offset = new THREE.Vector3(), tipW = new THREE.Vector3(), camDir = new THREE.Vector3();

  container.innerHTML = `
    <div class="kit-locked">🔒 ${lockedText}<br><button class="kit-btn" data-act="skip">⏩ Skip to the end of the reaction</button></div>
    <div class="kit" style="display:none">
      <h2>🧪 Test the product</h2>
      <div class="sub">${intro}</div>
      <div class="kit-extra"></div>
      <button class="kit-btn kit-clean" data-act="reset">🧼 Clean all tools &amp; take fresh paper strips</button>
      <ul class="kit-tools"></ul>
      ${phChart ? `<div class="ph-chart">${UNIVERSAL.map((c, i) => `<span style="background:${c}" data-ph="${i + 1}">${i + 1}</span>`).join('')}</div>
        <div class="ph-scale"><span>acidic</span><span>neutral</span><span>basic</span></div>` : ''}
      <h2>Lab notebook</h2>
      <ol class="kit-log"><li class="sub">No tests yet.</li></ol>
    </div>`;
  const $k = sel => container.querySelector(sel);
  $k('[data-act=skip]').onclick = () => onSkip();
  $k('[data-act=reset]').onclick = () => {
    tools.forEach(t => { t.reset?.(t); t.returning = true; t.liftY = liftHeight(t); });
    log('🧼 All tools cleaned (the wire loop was dipped in HCl and heated until it gave no colour), and fresh paper strips were taken.');
  };

  const tipEl = document.createElement('div');
  tipEl.className = 'tool-tip';
  document.body.appendChild(tipEl);

  // anchor {x, z, y0, y1, r}: a vertical column over the target. While the pointer is over it,
  // the dragged tool moves at the target's depth (so it can actually go into a beaker or tube).
  // marker {at, r, text, when?}: a glowing ring + floating label showing where tools can go.
  // While a tool is dragged, markers of the zones it can be used in light up and the rest dim.
  function addZone(id, contains, anchor = null, marker = null) {
    const a = anchor && { v0: new THREE.Vector3(anchor.x, anchor.y0, anchor.z), v1: new THREE.Vector3(anchor.x, anchor.y1, anchor.z), r2: anchor.r ** 2 };
    const zone = { id, contains, anchor: a };
    if (marker) {
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x4fd1ff, transparent: true, opacity: 0.7, depthTest: false, depthWrite: false });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(marker.r, Math.max(0.006, marker.r * 0.09), 8, 40), ringMat);
      ring.position.copy(marker.at);
      ring.renderOrder = 998;
      const lbl = textSprite(marker.text);
      lbl.position.copy(marker.at).add(new THREE.Vector3(0, marker.r + 0.09, 0));
      ring.visible = lbl.visible = false;
      scene.add(ring, lbl);
      zone.marker = { ring, ringMat, lbl, when: marker.when };
    }
    zones.push(zone);
  }

  function addTool(t) {
    // generous invisible grab box; never added to the scene, only used for picking
    // (parts marked userData.noGrab, e.g. a lamp's light beam, don't count toward the grab box)
    const box = new THREE.Box3();
    t.obj.updateMatrixWorld(true);
    t.obj.traverse(o => { if (o.isMesh && !o.userData.noGrab) box.expandByObject(o); });
    const size = box.getSize(new THREE.Vector3());
    t.grab = new THREE.Mesh(new THREE.BoxGeometry(size.x + 0.05, size.y + 0.02, size.z + 0.05));
    t.grabOffset = new THREE.Matrix4().makeTranslation(box.getCenter(new THREE.Vector3()));
    t.grab.userData.tool = t;
    // render tools in the transparent pass: the water's refraction capture only sees opaque
    // objects, so this keeps tools in front of a beaker from appearing as ghosts inside it
    t.obj.traverse(o => { if (o.material) o.material.transparent = true; });
    t.obj.scale.setScalar(toolScale);
    t.S = toolScale;
    t.halfW = Math.max(size.x, size.z) / 2 * toolScale;   // horizontal half-width, for wall collisions
    t.insideOf = new Set();
    t.home = t.home.clone();
    t.home.y = Math.max(t.home.y, 0.075 - t.tip.y * toolScale); // stand on the rack
    t.obj.position.copy(t.home);
    t.obj.visible = enabled;
    t.inZone = null;
    t.obj.traverse(o => { o.userData.tool = t; });
    scene.add(t.obj);
    tools.push(t);
    t.reset?.(t);
    $k('.kit-tools').insertAdjacentHTML('beforeend', `<li><b>${t.name}</b><span class="sub"> · ${t.hint}</span></li>`);
  }
  let logEmpty = true;
  const toastEl = document.createElement('div');
  toastEl.className = 'kit-toast' + (toastSide === 'right' ? ' right' : '');
  document.body.appendChild(toastEl);
  let toastTimer;
  function log(html) {
    toastEl.innerHTML = html;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 5000);
    const ol = $k('.kit-log');
    if (logEmpty) { ol.innerHTML = ''; logEmpty = false; }
    ol.insertAdjacentHTML('afterbegin', `<li>${html}</li>`);
  }
  function showPH(ph) {
    container.querySelectorAll('.ph-chart span').forEach(s => s.classList.toggle('hit', +s.dataset.ph === Math.round(ph)));
  }
  function setEnabled(on) {
    enabled = on;
    if (!on) toastEl.classList.remove('show');
    $k('.kit-locked').style.display = on ? 'none' : '';
    $k('.kit').style.display = on ? '' : 'none';
    tools.forEach(t => { t.obj.visible = on; t.obj.position.copy(t.home); t.inZone = null; t.insideOf.clear(); t.returning = false; t.liftY = null; });
  }
  // a falling drop from `from` that lands at height `toY`, then calls onLand
  function drop(from, toY, color, onLand) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.8 }));
    m.position.copy(from);
    scene.add(m);
    drops.push({ m, v: 0, toY, onLand });
  }

  // --- dragging -------------------------------------------------------------
  function pick(e) {
    const r = dom.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const grabs = tools.filter(t => t.obj.visible).map(t => {
      t.grab.matrixWorld.multiplyMatrices(t.obj.matrixWorld, t.grabOffset);
      return t.grab;
    });
    const hits = ray.intersectObjects(grabs, false);
    return hits.length ? hits[0].object.userData.tool : null;
  }
  // Listen on the canvas' parent in the capture phase so a tool grab never reaches OrbitControls
  const host = dom.parentElement;
  host.addEventListener('pointerdown', e => {
    if (!enabled || !controls.enabled) return;
    const t = pick(e);
    if (!t) return;
    e.stopPropagation();
    drag = t;
    camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();
    plane.setFromNormalAndCoplanarPoint(camDir, t.obj.position);
    ray.ray.intersectPlane(plane, hit);
    offset.copy(t.obj.position).sub(hit);
    controls.enabled = false;
    dom.style.cursor = 'grabbing';
  }, true);
  addEventListener('pointermove', e => {
    if (drag) {
      const r = dom.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      // drag at the depth of whichever target the pointer is over, else at the tool's own depth
      let best = null, bestD = Infinity;
      for (const z of zones) {
        if (!z.anchor) continue;
        const d = ray.ray.distanceSqToSegment(z.anchor.v0, z.anchor.v1);
        if (d < z.anchor.r2 && d < bestD) { best = z; bestD = d; }
      }
      plane.setFromNormalAndCoplanarPoint(camDir, best ? best.anchor.v0 : drag.home);
      if (ray.ray.intersectPlane(plane, hit)) {
        drag.obj.position.copy(hit).add(offset);
        drag.obj.position.y = Math.max(drag.obj.position.y, 0.07 - drag.tip.y * drag.S); // keep the tip above the bench
        constrain(drag);
      }
      tipEl.style.display = 'none';
      return;
    }
    if (!enabled || e.target !== dom) { tipEl.style.display = 'none'; return; }
    const t = pick(e);
    dom.style.cursor = t ? 'grab' : '';
    tipEl.style.display = t ? 'block' : 'none';
    if (t) {
      tipEl.innerHTML = `<b>${t.name}</b><br>${t.hint}`;
      tipEl.style.left = e.clientX + 14 + 'px';
      tipEl.style.top = e.clientY + 14 + 'px';
    }
  });
  addEventListener('pointerup', () => {
    if (!drag) return;
    drag.returning = true;
    drag.liftY = liftHeight(drag);
    drag = null;
    controls.enabled = true;
    dom.style.cursor = '';
  });

  function update(time) {
    const now = performance.now(), realDt = (now - last) / 1000, dt = Math.min(0.05, realDt);
    last = now;
    for (const z of zones) {
      const m = z.marker;
      if (!m) continue;
      const show = enabled && (!m.when || m.when());
      m.ring.visible = m.lbl.visible = show;
      if (!show) continue;
      const relevant = drag ? (drag.targets || []).includes(z.id) : true;
      m.ring.quaternion.copy(camera.quaternion); // face the viewer
      m.ring.scale.setScalar(1 + (relevant ? 0.12 : 0.04) * Math.sin(now / 250));
      m.ringMat.color.setHex(drag && relevant ? 0x7dffb0 : 0x4fd1ff);
      m.ringMat.opacity = drag ? (relevant ? 0.95 : 0.12) : 0.6;
      m.lbl.material.opacity = drag ? (relevant ? 1 : 0.2) : 0.9;
    }
    for (const t of tools) {
      if (!t.obj.visible) continue;
      if (t.returning && t !== drag) {
        const p = t.obj.position, k = Math.min(1, dt * 6);
        if (t.liftY != null && p.y < t.liftY - 0.01) p.y += (t.liftY - p.y) * Math.min(1, dt * 10);  // rise out
        else if (t.liftY != null && Math.hypot(p.x - t.home.x, p.z - t.home.z) > 0.01) {                  // travel over
          p.x += (t.home.x - p.x) * k; p.z += (t.home.z - p.z) * k;
        } else {                                                                                            // settle
          t.liftY = null;
          p.lerp(t.home, k);
          if (p.distanceTo(t.home) < 0.002) { p.copy(t.home); t.returning = false; t.insideOf.clear(); }
        }
      }
      tipW.copy(t.tip).applyMatrix4(t.obj.matrixWorld);
      const z = zones.find(z => z.contains(tipW));
      const id = z ? z.id : null;
      // a zone only counts once the tip has stayed in it briefly, so sweeping a tool
      // past a test tube on the way somewhere else doesn't trigger it
      if (id !== t.pending) { t.pending = id; t.dwellT = 0; } else t.dwellT += realDt;
      if (id !== t.inZone && (id === null || t.dwellT >= 0.35)) {
        if (t.inZone) t.onLeave?.(t.inZone, t);
        if (id) t.onEnter?.(id, t, tipW.clone());
        t.inZone = id;
      }
      t.update?.(t, dt, time);
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.v += 3 * dt;
      d.m.position.y -= d.v * dt;
      if (d.m.position.y <= d.toY) {
        scene.remove(d.m); d.m.geometry.dispose();
        drops.splice(i, 1);
        d.onLand?.();
      }
    }
  }

  // Open-topped containers (beakers) that tools can't pass through: a tool only gets in or
  // out over the rim, and while inside below the rim it stays within the wall.
  function addContainer(c) { containers.push(c); }
  function constrain(t) {
    const p = t.obj.position;
    for (const c of containers) {
      const tipY = p.y + t.tip.y * t.S;
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz) || 1e-6;
      const inner = c.r - t.halfW - 0.015, outer = c.r + t.halfW + 0.015;
      if (t.insideOf.has(c)) {
        if (tipY < c.top) {
          if (d > inner) { p.x = c.x + dx / d * inner; p.z = c.z + dz / d * inner; }
        } else if (d > inner) t.insideOf.delete(c);          // lifted clear of the rim
      } else if (d < outer) {
        if (tipY < c.top + 0.01) p.y = c.top + 0.01 - t.tip.y * t.S;  // ride over the rim
        if (d < inner) t.insideOf.add(c);                             // now above the opening
      }
    }
  }
  function liftHeight(t) {
    let y = null;
    for (const c of containers) {
      const d = Math.hypot(t.obj.position.x - c.x, t.obj.position.z - c.z);
      if (t.insideOf.has(c) || d < c.r + t.halfW + 0.015) y = Math.max(y ?? -Infinity, c.top + 0.06 - t.tip.y * t.S);
    }
    return y;
  }

  return { addZone, addTool, addContainer, log, showPH, setEnabled, drop, update, extra: $k('.kit-extra'), get enabled() { return enabled; } };
}
