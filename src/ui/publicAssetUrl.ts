/** Resolve canonical public paths only at presentation boundaries; keep inventories unchanged. */
export function publicAssetUrl(path: string): string {
  return import.meta.env.BASE_URL + (__BATTLE_IMAGE_URLS__[path] ?? path).replace(/^\//, '');
}

declare const __BATTLE_IMAGE_URLS__: Record<string, string>;
