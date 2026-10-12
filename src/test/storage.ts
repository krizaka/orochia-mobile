/** An in-memory stand-in for `@/lib/storage` (the Keychain / Keystore on a device). */
const values = new Map<string, string>();
export const storage = {
  get: async (key: string) => values.get(key) ?? null,
  set: async (key: string, value: string) => void values.set(key, value),
  remove: async (key: string) => void values.delete(key),
};
export const resetStorage = () => values.clear();
