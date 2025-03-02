import { useSnapshot } from "valtio";
import { runtimeSettings } from "../../settings";
import {
  AspectRatio,
  Badge,
  Box,
  Button,
  FormatNumber,
  Group,
  HStack,
  Icon,
  Image,
  Mark,
  RatingGroup,
  Spacer,
  Stack,
  Text,
} from "@chakra-ui/react";
import { RadioCardItem, RadioCardLabel, RadioCardRoot } from "../ui/radio-card";
import { FaStripeS } from "react-icons/fa";
import { DifficultyBadge } from "./DifficultyBadge";
export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export function MapDetails() {
  const { selectedSong, selectedSongImage } = useSnapshot(runtimeSettings);
  if (!selectedSong) {
    return <></>;
  }
  return (
    <Stack w={"100%"} h={"100%"}>
      <Box
        borderWidth="1px"
        borderRadius="lg"
        overflow="hidden"
        maxH={250}
        h={250}
        pos={"relative"}
      >
        <Image
          src={selectedSongImage || ""}
          pos={"absolute"}
          alt="naruto"
          maxH={250}
          objectFit="cover"
          w={"100%"}
          filter="blur(15px)"
          opacity={0.5}
        />

        <Group
          w={"100%"}
          h={"100%"}
          p={6}
          pos={"relative"}
          align={"center"}
          justify={"space-between"}
        >
          <Stack gap={0} h="100%" w={"70%"}>
            <Text fontSize={24} truncate fontWeight={"bold"}>
              {selectedSong.title}
            </Text>
            <Text color={"fg.muted"} textStyle="sm">
              Mapped by{" "}
              <Mark fontWeight={"semibold"} color={"white"}>
                {selectedSong.mappers.join(", ")}
              </Mark>
            </Text>
            <Spacer maxH={2} />

            <Group wrap={"wrap"} w={"70%"}>
              <Badge colorPalette="black" size={"md"}>
                <FormatNumber
                  value={selectedSong.noteCount}
                  notation="compact"
                  compactDisplay="short"
                />{" "}
                notes
              </Badge>
              <Badge colorPalette="black" size={"md"}>
                <FormatNumber
                  value={selectedSong.starRating}
                  notation="compact"
                  compactDisplay="short"
                />{" "}
                stars
              </Badge>
              <Badge colorPalette="black" size={"md"}>
                {formatTime(selectedSong.duration)} minutes
              </Badge>
              {selectedSong.onlineStatus == "RANKED" && (
                <Badge colorPalette="blue" size={"md"}>
                  {selectedSong.onlineStatus}
                </Badge>
              )}
              {selectedSong.onlineStatus == "APPROVED" && (
                <Badge colorPalette="orange" size={"md"}>
                  LEGACY
                </Badge>
              )}
              {selectedSong.onlineStatus == "UNRANKED" && (
                <Badge colorPalette="red" size={"md"}>
                  UNRANKED
                </Badge>
              )}
            </Group>
            <Spacer />
            <Group>
              <DifficultyBadge difficulty={selectedSong.difficulty} />
              <RatingGroup.Root
                readOnly
                count={14}
                defaultValue={Math.round(selectedSong.starRating)}
                size="md"
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

          <Image
            w={200}
            h={200}
            rounded={"md"}
            src={selectedSongImage || ""}
            alt="naruto"
            objectFit="cover"
          />
        </Group>
      </Box>
      {/* <Box borderWidth="1px" borderRadius="lg" p={4} px={6}></Box> */}

      <Button variant={"subtle"} colorPalette={"green"} onClick={() => {}}>
        Play
      </Button>
    </Stack>
  );
}
