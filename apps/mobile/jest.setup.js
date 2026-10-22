/* global jest */

// Icons are decorative and their fonts load asynchronously (act() warnings), so tests render nothing.
jest.mock('@expo/vector-icons', () => {
  const Icon = () => null;
  return { MaterialCommunityIcons: Icon, Ionicons: Icon };
});

// expo-secure-store talks to the iOS Keychain / Android Keystore, which do not exist in Jest.
// Every test gets an in-memory replacement; `__reset()` empties it.
jest.mock('expo-secure-store', () => {
  let store = new Map();
  return {
    getItemAsync: jest.fn((key) => Promise.resolve(store.has(key) ? store.get(key) : null)),
    setItemAsync: jest.fn((key, value) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key) => {
      store.delete(key);
      return Promise.resolve();
    }),
    __reset: () => {
      store = new Map();
    },
  };
});
