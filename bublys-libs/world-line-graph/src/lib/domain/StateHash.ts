const FNV_PRIME = BigInt('0x100000001b3');
const FNV_OFFSET = BigInt('0xcbf29ce484222325');
const MASK_64 = BigInt('0xffffffffffffffff');

export function computeStateHash(stateData: unknown): string {
  const normalized = normalizeJson(stateData);
  let hash = FNV_OFFSET;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= BigInt(normalized.charCodeAt(i));
    hash = (hash * FNV_PRIME) & MASK_64;
  }
  return hash.toString(16).padStart(16, '0');
}

function normalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(normalizeJson).join(',') + ']';
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map(
    (key) =>
      `${JSON.stringify(key)}:${normalizeJson((obj as Record<string, unknown>)[key])}`
  );
  return '{' + pairs.join(',') + '}';
}
