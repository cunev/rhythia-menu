import {
  Avatar,
  Badge,
  Box,
  Card,
  Group,
  Mark,
  Presence,
  RatingGroup,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useRef, useState, useCallback, memo, useEffect } from "react";
import { useSnapshot } from "valtio";
import { runtimeSettings, settings } from "../settings";
import {
  imageStorage,
  mapStorage,
  musicStorage,
} from "../utils/storage/storageUtils";
import BScroll from "@better-scroll/core";
import MouseWheel from "@better-scroll/mouse-wheel";
import ScrollBar from "@better-scroll/scroll-bar";
import ObserveDOM from "@better-scroll/observe-dom";
import { SoundSpaceMemoryMap } from "../utils/types/ssmm";
import { MapDetails } from "../components/composites/MapDetails";
import { DifficultyBadge } from "../components/composites/DifficultyBadge";
import AudioVisualizer from "../components/composites/AudioVisualizer";
import { audioState } from "../audioState";

BScroll.use(MouseWheel);
BScroll.use(ScrollBar);
BScroll.use(ObserveDOM);

// Create a cache object outside the component
const dataCache = new Map();

// Custom hook for fetching and caching song data
const useSongData = (songId: string) => {
  const [songData, setSongData] = useState<{
    songInfo: SoundSpaceMemoryMap | null;
    imageUrl: string | null;
    musicUrl: string | null;
  }>(() => {
    // Check cache first
    const cached = dataCache.get(songId);
    return cached || { songInfo: null, imageUrl: null, musicUrl: null };
  });

  useEffect(() => {
    // Skip if we already have cached data
    if (dataCache.has(songId)) {
      setSongData(dataCache.get(songId));
      return;
    }
    let isActive = true;

    async function fetchData() {
      try {
        const [json, imageBuffer, musicBuffer] = await Promise.all([
          mapStorage.getItem(songId) as Promise<SoundSpaceMemoryMap>,
          imageStorage.getItem(songId) as Promise<ArrayBuffer>,
          musicStorage.getItem(songId) as Promise<ArrayBuffer>,
        ]);

        if (!isActive) return;

        // Convert ArrayBuffer to blob URL
        const blob = new Blob([imageBuffer], { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);

        const blob2 = new Blob([musicBuffer], { type: "image/jpeg" });
        const url2 = URL.createObjectURL(blob2);

        const newData = { songInfo: json, imageUrl: url, musicUrl: url2 };

        // Update cache
        dataCache.set(songId, newData);
        setSongData(newData);
      } catch (error) {
        console.error("Error fetching song data:", error);
      }
    }

    fetchData();

    // Cleanup function
    return () => {
      isActive = false;
    };
  }, [songId]);

  return songData;
};

const MapCard = memo(({ songId, zoom }: { songId: string; zoom: number }) => {
  const { songInfo, imageUrl, musicUrl } = useSongData(songId);

  if (!songInfo) return <></>;

  return (
    <Card.Root
      w="50%"
      className="song-box"
      style={{ filter: "invert(0)", zoom }}
      ml={2}
      maxH={ITEM_HEIGHT - 12}
      h={ITEM_HEIGHT - 12}
      mt={"12px"}
      _hover={{ left: "calc(50% - 6px)" }}
      _pressed={{ left: "50%" }}
      left={"50%"}
      transition="position"
      transitionTimingFunction="ease-in-out"
    >
      <Card.Body
        py={4}
        onClick={() => {
          audioState.url = musicUrl || "";
          audioState.coverUrl = imageUrl || "";
          audioState.musicName = songInfo.title;

          audioState.pause();

          runtimeSettings.selectedSong = null;
          runtimeSettings.selectedSongImage = imageUrl || "";
          runtimeSettings.selectedSongMusic = musicUrl || "";
          setTimeout(() => {
            audioState.play();

            runtimeSettings.selectedSong = songInfo;
          }, 150);
        }}
      >
        <Group gap={3}>
          <Avatar.Root
            key={imageUrl}
            shape="rounded"
            border={4}
            h={"16"}
            w={"16"}
          >
            <Avatar.Fallback name="?" />
            <Avatar.Image src={imageUrl || ""} />
          </Avatar.Root>
          <Stack gap="1" align="start" w={"100%"}>
            <Text truncate w={"75%"} fontWeight="semibold" textStyle="sm">
              {songInfo.title}
            </Text>
            <Text color={"fg.muted"} textStyle="xs">
              Mapped by{" "}
              <Mark fontWeight={"semibold"} color={"white"}>
                {songInfo.mappers.join(", ")}
              </Mark>
            </Text>
            <Group>
              <DifficultyBadge difficulty={songInfo.difficulty} />
              <RatingGroup.Root
                readOnly
                count={14}
                defaultValue={Math.round(songInfo.starRating)}
                size="sm"
              >
                <RatingGroup.HiddenInput />
                <RatingGroup.Control>
                  {Array.from({ length: 14 }).map((_, index) => (
                    <RatingGroup.Item key={index} index={index + 1}>
                      <RatingGroup.ItemIndicator />
                    </RatingGroup.Item>
                  ))}
                </RatingGroup.Control>
              </RatingGroup.Root>
            </Group>
          </Stack>
        </Group>
      </Card.Body>
    </Card.Root>
  );
});

const ITEM_HEIGHT = 110;
const BUFFER_ITEMS = 5;

export function MapsPage() {
  const { layoutZoom } = useSnapshot(settings);
  const { selectedSong } = useSnapshot(runtimeSettings);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<BScroll | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [songs, setSongs] = useState<string[]>([]);

  // Load songs with debug logging
  useEffect(() => {
    mapStorage.keys().then((keys) => {
      setSongs([...keys]);
    });
  }, []);

  // Initialize BetterScroll
  useEffect(() => {
    if (!wrapperRef.current || !songs.length) {
      return;
    }

    const bs = new BScroll(wrapperRef.current, {
      scrollY: true,
      click: true,
      scrollbar: true,
      probeType: 3,
      mouseWheel: {
        speed: 20,
        invert: false,
        easeTime: 700, // Longer easing time
        smoothOffset: true,
        dampingFactor: 0.1, // Added damping
        discreteTime: 300, // Smoother discrete scrolling
      },
      bounce: 0,
    });

    bs.on("scroll", (pos: { y: number }) => {
      setScrollTop(pos.y);
    });

    scrollerRef.current = bs;

    return () => {
      if (scrollerRef.current) {
        scrollerRef.current.destroy();
        scrollerRef.current = null;
      }
    };
  }, [songs]);

  const getVisibleRange = useCallback(() => {
    if (!wrapperRef.current || !songs.length)
      return { start: 0, end: 0, height: 0 };

    const containerHeight = wrapperRef.current.clientHeight;
    const scaledItemHeight = ITEM_HEIGHT * layoutZoom;
    const visibleItemCount =
      Math.ceil(containerHeight / scaledItemHeight) + BUFFER_ITEMS * 2;

    const startIndex = Math.max(
      0,
      Math.floor(Math.abs(scrollTop) / layoutZoom / ITEM_HEIGHT) - BUFFER_ITEMS
    );
    const endIndex = Math.min(songs.length, startIndex + visibleItemCount);

    return {
      start: startIndex,
      end: endIndex,
      height: songs.length * scaledItemHeight,
    };
  }, [songs.length, scrollTop, layoutZoom]);

  const { start, end, height: containerHeight } = getVisibleRange();
  const visibleSongs = songs.slice(start, end);
  const offsetY = start * (ITEM_HEIGHT * layoutZoom);

  if (!songs.length) {
    console.log("No songs to render");
    return null;
  }

  return (
    <Box position="relative" w="100%" h="100%" className="game-page">
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
      <Box
        ref={wrapperRef}
        className="better-scroll-wrapper"
        position="absolute"
        w="100%"
        h="100%"
        right={0}
        pr={5}
        overflow="hidden"
      >
        <Box
          className="better-scroll-content"
          w="100%"
          position="relative"
          style={{ height: `${containerHeight}px` }}
        >
          <VStack
            position="absolute"
            alignItems="stretch"
            w="100%"
            gap={0}
            style={{
              transform: `translateY(${offsetY}px)`,
              willChange: "transform",
            }}
          >
            {visibleSongs.map((song) => (
              <MapCard key={song} songId={song} zoom={layoutZoom} />
            ))}
          </VStack>
        </Box>
      </Box>
    </Box>
  );
}

export default memo(MapsPage);
