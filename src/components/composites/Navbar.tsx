import {
  Button,
  Card,
  Group,
  Image,
  Separator,
  Stack,
  Tabs,
  Text,
} from "@chakra-ui/react";
import {
  TbHeart,
  TbList,
  TbSettings,
  TbSquares,
  TbUsersGroup,
} from "react-icons/tb";
import { Clock } from "./Clock";
import { ProfileCard } from "./ProfileCard";
import { settings } from "../../settings";
import { useSnapshot } from "valtio";
import { CurrentlyPlaying } from "./CurrentlyPlaying";

export function Navbar() {
  const { currentTab, layoutZoom } = useSnapshot(settings);
  return (
    <Card.Root w={"100%"} style={{ filter: "invert(0)" }} zoom={layoutZoom}>
      <Card.Body py={4}>
        <Group gap={4} justify={"space-between"}>
          <Group gap={4}>
            <Image src="logosmall.png" w={"10"}></Image>
            <Separator orientation="vertical" h={8} />
            <Tabs.Root
              value={currentTab}
              variant={"outline"}
              onValueChange={(tab) => {
                settings.currentTab = tab.value;
              }}
            >
              <Tabs.List>
                <Tabs.Trigger value="maps">
                  <TbList />
                  Maps
                </Tabs.Trigger>
                <Tabs.Trigger value="collections">
                  <TbSquares />
                  Collections
                </Tabs.Trigger>
                <Tabs.Trigger value="multiplayer">
                  <TbUsersGroup />
                  Multiplayer
                </Tabs.Trigger>
                <Tabs.Trigger value="settings">
                  <TbSettings />
                  Settings
                </Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>
          </Group>
          <Group gap={4} h="100%">
            <Separator orientation="vertical" h={8} />
            <ProfileCard />
            <Separator orientation="vertical" h={8} />
            <CurrentlyPlaying />
            <Separator orientation="vertical" h={8} />
            <Button variant={"ghost"}>
              <TbHeart />
            </Button>
          </Group>
        </Group>
      </Card.Body>
    </Card.Root>
  );
}
