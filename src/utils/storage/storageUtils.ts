import localforage from "localforage";
// This stores only map covers <id, Buffer)
export let imageStorage = localforage.createInstance({
  driver: localforage.INDEXEDDB,
  name: "rhythia-game",
  version: 1.0,
  storeName: "rhythia-image-store",
});

// This stores only map music <id, Buffer)
export let musicStorage = localforage.createInstance({
  driver: localforage.INDEXEDDB,
  name: "rhythia-game",
  version: 1.0,
  storeName: "rhythia-music-store",
});

// This stores only map data <id, SoundSpaceMemoryMap)
export let mapStorage = localforage.createInstance({
  driver: localforage.INDEXEDDB,
  name: "rhythia-game",
  version: 1.0,
  storeName: "rhythia-map-store",
});

// This stores only config applicable to the entire game
export let globalConfig = localforage.createInstance({
  driver: localforage.INDEXEDDB,
  name: "rhythia-game",
  version: 1.0,
  storeName: "rhythia-global-config",
});

export async function getAvailableStorage() {
  if (navigator.storage && navigator.storage.estimate) {
    const quota = await navigator.storage.estimate();
    const percentageUsed = (quota.usage! / quota.quota!) * 100;
    const remaining = (quota.quota! - quota.usage!) / 1024 / 1024;
    return { percentageUsed, remaining };
  }
  return { percentageUsed: 100, remaining: 0 };
}
