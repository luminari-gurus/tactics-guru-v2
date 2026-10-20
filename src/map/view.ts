import './style.css';
import { generateMap, MAP_TYPES, type MapType } from './generate';
import { applyBiome, BIOMES, type Biome } from './biomes';
import { ART_STYLES, createMapArt, type ArtStyle, type ArtTreatment } from './art';
import { createOverworld, type OverworldState } from './state';

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
        <div class="map-field"><label for="map-art">Art style</label><select id="map-art">${ART_STYLES.map(style => `<option value="${style.id}">${style.label}</option>`).join('')}</select></div>
        <button type="submit">Generate</button><button id="map-new-seed" type="button">New seed</button>
      </form>
      <p id="map-seed-help">Enter a whole number from 0 to 4294967295. Reuse a seed to see the same map.</p>
      <p id="map-status" role="status" aria-live="polite"></p>
      <figure id="map-figure"><div id="map-grid" role="img" aria-describedby="map-markers"></div>
        <figcaption><span><i class="map-floor"></i> <span id="map-open-label">Walkable</span></span><span><i class="map-wall"></i> <span id="map-blocked-label">Blocked</span></span>
          <span><i class="map-marker-key" data-marker-kind="player" aria-hidden="true"></i> Player · 1</span><span><i class="map-marker-key" data-marker-kind="enemy" aria-hidden="true"></i> Enemies · 3</span></figcaption>
      </figure>
      <p id="map-markers" class="map-visually-hidden"></p>
    </main>`;
  const input = document.querySelector<HTMLInputElement>('#map-seed')!;
  const grid = document.querySelector<HTMLElement>('#map-grid')!;
  const status = document.querySelector<HTMLElement>('#map-status')!;
  const select = document.querySelector<HTMLSelectElement>('#map-type')!;
  const biomeSelect = document.querySelector<HTMLSelectElement>('#map-biome')!;
  const artSelect = document.querySelector<HTMLSelectElement>('#map-art')!;
  const figure = document.querySelector<HTMLElement>('#map-figure')!;
  const description = document.querySelector<HTMLElement>('#map-markers')!;
  let world: OverworldState | undefined;
  let placementFailure = '';
  let art: ArtStyle = 'simple';
  let invalidSeed = false;
  const treatment = createMapArt(render);
  function decorate(element: HTMLElement, resolved: ArtTreatment): void {
    element.dataset.art = resolved.url ? 'legacy-8bit' : 'simple';
    element.style.backgroundImage = resolved.url ? `url("${resolved.url}")` : '';
  }
  function render(): void {
    restoreChoices();
    const validation = invalidSeed ? 'Enter a whole number from 0 to 4294967295. The map is unchanged. ' : '';
    if (!world) {
      grid.replaceChildren();
      grid.setAttribute('aria-label', 'Overworld unavailable');
      description.textContent = 'No markers placed.';
      status.textContent = validation + placementFailure;
      return;
    }
    const { map, markers } = world;
    figure.dataset.biome = map.biome;
    const biome = BIOMES.find(entry => entry.id === map.biome)!;
    document.querySelector<HTMLElement>('#map-open-label')!.textContent = `Walkable · ${biome.open}`;
    document.querySelector<HTMLElement>('#map-blocked-label')!.textContent = `Blocked · ${biome.blocked}`;
    const open = treatment(`${map.biome}-open`, art);
    const blocked = treatment(`${map.biome}-blocked`, art);
    decorate(document.querySelector<HTMLElement>('figcaption .map-floor')!, open);
    decorate(document.querySelector<HTMLElement>('figcaption .map-wall')!, blocked);
    const walkable = map.cells.reduce<number>((total, cell) => total + cell, 0);
    const cells = document.createDocumentFragment();
    const occupants = new Map(markers.map(marker => [marker.y * map.width + marker.x, marker]));
    for (const [index, terrain] of map.terrain.entries()) {
      const cell = document.createElement('span');
      cell.className = terrain.endsWith('-open') ? 'map-floor' : 'map-wall';
      cell.dataset.terrain = terrain;
      decorate(cell, terrain.endsWith('-open') ? open : blocked);
      const marker = occupants.get(index);
      if (marker) {
        cell.dataset.markerId = marker.id;
        cell.dataset.markerKind = marker.kind;
        cell.dataset.markerX = String(marker.x);
        cell.dataset.markerY = String(marker.y);
      }
      cell.setAttribute('aria-hidden', 'true');
      cells.append(cell);
    }
    grid.replaceChildren(cells);
    grid.setAttribute('aria-label', `20 by 20 ${biome.label} map with ${walkable} walkable and ${400 - walkable} blocked cells, 1 player and 3 enemies`);
    description.textContent = markers.map(marker =>
      `${marker.id === 'player' ? 'Player' : `Enemy ${marker.id.slice(-1)}`} (${marker.id}): row ${marker.y + 1}, column ${marker.x + 1}.`).join(' ');
    grid.dataset.placementVersion = world.placementVersion;
    grid.dataset.seed = String(map.seed);
    grid.dataset.version = map.version;
    grid.dataset.type = map.type;
    grid.dataset.biome = map.biome;
    grid.dataset.biomeVersion = map.biomeVersion;
    grid.dataset.fallback = String(map.fallback);
    grid.dataset.commit = __BUILD_INFO__.commit;
    grid.dataset.art = art;
    const fallbacks = new Set([open.fallback, blocked.fallback]);
    grid.dataset.artFallback = String(Boolean(open.fallback || blocked.fallback));
    const feedback = fallbacks.has('missing') ? ' · No legacy desert artwork; using Simple'
      : fallbacks.has('failed') ? ' · Artwork unavailable; using Simple for affected terrain'
      : fallbacks.has('loading') ? ' · Loading artwork; using Simple while loading' : '';
    status.textContent = `${validation}${placementFailure}Seed ${map.seed} · ${MAP_TYPES.find(entry => entry.id === map.type)!.label} · ${map.version} · ${biome.label} (${map.biome}) · ${map.biomeVersion} · ${ART_STYLES.find(entry => entry.id === art)!.label} · ${walkable} walkable cells${map.fallback ? ' · Using a safe fallback layout' : ''}${feedback}`;
  }
  function restoreChoices(): void {
    select.value = world?.map.type ?? 'rooms';
    biomeSelect.value = world?.map.biome ?? 'grassland';
    artSelect.value = art;
  }
  function validSeed(): number | undefined {
    const text = input.value.trim();
    const value = Number(text);
    if (!/^\d{1,10}$/.test(text) || !Number.isSafeInteger(value) || value > 0xffffffff) {
      restoreChoices();
      invalidSeed = true;
      input.setAttribute('aria-invalid', 'true');
      status.textContent = 'Enter a whole number from 0 to 4294967295. The map is unchanged. ' + placementFailure;
      input.focus();
      return undefined;
    }
    invalidSeed = false;
    input.removeAttribute('aria-invalid');
    return value;
  }
  function regenerate(seed: number, type: MapType, biome: Biome): void {
    const result = createOverworld(applyBiome(generateMap(seed, type), biome));
    if (!result.ok) {
      placementFailure = `Marker placement failed. ${result.reason} ${world ? 'The previous world is unchanged.' : 'The overworld is unavailable; retry Generate.'} `;
      render();
      return;
    }
    world = result.state;
    placementFailure = '';
    input.value = String(world.map.seed);
    invalidSeed = false;
    input.removeAttribute('aria-invalid');
    render();
  }
  function applySelection(): void {
    const value = validSeed();
    if (value === undefined) return;
    regenerate(value, select.value as MapType, biomeSelect.value as Biome);
  }
  document.querySelector<HTMLFormElement>('#map-controls')!.addEventListener('submit', event => {
    event.preventDefault();
    applySelection();
  });
  select.addEventListener('change', applySelection);
  biomeSelect.addEventListener('change', applySelection);
  artSelect.addEventListener('change', () => {
    const selected = artSelect.value as ArtStyle;
    if (validSeed() === undefined) return;
    art = selected;
    render();
  });
  document.querySelector<HTMLButtonElement>('#map-new-seed')!.addEventListener('click', () => {
    const seed = world?.map.seed ?? 1;
    let next = (seed + 1) >>> 0;
    try { next = crypto.getRandomValues(new Uint32Array(1))[0]; } catch { /* Next seed remains usable without browser entropy. */ }
    if (next === seed) next = (seed + 1) >>> 0;
    regenerate(next, world?.map.type ?? 'rooms', world?.map.biome ?? 'grassland');
  });
  regenerate(1, 'rooms', 'grassland');
}
