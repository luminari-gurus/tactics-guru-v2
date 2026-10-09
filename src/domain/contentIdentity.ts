import type { ContentCatalog, EnemyRecord, HeroRecord } from '../content/types';
// SHA-256 constants, fractional roots of the first primes (FIPS 180-4).
const K = [1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298];
const INITIAL = [1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225];
/** Sorted-key JSON of validated data, so equal values compare equal whatever their key order. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return '{' + Object.keys(obj).sort().map(k => JSON.stringify(k) + ':' + canonical(obj[k])).join(',') + '}';
  }
  const json = JSON.stringify(value);
  if (json === undefined || (typeof value === 'number' && !Number.isSafeInteger(value))) throw new TypeError('Catalog must be validated JSON with integer numbers');
  return json;
}
const rotate = (x: number, n: number): number => (x >>> n) | (x << (32 - n));
/** Canonical sorted-key JSON, UTF-8, SHA-256. No browser crypto or Node dependencies. */
export function hashJson(value: unknown): string {
  const encoded = encodeURIComponent(canonical(value));
  const bytes: number[] = [];
  for (let i = 0; i < encoded.length; i++) {
    if (encoded[i] === '%') { bytes.push(Number.parseInt(encoded.slice(i + 1, i + 3), 16)); i += 2; }
    else bytes.push(encoded.charCodeAt(i));
  }
  const length = bytes.length;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const bits = length * 8;
  const high = Math.floor(bits / 0x100000000), low = bits >>> 0;
  for (const word of [high,low]) for (const shift of [24,16,8,0]) bytes.push((word >>> shift) & 255);
  const hash: number[] = [...INITIAL];
  for (let offset = 0; offset < bytes.length; offset += 64) {
    const w: number[] = [];
    for (let i = 0; i < 16; i++) {
      const p = offset + i * 4;
      w[i] = ((bytes[p] << 24) | (bytes[p+1] << 16) | (bytes[p+2] << 8) | bytes[p+3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const x = w[i-15], y = w[i-2];
      w[i] = (w[i-16] + (rotate(x,7) ^ rotate(x,18) ^ (x >>> 3)) + w[i-7] + (rotate(y,17) ^ rotate(y,19) ^ (y >>> 10))) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = hash;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotate(e,6) ^ rotate(e,11) ^ rotate(e,25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotate(a,2) ^ rotate(a,13) ^ rotate(a,22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
    }
    [a,b,c,d,e,f,g,h].forEach((v,i) => { hash[i] = (hash[i] + v) >>> 0; });
  }
  return 'sha256:' + hash.map(v => v.toString(16).padStart(8,'0')).join('');
}
/**
 * The catalog data rules read: everything except art. Asset records and the asset references on units, terrains and map
 * cells are left out, so a sprite re-export or a provenance fix keeps saves and replays valid. Art is removed rather than
 * rules fields listed, so a field or group a later issue adds (such as #8's abilities) counts by default.
 */
export function rulesContent(catalog: ContentCatalog): unknown {
  const each = <T>(group: Readonly<Record<string, T>>, rules: (record: T) => unknown) =>
    Object.fromEntries(Object.entries(group).map(([id, record]) => [id, rules(record)]));
  const unit = ({ spriteAssetId, portraitAssetId, ...rules }: HeroRecord | EnemyRecord) => rules;
  const { assets, maps, heroes, enemies, terrains, ...rest } = catalog;
  return { ...rest, heroes: each(heroes, unit), enemies: each(enemies, unit),
    terrains: each(terrains, ({ surfaceAssetId, ...rules }) => rules),
    maps: each(maps, map => ({ ...map, cells: map.cells.map(({ propAssetId, ...cell }) => cell) })) };
}
