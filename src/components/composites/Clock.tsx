import { Text } from "@chakra-ui/react";
import { useTime } from "react-timer-hook";

export function Clock() {
  const { seconds, minutes, hours, ampm } = useTime({ format: "12-hour" });
  return (
    <Text textStyle="md">
      {hours.toString().padStart(2, "0")}:{minutes.toString().padStart(2, "0")}:
      {seconds.toString().padStart(2, "0")} {ampm}
    </Text>
  );
}
