import p5 from "p5";
import { imageStorage, mapStorage } from "../../../utils/storage/storageUtils";
import { SoundSpaceMemoryMap } from "../../../utils/types/ssmm";

// Shared state
export let mapIds: string[] = [];
export const mapCache = new Map<string, SoundSpaceMemoryMap | null>();
export const imageCache = new Map<string, p5.Element | null>();
export const failedMaps = new Set<string>();
export const failedImages = new Set<string>();

// Loading queue
const imageLoadQueue: string[] = [];
const MAX_CONCURRENT_LOADS = 1;
let currentlyLoading = 0;
const MAX_RETRY_ATTEMPTS = 3;
const retryAttempts = new Map<string, number>();

/**
 * Initialize the map loader service
 */
export async function initMapLoader() {
  try {
    const keys = await mapStorage.keys();
    mapIds = [...keys, ...keys, ...keys]; // Triple the maps (for testing)
  } catch (error) {
    console.error("Failed to load map keys:", error);
    mapIds = [];
  }
}

/**
 * Queue a map for loading
 */
export function queueImageLoad(mapId: string) {
  if (!mapId) return;

  // Skip permanently failed items or already queued/cached items
  if (failedMaps.has(mapId)) return;
  if (
    mapCache.has(mapId) &&
    imageCache.has(mapId) &&
    imageCache.get(mapId) !== null
  )
    return;
  if (imageLoadQueue.includes(mapId)) return;

  imageLoadQueue.push(mapId);
  processImageQueue();
}

/**
 * Process the image loading queue
 */
function processImageQueue() {
  // If we're already at max concurrent loads, don't start more
  if (currentlyLoading >= MAX_CONCURRENT_LOADS || imageLoadQueue.length === 0) {
    return;
  }

  // Process as many items as we can up to MAX_CONCURRENT_LOADS
  while (currentlyLoading < MAX_CONCURRENT_LOADS && imageLoadQueue.length > 0) {
    const mapId = imageLoadQueue.shift();
    if (!mapId) continue;

    // Skip already processed items (success or permanent failure)
    if (mapCache.has(mapId) && imageCache.has(mapId)) continue;
    if (failedMaps.has(mapId)) continue;

    // Track retry attempts
    const attempts = retryAttempts.get(mapId) || 0;
    if (attempts >= MAX_RETRY_ATTEMPTS) {
      failedMaps.add(mapId);
      continue;
    }

    retryAttempts.set(mapId, attempts + 1);
    currentlyLoading++;

    // Load the map data and image
    loadMapAndImage(mapId);
  }
}

/**
 * Load a map and its image
 */
async function loadMapAndImage(mapId: string) {
  try {
    // Load map data
    const map = await mapStorage.getItem(mapId);
    if (!map) {
      throw new Error(`Map data for ${mapId} is null or undefined`);
    }

    mapCache.set(mapId, map as SoundSpaceMemoryMap);

    // Load image
    const image = await imageStorage.getItem(mapId);
    if (!image) {
      throw new Error(`Image data for ${mapId} is null or undefined`);
    }

    const arrayBuffer = image as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);

    // Create and initialize p5 image element
    const p = new p5(() => {});
    const img = p.createImg(url, "alt");
    img.hide(); // Hide the image from DOM

    // Set up load handlers
    img.elt.onload = () => {
      currentlyLoading--;
      imageCache.set(mapId, img);
      processImageQueue();
    };

    img.elt.onerror = () => {
      console.error(`Error loading image element for ${mapId}`);
      URL.revokeObjectURL(url); // Clean up the blob URL

      // Mark as failed if max retries reached
      if (retryAttempts.get(mapId)! >= MAX_RETRY_ATTEMPTS) {
        failedImages.add(mapId);
        imageCache.set(mapId, null); // Store null to indicate failure
      } else {
        // Otherwise requeue for retry
        imageLoadQueue.push(mapId);
      }

      currentlyLoading--;
      processImageQueue();
    };
  } catch (error) {
    console.error(`Error loading data for ${mapId}:`, error);

    // Mark as failed if max retries reached
    if (retryAttempts.get(mapId)! >= MAX_RETRY_ATTEMPTS) {
      failedMaps.add(mapId);
      // Store null values in cache to indicate failure but prevent retries
      if (!mapCache.has(mapId)) mapCache.set(mapId, null);
      if (!imageCache.has(mapId)) imageCache.set(mapId, null);
    } else {
      // Otherwise requeue for retry
      imageLoadQueue.push(mapId);
    }

    currentlyLoading--;
    processImageQueue();
  }
}

// Initialize the loader when this module is imported
initMapLoader();
