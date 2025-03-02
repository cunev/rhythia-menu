import p5 from "p5";
import { imageStorage, mapStorage } from "../../../utils/storage/storageUtils";
import { SoundSpaceMemoryMap } from "../../../utils/types/ssmm";

// Shared state
export let mapIds: string[] = [];
export const mapCache = new Map<string, SoundSpaceMemoryMap | null>();
export const imageCache = new Map<string, p5.Element | null>();
export const failedMaps = new Set<string>();
export const failedImages = new Set<string>();

// Separate loading queues with priority flags
interface QueueItem {
  mapId: string;
  isVisible: boolean; // Flag for visible items to prioritize
  timestamp: number; // Used for sorting by most recent request
}

const mapLoadQueue: QueueItem[] = [];
const imageLoadQueue: QueueItem[] = [];

// Configure concurrent loads per queue type
const MAX_CONCURRENT_MAP_LOADS = 1;
const MAX_CONCURRENT_IMAGE_LOADS = 1;
let currentlyLoadingMaps = 0;
let currentlyLoadingImages = 0;

const MAX_RETRY_ATTEMPTS = 2;
const mapRetryAttempts = new Map<string, number>();
const imageRetryAttempts = new Map<string, number>();

// Single shared p5 instance
let p: p5;

/**
 * Initialize the map loader service
 */
export async function initMapLoader() {
  try {
    // Initialize the shared p5 instance
    p = new p5(() => {});

    // Preload star image
    const starImg = p.createImg("/star.png", "alt");
    starImg.hide();
    imageCache.set("__star", starImg);

    // Load map keys
    const keys = await mapStorage.keys();
    mapIds = [...keys];
  } catch (error) {
    console.error("Failed to initialize map loader:", error);
    mapIds = [];
  }
}

/**
 * Queue a map for loading both data and image
 * @param mapId Map identifier
 * @param isVisible Whether the map is currently visible in the viewport
 */
export function queueMapLoad(mapId: string, isVisible = false) {
  if (!mapId) return;

  queueMapDataLoad(mapId, isVisible);
  queueMapImageLoad(mapId, isVisible);
}

/**
 * Queue a map's data for loading
 * @param mapId Map identifier
 * @param isVisible Whether the map is currently visible in the viewport
 */
export function queueMapDataLoad(mapId: string, isVisible = false) {
  if (!mapId) return;

  // Skip permanently failed items or already cached items
  if (failedMaps.has(mapId)) return;
  if (mapCache.has(mapId) && mapCache.get(mapId) !== null) return;

  // Check if the map is already in queue
  const existingIndex = mapLoadQueue.findIndex((item) => item.mapId === mapId);

  if (existingIndex !== -1) {
    // Update existing item if it's already in queue
    mapLoadQueue[existingIndex].isVisible =
      mapLoadQueue[existingIndex].isVisible || isVisible;
    mapLoadQueue[existingIndex].timestamp = Date.now();

    // If visible status changed to true, resort the queue
    if (isVisible && !mapLoadQueue[existingIndex].isVisible) {
      sortMapLoadQueue();
    }
  } else {
    // Add new item to queue
    mapLoadQueue.push({
      mapId,
      isVisible,
      timestamp: Date.now(),
    });

    // Sort queue if we added a visible item
    if (isVisible) {
      sortMapLoadQueue();
    }
  }

  processMapQueue();
}

/**
 * Queue a map's image for loading
 * @param mapId Map identifier
 * @param isVisible Whether the map is currently visible in the viewport
 */
export function queueMapImageLoad(mapId: string, isVisible = false) {
  if (!mapId) return;

  // Skip permanently failed items or already cached items
  if (failedImages.has(mapId)) return;
  if (imageCache.has(mapId) && imageCache.get(mapId) !== null) return;

  // Check if the map is already in queue
  const existingIndex = imageLoadQueue.findIndex(
    (item) => item.mapId === mapId
  );

  if (existingIndex !== -1) {
    // Update existing item if it's already in queue
    imageLoadQueue[existingIndex].isVisible =
      imageLoadQueue[existingIndex].isVisible || isVisible;
    imageLoadQueue[existingIndex].timestamp = Date.now();

    // If visible status changed to true, resort the queue
    if (isVisible && !imageLoadQueue[existingIndex].isVisible) {
      sortImageLoadQueue();
    }
  } else {
    // Add new item to queue
    imageLoadQueue.push({
      mapId,
      isVisible,
      timestamp: Date.now(),
    });

    // Sort queue if we added a visible item
    if (isVisible) {
      sortImageLoadQueue();
    }
  }

  processImageQueue();
}

/**
 * Sort the map load queue to prioritize visible maps first, then by timestamp
 */
function sortMapLoadQueue() {
  mapLoadQueue.sort((a, b) => {
    // First priority: visible items come first
    if (a.isVisible !== b.isVisible) {
      return a.isVisible ? -1 : 1;
    }
    // Second priority: newest requests come first (for non-visible items)
    return b.timestamp - a.timestamp;
  });
}

/**
 * Sort the image load queue to prioritize visible maps first, then by timestamp
 */
function sortImageLoadQueue() {
  imageLoadQueue.sort((a, b) => {
    // First priority: visible items come first
    if (a.isVisible !== b.isVisible) {
      return a.isVisible ? -1 : 1;
    }
    // Second priority: newest requests come first (for non-visible items)
    return b.timestamp - a.timestamp;
  });
}

/**
 * Process the map data loading queue
 */
function processMapQueue() {
  // If we're already at max concurrent loads, don't start more
  if (
    currentlyLoadingMaps >= MAX_CONCURRENT_MAP_LOADS ||
    mapLoadQueue.length === 0
  ) {
    return;
  }

  // Make sure the queue is sorted by priority before processing
  sortMapLoadQueue();

  // Process as many items as we can up to MAX_CONCURRENT_MAP_LOADS
  while (
    currentlyLoadingMaps < MAX_CONCURRENT_MAP_LOADS &&
    mapLoadQueue.length > 0
  ) {
    const queueItem = mapLoadQueue.shift();
    if (!queueItem) continue;

    const { mapId } = queueItem;

    // Skip already processed items (success or permanent failure)
    if (mapCache.has(mapId) && mapCache.get(mapId) !== null) continue;
    if (failedMaps.has(mapId)) continue;

    // Track retry attempts
    const attempts = mapRetryAttempts.get(mapId) || 0;
    if (attempts >= MAX_RETRY_ATTEMPTS) {
      failedMaps.add(mapId);
      continue;
    }

    mapRetryAttempts.set(mapId, attempts + 1);
    currentlyLoadingMaps++;

    // Load the map data
    loadMapData(mapId);
  }
}

/**
 * Process the image loading queue
 */
function processImageQueue() {
  // If we're already at max concurrent loads, don't start more
  if (
    currentlyLoadingImages >= MAX_CONCURRENT_IMAGE_LOADS ||
    imageLoadQueue.length === 0
  ) {
    return;
  }

  // Make sure the queue is sorted by priority before processing
  sortImageLoadQueue();

  // Process as many items as we can up to MAX_CONCURRENT_IMAGE_LOADS
  while (
    currentlyLoadingImages < MAX_CONCURRENT_IMAGE_LOADS &&
    imageLoadQueue.length > 0
  ) {
    const queueItem = imageLoadQueue.shift();
    if (!queueItem) continue;

    const { mapId } = queueItem;

    // Skip already processed items (success or permanent failure)
    if (imageCache.has(mapId) && imageCache.get(mapId) !== null) continue;
    if (failedImages.has(mapId)) continue;

    // Track retry attempts
    const attempts = imageRetryAttempts.get(mapId) || 0;
    if (attempts >= MAX_RETRY_ATTEMPTS) {
      failedImages.add(mapId);
      continue;
    }

    imageRetryAttempts.set(mapId, attempts + 1);
    currentlyLoadingImages++;

    // Load the image
    loadMapImage(mapId);
  }
}

/**
 * Load map data only
 */
async function loadMapData(mapId: string) {
  try {
    // Load map data
    const map = await mapStorage.getItem(mapId);
    if (!map) {
      throw new Error(`Map data for ${mapId} is null or undefined`);
    }

    mapCache.set(mapId, map as SoundSpaceMemoryMap);

    // Finish loading
    currentlyLoadingMaps--;
    processMapQueue();
  } catch (error) {
    console.error(`Error loading map data for ${mapId}:`, error);

    // Mark as failed if max retries reached
    if (mapRetryAttempts.get(mapId)! >= MAX_RETRY_ATTEMPTS) {
      failedMaps.add(mapId);
      // Store null value in cache to indicate failure but prevent retries
      mapCache.set(mapId, null);
    } else {
      // Otherwise requeue for retry
      queueMapDataLoad(mapId, false); // Requeue with non-visible priority
    }

    currentlyLoadingMaps--;
    processMapQueue();
  }
}

/**
 * Load map image only
 */
async function loadMapImage(mapId: string) {
  try {
    // Load image
    const image = await imageStorage.getItem(mapId);
    if (!image) {
      throw new Error(`Image data for ${mapId} is null or undefined`);
    }

    const arrayBuffer = image as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);

    const img = p.createImg(url, "alt");

    // Set up load handlers
    img.elt.onload = () => {
      currentlyLoadingImages--;
      imageCache.set(mapId, img);
      processImageQueue();
    };

    img.elt.onerror = () => {
      console.error(`Error loading image element for ${mapId}`);
      URL.revokeObjectURL(url); // Clean up the blob URL

      // Mark as failed if max retries reached
      if (imageRetryAttempts.get(mapId)! >= MAX_RETRY_ATTEMPTS) {
        failedImages.add(mapId);
        imageCache.set(mapId, null); // Store null to indicate failure
      } else {
        // Otherwise requeue for retry
        queueMapImageLoad(mapId, false); // Requeue with non-visible priority
      }

      currentlyLoadingImages--;
      processImageQueue();
    };
  } catch (error) {
    console.error(`Error loading image data for ${mapId}:`, error);

    // Mark as failed if max retries reached
    if (imageRetryAttempts.get(mapId)! >= MAX_RETRY_ATTEMPTS) {
      failedImages.add(mapId);
      imageCache.set(mapId, null);
    } else {
      // Otherwise requeue for retry
      queueMapImageLoad(mapId, false); // Requeue with non-visible priority
    }

    currentlyLoadingImages--;
    processImageQueue();
  }
}

/**
 * Mark maps as visible in the current viewport to prioritize their loading
 * @param visibleMapIds Array of map IDs that are currently visible
 */
export function setVisibleMaps(visibleMapIds: string[]) {
  if (!visibleMapIds.length) return;

  // Create a Set for faster lookups
  const visibleSet = new Set(visibleMapIds);

  // Queue all visible maps with high priority
  visibleMapIds.forEach((mapId) => {
    queueMapLoad(mapId, true);
  });

  // Additionally, update priority for any maps already in the queue
  mapLoadQueue.forEach((item) => {
    item.isVisible = visibleSet.has(item.mapId);
  });

  imageLoadQueue.forEach((item) => {
    item.isVisible = visibleSet.has(item.mapId);
  });

  // Re-sort the queues to reflect the new priorities
  sortMapLoadQueue();
  sortImageLoadQueue();

  // Process queues immediately to start loading high-priority items
  processMapQueue();
  processImageQueue();
}

/**
 * Get current queue stats for monitoring
 */
export function getQueueStats() {
  return {
    mapQueueLength: mapLoadQueue.length,
    imageQueueLength: imageLoadQueue.length,
    mapsLoading: currentlyLoadingMaps,
    imagesLoading: currentlyLoadingImages,
    mapsLoaded: mapCache.size,
    imagesLoaded: imageCache.size,
    mapsFailed: failedMaps.size,
    imagesFailed: failedImages.size,
    visibleMapsInQueue: mapLoadQueue.filter((item) => item.isVisible).length,
    visibleImagesInQueue: imageLoadQueue.filter((item) => item.isVisible)
      .length,
  };
}

/**
 * Cleanup function to properly dispose p5 instance if needed
 */
export function cleanup() {
  if (p) {
    p.remove();
  }
  // Clear object URLs to prevent memory leaks
  imageCache.forEach((img) => {
    if (img && img.elt && img.elt.src) {
      if (img.elt.src.startsWith("blob:")) {
        URL.revokeObjectURL(img.elt.src);
      }
    }
  });
}
