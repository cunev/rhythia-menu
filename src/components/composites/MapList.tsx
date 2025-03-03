import { useCallback, useState, useEffect, useRef } from "react";
import p5 from "p5";
import P5Canvas from "./P5Canvas";
import {
  initMapLoader,
  mapIds,
  queueMapLoad,
  setVisibleMaps,
} from "./renderUtils/mapLoaderService";
import { selectMap } from "./renderUtils/mapPlayerService";
import { ScrollState, useScrollManager } from "./renderUtils/scrollManager";
import { renderMapItem } from "./renderUtils/mapRenderer";
import { settings } from "../../settings";
import {
  parseSearchQuery,
  ParsedQuery,
  filterMapIds,
  searchAllMaps,
  getSearchCacheSize,
} from "./renderUtils/searchUtils";

interface MapListProps {
  query: string;
}

export function MapList({ query }: MapListProps) {
  // State to store filtered map IDs
  const [filteredIds, setFilteredIds] = useState<string[]>([]);
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery>({
    filters: [],
    text: "",
  });
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchProgress, setSearchProgress] = useState<number>(0);
  const [cacheSize, setCacheSize] = useState<number>(0);

  // Use ref to track the current search query to avoid stale closures
  const currentQueryRef = useRef<string>("");

  // Debounced search to avoid triggering too many searches while typing
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to update filtered IDs when query changes
  useEffect(() => {
    // Store the current query in ref
    currentQueryRef.current = query;

    // Store parsed query for highlighting in renderer
    setParsedQuery(parseSearchQuery(query));

    if (!query) {
      setFilteredIds([]);
      return;
    }

    // Clear any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Add a small delay before searching to avoid searching while typing
    (searchTimeoutRef as any).current = setTimeout(() => {
      const doSearch = async () => {
        setIsSearching(true);
        setSearchProgress(0);

        try {
          // Use the comprehensive search that looks through all maps in storage
          const matches = await searchAllMaps(
            mapIds,
            query,
            (interim, progress) => {
              // Only update if this is still the current query
              if (currentQueryRef.current === query) {
                setFilteredIds(interim);
                setSearchProgress(progress);
              }
            }
          );

          // Only update if this is still the current query
          if (currentQueryRef.current === query) {
            setFilteredIds(matches);
            // Update the search cache size display
            setCacheSize(getSearchCacheSize());
          }
        } catch (error) {
          console.error("Error during map search:", error);

          // Fallback to simple cache-only filtering
          if (currentQueryRef.current === query) {
            const cacheMatches = filterMapIds(mapIds, query);
            setFilteredIds(cacheMatches);
          }
        } finally {
          // Only update if this is still the current query
          if (currentQueryRef.current === query) {
            setIsSearching(false);
            setSearchProgress(100);
          }
        }
      };

      doSearch();
    }, 250); // 250ms delay

    // Cleanup function to cancel search if component unmounts or query changes
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const sketchFunction = useCallback(
    async (p: p5) => {
      // Initialize scroll state
      const scrollState: ScrollState = useScrollManager(p);

      // Setup canvas
      p.setup = (): void => {
        p.createCanvas(p.windowWidth, p.windowHeight - 220);
        p.background(240);
        p.frameRate(280);
        initMapLoader();
      };

      p.draw = (): void => {
        p.clear();

        // Update scroll position based on state
        scrollState.update();

        // Calculate visible range based on filtered IDs
        const idsToRender = query ? filteredIds : mapIds;
        const contentHeight = Math.max(1, idsToRender.length * 110);
        const maxScroll = contentHeight - p.height;
        scrollState.constrainScroll(0, maxScroll);

        // Calculate visible indices
        const firstVisibleIndex = Math.floor(scrollState.scroll / 110);
        const lastVisibleIndex = Math.ceil(
          (scrollState.scroll + p.height) / 110
        );

        // Queue visible and upcoming items for loading with visibility priority
        const visibleRange = updateVisibleAndPreloadItems(
          firstVisibleIndex,
          lastVisibleIndex,
          idsToRender
        );

        // Render scroll bar
        renderScrollBar(p, scrollState, contentHeight);

        // Render map items
        renderMapItems(p, scrollState.smoothScroll, visibleRange, idsToRender);
      };

      /**
       * Updates the loading priorities based on visibility and preloads upcoming maps
       * @returns Object with visible range info
       */
      function updateVisibleAndPreloadItems(
        firstVisibleIndex: number,
        lastVisibleIndex: number,
        idsToRender: string[]
      ) {
        const PRELOAD_AHEAD = 15; // Number of items to preload ahead
        const PRELOAD_BEHIND = 5; // Number of items to keep loaded behind the viewport

        // Adjust for boundary conditions
        firstVisibleIndex = Math.max(0, firstVisibleIndex);
        lastVisibleIndex = Math.min(idsToRender.length - 1, lastVisibleIndex);

        // Calculate preload ranges
        const preloadStartIndex = Math.max(
          0,
          firstVisibleIndex - PRELOAD_BEHIND
        );
        const preloadEndIndex = Math.min(
          idsToRender.length - 1,
          lastVisibleIndex + PRELOAD_AHEAD
        );

        // Collect visible map IDs
        const visibleMapIds: string[] = [];
        for (let i = firstVisibleIndex; i <= lastVisibleIndex; i++) {
          if (i >= 0 && i < idsToRender.length) {
            visibleMapIds.push(idsToRender[i]);
          }
        }

        // Set visible map priorities in the loader service
        setVisibleMaps(visibleMapIds);

        // Queue preload items (ahead and behind)
        const preloadItems: string[] = [];
        for (let i = preloadStartIndex; i < firstVisibleIndex; i++) {
          preloadItems.push(idsToRender[i]);
        }
        for (let i = lastVisibleIndex + 1; i <= preloadEndIndex; i++) {
          preloadItems.push(idsToRender[i]);
        }

        // Queue preload items with non-visible priority
        preloadItems.forEach((mapId) => queueMapLoad(mapId, false));

        // Return range information for rendering
        return {
          firstVisibleIndex,
          lastVisibleIndex,
          preloadStartIndex,
          preloadEndIndex,
          visibleMapIds,
          preloadMapIds: preloadItems,
        };
      }

      // Render map items in the visible range
      function renderMapItems(
        p: p5,
        smoothScroll: number,
        range: {
          preloadStartIndex: number;
          preloadEndIndex: number;
          firstVisibleIndex: number;
          lastVisibleIndex: number;
        },
        idsToRender: string[]
      ) {
        // Only render the maps in the expanded preload range to avoid unnecessary rendering
        for (let i = range.preloadStartIndex; i <= range.preloadEndIndex; i++) {
          const yPosition = i * 110 - smoothScroll;

          // Skip items that are definitely outside the viewport with some buffer
          if (yPosition < -110 || yPosition > p.height + 10) continue;

          const mapId = idsToRender[i];
          const isHovered =
            p.mouseX > p.width / 2 - 36 &&
            p.mouseX < p.width - 36 &&
            p.mouseY > yPosition &&
            p.mouseY < yPosition + 100;

          // Add a property to indicate if item is in the visible portion
          const isVisible =
            i >= range.firstVisibleIndex && i <= range.lastVisibleIndex;

          // Pass the search terms for highlighting
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
        const scrollBarVisibleHeight = p.height; // Offset from bottom

        const visibleRatio = Math.min(
          scrollBarVisibleHeight / contentHeight,
          1
        );
        const scrollBarHeight = Math.max(
          scrollBarVisibleHeight * visibleRatio,
          50
        );

        const maxScroll = contentHeight - p.height;
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
            p.width -
              scrollState.scrollBarPadding +
              scrollState.scrollBarWidth &&
          p.mouseY > scrollState.scrollBarY &&
          p.mouseY < scrollState.scrollBarY + scrollState.scrollBarHeight;

        if (isScrollBarClicked) {
          scrollState.startScrollBarDrag(p.mouseX, p.mouseY);
        } else {
          scrollState.startDrag(p.mouseX, p.mouseY);
        }

        // Handle map clicks
        const idsToCheck = query ? filteredIds : mapIds;
        for (let i = 0; i < idsToCheck.length; i++) {
          const yPosition = i * 110 - scrollState.smoothScroll;
          if (yPosition < -100 || yPosition > p.height) continue;

          const mapId = idsToCheck[i];
          if (
            p.mouseX > p.width / 2 - 36 &&
            p.mouseX < p.width - 36 &&
            p.mouseY > yPosition &&
            p.mouseY < yPosition + 100 &&
            p.mouseY > 70
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
        p.resizeCanvas(p.windowWidth, p.windowHeight - 220);
      };
    },
    [filteredIds, parsedQuery, isSearching, searchProgress, cacheSize]
  );

  return <P5Canvas sketchFunction={sketchFunction} />;
}
