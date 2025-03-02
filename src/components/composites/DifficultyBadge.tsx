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
