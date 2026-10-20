// Shared page tabs: Atomic orbitals <-> Crystal structures <-> Reactions.
// Each tab remembers where you were (last element / last reaction) so switching back is one click;
// the two element pages share the element, so Li's orbitals lead straight to Li's crystal.
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

const page = /reaction\.html$/.test(location.pathname) ? 'rx' : /crystal\.html$/.test(location.pathname) ? 'xtal' : 'atoms';
if (page === 'rx') store.set('nav.reaction', location.search || '?rx=li-water');
else {
  // keep only the element symbol: each element page has its own extra hash parts
  const keep = () => store.set('nav.el', location.hash.slice(1).split('/')[0]);
  keep(); addEventListener('hashchange', () => { keep(); syncEl(); });
}
const el = () => (store.get('nav.el') ? '#' + store.get('nav.el') : '');

const tabs = [
  { id: 'atoms', label: '⚛ Atomic orbitals', href: () => 'index.html' + el(), title: 'Electron clouds of single atoms' },
  { id: 'xtal', label: '◈ Crystal structures', href: () => 'crystal.html' + el(), title: 'How the atoms pack in the solid' },
  { id: 'rx', label: '⚗ Reactions', href: () => 'reaction.html' + (store.get('nav.reaction') || '?rx=li-water'),
    title: 'Atomic and naked-eye views of reactions' },
];

const css = document.createElement('style');
css.textContent = `
  .tabs { display: flex; gap: 2px; padding: 3px; background: rgba(0,0,0,0.35); border: 1px solid var(--border); border-radius: 8px; }
  .tabs a { padding: 5px 14px; border-radius: 6px; color: var(--muted); text-decoration: none; font-size: 13px; font-weight: 600;
    white-space: nowrap; transition: background .15s, color .15s; }
  .tabs a:hover { color: var(--text); background: rgba(255,255,255,0.06); }
  .tabs a.on { color: #fff; background: #3a4a8a; box-shadow: inset 0 0 0 1px #6d82d6; cursor: default; }
  #tabsPanel { top: 16px; left: 50%; transform: translateX(-50%); padding: 6px; z-index: 5; }
`;
document.head.appendChild(css);

const nav = document.createElement('nav');
nav.className = 'tabs';
nav.innerHTML = tabs.map(t =>
  `<a data-tab="${t.id}" href="${t.href()}" title="${t.title}"${t.id === page ? ' class="on" aria-current="page"' : ''}>${t.label}</a>`).join('');
function syncEl() { for (const t of tabs) nav.querySelector(`[data-tab="${t.id}"]`).href = t.href(); }
nav.addEventListener('click', e => { if (e.target.closest('a.on')) e.preventDefault(); });

const topbar = document.getElementById('topbar');
if (topbar) {
  // reaction page: tabs lead the existing top bar
  const sep = document.createElement('span');
  sep.className = 'sep';
  topbar.prepend(nav, sep);
} else {
  const panel = document.createElement('div');
  panel.id = 'tabsPanel';
  panel.className = 'panel';
  panel.appendChild(nav);
  document.body.appendChild(panel);
}
