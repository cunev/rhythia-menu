import { useCallback } from "react";
import p5 from "p5";
import P5Canvas from "./P5Canvas";
import {
  initMapLoader,
  mapIds,
  queueImageLoad,
} from "./renderUtils/mapLoaderService";
import { selectMap } from "./renderUtils/mapPlayerService";
import { ScrollState, useScrollManager } from "./renderUtils/scrollManager";
import { renderMapItem } from "./renderUtils/mapRenderer";
import { settings } from "../../settings";

export function MapList() {
  const sketchFunction = useCallback(async (p: p5) => {
    // Initialize scroll state
    const scrollState: ScrollState = useScrollManager(p);

    // Setup canvas
    p.setup = (): void => {
      p.createCanvas(p.windowWidth, p.windowHeight);
      p.background(240);
      p.frameRate(144);
      initMapLoader();
    };

    p.draw = (): void => {
      p.clear();

      // Update scroll position based on state
      scrollState.update();

      // Calculate visible range
      const contentHeight = Math.max(1, mapIds.length * 110);
      const maxScroll = contentHeight - p.height + 200;
      scrollState.constrainScroll(-100, maxScroll);

      // Calculate visible indices
      const firstVisibleIndex = Math.floor(scrollState.smoothScroll / 110);
      const lastVisibleIndex = Math.ceil(
        (scrollState.smoothScroll + p.height) / 110
      );

      // Queue visible and upcoming items for loading
      const preloadRange = queueVisibleAndUpcomingItems(
        firstVisibleIndex,
        lastVisibleIndex
      );

      // Render map items
      renderMapItems(p, scrollState.smoothScroll, preloadRange);

      // Render scroll bar
      renderScrollBar(p, scrollState, contentHeight);
    };

    // Queue visible and upcoming items for loading
    function queueVisibleAndUpcomingItems(
      firstVisibleIndex: number,
      lastVisibleIndex: number
    ) {
      const PRELOAD_AHEAD = 15;
      const preloadStartIndex = Math.max(0, firstVisibleIndex - 2);
      const preloadEndIndex = Math.min(
        mapIds.length - 1,
        lastVisibleIndex + PRELOAD_AHEAD
      );

      const visibleItems = new Set<string>();
      const preloadItems = new Set<string>();

      for (let i = preloadStartIndex; i <= preloadEndIndex; i++) {
        if (i >= 0 && i < mapIds.length) {
          const mapId = mapIds[i];
          if (i >= firstVisibleIndex && i <= lastVisibleIndex) {
            visibleItems.add(mapId);
          } else {
            preloadItems.add(mapId);
          }
        }
      }

      // Queue visible items first, then preload items
      [...visibleItems].forEach(queueImageLoad);
      [...preloadItems].forEach(queueImageLoad);

      return {
        firstVisibleIndex,
        lastVisibleIndex,
        preloadStartIndex,
        preloadEndIndex,
      };
    }

    // Render map items in the visible range
    function renderMapItems(
      p: p5,
      smoothScroll: number,
      range: { preloadStartIndex: number; preloadEndIndex: number }
    ) {
      for (let i = range.preloadStartIndex; i <= range.preloadEndIndex; i++) {
        const yPosition = i * 110 - smoothScroll;
        if (yPosition < -100 || yPosition > p.height) continue;

        const mapId = mapIds[i];
        const isHovered =
          p.mouseX > p.width / 2 - 36 &&
          p.mouseX < p.width - 36 &&
          p.mouseY > yPosition &&
          p.mouseY < yPosition + 100;

        renderMapItem(p, mapId, yPosition, isHovered);
      }
    }

    // Render scroll bar
    function renderScrollBar(
      p: p5,
      scrollState: ScrollState,
      contentHeight: number
    ) {
      const scrollBarWidth = 8;
      const scrollBarPadding = 16;
      const scrollBarVisibleHeight = p.height - 100; // Offset from bottom

      const visibleRatio = Math.min(scrollBarVisibleHeight / contentHeight, 1);
      const scrollBarHeight = Math.max(
        scrollBarVisibleHeight * visibleRatio,
        50
      );

      const maxScroll = contentHeight - p.height + 200;
      const scrollRatio = scrollState.scroll / maxScroll;
      const scrollBarY =
        scrollRatio * (scrollBarVisibleHeight - scrollBarHeight);

      // Update scrollbar position when dragging
      if (scrollState.scrollBarDragging) {
        const newY = p.constrain(
          p.mouseY - scrollState.startPosition.y,
          0,
          scrollBarVisibleHeight - scrollBarHeight
        );
        const newScrollRatio =
          newY / (scrollBarVisibleHeight - scrollBarHeight);
        scrollState.scroll = newScrollRatio * maxScroll;
      }

      if (scrollState.scrollBarDraggingRight) {
        const newY = p.constrain(
          p.mouseY,
          0,
          scrollBarVisibleHeight - scrollBarHeight
        );
        const newScrollRatio =
          newY / (scrollBarVisibleHeight - scrollBarHeight);
        scrollState.scroll = newScrollRatio * maxScroll;
      }

      // Draw scroll bar
      p.noStroke();
      p.rectMode(p.CENTER);

      // Scroll bar handle
      const isScrollBarHovered =
        p.mouseX > p.width - scrollBarPadding - scrollBarWidth * 2 &&
        p.mouseX < p.width - scrollBarPadding + scrollBarWidth &&
        p.mouseY > scrollBarY &&
        p.mouseY < scrollBarY + scrollBarHeight;

      p.fill(isScrollBarHovered || scrollState.scrollBarDragging ? 80 : 120);
      p.rect(
        p.width - scrollBarPadding - scrollBarWidth / 2,
        scrollBarY + scrollBarHeight / 2,
        scrollBarWidth,
        scrollBarHeight,
        scrollBarWidth / 2
      );
      p.rectMode(p.CORNER);

      // Store current scrollbar position for hit testing
      scrollState.scrollBarY = scrollBarY;
      scrollState.scrollBarHeight = scrollBarHeight;
      scrollState.scrollBarWidth = scrollBarWidth;
      scrollState.scrollBarPadding = scrollBarPadding;
    }

    // Mouse wheel event
    p.mouseWheel = (event: any): void => {
      if (settings.currentTab !== "maps") return;
      scrollState.handleMouseWheel(event);
    };

    // Mouse pressed event
    p.mousePressed = (): void => {
      if (settings.currentTab !== "maps") return;

      // Handle right-click for scrollbar dragging
      if (p.mouseButton === p.RIGHT) {
        scrollState.scrollBarDraggingRight = true;
        return;
      }

      // Check if clicking on scroll bar
      const isScrollBarClicked =
        p.mouseX >
          p.width -
            scrollState.scrollBarPadding -
            scrollState.scrollBarWidth * 2 &&
        p.mouseX <
          p.width - scrollState.scrollBarPadding + scrollState.scrollBarWidth &&
        p.mouseY > scrollState.scrollBarY &&
        p.mouseY < scrollState.scrollBarY + scrollState.scrollBarHeight;

      if (isScrollBarClicked) {
        scrollState.startScrollBarDrag(p.mouseX, p.mouseY);
      } else {
        scrollState.startDrag(p.mouseX, p.mouseY);
      }

      // Handle map clicks
      for (let i = 0; i < mapIds.length; i++) {
        const yPosition = i * 110 - scrollState.smoothScroll;
        if (yPosition < -100 || yPosition > p.height) continue;

        const mapId = mapIds[i];
        if (
          p.mouseX > p.width / 2 - 36 &&
          p.mouseX < p.width - 36 &&
          p.mouseY > yPosition &&
          p.mouseY < yPosition + 100 &&
          p.mouseY > 40
        ) {
          selectMap(mapId);
          break;
        }
      }
    };

    // Mouse released event
    p.mouseReleased = (): void => {
      if (settings.currentTab !== "maps") return;

      scrollState.endDrag();
    };

    // Window resized event
    p.windowResized = (): void => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
    };
  }, []);

  return <P5Canvas sketchFunction={sketchFunction} />;
}
