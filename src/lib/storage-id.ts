export function createStorageObjectId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const randomValues =
    typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
      ? Array.from(crypto.getRandomValues(new Uint32Array(4)))
      : [
          Math.floor(Math.random() * 0xffffffff),
          Math.floor(Math.random() * 0xffffffff),
          Math.floor(Math.random() * 0xffffffff),
          Math.floor(Math.random() * 0xffffffff),
        ];

  return `${Date.now().toString(36)}-${randomValues.map((value) => value.toString(36)).join("-")}`;
}
