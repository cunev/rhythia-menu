// searchUtils.ts
import { mapCache, mapIds } from "./mapLoaderService";
import { SoundSpaceMemoryMap } from "../../../utils/types/ssmm";
import { mapStorage } from "../../../utils/storage/storageUtils";

/**
 * Filter structure for parsed search query
 */
export interface SearchFilter {
  field: string;
  operator: string;
  value: string;
}

/**
 * Parsed search query structure
 */
export interface ParsedQuery {
  filters: SearchFilter[];
  text: string;
}

/**
 * Parse a search query string into structured filters and text search
 * @param {string} query The search query
 * @returns {ParsedQuery} Parsed query with filters and text
 */
export function parseSearchQuery(query: string): ParsedQuery {
  if (!query) return { filters: [], text: "" };

  const filters: SearchFilter[] = [];
  let textSearch: string = query;

  // Extract special syntax commands (e.g., STAR>2)
  const specialCommands = query.match(/([A-Z]+)(=|>|<)([^\s]+)/g) || [];

  specialCommands.forEach((command) => {
    // Remove the command from the query for full-text search
    textSearch = textSearch.replace(command, "");

    // Parse the command
    const match = command.match(/([A-Z]+)(=|>|<)([^\s]+)/);
    if (match) {
      const [, field, operator, value] = match;
      filters.push({ field: field.toLowerCase(), operator, value });
    }
  });

  // Remaining text is for full-text search
  textSearch = textSearch.trim();

  return { filters, text: textSearch };
}

/**
 * Get a map value based on the filter field
 * @param {SoundSpaceMemoryMap} map The map object
 * @param {string} field The field name from the filter
 * @returns {any} The value from the map
 */
function getMapValueByField(map: SoundSpaceMemoryMap, field: string): any {
  // Map the query field to the actual field in the map object
  const fieldMap: Record<string, keyof SoundSpaceMemoryMap> = {
    star: "starRating",
    author: "mappers",
    diff: "difficulty",
    name: "title",
    id: "id",
    status: "onlineStatus",
  };

  const actualField = fieldMap[field] || (field as keyof SoundSpaceMemoryMap);
  return map[actualField];
}

/**
 * Evaluate a filter against a map value
 * @param {any} value The map value
 * @param {string} operator The comparison operator
 * @param {string} filterValue The filter value to compare against
 * @returns {boolean} Whether the filter matches
 */
function evaluateFilter(
  value: any,
  operator: string,
  filterValue: string
): boolean {
  if (operator === "=") {
    // Handle string comparison
    if (typeof value === "string") {
      return value.toLowerCase() == filterValue.toLowerCase();
    }
    return value == filterValue; // Use loose equality for type conversion
  } else if (operator === ">") {
    return value > parseFloat(filterValue);
  } else if (operator === "<") {
    return value < parseFloat(filterValue);
  }
  return true;
}

/**
 * Check if a map matches the search criteria
 * @param {SoundSpaceMemoryMap} map The map to check
 * @param {ParsedQuery} parsedQuery The parsed search query
 * @returns {boolean} Whether the map matches
 */
function mapMatchesSearch(
  map: SoundSpaceMemoryMap,
  parsedQuery: ParsedQuery
): boolean {
  // Apply special filters
  for (const filter of parsedQuery.filters) {
    const mapValue = getMapValueByField(map, filter.field);
    if (!evaluateFilter(mapValue, filter.operator, filter.value)) {
      return false;
    }
  }

  // Apply text search if provided
  if (parsedQuery.text) {
    // Simple check if the map contains the text in searchable fields
    const searchableText = `${map.title || ""} ${
      map.mappers || ""
    }`.toLowerCase();
    return searchableText.includes(parsedQuery.text.toLowerCase());
  }

  return true;
}

/**
 * Search batch size - how many maps to load at once
 */
const SEARCH_BATCH_SIZE = 20;

/**
 * Cache of maps that have been loaded for search but not added to main cache
 * This prevents reloading maps from storage during subsequent searches
 */
const searchCache = new Map<string, SoundSpaceMemoryMap>();

/**
 * Search through all maps in storage
 * @param {string[]} allMapIds Array of all map IDs
 * @param {string} query The search query
 * @param {(matches: string[], progress: number) => void} onProgress Callback for interim results
 * @returns {Promise<string[]>} Promise resolving to matching map IDs
 */
export async function searchAllMaps(
  allMapIds: string[],
  query: string,
  onProgress?: (matches: string[], progress: number) => void
): Promise<string[]> {
  if (!query) return allMapIds;

  const parsedQuery = parseSearchQuery(query);
  const matchedMapIds: string[] = [];

  // Process maps in batches to avoid blocking the UI
  for (let i = 0; i < allMapIds.length; i += SEARCH_BATCH_SIZE) {
    const batchIds = allMapIds.slice(i, i + SEARCH_BATCH_SIZE);
    const batchResults = await Promise.all(
      batchIds.map(async (mapId) => {
        // First check main cache
        let map = mapCache.get(mapId) as SoundSpaceMemoryMap | null;

        // Then check search cache if not in main cache
        if (!map && searchCache.has(mapId)) {
          map = searchCache.get(mapId) as SoundSpaceMemoryMap;
        }

        // If not in either cache, load from storage
        if (!map) {
          try {
            const storedMap = await mapStorage.getItem(mapId);
            if (storedMap) {
              map = storedMap as SoundSpaceMemoryMap;
              // Add to search cache for future searches
              searchCache.set(mapId, map);
            }
          } catch (error) {
            console.error(`Error loading map ${mapId} for search:`, error);
            return null;
          }
        }

        if (!map) return null;

        // Check if map matches search criteria
        return mapMatchesSearch(map, parsedQuery) ? mapId : null;
      })
    );

    // Add matching maps from this batch
    const validResults = batchResults.filter((id): id is string => id !== null);
    matchedMapIds.push(...validResults);

    // Report progress if callback provided
    if (onProgress) {
      const progress = Math.min(
        100,
        Math.round(((i + batchIds.length) / allMapIds.length) * 100)
      );
      onProgress([...matchedMapIds], progress);
    }

    // Allow UI to update by yielding execution for a moment
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return matchedMapIds;
}

/**
 * Clear the search cache to free up memory
 */
export function clearSearchCache(): void {
  searchCache.clear();
}

/**
 * Get the number of maps in the search cache
 */
export function getSearchCacheSize(): number {
  return searchCache.size;
}

/**
 * Filter map IDs based on maps in the cache (legacy method)
 * This is a fallback that only searches through maps that are already loaded
 * @param {string[]} mapIds Array of map IDs
 * @param {string} query The search query
 * @returns {string[]} Filtered map IDs
 */
export function filterMapIds(mapIds: string[], query: string): string[] {
  if (!query) return mapIds;

  const parsedQuery = parseSearchQuery(query);

  return mapIds.filter((mapId) => {
    // Check main cache first
    let map = mapCache.get(mapId) as SoundSpaceMemoryMap | null;

    // Check search cache if not in main cache
    if (!map && searchCache.has(mapId)) {
      map = searchCache.get(mapId) as SoundSpaceMemoryMap;
    }

    if (!map) return false; // Skip maps that aren't loaded

    return mapMatchesSearch(map, parsedQuery);
  });
}

/**
 * Highlight search terms in text
 * @param {string} text The text to highlight
 * @param {string} searchTerm The search term to highlight
 * @returns {string} HTML with highlighted search terms
 */
export function highlightSearchTerms(text: string, searchTerm: string): string {
  if (!searchTerm || !text) return text;

  const regex = new RegExp(
    `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi"
  );
  return text.replace(regex, '<span class="highlight">$1</span>');
}
