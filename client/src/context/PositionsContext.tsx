import { WithNull } from "@/types/mainTypes";
import { createContext, ReactNode, useState } from "react";

export interface PositionElement {
  x: number;
  y: number;
}

export interface PlayerPosition extends PositionElement {
  cardSide?: string;
  openCardsPosition?: "top" | "bottom" | "left" | "right";
}

interface PositionsContextState {
  deckPosition: WithNull<PositionElement>;
  playersPositions: PlayerPosition[];
  bidsPosition: WithNull<PositionElement>;
  changeDeckPosition: (position: WithNull<PositionElement>) => void;
  changePlayersPositions: (positions: PlayerPosition[]) => void;
  addPlayerPosition: (position: PlayerPosition) => void;
  changeBidsPosition: (position: WithNull<PositionElement>) => void;
}

export const PositionsContext = createContext<PositionsContextState>({
  deckPosition: null,
  playersPositions: [],
  bidsPosition: null,
  changeDeckPosition: () => {},
  changePlayersPositions: () => {},
  addPlayerPosition: () => {},
  changeBidsPosition: () => {},
});

interface Props {
  children: ReactNode;
}

export function PositionsProvider({ children }: Props) {
  const [deckPosition, setDeckPosition] =
    useState<WithNull<PositionElement>>(null);
  const [playersPositions, setPlayersPositions] = useState<PlayerPosition[]>(
    []
  );
  const [bidsPosition, setBidsPosition] =
    useState<WithNull<PositionElement>>(null);

  const changeDeckPosition = (position: WithNull<PositionElement>) => {
    setDeckPosition(position);
  };

  const changePlayersPositions = (positions: PlayerPosition[]) => {
    setPlayersPositions(positions);
  };

  const addPlayerPosition = (position: PlayerPosition) => {
    setPlayersPositions((prev) => [...prev, position]);
  };

  const changeBidsPosition = (position: WithNull<PositionElement>) => {
    setBidsPosition(position);
  };

  return (
    <PositionsContext.Provider
      value={{
        deckPosition,
        playersPositions,
        changeDeckPosition,
        changePlayersPositions,
        addPlayerPosition,
        bidsPosition,
        changeBidsPosition,
      }}
    >
      {children}
    </PositionsContext.Provider>
  );
}
