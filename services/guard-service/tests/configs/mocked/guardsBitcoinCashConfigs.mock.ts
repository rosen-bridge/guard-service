/** Minimal config reader used by the isolated BCH operator fixtures. */
type ConfigFallback = {
  has: (key: string) => boolean;
  get: (key: string) => unknown;
};

/**
 * Mock operator config from mutable scenario values, with optional legacy fallback.
 * @param readValues - Reads the current fixture values after scenario mutations
 * @param fallback - Real fixture config used only by registration consumer joins
 * @returns A config module factory result without external requests
 */
export const createBitcoinCashConfigMock = (
  readValues: () => Record<string, unknown>,
  fallback?: ConfigFallback,
) => {
  /** Check only current own fixture keys before consulting the legacy fixture. */
  const has = (key: string) =>
    Object.hasOwn(readValues(), key) || (fallback?.has(key) ?? false);
  /** Return the current own value or preserve the selected missing-key behavior. */
  const get = (key: string) => {
    const values = readValues();
    if (Object.hasOwn(values, key)) return values[key];
    if (fallback) return fallback.get(key);
    throw Error('Missing config key');
  };
  return { default: { has, get } };
};
