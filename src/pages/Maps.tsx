import { Box, Input, Presence } from "@chakra-ui/react";
import { JSX, useState } from "react";
import { useSnapshot } from "valtio";
import { MapDetails } from "../components/composites/MapDetails";
import { runtimeSettings, settings } from "../settings";
import { MapList } from "../components/composites/MapList";
import { Field } from "../components/ui/field";

export function MapsPage(): JSX.Element {
  const { layoutZoom } = useSnapshot(settings);
  const { selectedSong } = useSnapshot(runtimeSettings);
  const [searchQuery, setSearchQuery] = useState("");
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
      <Box pos={"absolute"} right={0} zIndex={25} bg={"bg.subtle"} w={"50%"}>
        <Field invalid>
          <Input
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size={"2xl"}
            placeholder="Type to search, parameters supported (eg. 'sample STAR>2, DIFF=LOGIC, AUTHOR=Noob')"
            shadow={"lg"}
            css={{ "--error-color": "colors.gray.800" }}
          />
        </Field>
      </Box>
      <Box pos={"absolute"} h={"100%"}>
        <MapList query={searchQuery} />
      </Box>
    </Box>
  );
}

export default MapsPage;
