import p5 from "p5";
import {
  mapCache,
  imageCache,
  failedMaps,
  failedImages,
} from "./mapLoaderService";
import { SoundSpaceMemoryMap } from "../../../utils/types/ssmm";
import { difficultyBadgeColors } from "../DifficultyBadge";

// Animation constants and state tracking
const mapLoadTimes = new Map<string, number>();
const fadeStates = new Map<string, number>();
const DELAY_TIME = 0.2; // Delay before starting fade (seconds)
const FADE_DURATION = 1; // Duration of fade effect (seconds)

/**
 * Render a map item based on its current state
 */
export function renderMapItem(
  p: p5,
  mapId: string,
  yPosition: number,
  isHovered: boolean
) {
  // Handle special cases first
  if (failedMaps.has(mapId)) {
    renderBasicRect(p, mapId, yPosition, "#27272a", "#111111");
    return;
  }

  if (!mapCache.has(mapId)) {
    renderBasicRect(p, mapId, yPosition, "#27272a", "#111111");
    return;
  }

  const mapEntry = mapCache.get(mapId);
  if (!mapEntry) {
    renderBasicRect(p, mapId, yPosition, "#27272a", "#111111", mapId);
    return;
  }

  // Initialize animation state if needed
  if (!mapLoadTimes.has(mapId)) {
    mapLoadTimes.set(mapId, Date.now());
    fadeStates.set(mapId, 0);
  }

  // Calculate animation progress
  const timeSinceLoad = (Date.now() - mapLoadTimes.get(mapId)!) / 1000;
  const fadeProgress =
    timeSinceLoad < DELAY_TIME
      ? 0
      : Math.min((timeSinceLoad - DELAY_TIME) / FADE_DURATION, 1);
  fadeStates.set(mapId, fadeProgress);

  // Determine if we have an image
  const hasImage = imageCache.has(mapId) && imageCache.get(mapId) !== null;

  // Render the map with appropriate state
  renderMap(p, mapId, mapEntry, yPosition, isHovered, fadeProgress, hasImage);
}

/**
 * Render a basic rectangle (for loading/error states)
 */
function renderBasicRect(
  p: p5,
  mapId: string,
  yPosition: number,
  strokeColor: string,
  fillColor: string,
  label?: string
) {
  p.stroke(strokeColor);
  p.fill(fillColor);
  p.rect(p.width / 2, yPosition, p.width / 2 - 36, 100, 6);

  if (label) {
    p.fill("#ffffff");
    p.textSize(24);
    p.text(label, p.width / 2 + 10, yPosition + 30);
  }
}

/**
 * Unified map rendering function that handles all states
 */
function renderMap(
  p: p5,
  mapId: string,
  mapEntry: SoundSpaceMemoryMap,
  yPosition: number,
  isHovered: boolean,
  fadeProgress: number,
  hasImage: boolean
) {
  p.push();
  isHovered && p.translate(-10, 0);

  // Draw background
  const bgColor = difficultyBadgeColors[mapEntry.difficulty as 0];
  p.stroke(bgColor);
  p.fill(bgColor);
  p.rect(p.width / 2, yPosition, p.width / 2 - 36, 100, 6);

  p.fill("rgba(0,0,0,0.6)");
  p.rect(p.width / 2, yPosition, p.width / 2 - 36, 100, 6);

  // Calculate x-offset based on whether we have an image
  const textXOffset = hasImage ? 105 : 20;

  // Draw title and mapper info
  p.fill("#ffffff");
  p.textSize(18);
  p.textStyle(p.BOLD);
  p.text(mapEntry?.title, p.width / 2 + textXOffset, yPosition + 36);

  p.textStyle(p.NORMAL);
  p.textSize(14);
  p.fill("rgba(255,255,255,0.7)");
  p.text(
    "Mapped by " + mapEntry.mappers.join(", "),
    p.width / 2 + textXOffset,
    yPosition + 54
  );

  // Draw stars with fade-in
  if (fadeProgress > 0) {
    const starImg = imageCache.get("__star");
    if (starImg) {
      for (
        let i = 0;
        i < p.constrain(Math.round(mapEntry.starRating), 0, 20);
        i++
      ) {
        p.image(
          starImg,
          p.width / 2 + textXOffset + i * 20,
          yPosition + 66,
          16,
          16
        );
      }
    }
  }

  // Draw image with fade-in effect (if we have one)
  if (hasImage) {
    try {
      const img = imageCache.get(mapId);
      if (img) {
        // Draw the image
        p.image(img, p.width / 2 + 12, yPosition + 10, 80, 80);

        // Apply fade overlay using badge color
        const overlayOpacity = 1 - fadeProgress;
        if (overlayOpacity > 0) {
          p.noStroke();

          // Extract RGB components from bgColor (assuming it's in hex format)
          let r = 0,
            g = 0,
            b = 0;
          const hexColor = bgColor.replace("#", "");
          if (hexColor.length === 6) {
            r = parseInt(hexColor.substring(0, 2), 16);
            g = parseInt(hexColor.substring(2, 4), 16);
            b = parseInt(hexColor.substring(4, 6), 16);
          }

          p.fill(`rgba(${r}, ${g}, ${b}, ${overlayOpacity})`);
          p.rect(p.width / 2 + 12, yPosition + 10, 80, 80);
        }
      }
    } catch (error) {
      // Mark as failed to prevent further attempts
      failedImages.add(mapId);
      imageCache.set(mapId, null);
    }
  }

  p.pop();
}
