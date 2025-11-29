import { HTMLAttributes, useContext, useEffect, useRef, useState } from "react";

import { BackCard } from "../BackCard/BackCard";
import { cn } from "@/utils/cn";
import { PositionsContext } from "@/context/PositionsContext";
import { createPortal } from "react-dom";
import { GameStatuses } from "@/types/game";
import { useSoundContext } from "@/context/SoundContext";

interface AnimatedCard {
  id: number;
  x: number;
  y: number;
  delay: number;
  animate: boolean;
}

interface Props extends HTMLAttributes<HTMLDivElement> {
  gameStatus: GameStatuses;
}

const MAX_ROUNDS = 3;

export function CardsDeck({ className, gameStatus }: Props) {
  const { changeDeckPosition, playersPositions, deckPosition } =
    useContext(PositionsContext);
  const cardsDeckArray = new Array(6).fill(1);
  const ref = useRef<HTMLDivElement>(null);
  const [animatedCards, setAnimatedCards] = useState<AnimatedCard[]>([]);
  const [isDeckVisible, setIsDeckVisible] = useState(false);
  const [isStartDistribution, setIsStartDistribution] = useState(false);
  const distributionTriggered = useRef(false);
  const { playSound } = useSoundContext();

  useEffect(() => {
    const onResizeHandler = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      changeDeckPosition({ x: rect.x, y: rect.y });
    };
    onResizeHandler();
    window.addEventListener("resize", onResizeHandler);
    return () => window.removeEventListener("resize", onResizeHandler);
  }, []);

  useEffect(() => {
    if (gameStatus === "ante" && !distributionTriggered.current) {
      setTimeout(() => {
        setIsDeckVisible(true);
        setIsStartDistribution(true);
        distributionTriggered.current = true;
      }, 2000)
    }
  }, [gameStatus]);

  useEffect(() => {
    if (!isStartDistribution || !isDeckVisible) return;

    const cards: AnimatedCard[] = [];
    let counter = 0;
    const CARD_WIDTH = 32;
    const CARD_HEIGHT = 44;

    for (let round = 0; round < MAX_ROUNDS; round++) {
      for (
        let playerIndex = 0;
        playerIndex < playersPositions.length;
        playerIndex++
      ) {
        const pos = playersPositions[playerIndex];
        const offsetX = round * MAX_ROUNDS;
        const targetXLeft = pos.x + CARD_WIDTH - 30 + offsetX;
        const targetXRight = pos.x + CARD_WIDTH + 60 + offsetX;
        const targetY = pos.y - CARD_HEIGHT + 92;

        cards.push({
          id: counter,
          x: pos.cardSide === "left" ? targetXLeft : targetXRight,
          y: targetY,
          delay: counter * 300,
          animate: false,
        });
        counter++;
      }
    }

    setAnimatedCards(cards);
    requestAnimationFrame(() =>
      setAnimatedCards(cards.map((c) => ({ ...c, animate: true })))
    );

    // cards.forEach((card) => {
    //   setTimeout(() => playSound("deal"), card.delay);
    // });

    const lastCard = cards[cards.length - 1];
    const totalTime = lastCard.delay + 500;
    const timeout = setTimeout(() => {
      setIsDeckVisible(false);
      setIsStartDistribution(false);
    }, totalTime + 200);

    return () => clearTimeout(timeout);
  }, [playersPositions, deckPosition, isStartDistribution, isDeckVisible]);

  if (!isDeckVisible) return null;

  return (
    <div
      className={cn(
        "absolute bottom-40 left-1/2 -translate-x-1/2 z-30",
        className
      )}
      ref={ref}
      id="cards-deck"
    >
      <div className="relative w-8 h-11">
        {cardsDeckArray.map((_, index) => (
          <BackCard
            className="absolute w-full h-full"
            style={{ bottom: index + "px" }}
          />
        ))}

        {deckPosition &&
          animatedCards.map((card) => {
            return createPortal(
              <BackCard
                key={card.id}
                className="fixed w-8 h-11"
                data-name="animate-card"
                style={{
                  zIndex: 30,
                  left: deckPosition.x + "px",
                  top: deckPosition.y - 6 + "px",
                  transform: card.animate
                    ? `translate(${card.x - (deckPosition?.x || 0)}px, ${
                        card.y - (deckPosition?.y || 0)
                      }px)`
                    : "translate(0, 0)",
                  transition: "transform 0.5s ease",
                  transitionDelay: `${card.delay}ms`,
                }}
              />,
              document.body
            );
          })}
      </div>
    </div>
  );
}
