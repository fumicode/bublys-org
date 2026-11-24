const STORAGE_KEY_PREFIX = "shift-template:";

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function saveTemplate(formatId: string, data: ArrayBuffer): void {
  try {
    const b64 = arrayBufferToBase64(data);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${formatId}`, b64);
  } catch {
    // localStorage quota exceeded or unavailable
  }
}

export function loadTemplate(formatId: string): ArrayBuffer | undefined {
  try {
    const b64 = localStorage.getItem(`${STORAGE_KEY_PREFIX}${formatId}`);
    if (!b64) return undefined;
    return base64ToArrayBuffer(b64);
  } catch {
    return undefined;
  }
}

export function hasTemplate(formatId: string): boolean {
  try {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${formatId}`) !== null;
  } catch {
    return false;
  }
}
