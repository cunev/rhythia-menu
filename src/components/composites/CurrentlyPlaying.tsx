import {
  Box,
  Group,
  HStack,
  IconButton,
  Image,
  MenuContent,
  MenuRoot,
  MenuTrigger,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import { audioState } from "../../audioState";
import { FaPause, FaPlay } from "react-icons/fa";
import { Slider } from "../ui/slider";
import { useState } from "react";

export function CurrentlyPlaying() {
  const {
    coverUrl,
    musicName,
    url,
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    seek,
  } = useSnapshot(audioState);
  const [isHovering, setIsHovering] = useState(false);
  // Toggle play/pause using the methods from audioState
  const togglePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  // Handle slider change to seek using the method from audioState
  const handleSliderChange = (value: number) => {
    seek(value);
  };

  // Format time (seconds to mm:ss)
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <Stack gap={2} width={300} maxW={300} maxH={"44px"}>
      <Group gap={3}>
        <Box
          position="relative"
          w={10}
          h={10}
          borderRadius="full"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onClick={togglePlayPause}
          cursor="pointer"
        >
          <Image
            src={coverUrl}
            w="100%"
            h="100%"
            rounded={"full"}
            objectFit="cover"
            filter={isHovering ? "blur(1px) brightness(0.7)" : "none"}
            transition="all 0.2s ease"
          />
          {isHovering && (
            <Box
              position="absolute"
              top="0"
              left="0"
              right="0"
              bottom="0"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {isPlaying ? (
                <FaPause color="white" size="16px" />
              ) : (
                <FaPlay color="white" size="16px" />
              )}
            </Box>
          )}
        </Box>
        <Stack gap={0} flex={1}>
          <Text truncate maxW="200px" fontSize={"sm"} color={"fg.muted"}>
            {musicName || "Nothing playing"}
          </Text>
          <Slider
            maxW="100%"
            size={"sm"}
            value={[currentTime]}
            onValueChange={(e) => handleSliderChange(e.value[0])}
            min={0}
            max={duration || 100}
            disabled={!url}
            mb={1}
          />
          <Box mt={-1}>
            <HStack
              justifyContent="space-between"
              fontSize="2xs"
              color="gray.500"
            >
              <Text>{formatTime(currentTime)}</Text>
              <Text>{formatTime(duration)}</Text>
            </HStack>
          </Box>
        </Stack>
      </Group>
    </Stack>
  );
}
