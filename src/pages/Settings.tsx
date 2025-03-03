import {
  Box,
  Button,
  Code,
  For,
  Group,
  Heading,
  Presence,
  Separator,
  Spacer,
  Stack,
  Switch,
  Tabs,
  Text,
} from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import { Slider } from "../components/ui/slider";
import { defaultSettings, settings } from "../settings";
import { TbRestore } from "react-icons/tb";
import { useState } from "react";
const settingRenderMap: {
  category: string;
  name: string;
  description: string;
  key: keyof typeof settings;
  type: "slider" | "check" | "number";
  min?: number;
  max?: number;
  step?: number;
  onEnd?: boolean;
}[] = [
  {
    category: "Audio",
    name: "Master Volume",
    description: "Multiplier for all sounds",
    key: "masterVolume",
    type: "slider",
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    category: "Audio",
    name: "Music Volume",
    description: "Volume of the music",
    key: "musicVolume",
    type: "slider",
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    category: "Audio",
    name: "SFX Volume",
    description: "Volume of the sound effects",
    key: "sfxVolume",
    type: "slider",
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    category: "Audio",
    name: "Hit Sound",
    description: "",
    key: "hitSound",
    type: "check",
  },
  {
    category: "Audio",
    name: "Miss Sound",
    description: "",
    key: "missSound",
    type: "check",
  },
  {
    category: "Video",
    name: "Menu Scale",
    description: "Main menu scale factor",
    key: "layoutZoom",
    type: "slider",
    min: 0.3,
    max: 1.5,
    step: 0.1,
    onEnd: true,
  },
  {
    category: "Gameplay",
    name: "Disable Pausing",
    description: "",
    key: "disablePausing",
    type: "check",
  },
  {
    category: "Gameplay",
    name: "Hitbox Size",
    description: "",
    key: "hitboxSize",
    type: "slider",
    min: 0.2,
    max: 2,
    step: 0.01,
  },
  {
    category: "Gameplay",
    name: "Hit Window",
    description: "",
    key: "hitWindow",
    type: "slider",
    min: 25,
    max: 100,
    step: 1,
  },
  {
    category: "Gameplay",
    name: "Counter Speed",
    description: "",
    key: "counterSpeed",
    type: "check",
  },
  {
    category: "Gameplay",
    name: "Restart on Death",
    description: "",
    key: "restartOnDeath",
    type: "check",
  },
  {
    category: "Gameplay",
    name: "Sensivity",
    description: "",
    key: "sensivity",
    type: "slider",
    min: 0,
    max: 5,
    step: 0.1,
  },
  {
    category: "Gameplay",
    name: "Absolute Mode",
    description: "",
    key: "absoluteMode",
    type: "check",
  },
  {
    category: "Gameplay",
    name: "Camera Parallax",
    description: "",
    key: "cameraParallax",
    type: "slider",
    min: 0,
    max: 10,
    step: 1,
  },
  {
    category: "Gameplay",
    name: "Field of View",
    description: "",
    key: "fov",
    type: "slider",
    min: 20,
    max: 120,
    step: 1,
  },
  {
    category: "Gameplay",
    name: "Spin",
    description: "",
    key: "spin",
    type: "check",
  },
  {
    category: "Video",
    name: "Fullscreen",
    description: "",
    key: "fullScreen",
    type: "check",
  },
  {
    category: "Video",
    name: "Optimize CPU/GPU Usage",
    description: "Will reduce your FPS to overall improve performance",
    key: "optimize",
    type: "check",
  },
];

export function SettingsPage() {
  const { layoutZoom } = useSnapshot(settings);
  const [currentTab, setCurrentTab] = useState("Gameplay");
  return (
    <Stack
      w={"100%"}
      h={"100%"}
      p={6}
      className="game-page"
      zoom={layoutZoom}
      style={{ filter: "invert(0)" }}
    >
      <Stack position="relative" gap={0}>
        <Heading size={"3xl"}>Settings</Heading>
        <Text color="fg.muted">Configure gameplay, video and audio</Text>
      </Stack>

      <Tabs.Root
        value={currentTab}
        onValueChange={(dets) => {
          setCurrentTab(dets.value);
        }}
      >
        <Tabs.List>
          <Tabs.Trigger value="Gameplay">Gameplay</Tabs.Trigger>
          <Tabs.Trigger value="Video">Video</Tabs.Trigger>
          <Tabs.Trigger value="Audio">Audio</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      <RenderSettings category={currentTab} />
    </Stack>
  );
}

export function RenderSettings({ category }: { category: string }) {
  const settingsSnap = useSnapshot(settings);
  return (
    <Stack h={"100%"} overflowY="scroll" pr={2} pb={6}>
      <For
        each={settingRenderMap.filter(
          (setting) => setting.category == category
        )}
      >
        {(item, index) => (
          <Box borderWidth="1px" key={index} p="4" bg={"bg"}>
            <Group h={2}>
              <Text fontWeight="bold">{item.name}</Text>
              <Presence
                present={defaultSettings[item.key] !== settingsSnap[item.key]}
                animationName={{
                  _open: "slide-from-bottom, fade-in",
                  _closed: "slide-to-bottom, fade-out",
                }}
                animationDuration="slower"
              >
                <Button
                  variant={"subtle"}
                  size={"2xs"}
                  fontSize={"xx-small"}
                  onClick={() => {
                    (settings[item.key] as any) = defaultSettings[item.key];
                  }}
                >
                  <TbRestore />
                  Revert to default of{" "}
                  <b>{defaultSettings[item.key]!.toString()}</b>
                </Button>
              </Presence>
            </Group>

            <Text color="fg.muted">{item.description}</Text>
            <Spacer h={1} />
            {item.type == "slider" && (
              <Stack align="flex-start">
                <Code fontSize={"xs"}>
                  Current: {settingsSnap[item.key]?.toString()}
                </Code>

                <Slider
                  w={400}
                  min={item.min}
                  max={item.max}
                  value={[settingsSnap[item.key] as number]}
                  onValueChange={
                    !item.onEnd
                      ? (e) => ((settings[item.key] as number) = e.value[0])
                      : undefined
                  }
                  onValueChangeEnd={(e) =>
                    ((settings[item.key] as number) = e.value[0])
                  }
                  step={item.step}
                />
              </Stack>
            )}

            {item.type == "check" && (
              <Stack align="flex-start">
                <Switch.Root
                  checked={settingsSnap[item.key] as boolean}
                  onCheckedChange={(e) =>
                    ((settings[item.key] as boolean) = e.checked)
                  }
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Switch.Label />
                </Switch.Root>
              </Stack>
            )}
          </Box>
        )}
      </For>
    </Stack>
  );
}
