import './style.css';
import { generateMap, MAP_TYPES, type MapType } from './generate';

export function startMap(): void {
  document.title = 'Overworld map · Tactics Guru';
  document.body.className = 'map-page';
  document.body.innerHTML = `
    <main id="map-page">
      <header><p class="map-eyebrow">Tactics Guru · Exploration prototype</p><h1>Overworld map</h1>
        <p>Twenty by twenty. A seeded layout to explore.</p></header>
      <form id="map-controls" novalidate>
        <label for="map-seed">Seed <input id="map-seed" type="text" inputmode="numeric" value="1" maxlength="10" autocomplete="off" aria-describedby="map-seed-help" /></label>
        <div class="map-field"><label for="map-type">Map type</label><select id="map-type">${MAP_TYPES.map(type => `<option value="${type.id}">${type.label}</option>`).join('')}</select></div>
        <button type="submit">Generate</button><button id="map-new-seed" type="button">New seed</button>
      </form>
      <p id="map-seed-help">Enter a whole number from 0 to 4294967295. Reuse a seed to see the same map.</p>
      <p id="map-status" role="status" aria-live="polite"></p>
      <figure><div id="map-grid" role="img"></div>
        <figcaption><span><i class="map-floor"></i> Walkable</span><span><i class="map-wall"></i> Blocked</span></figcaption>
      </figure>
    </main>`;
  const input = document.querySelector<HTMLInputElement>('#map-seed')!;
  const grid = document.querySelector<HTMLElement>('#map-grid')!;
  const status = document.querySelector<HTMLElement>('#map-status')!;
  const select = document.querySelector<HTMLSelectElement>('#map-type')!;
  let seed = 1;
  let type: MapType = 'rooms';
  function render(nextSeed: number, nextType: MapType = type): void {
    const map = generateMap(nextSeed, nextType);
    type = map.type;
    select.value = type;
    seed = map.seed;
    input.value = String(seed);
    input.removeAttribute('aria-invalid');
    const walkable = map.cells.reduce<number>((total, cell) => total + cell, 0);
    const cells = document.createDocumentFragment();
    for (const value of map.cells) {
      const cell = document.createElement('span');
      cell.className = value === 1 ? 'map-floor' : 'map-wall';
      cell.setAttribute('aria-hidden', 'true');
      cells.append(cell);
    }
    grid.replaceChildren(cells);
    grid.setAttribute('aria-label', `20 by 20 map with ${walkable} walkable and ${400 - walkable} blocked cells`);
    grid.dataset.seed = String(seed);
    grid.dataset.version = map.version;
    grid.dataset.type = map.type;
    grid.dataset.fallback = String(map.fallback);
    grid.dataset.commit = __BUILD_INFO__.commit;
    status.textContent = `Seed ${seed} · ${MAP_TYPES.find(entry => entry.id === type)!.label} · ${map.version} · ${walkable} walkable cells${map.fallback ? ' · Using a safe fallback layout' : ''}`;
  }
  function applySelection(): void {
    const text = input.value.trim();
    const value = Number(text);
    if (!/^\d{1,10}$/.test(text) || !Number.isSafeInteger(value) || value > 0xffffffff) {
      select.value = type;
      input.setAttribute('aria-invalid', 'true');
      status.textContent = 'Enter a whole number from 0 to 4294967295. The map is unchanged.';
      input.focus();
      return;
    }
    render(value, select.value as MapType);
  }
  document.querySelector<HTMLFormElement>('#map-controls')!.addEventListener('submit', event => {
    event.preventDefault();
    applySelection();
  });
  select.addEventListener('change', applySelection);
  document.querySelector<HTMLButtonElement>('#map-new-seed')!.addEventListener('click', () => {
    let next = (seed + 1) >>> 0;
    try { next = crypto.getRandomValues(new Uint32Array(1))[0]; } catch { /* Next seed remains usable without browser entropy. */ }
    if (next === seed) next = (seed + 1) >>> 0;
    render(next);
  });
  render(seed);
}
