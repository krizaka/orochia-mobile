import * as SecureStore from "expo-secure-store";

/** Small private values on the device: the Keychain on iOS, Keystore-backed storage on Android. */
export const storage = {
  get: (key: string) => SecureStore.getItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};
