# Maya's Lab

Interactive 3D chemistry in the browser: electron orbitals of single atoms, the crystal structures of the elements, and chemical reactions seen both at the electron level and as they would look on a lab bench.

**Live site: https://maya00912.github.io/**

Built with plain HTML and JavaScript plus [three.js](https://threejs.org/) (loaded from a CDN). There is no build step and nothing to install.

## The three tabs

### ⚛ Atomic orbitals (`index.html`)

Probability clouds for **H, Li, C, N, O, Ti, Ga, I and Ce**. Each dot is a Monte-Carlo sample of where an electron can be found, drawn from |ψ|².

- Toggle each subshell (1s, 2s, 2p, … 4f) on and off, and pick a single real orbital (for example 2pz, 3dz², 4fxyz) from the menus.
- Effective nuclear charges come from Slater's rules; the info panel lists Z<sub>eff</sub>, ⟨r⟩ and the radial nodes of every subshell.
- Radial probability chart (it can be minimised), log scale, wavefunction-phase colouring, cutaway, radial node spheres, and a nucleus built from the right number of protons and neutrons.
- Empty excited-state orbitals for H (2s, 2p) and Li (2p).

### ◈ Crystal structures (`crystal.html`)

How the same elements pack in the solid:

| Element | Structure(s) |
|---|---|
| H | solid H₂, hexagonal close-packed (below 14 K) |
| Li | body-centred cubic |
| C | diamond and graphite |
| N | α-N₂, cubic molecular crystal (below 35.6 K) |
| O | α-O₂, monoclinic molecular crystal (below 23.9 K) |
| Ti | α-Ti (hcp) and β-Ti (bcc, above 882 °C) |
| Ga | α-Ga, orthorhombic with Ga₂ pairs |
| I | solid I₂, orthorhombic molecular crystal |
| Ce | γ-Ce (fcc) and the collapsed α-Ce |

Repeat 1–3 unit cells, show bonds and the unit-cell box, switch to space-filling atoms, or highlight one atom's neighbours as a coordination polyhedron. Density and packing fraction are calculated from the atom positions (they match the measured values), not looked up.

### ⚗ Reactions (`reaction.html`)

| Reaction | Lab setup in the naked-eye view |
|---|---|
| 2 Li + 2 H₂O → 2 LiOH + H₂ | lithium on water in a beaker |
| 2 Ce + 3 I₂ → 2 CeI₃ | heated test tube under a fume hood |
| benzyne formation (+ CO₂ + N₂) | reflux flask, condenser and gas syringe in a fume hood |
| 2 Ga + N₂ → 2 GaN | tube furnace under ammonia |
| Ti + 2 Cl₂ → TiCl₄ | combustion tube, chlorine stream and ice-cooled receiver |

Each reaction has two views:

- **Atomic view**: electron clouds that morph stage by stage, so you can follow where each electron goes, with bond sticks (single, double, triple, and faded for bonds that are breaking or forming). Play, pause, change speed, or scrub the timeline.
- **Naked-eye view**: the experiment on a lab bench in a 3D lab room. Once the reaction finishes, a **testing kit** unlocks: drag tools such as pH paper, litmus, droppers of reagents, a flame-test loop, a UV lamp or a multimeter onto the product, and every result is recorded in a lab notebook.

## Run it locally

Requires [Node.js](https://nodejs.org/) 18 or newer, with no dependencies.

```bash
node dev-server.mjs        # http://localhost:8000
node dev-server.mjs 3000   # or choose a port
```

The dev server reloads the page automatically whenever a file changes. Any static file server works too, but the pages must be served over HTTP (not opened as `file://`) because they use ES modules.

## Project layout

| File | What it does |
|---|---|
| `index.html`, `main.js` | Atomic orbitals page |
| `crystal.html`, `crystal.js` | Crystal structures page |
| `reaction.html`, `reaction-engine.js` | Reaction page and the shared engine (cloud morphing, stages, bond sticks, both views) |
| `rx-li-water.js`, `rx-ce-iodine.js`, `rx-benzyne.js`, `rx-gan.js`, `rx-ticl4.js` | One module per reaction: atomic stages, lab scene and testing tools |
| `lab-tools.js` | Draggable tools, drop zones, lab notebook and pH chart |
| `lab-room.js` | The lab room: bench, cabinets, shelves and fume hood |
| `nav.js` | The tab bar shared by all pages |
| `dev-server.mjs` | Local static server with live reload |

To add a reaction, create an `rx-*.js` module that default-exports `{ ui, atomic, macro }` (the existing modules are the templates) and register it in `REACTIONS` at the top of `reaction-engine.js`.

## About the model

The orbitals are hydrogen-like wavefunctions with Slater effective charges. That is exact for hydrogen and a good qualitative picture for the other elements, but not a full quantum-chemistry calculation. In the reactions, bonds and lone pairs are drawn as approximate Gaussian-shaped clouds. Reaction timings are sped up, and some instrument readings (resistance, luminescence) are typical values, not measurements.

## Commit conventions

Do not add `Co-Authored-By` trailers (or any other AI attribution lines) to commit messages in this repository. This applies to people and to AI coding assistants alike.

## Deployment

The site is served by GitHub Pages from the `main` branch of this repository. Every push to `main` redeploys it within a minute or so.
