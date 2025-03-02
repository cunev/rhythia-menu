import p5 from "p5";
import {
  mapCache,
  imageCache,
  failedMaps,
  failedImages,
} from "./mapLoaderService";
import { SoundSpaceMemoryMap } from "../../../utils/types/ssmm";
import { difficultyBadgeColors } from "../DifficultyBadge";

/**
 * Render a map item
 */
export function renderMapItem(
  p: p5,
  mapId: string,
  yPosition: number,
  isHovered: boolean
) {
  // Handle failed maps - but still display them
  if (failedMaps.has(mapId)) {
    renderFailedMap(p, mapId, yPosition);
    return;
  }

  // Queue this item for loading if not already loaded/queued
  if (!mapCache.has(mapId)) {
    renderLoadingMap(p, mapId, yPosition);
    return;
  }

  const mapEntry = mapCache.get(mapId);
  if (!mapEntry) {
    renderMapWithMissingData(p, mapId, yPosition);
    return;
  }

  // Draw placeholder for image but display map title if image is still loading or failed
  if (!imageCache.has(mapId) || imageCache.get(mapId) === null) {
    renderMapWithLoadingImage(p, mapId, mapEntry, yPosition, isHovered);
    return;
  }

  // Draw the item with loaded image
  renderCompleteMap(p, mapId, mapEntry, yPosition, isHovered);
}

/**
 * Render a map that failed to load
 */
function renderFailedMap(p: p5, mapId: string, yPosition: number) {
  p.stroke("#27272a");
  p.fill("#111111");
  p.rect(p.width / 2, yPosition, p.width / 2 - 36, 100, 6);
  p.fill("#ffffff");
  p.textSize(24);
  p.text(mapId, p.width / 2 + 10, yPosition + 30);
}

/**
 * Render a map that is still loading
 */
function renderLoadingMap(p: p5, mapId: string, yPosition: number) {
  p.stroke("#27272a");
  p.fill("#111111");
  p.rect(p.width / 2, yPosition, p.width / 2 - 36, 100, 6);
  p.fill("#ffffff");
  p.textSize(24);
  p.text("Loading...", p.width / 2 + 10, yPosition + 30);
}

/**
 * Render a map with missing data
 */
function renderMapWithMissingData(p: p5, mapId: string, yPosition: number) {
  p.stroke("#27272a");
  p.fill("#111111");
  p.rect(p.width / 2, yPosition, p.width / 2 - 36, 100, 6);
  p.fill("#ffffff");
  p.textSize(24);
  p.text(mapId, p.width / 2 + 10, yPosition + 30);
}

/**
 * Render a map with loading image
 */
function renderMapWithLoadingImage(
  p: p5,
  mapId: string,
  mapEntry: any,
  yPosition: number,
  isHovered: boolean
) {
  p.stroke("#27272a");
  p.fill("#111111");

  if (isHovered) {
    p.fill("#333333");
  }

  p.rect(p.width / 2, yPosition, p.width / 2 - 36, 100, 6);
  p.fill("#ffffff");
  p.textSize(24);
  p.text(mapEntry.title || mapId, p.width / 2 + 10, yPosition + 30);
}

/**
 * Render a complete map with image
 */
function renderCompleteMap(
  p: p5,
  mapId: string,
  mapEntry: SoundSpaceMemoryMap,
  yPosition: number,
  isHovered: boolean
) {
  p.push();
  isHovered && p.translate(-10, 0);
  p.stroke(difficultyBadgeColors[mapEntry.difficulty as 0]);
  p.fill(difficultyBadgeColors[mapEntry.difficulty as 0]);
  p.rect(p.width / 2, yPosition, p.width / 2 - 36, 100, 6);

  p.fill("rgba(0,0,0,0.6)");
  p.rect(p.width / 2, yPosition, p.width / 2 - 36, 100, 6);
  p.fill("#ffffff");
  p.textSize(18);
  p.textStyle(p.BOLD);
  p.text(mapEntry?.title, p.width / 2 + 105, yPosition + 36);

  p.textStyle(p.NORMAL);
  p.textSize(14);
  p.fill("rgba(255,255,255,0.7)");
  p.text(
    "Mapped by " + mapEntry.mappers.join(", "),
    p.width / 2 + 105,
    yPosition + 54
  );
  try {
    const img = imageCache.get(mapId);
    if (img) {
      p.image(img, p.width / 2 + 12, yPosition + 10, 80, 80);
    } else {
    }
  } catch (error) {
    // Mark as failed to prevent further attempts
    failedImages.add(mapId);
    imageCache.set(mapId, null);
  }
  p.pop();
}
