import { Image, Presence, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import {
  imageStorage,
  mapStorage,
  musicStorage,
} from "../../utils/storage/storageUtils";
import { SoundSpaceMemoryMap } from "../../utils/types/ssmm";
import { audioState } from "../../audioState";

export function Warning() {
  const [show, setShow] = useState(true);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setShow(false);
    }, 6000);
    setTimeout(() => {
      setShowText(true);
      setTimeout(async () => {
        const keys = await mapStorage.keys();
        const key = Math.floor(Math.random() * keys.length);
        const item = (await musicStorage.getItem(keys[key])) as ArrayBuffer;

        const image = (await imageStorage.getItem(keys[key])) as ArrayBuffer;

        const map = (await mapStorage.getItem(
          keys[key]
        )) as SoundSpaceMemoryMap;
        const blob2 = new Blob([item], { type: "image/jpeg" });
        const blob = new Blob([image], { type: "image/jpeg" });

        const url2 = URL.createObjectURL(blob2);
        const url = URL.createObjectURL(blob);

        audioState.url = url2;
        audioState.coverUrl = url;
        audioState.musicName = map.title;
        audioState.play();
      }, 500);
    }, 1000);
  }, []);

  return (
    <Presence
      pos={"absolute"}
      w="100%"
      h="100vh"
      left={0}
      right={0}
      bg={"rgb(0,0,0)"}
      zIndex={50}
      present={show}
      animationName={{
        _closed: "slide-to-bottom, fade-out",
      }}
      animationDuration="slowest"
    >
      <Stack
        w="100%"
        h="100%"
        justify={"center"}
        align={"center"}
        gap={12}
        userSelect={"none"}
        filter={"invert(0)"}
      >
        <Image src="logosmall.png" w={110}></Image>

        <Presence
          present={showText}
          animationName={{
            _open: "slide-from-bottom, fade-in",
            _closed: "slide-to-bottom, fade-out",
          }}
          animationDuration="slower"
          lazyMount
        >
          <Text className="warning" maxW={1300} px={12} fontWeight={"medium"}>
            Your gameplay information may be displayed on web pages,
            leaderboards, including those located at https://rhythia.com. For
            any official announcement, or updates related to the game, please
            visit https://rhythia.com/download. <br />
            <br />
            Unauthorized copying, reverse engineering, transmission, public
            performance, rental, pay for play, or circumvention of copy
            protection is strictly prohibited. The content of this videogame is
            purely fictional, is not intended to depict any actual event,
            person, or entity, and any such similiarities is purely
            coincidental. The makers and publishers of the videogame do not in
            any way endorse, condone or encourage engaging in any conduct
            depicted in this videogame. <br />
            <br />
            Online gameplay might also submit additional system information
            telemetries to prevent unfair advantage, the data is encrypted and
            managed by https://hook.ac subsidiary. <br />
            <br />
            Rhythia is a community-driven game, with community made content that
            might be subject to copyright rights, in case of any infringement
            detected by game management, or notice, the content is removed from
            the platform indefinitely, more information can be read on the
            official platform https://www.rhythia.com/copyright.
          </Text>
        </Presence>
      </Stack>
    </Presence>
  );
}
