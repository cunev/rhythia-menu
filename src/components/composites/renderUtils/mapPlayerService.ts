import { SoundSpaceMemoryMap } from "../../../utils/types/ssmm";
import {
  imageStorage,
  mapStorage,
  musicStorage,
} from "../../../utils/storage/storageUtils";
import { audioState } from "../../../audioState";
import { runtimeSettings } from "../../../settings";
import { mapCache } from "./mapLoaderService";

/**
 * Select and play a map
 */
export async function selectMap(mapId: string): Promise<void> {
  try {
    // 1. Get map data (from cache or storage)
    const mapData = await getMapData(mapId);

    // 2. Load music data
    const musicUrl = await loadMusicData(mapId);
    if (!musicUrl) return;

    // 3. Load image data (optional)
    const imageUrl = await loadImageData(mapId);

    // 4. Set up playback
    setupPlayback(mapId, mapData, musicUrl, imageUrl);
  } catch (error) {
    console.error(`Error in selectMap for ${mapId}:`, error);
  }
}

/**
 * Get map data from cache or load from storage
 */
async function getMapData(mapId: string): Promise<SoundSpaceMemoryMap> {
  // Check if we already have map data in cache
  let mapData = mapCache.get(mapId) as SoundSpaceMemoryMap | null;

  // If not in cache, try to load it
  if (!mapData) {
    try {
      mapData = (await mapStorage.getItem(mapId)) as SoundSpaceMemoryMap;
      if (mapData) {
        mapCache.set(mapId, mapData);
      }
    } catch (error) {
      console.error(`Error loading map data for ${mapId}:`, error);
    }
  }

  // Still no map data? Use a fallback
  if (!mapData) {
    // Create a minimal fallback map with the ID as title
    mapData = {
      title: mapId,
      description: "No description available",
      // Add other required SoundSpaceMemoryMap properties as needed
    } as unknown as SoundSpaceMemoryMap;
  }

  return mapData;
}

/**
 * Load music data for a map
 */
async function loadMusicData(mapId: string): Promise<string | null> {
  try {
    const item = (await musicStorage.getItem(mapId)) as ArrayBuffer;
    if (!item || item.byteLength === 0) {
      console.error(`Music data for ${mapId} is invalid`);
      return null;
    }

    // Create audio blob and URL
    const blob = new Blob([item], { type: "audio/mpeg" });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error(`Error loading music for ${mapId}:`, error);
    return null;
  }
}

/**
 * Load image data for a map
 */
async function loadImageData(mapId: string): Promise<string | null> {
  try {
    const image = (await imageStorage.getItem(mapId)) as ArrayBuffer;
    if (!image || image.byteLength === 0) {
      console.error(`Image data for ${mapId} is invalid`);
      return null;
    }

    const blob = new Blob([image], { type: "image/jpeg" });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error(`Error loading image for ${mapId}:`, error);
    return null;
  }
}

/**
 * Set up playback with the loaded data
 */
function setupPlayback(
  mapId: string,
  mapData: SoundSpaceMemoryMap,
  musicUrl: string,
  imageUrl: string | null
) {
  // Set up runtime settings
  runtimeSettings.selectedSong = mapData;
  runtimeSettings.selectedSongMusic = musicUrl;
  runtimeSettings.selectedSongImage = imageUrl || "";

  // Set up audio state
  audioState.url = musicUrl;
  audioState.musicName = mapData.title || mapId;
  audioState.coverUrl = imageUrl || "";

  // Start playback
  audioState.play();
}
