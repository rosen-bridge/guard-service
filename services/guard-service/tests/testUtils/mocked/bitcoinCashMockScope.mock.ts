import { vi } from 'vitest';

/**
 * Isolate exactly the fixture methods a BCH group will replace.
 * Existing spies retain their identity, implementation and one-shot queue.
 * @param targets - Objects and own callable properties owned by the scenario
 * @returns A teardown that restores their exact original descriptors
 */
export const preserveBitcoinCashMocks = (
  targets: ReadonlyArray<readonly [object, readonly string[]]>,
) => {
  const originals = targets.flatMap(([target, keys]) =>
    keys.map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(target, key);
      const value = Reflect.get(target, key);
      if (!descriptor?.configurable || typeof value !== 'function')
        throw Error(
          'BCH fixture mock target must be an own configurable function',
        );
      return { target, key, descriptor, value };
    }),
  );
  for (const { target, key, value, descriptor } of originals) {
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: descriptor.enumerable,
      writable: true,
      /** Provide the value test seam for the current scenario without external requests. */
      value: vi.fn(function (this: unknown, ...args: unknown[]) {
        return Reflect.apply(value, this, args);
      }),
    });
  }
  let restored = false;
  /** Restore only this group's replacements, preserving all setup-owned mocks. */
  const restore = () => {
    if (restored) return;
    restored = true;
    for (const { target, key, descriptor } of originals.reverse()) {
      const current = Reflect.get(target, key);
      if (vi.isMockFunction(current)) current.mockRestore();
      Object.defineProperty(target, key, descriptor);
    }
  };
  return restore;
};
