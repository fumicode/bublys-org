import { afterEach, describe, expect, it, vi } from "vitest";
import { newId } from "./new-id.js";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("newId", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("randomUUID があればそれを使う", () => {
    expect(newId()).toMatch(UUID_V4);
  });

  it("安全でない接続（randomUUID が無い）でも UUID v4 を作る", () => {
    const real = globalThis.crypto;
    vi.stubGlobal("crypto", { getRandomValues: (a: Uint8Array) => real.getRandomValues(a) });
    const ids = new Set(Array.from({ length: 100 }, () => newId()));
    expect([...ids].every((id) => UUID_V4.test(id))).toBe(true);
    expect(ids.size).toBe(100);
  });
});
