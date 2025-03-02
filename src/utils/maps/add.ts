import type { SoundSpaceMemoryMap } from "../types/ssmm";
import { type SSPMParsedMap, SSPMParser } from "./sspmParser";
import { type SSPMMap, V1SSPMParser } from "./sspmv1Parser";
import { Buffer } from "buffer";
import {
  imageStorage,
  mapStorage,
  musicStorage,
} from "../storage/storageUtils";

export async function addSSPMMap(
  mapBytes: ArrayBuffer,
  onlineData?: {
    starRating: number;
    status: string;
  }
) {
  let map: SSPMParsedMap | SSPMMap;
  try {
    map = new SSPMParser(Buffer.from(mapBytes)).parse();
  } catch (error) {
    map = new V1SSPMParser(Buffer.from(mapBytes)).parse();
  }

  if (!map) return;

  let generatedMap: SoundSpaceMemoryMap = {
    id: "",
    mappers: [],
    title: "",
    duration: 0,
    noteCount: 0,
    difficulty: 0,
    starRating: 0,
    onlineStatus: "UNRANKED",
    notes: [],
  };
  let notes: [number, number, number][] = [];

  if ("markers" in map) {
    generatedMap.title = map.strings.mapName;
    generatedMap.id = map.strings.mapID;
    generatedMap.mappers = map.strings.mappers;
    generatedMap.difficulty = map.metadata.difficulty;
    map.markers.sort((a, b) => a.position - b.position);
    notes = map.markers
      .filter((marker) => marker.type === 0)
      .map((marker) => [
        marker.position,
        (marker.data as any)["field0"].x,
        (marker.data as any)["field0"].y,
      ]);
    generatedMap.notes = notes;
  } else {
    generatedMap.title = map.name;
    generatedMap.id = map.id;
    generatedMap.mappers = [map.creator];
    generatedMap.difficulty = map.difficulty;
    map.notes.sort((a, b) => a.position - b.position);
    notes = map.notes.map((marker) => [marker.position, marker.x, marker.y]);
    generatedMap.notes = notes;
  }

  if (map.audio) {
    await musicStorage.setItem(generatedMap.id, map.audio);
  }
  if (map.cover) {
    await imageStorage.setItem(generatedMap.id, map.cover);
  }
  generatedMap.noteCount = notes.length;
  generatedMap.duration = notes[notes.length - 1][0];

  if (onlineData) {
    generatedMap.starRating = onlineData.starRating;
    generatedMap.onlineStatus = onlineData.status;
  }
  await mapStorage.setItem(generatedMap.id, generatedMap);
}
