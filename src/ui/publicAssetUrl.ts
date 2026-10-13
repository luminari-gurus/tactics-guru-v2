/** Resolve canonical public paths only at presentation boundaries; keep inventories unchanged. */
export function publicAssetUrl(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, '');
}
