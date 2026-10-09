/**
 * The web target (a preview of the app in a browser) has no secure enclave: localStorage stands in. The native apps
 * never load this file.
 */
export const storage = {
  get: async (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: async (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Storage refused (private mode): the session lasts for the page.
    }
  },
  remove: async (key: string) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Nothing to remove.
    }
  },
};
