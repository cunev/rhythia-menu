import { Badge } from "@chakra-ui/react";

export function DifficultyBadge({ difficulty }: { difficulty: number }) {
  let difficultyBadge = <Badge colorPalette={"purple"}>LOGIC</Badge>;

  if (difficulty == 0) {
    difficultyBadge = <Badge colorPalette={"dark"}>N/A</Badge>;
  }
  if (difficulty == 1) {
    difficultyBadge = <Badge colorPalette={"green"}>EASY</Badge>;
  }
  if (difficulty == 2) {
    difficultyBadge = <Badge colorPalette={"yellow"}>MEDIUM</Badge>;
  }
  if (difficulty == 5) {
    difficultyBadge = <Badge colorPalette={"dark"}>TASUKETE</Badge>;
  }
  if (difficulty == 3) {
    difficultyBadge = <Badge colorPalette={"red"}>HARD</Badge>;
  }
  return difficultyBadge;
}

export const difficultyBadgeColors = {
  0: "#18181b", // N/A
  1: "#042713", // EASY
  2: "#422006", // MEDIUM
  3: "#300c0c", // HARD
  4: "#2f0553", // LOGIC
  5: "#27272a", // TASUKETE
};
export const difficultyBadgeNames = {
  0: "N/A", // N/A
  1: "EASY", // EASY
  2: "MEDIUM", // MEDIUM
  3: "HARD", // HARD
  4: "LOGIC", // LOGIC
  5: "TASUKETE", // TASUKETE
};
