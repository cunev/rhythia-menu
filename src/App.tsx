import { Presence, Stack } from "@chakra-ui/react";
import { Navbar } from "./components/composites/Navbar";
import useElementSound from "./hook/useSound";
import { useSnapshot } from "valtio";
import { settings } from "./settings";
import { SettingsPage } from "./pages/Settings";
import { MapsPage } from "./pages/Maps";
import { Warning } from "./components/composites/Warning";
import AudioVisualizer from "./components/composites/AudioVisualizer";

function App() {
  const { currentTab } = useSnapshot(settings);
  useElementSound({
    elementType: "button",
    className: "chakra-button",
    clickSoundUrl: "/button-click.wav",
    hoverSoundUrl: "/button-hover.wav",
  });
  useElementSound({
    elementType: "div",
    className: "song-box",
    clickSoundUrl: "/button-click.wav",
    hoverSoundUrl: "/button-hover.wav",
  });
  useElementSound({
    elementType: "button",
    className: "chakra-tabs__trigger",
    clickSoundUrl: "/button-click.wav",
    hoverSoundUrl: "/button-hover.wav",
  });

  useElementSound({
    elementType: "span",
    className: "chakra-switch__control",
    clickSoundUrl: "/button-click.wav",
  });

  useElementSound({
    elementType: "p",
    className: "warning",
    appearSoundUrl: "/done.wav",
    appearVolumeMultiplier: 0.4,
  });
  return (
    <>
      <AudioVisualizer />

      <Warning />
      <Stack h={"100dvh"} p={"4"} userSelect={"none"}>
        <Navbar />
        <Stack pos={"relative"} h={"100%"} w={"100%"}>
          <Presence
            present={currentTab == "settings"}
            animationName={{
              _open: "slide-from-bottom, fade-in",
              _closed: "slide-to-bottom, fade-out",
            }}
            animationDuration="slower"
            position={"absolute"}
            w={"100%"}
            h={"100%"}
          >
            <SettingsPage />
          </Presence>
          <Presence
            present={currentTab == "maps"}
            animationName={{
              _open: "slide-from-bottom, fade-in",
              _closed: "slide-to-bottom, fade-out",
            }}
            animationDuration="slower"
            position={"absolute"}
            w={"100%"}
            h={"100%"}
          >
            <MapsPage />
          </Presence>
        </Stack>
      </Stack>
    </>
  );
}

export default App;
