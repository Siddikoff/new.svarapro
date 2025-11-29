import { PositionElement, PositionsContext } from "@/context/PositionsContext";
import { cn } from "@/utils/cn";
import { getChipsCountFromBet } from "@/utils/getChipsCountFromBet";
import { HTMLAttributes, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Coin } from "../Coin/Coin";

interface Props extends HTMLAttributes<HTMLDivElement> {
  bet?: number;
  playerPosition: PositionElement;
  reverse?: boolean;
  showAnimation?: boolean;
}

interface AnimatedChip {
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  delay: number;
  animate: boolean;
  faded: boolean;
}

export const PlayerBetAnimation = ({
  className,
  bet,
  playerPosition,
  reverse = false,
  showAnimation,
}: Props) => {
  const { bidsPosition } = useContext(PositionsContext);
  const [isPlayAnimation, setIsPlayAnimation] = useState(false);
  const chipsCount = getChipsCountFromBet(bet || 0);
  const [animatedChips, setAnimatedChips] = useState<AnimatedChip[]>([]);
  const [isStartAnimation, setIsStartAnimation] = useState(false);

  const playAnimation = () => setIsPlayAnimation(true);
  const stopAnimation = () => setIsPlayAnimation(false);

  useEffect(() => {
    if (showAnimation) {
      setIsStartAnimation(true);
    }
  }, [showAnimation]);

  useEffect(() => {
    if (!isStartAnimation) return;

    playAnimation();

    const timeout = setTimeout(() => {
      stopAnimation();
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isStartAnimation]);

  useEffect(() => {
    if (!bidsPosition || !chipsCount) return;

    const chips: AnimatedChip[] = [];
    const CHIP_WIDTH = 15;
    const CHIP_HEIGHT = 13;

    for (let i = 0; i < chipsCount; i++) {
      const randomOffsetX = (Math.random() - 0.5) * 30;
      const randomOffsetY = (Math.random() - 0.5) * 30;
      const randomDelay = Math.random() * 80;

      // меняем старт и цель в зависимости от reverse
      const startX = reverse
        ? bidsPosition.x + CHIP_WIDTH + randomOffsetX
        : playerPosition.x + 60;
      const startY = reverse
        ? bidsPosition.y - CHIP_HEIGHT / 2 + randomOffsetY
        : playerPosition.y + 60;
      const targetX = reverse
        ? playerPosition.x + 60
        : bidsPosition.x + CHIP_WIDTH + randomOffsetX;
      const targetY = reverse
        ? playerPosition.y + 60
        : bidsPosition.y - CHIP_HEIGHT / 2 + randomOffsetY;

      chips.push({
        id: i,
        startX,
        startY,
        targetX,
        targetY,
        delay: randomDelay,
        animate: false,
        faded: false,
      });
    }

    setAnimatedChips(chips);

    requestAnimationFrame(() => {
      setAnimatedChips((prev) => prev.map((c) => ({ ...c, animate: true })));
    });

    const fadeTimeout = setTimeout(() => {
      setAnimatedChips((prev) => prev.map((c) => ({ ...c, faded: true })));
    }, 800);

    return () => clearTimeout(fadeTimeout);
  }, [bidsPosition, chipsCount, playerPosition, reverse]);

  if (!isPlayAnimation) return null;

  return (
    <div className={cn(className)}>
      {animatedChips.map((chip) =>
        createPortal(
          <Coin
            key={chip.id}
            className="fixed w-8 h-11"
            style={{
              zIndex: 30 + chip.id,
              left: chip.startX,
              top: chip.startY,
              transform: chip.animate
                ? `translate(${chip.targetX - chip.startX}px, ${
                    chip.targetY - chip.startY
                  }px)`
                : "translate(0, 0)",
              opacity: chip.faded ? 0 : 1,
              transition: `
  transform 2s cubic-bezier(0.25, 1, 0.5, 1),
  opacity 0.5s ease ${chip.delay + 3000}ms
`,
              transitionDelay: `${chip.delay}ms`,
            }}
          />,
          document.body
        )
      )}
    </div>
  );
};
