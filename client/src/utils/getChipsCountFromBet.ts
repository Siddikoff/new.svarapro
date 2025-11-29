import { HOW_MANY_CHIPS_TO_BET } from "@/constants";

export const getChipsCountFromBet = (bet: number): number => {
  const thresholds = Object.keys(HOW_MANY_CHIPS_TO_BET)
    .map(Number)
    .sort((a, b) => a - b);

  for (let i = 0; i < thresholds.length; i++) {
    const limit = thresholds[i];
    if (bet <= limit) {
      return HOW_MANY_CHIPS_TO_BET[limit];
    }
  }

    return 15;
};