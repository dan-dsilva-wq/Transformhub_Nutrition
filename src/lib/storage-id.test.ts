import { describe, expect, it, vi } from "vitest";
import { createStorageObjectId } from "./storage-id";

describe("createStorageObjectId", () => {
  it("uses crypto.randomUUID when available", () => {
    const originalCrypto = globalThis.crypto;

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        randomUUID: vi.fn(() => "fixed-uuid"),
      },
    });

    expect(createStorageObjectId()).toBe("fixed-uuid");

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: originalCrypto,
    });
  });

  it("falls back when randomUUID is unavailable", () => {
    const originalCrypto = globalThis.crypto;

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        getRandomValues(values: Uint32Array) {
          values.set([1, 2, 3, 4]);
          return values;
        },
      },
    });

    expect(createStorageObjectId()).toMatch(/^[a-z0-9]+-1-2-3-4$/);

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: originalCrypto,
    });
  });
});
