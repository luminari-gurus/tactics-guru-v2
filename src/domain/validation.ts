/** JSON record/array shapes: dense, no hidden keys, symbols or accessors. */
export type JsonRecord = Record<string, unknown>;
export function isPlainRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
}
export function hasShape(value: unknown, keys: readonly string[]): value is JsonRecord {
  if (!isPlainRecord(value) || Reflect.ownKeys(value).length !== keys.length) return false;
  return keys.every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined && descriptor.enumerable && Object.hasOwn(descriptor, 'value');
  });
}
export function isDenseArray(value: unknown, maxLength = Number.MAX_SAFE_INTEGER): value is unknown[] {
  if (!Array.isArray(value) || value.length > maxLength || Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).length !== value.length + 1) return false;
  for (let i = 0; i < value.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return false;
  }
  return true;
}
