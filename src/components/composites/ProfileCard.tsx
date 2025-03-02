import {
  Avatar,
  Group,
  Separator,
  Spacer,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import { online, supabase } from "../../supabase";

export function ProfileCard() {
  const { userProfile, loading } = useSnapshot(online);
  if (loading) {
    return <Spinner />;
  }
  if (!userProfile) {
    return (
      <Group
        h="100%"
        gap={3}
        cursor={"pointer"}
        onClick={() => {
          supabase.auth.signInWithOAuth({
            provider: "discord",
            options: {
              redirectTo: "http://localhost:5173",
            },
          });
        }}
      >
        <Separator orientation="vertical" h={8} />

        <Avatar.Root shape="rounded" border={4}>
          <Avatar.Fallback name="?" />
        </Avatar.Root>
        <Stack gap={0} justify={"center"} h="100%">
          <Text fontWeight={700} lineHeight={1.2} truncate w={100}>
            Guest
          </Text>
          <Text
            fontSize={"small"}
            color={"gray.500"}
            truncate
            w={100}
            lineHeight={1.2}
          >
            Log in to submit
          </Text>
        </Stack>
        <Spacer w={5} />
        <Text
          fontWeight={700}
          color={"gray.500"}
          fontSize={"xl"}
          lineHeight={1.2}
        >
          0rp
        </Text>
        <Text fontWeight={900} fontSize={"xl"} lineHeight={1.2}>
          #?
        </Text>

        <Separator orientation="vertical" h={8} />
      </Group>
    );
  }
  return (
    <Group h="100%" gap={3}>
      <Avatar.Root shape="rounded" border={4}>
        <Avatar.Fallback name="?" />
        <Avatar.Image src="https://static.rhythia.com/user-avatar-1735403011472-a2a8cfbe-af5d-46e8-a19a-be2339c1679a" />
      </Avatar.Root>
      <Stack gap={0} justify={"center"} h="100%">
        <Text fontWeight={700} lineHeight={1.2}>
          {userProfile.username}
        </Text>
        <Text fontSize={"small"} color={"gray.500"} lineHeight={1.2}>
          {userProfile.flag}
        </Text>
      </Stack>
      <Spacer w={5} />
      <Text
        fontWeight={700}
        color={"gray.500"}
        fontSize={"md"}
        lineHeight={1.2}
      >
        {Math.round(userProfile.skill_points || 0)}rp
      </Text>
      <Text fontWeight={900} fontSize={"mds"} lineHeight={1.2}>
        #{Math.round(userProfile.position || 0)}
      </Text>
    </Group>
  );
}
