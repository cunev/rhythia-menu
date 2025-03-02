import { getBeatmaps } from "rhythia-api";
import { addSSPMMap } from "./add";
import { globalConfig } from "../storage/storageUtils";

export async function downloadBinary(url: string): Promise<ArrayBuffer> {
  const beatmapFile = await fetch(url);
  return await beatmapFile.arrayBuffer();
}

export async function downloadDefaultMapSet(): Promise<void> {
  if (await globalConfig.getItem("downloaded_default_maps_2")) {
    return;
  }

  const onlineMaps = await getBeatmaps({
    session: "",
    page: 1,
    status: "UNRANKED",
  });

  if (!onlineMaps.beatmaps) {
    return;
  }

  for (const map of onlineMaps.beatmaps) {
    if (!map.beatmapFile) continue;
    const binary = await downloadBinary(map.beatmapFile);
    await addSSPMMap(binary, {
      starRating: map.starRating || 0,
      status: map.status || "UNRANKED",
    });
  }
  await globalConfig.setItem("downloaded_default_maps_2", true);
}
