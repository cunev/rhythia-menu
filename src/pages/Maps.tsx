import { Box, Presence } from "@chakra-ui/react";
import { JSX } from "react";
import { useSnapshot } from "valtio";
import { MapDetails } from "../components/composites/MapDetails";
import { runtimeSettings, settings } from "../settings";
import { MapList } from "../components/composites/MapList";

export function MapsPage(): JSX.Element {
  const { layoutZoom } = useSnapshot(settings);
  const { selectedSong } = useSnapshot(runtimeSettings);

  return (
    <Box w="100%" h="100%" className="game-page">
      <Presence
        zoom={layoutZoom}
        pos={"absolute"}
        w={"50%"}
        h={"100%"}
        p={4}
        pl={0}
        present={!!selectedSong}
        animationName={{
          _open: "slide-from-left, fade-in",
          _closed: "slide-to-right, fade-out",
        }}
        animationDuration="slower"
      >
        <MapDetails />
      </Presence>
      <Box pos={"absolute"} h={"100%"}>
        <MapList />
      </Box>
    </Box>
  );
}

export default MapsPage;
