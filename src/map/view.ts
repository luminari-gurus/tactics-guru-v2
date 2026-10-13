import './style.css';
import { generateMap, MAP_TYPES, type MapType } from './generate';
import { applyBiome, BIOMES, type Biome } from './biomes';

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
        <div class="map-field"><label for="map-biome">Biome</label><select id="map-biome">${BIOMES.map(biome => `<option value="${biome.id}">${biome.label}</option>`).join('')}</select></div>
        <button type="submit">Generate</button><button id="map-new-seed" type="button">New seed</button>
      </form>
      <p id="map-seed-help">Enter a whole number from 0 to 4294967295. Reuse a seed to see the same map.</p>
      <p id="map-status" role="status" aria-live="polite"></p>
      <figure id="map-figure"><div id="map-grid" role="img"></div>
        <figcaption><span><i class="map-floor"></i> <span id="map-open-label">Walkable</span></span><span><i class="map-wall"></i> <span id="map-blocked-label">Blocked</span></span></figcaption>
      </figure>
    </main>`;
  const input = document.querySelector<HTMLInputElement>('#map-seed')!;
  const grid = document.querySelector<HTMLElement>('#map-grid')!;
  const status = document.querySelector<HTMLElement>('#map-status')!;
  const select = document.querySelector<HTMLSelectElement>('#map-type')!;
  const biomeSelect = document.querySelector<HTMLSelectElement>('#map-biome')!;
  const figure = document.querySelector<HTMLElement>('#map-figure')!;
  let map = applyBiome(generateMap(1));
  function render(): void {
    select.value = map.type;
    biomeSelect.value = map.biome;
    figure.dataset.biome = map.biome;
    const biome = BIOMES.find(entry => entry.id === map.biome)!;
    document.querySelector<HTMLElement>('#map-open-label')!.textContent = `Walkable · ${biome.open}`;
    document.querySelector<HTMLElement>('#map-blocked-label')!.textContent = `Blocked · ${biome.blocked}`;
    input.value = String(map.seed);
    input.removeAttribute('aria-invalid');
    const walkable = map.cells.reduce<number>((total, cell) => total + cell, 0);
    const cells = document.createDocumentFragment();
    for (const terrain of map.terrain) {
      const cell = document.createElement('span');
      cell.className = terrain.endsWith('-open') ? 'map-floor' : 'map-wall';
      cell.dataset.terrain = terrain;
      cell.setAttribute('aria-hidden', 'true');
      cells.append(cell);
    }
    grid.replaceChildren(cells);
    grid.setAttribute('aria-label', `20 by 20 ${biome.label} map with ${walkable} walkable and ${400 - walkable} blocked cells`);
    grid.dataset.seed = String(map.seed);
    grid.dataset.version = map.version;
    grid.dataset.type = map.type;
    grid.dataset.biome = map.biome;
    grid.dataset.biomeVersion = map.biomeVersion;
    grid.dataset.fallback = String(map.fallback);
    grid.dataset.commit = __BUILD_INFO__.commit;
    status.textContent = `Seed ${map.seed} · ${MAP_TYPES.find(entry => entry.id === map.type)!.label} · ${map.version} · ${biome.label} (${map.biome}) · ${map.biomeVersion} · Simple · ${walkable} walkable cells${map.fallback ? ' · Using a safe fallback layout' : ''}`;
  }
  function applySelection(): void {
    const text = input.value.trim();
    const value = Number(text);
    if (!/^\d{1,10}$/.test(text) || !Number.isSafeInteger(value) || value > 0xffffffff) {
      select.value = map.type;
      biomeSelect.value = map.biome;
      input.setAttribute('aria-invalid', 'true');
      status.textContent = 'Enter a whole number from 0 to 4294967295. The map is unchanged.';
      input.focus();
      return;
    }
    map = applyBiome(generateMap(value, select.value as MapType), biomeSelect.value as Biome);
    render();
  }
  document.querySelector<HTMLFormElement>('#map-controls')!.addEventListener('submit', event => {
    event.preventDefault();
    applySelection();
  });
  select.addEventListener('change', applySelection);
  biomeSelect.addEventListener('change', applySelection);
  document.querySelector<HTMLButtonElement>('#map-new-seed')!.addEventListener('click', () => {
    let next = (map.seed + 1) >>> 0;
    try { next = crypto.getRandomValues(new Uint32Array(1))[0]; } catch { /* Next seed remains usable without browser entropy. */ }
    if (next === map.seed) next = (map.seed + 1) >>> 0;
    map = applyBiome(generateMap(next, map.type), map.biome);
    render();
  });
  render();
}
