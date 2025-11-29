import { useState, useEffect, useRef, useContext } from "react";
import { GameStatuses, Player } from "@/types/game";
import { CardComponent } from "./CardComponent";
import { ActionNotification } from "./ActionNotification";
import defaultAvatar from "@/assets/main_logo.png";
import cardBack from "@/assets/game/back.png";
import chatButtonBg from "@/assets/game/chat.png";
import { TURN_DURATION_SECONDS } from "@/constants";
import { PositionElement, PositionsContext } from "@/context/PositionsContext";
import { PlayerBetAnimation } from "./PlayerBetAnimation";
import { WithNull } from "@/types/mainTypes";
import { cn } from "@/utils/cn";

const formatAmount = (amount: number): string => {
  const num = Number(amount);
  const fixed = num.toFixed(2);
  if (fixed.endsWith(".00")) {
    return String(Math.round(num));
  }
  if (fixed.endsWith("0")) {
    return fixed.slice(0, -1);
  }
  return fixed;
};

const formatUsername = (username: string): string => {
  if (username.length <= 11) {
    return username;
  }
  return username.slice(0, 8) + "...";
};

interface PlayerSpotProps {
  player: Player;
  isCurrentUser: boolean;
  showCards: boolean;
  scale?: number;
  cardSide?: string;
  openCardsPosition?: "top" | "bottom" | "left" | "right";
  isTurn?: boolean;
  turnTimer?: number;
  winAmount?: number;
  chatPhrase?: string;
  onPlayerBet?: (playerId: string) => void;
  gameState?: {
    log: Array<{
      telegramId: string;
      amount?: number;
      timestamp: number;
      type?: string;
    }>;
    winners?: Array<{ id: string; username?: string; position?: number }>;
    status?: string;
    lastActionAmount?: number;
    currentBet?: number;
  };
  notificationType: "blind" | "paid" | "pass" | "rais" | "win" | "look" | null;
  showWinIndicator: boolean;
}

export function PlayerSpot({
  player,
  isCurrentUser,
  showCards,
  scale = 1,
  cardSide = "right",
  openCardsPosition = "top",
  isTurn = false,
  turnTimer = TURN_DURATION_SECONDS,
  winAmount = 0,
  chatPhrase,
  onPlayerBet,
  gameState,
  notificationType,
  showWinIndicator,
}: PlayerSpotProps) {
  scale = 1;
  const { username, avatar, balance, cards, hasFolded, hasLooked, score } =
    player;
  const [lastTotalBet, setLastTotalBet] = useState(player.totalBet);
  const { addPlayerPosition } = useContext(PositionsContext);
  const ref = useRef<HTMLDivElement>(null);
  const [playerPosition, setPlayerPosition] =
    useState<WithNull<PositionElement>>(null);
  const [showBetAnimation, setShowBetAnimation] = useState(false);
  const [lastBet, setLastBet] = useState(player.currentBet);

  const [openCards, setOpenCards] = useState(false)
  const [newShowWinIndicator, setNewShowWinIndicator] = useState(false);

  useEffect(() => {
    console.log('shoWinIndicator!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!>>', showWinIndicator)
    if (showWinIndicator) {
      setNewShowWinIndicator(true);
      setTimeout(() => {
        setNewShowWinIndicator(false)
      }, 2250)
    }
  }, [showWinIndicator])

  const buttonTextStyle: React.CSSProperties = {
    fontWeight: 700,
    fontSize: "9px",
    lineHeight: "100%",
    textAlign: "center",
    color: "black",
  };

  // Функция для вычисления суммы последнего действия игрока
  // const getLastActionAmount = () => {
  //   if (!gameState?.log) return 0;
  //
  //   if (gameState.status === 'betting') {
  //     if (gameState.lastActionAmount && gameState.lastActionAmount > 0) {
  //       return gameState.lastActionAmount;
  //     }
  //
  //     const currentPlayerBet = player.currentBet || 0;
  //     const gameStateCurrentBet = gameState.currentBet || 0;
  //     return Math.max(0, gameStateCurrentBet - currentPlayerBet);
  //   }
  //
  //   const playerActions = gameState.log
  //     .filter((action) => action.telegramId === player.id)
  //     .sort((a, b) => b.timestamp - a.timestamp);
  //
  //   if (playerActions.length === 0) return 0;
  //
  //   const lastAction = playerActions[0];
  //   const amount = lastAction.amount || 0;
  //
  //   return amount;
  // };

  const progress = (turnTimer / TURN_DURATION_SECONDS) * 100;

  // Отслеживание изменений ставок для анимации фишек
  useEffect(() => {
    // Временно отключена автоматическая анимация - она запускается только через обработчики действий
    // if (player.totalBet > lastTotalBet && onPlayerBet) {
    //   onPlayerBet(player.id);
    // }
    setLastTotalBet(player.totalBet);
  }, [player.totalBet, lastTotalBet, player.id, onPlayerBet]);

  const baseAvatarSize = 71;
  const baseNameWidth = 70;
  const baseNameHeight = 32;

  const avatarSize = baseAvatarSize * scale;
  const nameWidth = baseNameWidth * scale;
  const nameHeight = baseNameHeight * scale;

  // Размеры карт для текущего пользователя (больше)
  const currentUserCardHeight = Math.round(avatarSize * 1.2);
  const currentUserCardWidth = Math.round(currentUserCardHeight * (65 / 90));
  const currentUserStep = Math.round(currentUserCardWidth * 0.46);

  // Размеры карт для других игроков (меньше)
  const otherPlayersCardHeight = Math.round(avatarSize);
  const otherPlayersCardWidth = Math.round(otherPlayersCardHeight * (65 / 90));
  const otherPlayersStep = Math.round(otherPlayersCardWidth * 0.46);

  // Выбираем размеры в зависимости от того, текущий ли это пользователь
  const cardHeight = isCurrentUser
    ? currentUserCardHeight
    : otherPlayersCardHeight;
  const cardWidth = isCurrentUser
    ? currentUserCardWidth
    : otherPlayersCardWidth;
  const step = isCurrentUser ? currentUserStep : otherPlayersStep;

  const spotClasses = `
    relative rounded-lg p-3 flex items-center
    ${hasFolded ? "opacity-60" : ""}
    ${!player.isActive && !player.hasFolded ? "opacity-70" : ""}
  `;

  const containerStyle: React.CSSProperties = {
    transform: `scale(${scale})`,
    transformOrigin: "center center",
  };

  useEffect(() => {
    const onResizeHandler = () => {
      if (!ref.current) return;

      const playerPosition = ref.current.getBoundingClientRect();
      addPlayerPosition({
        x: playerPosition.x,
        y: playerPosition.y,
        cardSide,
        openCardsPosition,
      });

      setPlayerPosition({
        x: playerPosition.x,
        y: playerPosition.y,
      });
    };

    onResizeHandler();
    window.addEventListener("resize", onResizeHandler);

    return () => window.removeEventListener("resize", onResizeHandler);
  }, []);

  const TotalBetComponent = player.totalBet > 0 && !showCards && (
    <div
      className="text-white font-semibold text-xs leading-4 flex items-center justify-center px-2"
      style={{
        minWidth: "32px",
        height: "19px",
        borderRadius: "8px",
        backgroundColor: "rgba(35, 34, 40, 0.61)",
      }}
    >
      {`$${formatAmount(player.totalBet)}`}
    </div>
  );

  const DealerIcon = player.isDealer && (
    <div className="w-[15px] h-[15px] bg-black rounded-full flex items-center justify-center text-white font-bold text-[10px]">
      D
    </div>
  );

  const CardDeckComponent = (type: string) =>  {
    if (type == 'right') {
      return <div className="flex flex-col items-center space-y-1">
          <div className="relative" style={{ width: "42px", height: "42px" }}>
            <img
              src={cardBack}
              alt="card back"
              className="absolute rounded-sm"
              style={{
                width: '32px',
                height: '44px',
                zIndex: 3,
                top: "0",
                left: "0",
              }}
            />
            <img
              src={cardBack}
              alt="card back"
              className="absolute rounded-sm"
              style={{
                width: '32px',
                height: '44px',
                zIndex: 2,
                top: "0",
                left: "4px",
              }}
            />
            <img
              src={cardBack}
              alt="card back"
              className="absolute rounded-sm"
              style={{
                width: '32px',
                height: '44px',
                zIndex: 1,
                top: "0",
                left: "8px",
              }}
            />
          </div>
          </div>
    } else if (type == 'left') {
      return <div className="flex flex-col items-center space-y-1">
          <div className="relative" style={{ width: "42px", height: "42px" }}>
            <img
              src={cardBack}
              alt="card back"
              className="absolute rounded-sm"
              style={{
                width: "30px",
                height: "42px",
                zIndex: 3,
                top: "0",
                left: "0",
              }}
            />
            <img
              src={cardBack}
              alt="card back"
              className="absolute rounded-sm"
              style={{
                width: "30px",
                height: "42px",
                zIndex: 2,
                top: "0",
                left: "-4px",
              }}
            />
            <img
              src={cardBack}
              alt="card back"
              className="absolute rounded-sm"
              style={{
                width: "30px",
                height: "42px",
                zIndex: 1,
                top: "0",
                left: "-8px",
              }}
            />
          </div>
          </div>
    } else {
      return <div className="flex flex-col items-center space-y-1">
          <div className="relative" style={{ width: "42px", height: "42px" }}>
            <img
              src={cardBack}
              alt="card back"
              className="absolute rounded-sm"
              style={{
                width: "30px",
                height: "42px",
                zIndex: 3,
                top: "0",
                left: "0",
              }}
            />
            <img
              src={cardBack}
              alt="card back"
              className="absolute rounded-sm"
              style={{
                width: "30px",
                height: "42px",
                zIndex: 2,
                top: "0",
                left: "4px",
              }}
            />
            <img
              src={cardBack}
              alt="card back"
              className="absolute rounded-sm"
              style={{
                width: "30px",
                height: "42px",
                zIndex: 1,
                top: "0",
                left: "8px",
              }}
            />
          </div>
          </div>
    }
    
  };

  useEffect(() => {
    if (!playerPosition || !gameState?.status) return;

    const bettingStatuses: GameStatuses[] = ["blind_betting", "betting"];

    // Если игрок делает ставку
    if (
      player.currentBet > lastBet &&
      bettingStatuses.includes(gameState.status as GameStatuses)
    ) {
      setShowBetAnimation(true);
      const timeout = setTimeout(() => setShowBetAnimation(false), 2000);
      return () => clearTimeout(timeout);
    }

    // Если игрок выиграл и нужно вернуть фишки
    if (gameState.status === "finished" && winAmount > 0) {
      setShowBetAnimation(true);
      const timeout = setTimeout(() => setShowBetAnimation(false), 2500);
      return () => clearTimeout(timeout);
    }

    setLastBet(player.currentBet);
  }, [
    player.currentBet,
    lastBet,
    gameState?.status,
    playerPosition,
    winAmount,
  ]);

  const hue = progress * 1.2;
  const progressBarColor = `hsl(${hue}, 100%, 50%)`;

  // Render a placeholder for players waiting for the next round
  if (!player.isActive && !player.hasFolded) {
    return (
      <div className={`${spotClasses} player-spot`} style={containerStyle}>
        <div className="relative">
          <div
            className="relative flex justify-center items-start"
            style={{
              width: `${avatarSize}px`,
              height: `${avatarSize + nameHeight / 1.5}px`,
            }}
          >
            <div
              className="relative z-10"
              style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
            >
              <div
                className="absolute rounded-full top-0 left-0"
                style={{
                  width: `${avatarSize}px`,
                  height: `${avatarSize}px`,
                  backgroundColor: "#555456",
                }}
              ></div>
              <div
                className="absolute rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  width: `${avatarSize - 6 * scale}px`,
                  height: `${avatarSize - 6 * scale}px`,
                  backgroundColor: "#ECEBF5",
                }}
              ></div>
              <div
                className="absolute rounded-full overflow-hidden top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  width: `${avatarSize - 10 * scale}px`,
                  height: `${avatarSize - 10 * scale}px`,
                }}
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt={username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={defaultAvatar}
                    alt={username}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
            <div
              className="absolute left-1/2 transform -translate-x-1/2 z-20"
              style={{ bottom: "-4px" }}
            >
              <div className="flex flex-col items-center">
                <div
                  className="relative"
                  style={{ width: `${nameWidth}px`, height: `${nameHeight}px` }}
                >
                  <div
                    className=" inset-0"
                    style={{
                      borderRadius: `${8 * scale}px`,
                      background:
                        "linear-gradient(180deg, #48454D 0%, rgba(255, 255, 255, 0.3) 50%, #2D2B31 100%)",
                    }}
                  ></div>
                  <div
                    className="absolute flex flex-col items-center justify-center"
                    style={{
                      top: `${1 * scale}px`,
                      left: `${1 * scale}px`,
                      right: `${1 * scale}px`,
                      bottom: `${1 * scale}px`,
                      borderRadius: `${7 * scale}px`,
                      background: "linear-gradient(to top, #000000, #36333B)",
                    }}
                  >
                    <div
                      className="font-bold"
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: `${10 * scale}px`,
                        borderBottom: `${1 * scale}px solid rgba(255, 255, 255, 0.07)`,
                      }}
                    >
                      {formatUsername(username)}
                    </div>
                    <div
                      className="font-bold"
                      style={{ color: "#D2A21B", fontSize: `${10 * scale}px` }}
                    >
                      {`$${formatAmount(balance)}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (player.hasFolded == false) {
      setTimeout(() => {
        setOpenCards(true);
      }, 2000)
    } else {
      setOpenCards(false)
    }
  }, [player])

  return (
    <div
      className={`${spotClasses} player-spot`}
      style={containerStyle}
      ref={ref}
    >
      {chatPhrase && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center p-1"
          style={{
            width: "75px",
            height: "38px",
            bottom: "80%", // Positioned above the avatar
            paddingBottom: "13px",
            backgroundImage: `url(${chatButtonBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            ...buttonTextStyle,
          }}
        >
          {chatPhrase}
        </div>
      )}
      <ActionNotification
        action={notificationType}
        visible={
          !!notificationType && (notificationType === "pass" || !hasFolded)
        }
      />
      <div className="relative">
        <div
          className="relative flex justify-center items-start"
          style={{
            width: `${avatarSize}px`,
            height: `${avatarSize + nameHeight / 1.5}px`,
          }}
        >
          <div
            className="relative z-10"
            style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
          >
            {/* Win amount container */}
            {newShowWinIndicator && (
              <div
                className="absolute left-1/2 transform -translate-x-1/2 -translate-y-full mb-2 flex items-center justify-center transition-opacity duration-500"
                style={{
                  top: "18px",
                  width: `${75 * scale}px`,
                  height: `${21 * scale}px`,
                  borderRadius: `${12 * scale}px`,
                  background: "#212027",
                  boxShadow: "0px 0px 4px 2px #EC8800",
                  zIndex: 50,
                  marginBottom: `${8 * scale}px`,
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontStyle: "normal",
                    fontSize: `${15 * scale}px`,
                    lineHeight: "100%",
                    letterSpacing: "0%",
                    textAlign: "center",
                    verticalAlign: "middle",
                    color: "#D2A21B",
                  }}
                >
                  {`+$${formatAmount(winAmount)}`}
                </span>
              </div>
            )}

            {/* Avatar with win animation shadow */}
            <div
              className="absolute rounded-full top-0 left-0 transition-all duration-500"
              style={{
                width: `${avatarSize}px`,
                height: `${avatarSize}px`,
                backgroundColor: "#555456",
                boxShadow: newShowWinIndicator
                  ? "0px 0px 4px 2px #EC8800"
                  : isTurn
                    ? "0px 0px 8px 4px #56BF00"
                    : "none",
              }}
            ></div>
            <div
              className="absolute rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              style={{
                width: `${avatarSize - 6 * scale}px`,
                height: `${avatarSize - 6 * scale}px`,
                backgroundColor: "#ECEBF5",
              }}
            ></div>
            <div
              className="absolute rounded-full overflow-hidden top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              style={{
                width: `${avatarSize - 10 * scale}px`,
                height: `${avatarSize - 10 * scale}px`,
              }}
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt={username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={defaultAvatar}
                  alt={username}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Total bet for current user - positioned above avatar */}
            {isCurrentUser && TotalBetComponent && (
              <div
                className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center"
                style={{
                  top: `-50px`,
                  zIndex: 60,
                }}
              >
                {TotalBetComponent}
              </div>
            )}
          </div>
          <div
            className="absolute left-1/2 transform -translate-x-1/2 z-20"
            style={{ bottom: "-4px" }}
          >
            <div className="flex flex-col items-center">
              <div
                className="relative"
                style={{ width: `${nameWidth}px`, height: `${nameHeight}px` }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    borderRadius: `${8 * scale}px`,
                    background:
                      "linear-gradient(180deg, #48454D 0%, rgba(255, 255, 255, 0.3) 50%, #2D2B31 100%)",
                  }}
                ></div>
                <div
                  className="absolute flex flex-col items-center justify-center"
                  style={{
                    top: `${1 * scale}px`,
                    left: `${1 * scale}px`,
                    right: `${1 * scale}px`,
                    bottom: `${1 * scale}px`,
                    borderRadius: `${7 * scale}px`,
                    background: "linear-gradient(to top, #000000, #36333B)",
                  }}
                >
                  <div
                    className="font-bold"
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: `${10 * scale}px`,
                      borderBottom: `${1 * scale}px solid rgba(255, 255, 255, 0.07)`,
                    }}
                  >
                    {formatUsername(username)}
                  </div>
                  <div
                    className="font-bold"
                    style={{ color: "#D2A21B", fontSize: `${10 * scale}px` }}
                  >
                    {`$${formatAmount(balance)}`}
                  </div>
                </div>

                {/* Dealer Icon - позиционируется слева или справа от блока с именем и балансом */}
                {DealerIcon && (
                  <div
                    className="absolute"
                    style={{
                      top: "50%",
                      transform: "translateY(-50%)",
                      [cardSide === "left" ? "left" : "right"]:
                        `${-20 * scale}px`,
                      zIndex: 25,
                    }}
                  >
                    {DealerIcon}
                  </div>
                )}
              </div>
              {isTurn && (
                <div
                  className="absolute"
                  style={{
                    bottom: "-10px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "68px",
                    height: "5px",
                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      backgroundColor: progressBarColor,
                      borderRadius: "3px",
                      transition:
                        "width 0.1s linear, background-color 0.1s linear",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        {!hasFolded &&
          (showCards ||
            (isCurrentUser &&
              hasLooked &&
              (gameState?.status === "blind_betting" ||
                gameState?.status === "betting"))) && (
            <div
              className="absolute z-50"
              style={{
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
                ...(openCardsPosition === "top" && {
                  left: "50%",
                  transform: "translateX(-50%)",
                  top: `${-10 * scale}px`,
                }),
                ...(openCardsPosition === "bottom" && {
                  left: "50%",
                  transform: "translateX(-50%)",
                  top: `${40 * scale}px`,
                }),
                ...(openCardsPosition === "left" && {
                  right: `${95 * scale}px`,
                  top: "40%",
                  transform: "translateY(-50%)",
                }),
                ...(openCardsPosition === "right" && {
                  left: `${95 * scale}px`,
                  top: "40%",
                  transform: "translateY(-50%)",
                }),
              }}
            >
              <div className="relative w-full h-full">
                {cards.map((card, index) => {
                  const centerOffset = ((cards.length - 1) * step) / 2;
                  const left = index * step - centerOffset;
                  const rotation = index === 0 ? -12 : index === 1 ? 0 : 12;
                  const topOffset = index === 1 ? 0 : 4;
                  return (
                    <div
                      key={index}
                      className="absolute"
                      style={{
                        left: `${left}px`,
                        top: `${topOffset}px`,
                        width: `${cardWidth}px`,
                        height: `${cardHeight}px`,
                        transform: `rotate(${rotation}deg)`,
                        zIndex: index + 1001,
                      }}
                    >
                      <CardComponent
                        card={card}
                        hidden={false}
                        customWidth={cardWidth}
                        customHeight={cardHeight}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        {!hasFolded && (
          
          <div
            className={cn(
              "absolute z-30 top-8 -translate-y-1/2 flex items-center space-x-2",
              {
                "-right-[22px]": cardSide === "right",
                "-left-[13px]": cardSide === "left",
                "left-[53%] -translate-x-[25%]":
                  openCardsPosition === "bottom" || openCardsPosition === "top",
             
                "left-[53px]": openCardsPosition === "top" || openCardsPosition === "bottom",
              }
            )}
          >
            <div
              className={`transition delay-3400 ${
                (!(isCurrentUser && hasLooked) &&
              gameState?.status !== "finished" &&
              gameState?.status !== "waiting" &&
              gameState?.status !== "ante" &&
              gameState?.status !== "showdown") ?
              'opacity-100'
              :
              'opacity-0'
              }`}
            
            >
              {CardDeckComponent(cardSide)}
            </div>
            
                
           
          </div>
        )}
        <div className="absolute w-full h-full top-[0] -left-[0]">
            {cardSide === "left" && !isCurrentUser && <div className="absolute left-[-55px] top-[23px]">{TotalBetComponent}</div>}
            
            {cardSide === "right" && !isCurrentUser && <div className="absolute right-[-52px] top-[23px]">{TotalBetComponent}</div>}
            {cardSide === "top" && !isCurrentUser && <div className="absolute left-1/2 transform -translate-x-1/2 bottom-[-40px]">{TotalBetComponent}</div>}
            {cardSide === "bottom" && !isCurrentUser && <div className="absolute left-[16px] top-[-56px]">{TotalBetComponent}</div>}
        </div>
        {/* {(() => {
          // For other players, show last action amount
          if (!isCurrentUser) {
            const lastActionAmount = getLastActionAmount();
            const shouldShow = lastActionAmount > 0 && !hasFolded;
            return shouldShow ? (
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white font-semibold text-[10px] leading-none text-center z-40">
                {`$${formatAmount(lastActionAmount)}`}
              </div>
            ) : null;
          }

          // For the current user, total bet is now shown above avatar
          return null;
        })()} */}
        {score !== undefined &&
          !hasFolded &&
          (gameState?.status === "showdown" ||
            (gameState?.status !== "finished" && isCurrentUser && hasLooked) ||
            (gameState?.status === "finished" && showCards)) && (
            <div
              className="absolute z-50 flex items-center justify-center"
              style={{
                width: `${22 * scale}px`,
                height: `${22 * scale}px`,
                backgroundColor: "#FF443A",
                borderRadius: "50%",
                ...(openCardsPosition === "bottom" && {
                  left: "50%",
                  bottom: `${-20 * scale}px`,
                  transform: "translateX(-50%)",
                }),
                ...(openCardsPosition === "top" && {
                  left: `${-45 * scale}px`,
                  top: `${40 * scale}px`,
                }),
                ...(openCardsPosition === "left" && {
                  right: `${70 * scale}px`,
                  top: `${-10 * scale}px`,
                }),
                ...(openCardsPosition === "right" && {
                  left: `${70 * scale}px`,
                  top: `${-10 * scale}px`,
                }),
              }}
            >
              <span
                style={{
                  fontWeight: 500,
                  fontStyle: "normal",
                  fontSize: `${14 * scale}px`,
                  lineHeight: "100%",
                  letterSpacing: "0%",
                  textAlign: "center",
                  verticalAlign: "middle",
                  color: "#FFFFFF",
                }}
              >
                {score}
              </span>
            </div>
          )}
      </div>

    
    </div>
  );
}
