import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { GameRoomProps, GameState, Player } from "@/types/game";
import { NotificationType } from "@/types/components";
import { Notification } from "@/components/Notification";
import { useGameState } from "@/hooks/useGameState";
import { useAssetPreloader } from "@/hooks/useAssetPreloader";
import GameTable from "../../components/GameProcess/GameTable";
import { ActionButtons } from "../../components/GameProcess/ActionButton";
import { BetSlider } from "../../components/GameProcess/BetSlider";
import { Socket } from "socket.io-client";
import { LoadingPage } from "../../components/LoadingPage";
import { PlayerSpot } from "../../components/GameProcess/PlayerSpot";
import { SeatButton } from "../../components/GameProcess/SeatButton";
import { UserData, PageData } from "@/types/entities";
import FlyingChip from "../../components/GameProcess/FlyingChip";
import FlyingCard from '../../components/GameProcess/FlyingCard';
import { Page } from "@/types/page";
import backgroundImage from "../../assets/game/background.jpg";
import menuIcon from "../../assets/game/menu.svg";
import chatButton from "../../assets/game/chatButton.png";
import { GameMenu } from "../../components/GameProcess/GameMenu";
import { ChatMenu } from "../../components/GameProcess/ChatMenu";
import { SvaraAnimation } from "../../components/GameProcess/SvaraAnimation";
import { SvaraJoinPopup } from "../../components/GameProcess/SvaraJoinPopup";
import { NoConnect } from "../../components/NoConnect";
import { TURN_DURATION_SECONDS } from "@/constants";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useAppBackButton } from "@/hooks/useAppBackButton";
import { useTranslation } from "react-i18next";
import WebApp from "@twa-dev/sdk";
import { CardsDeck } from "@/components/CardsDeck/CardsDeck";
import { Bids } from "@/components/Bids/Bids";

interface ChipAnimation {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  delay: number;
}

interface CardAnimation {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  delay: number;
}

interface GameRoomPropsExtended extends GameRoomProps {
  socket: Socket | null;
  setCurrentPage: (page: Page, data?: Record<string, unknown>) => void;
  userData: UserData;
  pageData: PageData | null;
}

const useWindowSize = () => {
  const [size, setSize] = useState([
    typeof window !== "undefined" ? window.innerWidth : 0,
    typeof window !== "undefined" ? window.innerHeight : 0,
  ]);
  useEffect(() => {
    function updateSize() {
      // Для iOS Safari используем более надежный способ получения размеров
      const width =
        window.innerWidth ||
        document.documentElement.clientWidth ||
        document.body.clientWidth;
      const height =
        window.innerHeight ||
        document.documentElement.clientHeight ||
        document.body.clientHeight;
      setSize([width, height]);
    }

    window.addEventListener("resize", updateSize);
    window.addEventListener("orientationchange", updateSize);

    // Initial size
    updateSize();

    // Force updates to handle iOS Safari viewport issues
    // Увеличиваем задержки для приватных комнат
    const timer1 = setTimeout(updateSize, 100);
    const timer2 = setTimeout(updateSize, 500);
    const timer3 = setTimeout(updateSize, 1000);
    const timer4 = setTimeout(updateSize, 2000); // Дополнительная задержка

    return () => {
      window.removeEventListener("resize", updateSize);
      window.removeEventListener("orientationchange", updateSize);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);
  return size;
};

const useTablePositioning = (gameStateLoaded: boolean) => {
  const [windowWidth] = useWindowSize();
  const [tableSize] = useState({ width: 315, height: 493 });

  // Улучшенный расчет scale для iOS Safari
  // Откладываем расчет до загрузки gameState
  let scale =
    gameStateLoaded && windowWidth > 0
      ? Math.max(0.5, (windowWidth * 0.85) / tableSize.width)
      : 0.5;
  

  const getPositionClasses = (
    position: number,
    isShowdown: boolean
  ): string => {
    const zIndex = isShowdown ? "z-40" : "z-30";
    const baseClasses = `absolute ${zIndex} transition-all duration-300 ease-in-out hover:scale-105 hover:z-40 w-20 h-24 flex items-center justify-center`;
    const positionClasses = {
      1: "-top-7 left-1/2",
      2: "top-1/4 -right-7",
      3: "bottom-1/4 -right-7",
      4: "-bottom-12 left-1/2",
      5: "bottom-1/4 -left-7",
      6: "top-1/4 -left-7",
    };
    return `${baseClasses} ${positionClasses[position as keyof typeof positionClasses] || ""}`;
  };

  const getPositionStyle = (position: number): React.CSSProperties => {
    let transform = `scale(${scale})`;
    if (position === 1 || position === 4) {
      transform += " translateX(-50%)";
    }
    return { transform };
  };

  return { getPositionStyle, getPositionClasses, scale };
};

export function GameRoom({
  roomId,
  balance,
  socket,
  setCurrentPage,
  userData,
  pageData,
}: GameRoomPropsExtended) {
  const { t } = useTranslation("common");
  const {
    gameState,
    loading,
    error,
    isSeated,
    isProcessing,
    showNoConnect,
    retryConnection,
    actions,
  } = useGameState(roomId, socket);
  const { isLoading: assetsLoading } = useAssetPreloader();
  const [showBetSlider, setShowBetSlider] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [activeChats, setActiveChats] = useState<
    Record<string, { phrase: string; timerId: NodeJS.Timeout }>
  >({});
  const [notification, setNotification] = useState<NotificationType | null>(
    null
  );
  const { getPositionStyle, getPositionClasses, scale } =
    useTablePositioning(!!gameState);
  const [turnTimer, setTurnTimer] = useState(TURN_DURATION_SECONDS);
  const [svaraStep, setSvaraStep] = useState<"none" | "animating" | "joining">(
    "none"
  );
  const { triggerImpact } = useHapticFeedback();
  const currentUserId =
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || "";
  const [winSequenceStep, setWinSequenceStep] = useState<
    "none" | "showdown" | "winner" | "chips"
  >("none");
  const [isSittingDown, setIsSittingDown] = useState(false);
  const [isMenuButtonPressed, setIsMenuButtonPressed] = useState(false);

  const handleMenuButtonPress = () => {
    setIsMenuButtonPressed(true);
    setTimeout(() => setIsMenuButtonPressed(false), 300);
    setTimeout(() => setShowMenuModal(true), 100);
  };

  // Объявляем переменные для useCallback
  const currentPlayer = gameState?.players.find((p) => p.id === currentUserId);
  const currentUserPosition = currentPlayer?.position;

  // Объявляем состояния для useCallback
  const [chipAnimations, setChipAnimations] = useState<Array<ChipAnimation>>(
    []
  );
  const [cardAnimations, setCardAnimations] = useState<Array<CardAnimation>>([]);

  const getScreenPosition = useCallback(
    (absolutePosition: number) => {
      if (!currentUserPosition || !isSeated) {
        return absolutePosition;
      }
      const offset = 4 - currentUserPosition;
      return ((absolutePosition + offset - 1 + 6) % 6) + 1;
    },
    [currentUserPosition, isSeated]
  );
  
  const [newCallAmount, setNewCallAmount] = useState(0)
  
  

  const handlePlayerBet = useCallback(
    (playerId: string) => {
      if (!gameState) return;
      const player = gameState.players.find((p) => p.id === playerId);
      if (!player || !player.isActive) {
        return;
      }

      // Проверяем, не создается ли уже анимация для этого игрока
      const existingAnimation = chipAnimations.find((chip) =>
        chip.id.includes(playerId)
      );
      if (existingAnimation) {
        return;
      }
     
      actions.playSound("chip");

      const absolutePosition = player.position;
      const isCurrentPlayer = player.id === currentUserId;
      // Текущий игрок ВСЕГДА в позиции 4 (снизу по центру), другие игроки преобразуются через getScreenPosition
      const relativePosition = isCurrentPlayer
        ? 4
        : getScreenPosition(absolutePosition);

      // Получаем координаты на основе CSS классов позиций PlayerSpot
      let playerX = 0;
      let playerY = 0;

      // Центр экрана (где находится банк)
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // Вычисляем позицию игрока на основе CSS классов из getPositionClasses
      // Используем точные координаты, соответствующие реальным позициям PlayerSpot
      const tableWidth = 315 * scale; // Ширина стола
      const tableHeight = 493 * scale; // Высота стола
      const verticalOffset = 100; // Смещение вверх для всех позиций

      switch (relativePosition) {
        case 1: // -top-10 left-1/2 (верхний центр)
          playerX = centerX;
          playerY = centerY - tableHeight * 0.4 - verticalOffset; // Поднимаем выше
          break;
        case 2: // top-1/4 -right-5 (правый верхний)
          playerX = centerX + tableWidth * 0.4;
          playerY = centerY - tableHeight * 0.25; // Поднимаем выше
          break;
        case 3: // bottom-1/4 -right-5 (правый нижний)
          playerX = centerX + tableWidth * 0.4;
          playerY = centerY + tableHeight * 0.25 - verticalOffset; // Поднимаем выше
          break;
        case 4: // -bottom-10 left-1/2 (нижний центр) - текущий пользователь
          playerX = centerX;
          playerY = centerY + tableHeight * 0.4 - verticalOffset; // Поднимаем выше
          break;
        case 5: // bottom-1/4 -left-5 (левый нижний)
          playerX = centerX - tableWidth * 0.4;
          playerY = centerY + tableHeight * 0.25 - verticalOffset; // Поднимаем выше
          break;
        case 6: // top-1/4 -left-5 (левый верхний)
          playerX = centerX - tableWidth * 0.4;
          playerY = centerY - tableHeight * 0.25; // Поднимаем выше
          break;
      }

      let currBet = player.totalBet;

      let quantChip = 3;
      
      if (currBet < 1000) {
        quantChip = 12;
      } 
      if (currBet < 200) {
        quantChip = 10;
      } 
      if (currBet < 100) {
        quantChip = 7;
      } 
      if (currBet < 50) {
        quantChip = 5;
      } 
      if (currBet < 20) {
        quantChip = 4;
      } 
      if (currBet < 10) {
        quantChip = 3;
      } 
      if (currBet < 5) {
        quantChip = 1;
      }
      
      for (let i = 0; i < quantChip; i++) {
        const chipId = `chip-${Date.now()}-${Math.random()}`;
        setChipAnimations((prev) => [
          ...prev,
          {
            id: chipId,
            fromX: playerX + Math.random() * 21-10,
            fromY: playerY + Math.random() * 21-10,
            toX: centerX + Math.random() * 21-10,
            toY: centerY + Math.random() * 21-10,
            delay: i * 50, // Небольшая задержка между фишками
          },
        ]);
      }
    },
    [
      gameState,
      chipAnimations,
      currentUserId,
      getScreenPosition,
      scale,
      setChipAnimations,
      actions,
    ]
  );

  const handleOtherPlayerAction = useCallback(
    (playerId: string) => {
      handlePlayerBet(playerId);
    },
    [handlePlayerBet]
  );
  
  const handleChipsAnte = () => {
    if (!gameState) return;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const tableWidth = 315 * scale;
    const tableHeight = 493 * scale;
    const verticalOffset = 100;

    // Раздаем по 3 карты каждому активному игроку

  
  
      gameState.players.forEach((player, i) => {
        if (!player.isActive) return;
  
        const isCurrentPlayer = player.id === currentUserId;
        const relativePosition = isCurrentPlayer ? 4 : getScreenPosition(player.position);
  
        // Вычисляем позицию игрока
        let playerX = 0;
        let playerY = 0;
  
        switch (relativePosition) {
          case 1: playerX = centerX + tableWidth * 0.1; playerY = centerY - tableHeight * 0.44 - verticalOffset; break; // Поднимаем выше
          case 2: playerX = centerX + tableWidth * 0.27; playerY = centerY - tableHeight * 0.32; break; // Левее и выше
          case 3: playerX = centerX + tableWidth * 0.27; playerY = centerY + tableHeight * 0.18 - verticalOffset; break; // Левее и выше
          case 4: playerX = centerX + tableWidth * 0.1; playerY = centerY + tableHeight * 0.52 - verticalOffset; break; // Правее и ниже
          case 5: playerX = centerX - tableWidth * 0.37; playerY = centerY + tableHeight * 0.18 - verticalOffset; break; // Поднимаем выше
          case 6: playerX = centerX - tableWidth * 0.37; playerY = centerY - tableHeight * 0.32; break; // Поднимаем выше
        }
  
        // Карты летят в центр компонента игрока
        const chipX = playerX;
        const chipY = playerY;
  
  
     	actions.playSound("chip");
        const cardId = `deal-${i}-${Date.now()}`;
          setChipAnimations(prev => [...prev, {
            id: cardId,
            fromX: chipX,
            fromY: chipY,
            toX: centerX,
            toY: centerY,
            delay: 0 // Задержка для последовательной раздачи
          }]);
          // Проигрываем звук fold.mp3 для каждой карты с задержкой
         
        
      });


    
     
  }

  

  const handleChipsToWinner = useCallback(() => {
  	
    if (!gameState?.winners || gameState.winners.length === 0) {
      return;
    }

    // Если ничья - не запускаем анимацию (фишки остаются в банке)
    if (gameState.winners.length > 1) {
      return;
    }

    const winner = gameState.winners[0];
    const winnerPlayer = gameState.players.find((p) => p.id === winner.id);

    if (!winnerPlayer) {
      return;
    }

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const tableWidth = 315 * scale;
    const tableHeight = 493 * scale;
    const verticalOffset = 100;

    const isCurrentPlayer = winnerPlayer.id === currentUserId;
    const relativePosition = isCurrentPlayer
      ? 4
      : getScreenPosition(winnerPlayer.position);

    // Вычисляем позицию победителя
    let winnerX = 0;
    let winnerY = 0;

    switch (relativePosition) {
      case 1:
        winnerX = centerX;
        winnerY = centerY - tableHeight * 0.4 - verticalOffset;
        break;
      case 2:
        winnerX = centerX + tableWidth * 0.4;
        winnerY = centerY - tableHeight * 0.25;
        break;
      case 3:
        winnerX = centerX + tableWidth * 0.4;
        winnerY = centerY + tableHeight * 0.25 - verticalOffset;
        break;
      case 4:
        winnerX = centerX;
        winnerY = centerY + tableHeight * 0.55 - verticalOffset;
        break;
      case 5:
        winnerX = centerX - tableWidth * 0.4;
        winnerY = centerY + tableHeight * 0.25 - verticalOffset;
        break;
      case 6:
        winnerX = centerX - tableWidth * 0.4;
        winnerY = centerY - tableHeight * 0.25;
        break;
    }
    actions.playSound("chip");
    // Подсчитываем количество фишек в банке
    const chipCount = 10;
	setChipAnimations([])
    // Создаем анимацию для каждой фишки
    for (let i = 0; i < chipCount; i++) {
      const chipId = `winner-chip-${Date.now()}-${i}`;
      setChipAnimations((prev) => [
        ...prev,
        {
          id: chipId,
          fromX: centerX + Math.random() * 21-10-15,
          fromY: centerY + Math.random() * 21-10-53,
          toX: winnerX + Math.random() * 21-10,
          toY: winnerY + Math.random() * 21-10,
          delay: i * 50, // Небольшая задержка между фишками
        },
      ]);
    }
  }, [
    gameState?.winners,
    gameState?.players,
    scale,
    currentUserId,
    getScreenPosition,
    setChipAnimations,
  ]);

  const handleFoldCards = useCallback(
    (playerId: string) => {
      if (!gameState) return;

      const player = gameState.players.find((p) => p.id === playerId);
      if (!player) return;

      // Показываем анимацию сброса карт даже для неактивных игроков (которые только что сбросили)
      if (!player.isActive && !player.hasFolded) return;

      // const centerX = window.innerWidth / 2;
      // const centerY = window.innerHeight / 2;
      // const tableWidth = 315 * scale;
      // const tableHeight = 493 * scale;
      // const verticalOffset = 100;

      // const isCurrentPlayer = player.id === currentUserId;
      // const relativePosition = isCurrentPlayer ? 4 : getScreenPosition(player.position);

      // Вычисляем позицию игрока
      // let playerX = 0;
      // let playerY = 0;

      // switch (relativePosition) {
      //   case 1: playerX = centerX; playerY = centerY - tableHeight * 0.4 - verticalOffset; break;
      //   case 2: playerX = centerX + tableWidth * 0.4; playerY = centerY - tableHeight * 0.25; break;
      //   case 3: playerX = centerX + tableWidth * 0.4; playerY = centerY + tableHeight * 0.25 - verticalOffset; break;
      //   case 4: playerX = centerX; playerY = centerY + tableHeight * 0.4 - verticalOffset; break;
      //   case 5: playerX = centerX - tableWidth * 0.4; playerY = centerY + tableHeight * 0.25 - verticalOffset; break;
      //   case 6: playerX = centerX - tableWidth * 0.4; playerY = centerY - tableHeight * 0.25; break;
      // }

      // Создаем 3 карты для сброса
      for (let cardIndex = 0; cardIndex < 3; cardIndex++) {
        // const cardId = `fold-${playerId}-${cardIndex}-${Date.now()}`;
        // setCardAnimations(prev => [...prev, {
        //   id: cardId,
        //   fromX: playerX,
        //   fromY: playerY,
        //   toX: centerX,
        //   toY: centerY,
        //   delay: cardIndex * 100 // Небольшая задержка между картами
        // }]);
      }
    },
    [gameState]
  );

  // TODO: fix svara animation

  useEffect(() => {
    if (
      gameState?.status === "svara_pending" &&
      svaraStep === "none" &&
      winSequenceStep === "none"
    ) {
      // Показываем SvaraAnimation только после завершения winSequenceStep
      console.log("🎯 Starting SvaraAnimation");
      setSvaraStep("animating");
    } else if (gameState?.status !== "svara_pending") {
      setSvaraStep("none");
    }
  }, [gameState?.status, svaraStep, winSequenceStep]);

  const handleLeaveRoom = useCallback(() => {
    setShowMenuModal(false);
    setShowBetSlider(false);
    if (actions) {
      actions.leaveRoom();
    }
    setCurrentPage("dashboard");
  }, [actions, setCurrentPage]);

  useAppBackButton(true, handleLeaveRoom);

  useEffect(() => {
    if (
      gameState &&
      gameState.status === "svara_pending" &&
      (gameState.svaraParticipants?.includes(currentUserId) ?? false)
    ) {
      actions.joinSvara();
    }
  }, [gameState, currentUserId, actions]);

  const [winSoundPlayed, setWinSoundPlayed] = useState(false);

  const [showChipStack, setShowChipStack] = useState(true);

  const [savedChipCount] = useState(0);
  const prevGameStateRef = useRef<GameState | null>(null);

  useEffect(() => {
    if (!gameState) return;

    const previousStatus = prevGameStateRef.current?.status;
    const currentStatus = gameState.status;

    if (previousStatus !== currentStatus) {
      if (currentStatus === "showdown") {
        // Сразу показываем showdown когда сервер переходит в этот статус
        console.log(
          "🎯 Starting showdown - winners:",
          gameState?.winners?.map((w) => ({
            id: w.id,
            username: w.username,
            lastWinAmount: w.lastWinAmount,
          }))
        );
        
        setWinSequenceStep("showdown");
          
        

      } else if (currentStatus === "finished") {
        // Переходим к winner после showdown
        console.log("🎯 Moving to winner step");
        setWinSequenceStep("winner");
        const t2 = setTimeout(() => {
          setWinSequenceStep("chips");
          handleChipsToWinner();
        }, 1);
        const t3 = setTimeout(() => {
          setWinSequenceStep("none");
        }, 4000);

        return () => {
          clearTimeout(t2);
          clearTimeout(t3);
        };
      } else if (currentStatus === "svara_pending") {
        // Сбрасываем winSequenceStep для свары
        setWinSequenceStep("none");
      } else if (currentStatus === "ante") {
        // Сбрасываем winSequenceStep когда начинается новая игра
        setWinSequenceStep("none");
        // Показываем ChipStack для новой игры
        handleChipsAnte();
        setShowChipStack(true);
      } else if (currentStatus === "waiting") {
        // Показываем ChipStack когда комната ждет игроков
        setShowChipStack(true);
      }
    }

    prevGameStateRef.current = gameState;
  }, [gameState, handleChipsToWinner]);

  // Эффективное состояние игры, управляемое новой машиной состояний
  const effectiveGameStatus =
    winSequenceStep !== "none" ? "finished" : gameState?.status || "waiting";

  // Chat message handling
  useEffect(() => {
    if (!socket) return;

    const handleNewChatMessage = ({
      playerId,
      phrase,
    }: {
      playerId: string;
      phrase: string;
    }) => {
      setActiveChats((prev) => {
        if (prev[playerId]) {
          clearTimeout(prev[playerId].timerId);
        }
        const timerId = setTimeout(() => {
          setActiveChats((currentChats) => {
            const newChats = { ...currentChats };
            delete newChats[playerId];
            return newChats;
          });
        }, 2000);

        return { ...prev, [playerId]: { phrase, timerId } };
      });
    };

    socket.on("new_chat_message", handleNewChatMessage);

    return () => {
      socket.off("new_chat_message", handleNewChatMessage);
      setActiveChats((prev) => {
        Object.values(prev).forEach((chat) => clearTimeout(chat.timerId));
        return {};
      });
    };
  }, [socket]);

  const handleSelectPhrase = (phrase: string) => {
    if (socket) {
      socket.emit("chat_message", { roomId, phrase });
      setShowChatMenu(false); // Close chat menu after sending
    }
  };

  const activeGamePhases: GameState["status"][] = useMemo(
    () => ["blind_betting", "betting"],
    []
  );
  const isCurrentUserTurn = !!(
    isSeated &&
    gameState &&
    activeGamePhases.includes(effectiveGameStatus) &&
    gameState.players[gameState.currentPlayerIndex]?.id === currentUserId &&
    !gameState.isAnimating &&
    !isProcessing
  );

  // Упрощенная логика таймера - только отображение
  useEffect(() => {
    if (!gameState?.turnStartTime) {
      setTurnTimer(TURN_DURATION_SECONDS);
      return;
    }

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - (gameState.turnStartTime || 0)) / 1000);
      const remaining = Math.max(0, TURN_DURATION_SECONDS - elapsed);
      setTurnTimer(remaining);
    };

    updateTimer(); // Сразу обновляем
    const interval = setInterval(updateTimer, 1000); // Обновляем каждую секунду

    return () => clearInterval(interval);
  }, [gameState?.turnStartTime]);


  // Separate effect for auto-fold when timer reaches 0
  useEffect(() => {
    if (turnTimer === 0 && isCurrentUserTurn) {
      actions.autoFold();
    }
  }, [turnTimer, isCurrentUserTurn, actions]);

  // Упрощенная логика - таймер управляется только сервером

  useEffect(() => {
    if (isCurrentUserTurn) {
      triggerImpact("medium");
      actions.playSound("turn");
    }
  }, [isCurrentUserTurn, triggerImpact, actions]);

  // Track fold actions for all players and play fold sound
  useEffect(() => {
    if (!gameState?.log) return;

    // Простая проверка: смотрим на последнее действие
    const lastAction = gameState.log[gameState.log.length - 1];

    if (lastAction && lastAction.type === "fold") {
      // actions.playSound('fold');
    }
  }, [gameState?.log, actions]);

  // Track other player actions for animations (only when log length changes)
  const prevLogLengthRef = useRef(0);
  const lastProcessedActionRef = useRef<string>("");

  useEffect(() => {
    if (!gameState?.log) return;

    const currentLogLength = gameState.log.length;
    if (currentLogLength > prevLogLengthRef.current) {
      // Новое действие добавлено в лог
      const lastAction = gameState.log[currentLogLength - 1];

      // Создаем уникальный ключ для действия
      const actionKey = `${lastAction.telegramId}-${lastAction.type}-${lastAction.timestamp}`;

      if (
        lastAction &&
        lastAction.telegramId !== currentUserId &&
        ["blind_bet", "call", "raise", "ante"].includes(lastAction.type) &&
        actionKey !== lastProcessedActionRef.current
      ) {
        lastProcessedActionRef.current = actionKey;
        handleOtherPlayerAction(lastAction.telegramId);
      }

      // Анимация сброса карт при fold
      if (lastAction && lastAction.type === "fold") {
        handleFoldCards(lastAction.telegramId);
      }

      console.error('анимация не запустилась. Код 1', lastAction, lastAction.type)
      // Анимация фишек для ante действий
      if (lastAction && lastAction.type == "ante") {
        console.error('анимация не запустилась. Код 0')
        handlePlayerBet(lastAction.telegramId);
      }
    }

    prevLogLengthRef.current = currentLogLength;
  }, [
    gameState?.log?.length,
    currentUserId,
    gameState?.status,
    handleOtherPlayerAction,
    handleFoldCards,
    handlePlayerBet,
    gameState?.log,
  ]);

  // Отслеживаем изменения в игроках для автоматического запуска анимации раздачи карт
  const prevPlayersRef = useRef<Player[]>([]);



  // Функция для сброса карт при fold
  // Play win sound for current user if they won
  useEffect(() => {
    if (winSequenceStep === "winner") {
      const currentUserWon = gameState?.winners?.some(
        (winner) => winner.id === currentUserId
      );
      if (currentUserWon && !winSoundPlayed) {
        actions.playSound("win");
        setWinSoundPlayed(true);
      }
    } else if (winSequenceStep === "none") {
      setWinSoundPlayed(false); // Reset for next round
    }
  }, [
    winSequenceStep,
    gameState?.winners,
    currentUserId,
    actions,
    winSoundPlayed,
  ]);

  const handleChipAnimationComplete = useCallback((chipId: string) => {
    setChipAnimations((prev) => {
      const newAnimations = prev.filter((chip) => chip.id !== chipId);

      // Скрываем ChipStack только если завершились анимации фишек к победителю
      const remainingWinnerChips = newAnimations.filter((chip) =>
        chip.id.startsWith("winner-chip-")
      );
      const hasWinnerChips = prev.some((chip) =>
        chip.id.startsWith("winner-chip-")
      );

      if (hasWinnerChips && remainingWinnerChips.length === 0) {
        
         setShowChipStack(false);
        
      }

      return newAnimations;
    });
  }, []);

  

  useEffect(() => {
    if (pageData?.autoSit && !isSeated && !isSittingDown && gameState) {
      setIsSittingDown(true);
      const seatedPositions = gameState.players.map((p) => p.position);
      let positionToSit = 1;
      while (seatedPositions.includes(positionToSit)) {
        positionToSit++;
      }
      if (positionToSit <= 6) {
        actions.sitDown(positionToSit, userData);
      }
    }
  }, [pageData, isSeated, gameState, actions, userData, isSittingDown]);

  if (loading || assetsLoading)
    return <LoadingPage isLoading={loading || assetsLoading} />;

  if (error) {
    return (
      <div className="bg-primary min-h-screen flex flex-col items-center justify-center">
        <div className="text-red-500 text-xl mb-4">
          {t("error_colon")} {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Перезагрузить страницу
        </button>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="bg-primary min-h-screen flex flex-col items-center justify-center">
        <div className="text-red-500 text-xl">
          {t("error_loading_game_state")}
        </div>
      </div>
    );
  }

  const isAnimating = !!gameState.isAnimating;
  const postLookActions =
    isCurrentUserTurn && !!currentPlayer?.hasLookedAndMustAct;
  const postLookCallAmount =
    gameState.lastBlindBet > 0 ? gameState.lastBlindBet * 2 : gameState.minBet;

  // ИСПРАВЛЕНИЕ: Улучшенный расчет callAmount с учетом blind ставок
  const callAmount = (() => {
    if (postLookActions) {
      const result = gameState.lastBlindBet > 0 ? gameState.lastBlindBet * 2 : gameState.minBet;
      console.log(`[CALL_AMOUNT_DEBUG] postLookActions: lastBlindBet=${gameState.lastBlindBet}, result=${result}`);
      return result;
    }
    console.log(`[CALL_AMOUNT_DEBUG] normal betting: lastActionAmount=${gameState.lastActionAmount}`);
    return gameState.lastActionAmount;
  })();

  const minRaiseAmount = (() => {
    if (postLookActions) {
      return gameState.lastBlindBet > 0
        ? gameState.lastBlindBet * 2
        : gameState.minBet;
    }
    return gameState.lastActionAmount * 2;
  })();


  const maxRaise = currentPlayer?.balance || 0;
  const blindBetAmount =
    gameState.lastBlindBet > 0 ? gameState.lastBlindBet * 2 : gameState.minBet;

  const canPerformBettingActions = !!(
    isCurrentUserTurn &&
    effectiveGameStatus === "betting" &&
    !isAnimating &&
    !postLookActions
  );
  const canPerformBlindActions = !!(
    isCurrentUserTurn &&
    effectiveGameStatus === "blind_betting" &&
    !isAnimating &&
    !postLookActions
  );

  const canFold = canPerformBettingActions || postLookActions;
  const canCall = canPerformBettingActions || postLookActions; // Добавляем call в postLookActions
  const canRaise = canPerformBettingActions || postLookActions;
  const canLook = canPerformBlindActions;
  const canBlindBet = canPerformBlindActions;

  // ИСПРАВЛЕНИЕ: Дополнительная проверка для look в blind_betting
  // Если у игрока нет денег на blind, но есть на look, то после look call/raise будут disabled
  const canMakeCallAfterLook = (currentPlayer?.balance || 0) >= (blindBetAmount * 2);

  // ИСПРАВЛЕНИЕ: Правильная логика disabled кнопок с проверкой баланса
  const isCallDisabled = !!(
    (currentPlayer?.balance || 0) < callAmount ||
    (postLookActions && !canMakeCallAfterLook)
  );
  const isRaiseDisabled = !!(
    (currentPlayer?.balance || 0) < minRaiseAmount ||
    gameState.hasRaiseMax ||
    (postLookActions && !canMakeCallAfterLook)
  );
  
  // ОТЛАДОЧНЫЕ ЛОГИ для проблемы 3
  if (gameState.hasRaiseMax) {
    console.log(`[RAISE_MAX_DEBUG] Client: hasRaiseMax=true, isRaiseDisabled=${isRaiseDisabled}, playerBalance=${currentPlayer?.balance}, minRaiseAmount=${minRaiseAmount}`);
  }
  const isBlindBetDisabled = !!((currentPlayer?.balance || 0) < blindBetAmount);

  const blindButtonsDisabled = !!(effectiveGameStatus !== "blind_betting");
  // Карты показываются только после затемнения экрана
  const showCards = winSequenceStep === "showdown";


  const handleRaiseClick = () => setShowBetSlider(true);
  const handleBlindBetClick = () => {
    // Проверяем, что игрок активен и это его ход
    if (!currentPlayer || !currentPlayer.isActive || !isCurrentUserTurn) {
      return;
    }

    // Запускаем анимацию фишки для текущего игрока
    handlePlayerBet(currentPlayer.id);
    actions.blindBet(blindBetAmount);
  };
  const handleBetConfirm = (amount: number) => {
    // Проверяем, что игрок активен и это его ход
    if (!currentPlayer || !currentPlayer.isActive || !isCurrentUserTurn) {
      return;
    }

    // Запускаем анимацию фишки для текущего игрока
    handlePlayerBet(currentPlayer.id);
    actions.raise(amount);
    setShowBetSlider(false);
  };

  const handleCallClick = () => {
    // Проверяем, что игрок активен и это его ход
    if (!currentPlayer || !currentPlayer.isActive || !isCurrentUserTurn) {
      return;
    }

    // Запускаем анимацию фишки для текущего игрока
    handlePlayerBet(currentPlayer.id);
    actions.call();
  };
  const handleInvite = () => {
    const referrerId = currentUserId;
    if (!referrerId) {
      console.error("Could not get referrerId");
      return;
    }
    // Формируем ссылку по образцу реферальной: https://t.me/Svaraprobot?start=TELEGRAM_ID
    // Для приглашения в игру используем формат: start=join_ROOM_ID_INVITER_ID
    const inviteLink = `https://t.me/Svaraprobot?start=join_${roomId}_${referrerId}`;
    WebApp.openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(
        inviteLink
      )}&text=${encodeURIComponent("Привет! Жду тебя в игре, присоединяйся!")}`
    );
  };

  const handleSitDown = (position: number) => {
    if (parseFloat(balance) < gameState.minBet * 10) {
      setNotification("insufficientBalance");
      return;
    }
    actions.sitDown(position, userData);
  };

  return (
    <div
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        height: "100vh",
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
      }}
      className="flex flex-col relative game-container"
    >
      {/* Затемняющий оверлей для фазы вскрытия карт */}
      {winSequenceStep === "showdown" && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-20 transition-opacity duration-500" />
      )}

      {svaraStep === "animating" && winSequenceStep === "none" && (
        <SvaraAnimation onAnimationComplete={() => setSvaraStep("joining")} />
      )}

      {svaraStep === "joining" &&
        !(gameState.svaraParticipants?.includes(currentUserId) ?? false) && (
          <SvaraJoinPopup
            gameState={gameState}
            userData={userData}
            actions={actions}
          />
        )}

      <div className="relative z-30 text-white p-4 flex justify-between items-center">
        <h2 className="text-xs font-semibold">
          {t("room_number_colon")}
          {roomId.slice(0, 8)}
        </h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleMenuButtonPress}
            className={`transition-all duration-200 ease-in-out hover:opacity-75 ${isMenuButtonPressed ? "button-press" : ""}`}
          >
            <img src={menuIcon} alt={t("menu")} className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-grow relative p-4">
        <div className="relative flex justify-center items-center min-h-[70vh] w-full p-4 sm:p-5 lg:p-6 game-table-container -mt-8">
          <div className="relative flex justify-center items-center w-full h-full">
            
            

            <div className="flex-shrink-0 relative z-10">
              <GameTable
                gameState={gameState}
                currentUserId={currentUserId}
                showCards={showCards}
                onSitDown={handleSitDown}
                onInvite={actions.invitePlayer}
                onChatOpen={() => setShowChatMenu(true)}
                maxPlayers={6}
                scale={scale}
                showChipStack={showChipStack}
                savedChipCount={savedChipCount}
              />
            </div>

            {Array.from({ length: 6 }).map((_, index) => {
              const absolutePosition = index + 1;
              const screenPosition = getScreenPosition(absolutePosition);
              const player = gameState.players.find(
                (p) => p.position === absolutePosition
              );
              const positionStyle = getPositionStyle(screenPosition);
              const positionClasses = getPositionClasses(
                screenPosition,
                showCards
              );

               let cardSide =
                screenPosition === 2 || screenPosition === 3 ? "left" : "right";
              
              if (screenPosition == 4) {
                cardSide = 'bottom'
              } else if (screenPosition == 1) {
                cardSide = 'top'
              }

              const getOpenCardsPosition = (position: number) => {
                switch (position) {
                  case 1:
                    return "bottom";
                  case 2:
                    return "left";
                  case 3:
                    return "left";
                  case 4:
                    return "top";
                  case 5:
                    return "right";
                  case 6:
                    return "right";
                  default:
                    return "top";
                }
              };

              const openCardsPosition = getOpenCardsPosition(screenPosition);
              const isTurn = !!(
                gameState &&
                player &&
                gameState.players[gameState.currentPlayerIndex]?.id ===
                  player.id
              );
              const chatPhrase = player
                ? activeChats[player.id]?.phrase
                : undefined;

              return (
                <div
                  key={absolutePosition}
                  style={positionStyle}
                  className={positionClasses}
                >
                  {player ? (
                    (() => {
                      const isCurrentUser =
                        userData &&
                        userData.id &&
                        player.id.toString() === userData.id.toString();
                      const isWinner = !!(
                        gameState.winners &&
                        gameState.winners.some(
						    (winner) => winner.id.toString() === player.id.toString()
						  )
                      );
                      const winAmount = isWinner
                        ? player.lastWinAmount || 0
                        : 0;
                      const showWinIndicator =
                        winSequenceStep === "winner" && isWinner;

                      let notificationType:
                        | "blind"
                        | "paid"
                        | "pass"
                        | "rais"
                        | "win"
                        | "look"
                        | null = null;
                      if (!isCurrentUser) {
                        if (showWinIndicator) {
                          notificationType = "win";
                        } else if (player.lastAction) {
                          switch (player.lastAction) {
                            case "blind":
                              notificationType = "blind";
                              break;
                            case "call":
                              notificationType = "paid";
                              break;
                            case "fold":
                              notificationType = "pass";
                              break;
                            case "raise":
                              notificationType = "rais";
                              break;
                            case "look":
                              notificationType = "look";
                              break;
                          }
                        }
                      }

                      if (isCurrentUser) {
                        const mergedPlayer = {
                          ...player,
                          username:
                            userData.username ||
                            userData.first_name ||
                            player.username,
                          avatar: userData.photo_url || player.avatar,
                        };
                        return (
                          <PlayerSpot
                            player={mergedPlayer}
                            isCurrentUser={true}
                            showCards={showCards}
                            scale={scale}
                            cardSide={cardSide}
                            openCardsPosition={openCardsPosition}
                            isTurn={isTurn}
                            turnTimer={turnTimer}
                            winAmount={winAmount}
                            chatPhrase={chatPhrase}
                            onPlayerBet={undefined}
                            gameState={gameState}
                            notificationType={notificationType}
                            showWinIndicator={showWinIndicator}
                          />
                        );
                      }
                      return (
                        <PlayerSpot
                          player={player}
                          isCurrentUser={false}
                          showCards={showCards}
                          scale={scale}
                          cardSide={cardSide}
                          openCardsPosition={openCardsPosition}
                          isTurn={isTurn}
                          turnTimer={turnTimer}
                          winAmount={winAmount}
                          chatPhrase={chatPhrase}
                          onPlayerBet={undefined}
                          gameState={gameState}
                          notificationType={notificationType}
                          showWinIndicator={showWinIndicator}
                        />
                      );
                    })()
                  ) : (
                    <SeatButton
                      type={isSeated ? "invite" : "sitdown"}
                      position={absolutePosition}
                      onSitDown={handleSitDown}
                      onInvite={handleInvite}
                      scale={scale}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isSeated && (
        <div className="px-4 -mt-2 pb-4">
          <div className="flex flex-col items-center space-y-4">
            <div>
              {effectiveGameStatus === "waiting" ? (
                <div className="p-4 flex items-center justify-center h-full">
                  <p className="text-white font-bold text-[10px] leading-[150%] tracking-[-0.011em] text-center">
                    {t("waiting_for_players")}
                  </p>
                </div>
              ) : isCurrentUserTurn ? (
                <ActionButtons
                  gameState={gameState}
                  postLookActions={postLookActions}
                  canFold={canFold}
                  canCall={canCall}
                  canRaise={canRaise}
                  canLook={canLook}
                  canBlindBet={canBlindBet}
                  callAmount={
                    postLookActions
                      ? postLookCallAmount
                      : callAmount
                  }
                  turnTimer={turnTimer}
                  onFold={actions.fold}
                  onCall={handleCallClick}
                  onRaise={handleRaiseClick}
                  onLook={actions.lookCards}
                  onBlindBet={handleBlindBetClick}
                  blindButtonsDisabled={blindButtonsDisabled || isProcessing}
                  isCallDisabled={isCallDisabled || isProcessing}
                  isRaiseDisabled={isRaiseDisabled || isProcessing}
                  isBlindBetDisabled={isBlindBetDisabled || isProcessing}
                  minBet={
                    effectiveGameStatus === "blind_betting"
                      ? blindBetAmount
                      : minRaiseAmount
                  }
                />
              ) : gameState?.status === "waiting" ? (
                <div className="p-4 flex items-center justify-center h-full">
                  <p className="text-white font-bold text-[10px] leading-[150%] tracking-[-0.011em] text-center">
                    {t("waiting_for_next_round")}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <BetSlider
        isOpen={showBetSlider}
        onClose={() => setShowBetSlider(false)}
        minBet={gameState?.lastActionAmount ? (gameState?.lastActionAmount==gameState?.lastBlindBet? gameState?.lastActionAmount*4 || 0 : gameState?.lastActionAmount*2 || 0) : 0}
        maxBet={maxRaise}
        initialBet={gameState?.lastActionAmount ? (gameState?.lastActionAmount==gameState?.lastBlindBet? gameState?.lastActionAmount*4 || 0 : gameState?.lastActionAmount*2 || 0) : 0}
        onConfirm={handleBetConfirm}
        isTurn={isCurrentUserTurn}
        turnTimer={turnTimer}
        isProcessing={isProcessing}
      />
      <GameMenu
        isOpen={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        onExit={handleLeaveRoom}
      />

      <ChatMenu
        isOpen={showChatMenu}
        onClose={() => setShowChatMenu(false)}
        onSelectPhrase={handleSelectPhrase}
      />

      {isSeated && (
        <button
          onClick={() => setShowChatMenu(true)}
          className="fixed z-40"
          style={{
            width: "40px",
            height: "40px",
            bottom: "25%",
            left: "18px",
          }}
        >
          <img src={chatButton} alt="Chat" className="w-full h-full" />
        </button>
      )}

      {notification && (
        <Notification
          type={notification}
          onClose={() => setNotification(null)}
        />
      )}

      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 50 }}
      >
        {chipAnimations.map((chip) => (
          <FlyingChip
            key={chip.id}
            chipId={chip.id}
            fromX={chip.fromX}
            fromY={chip.fromY}
            toX={chip.toX}
            toY={chip.toY}
            delay={chip.delay}
            onComplete={handleChipAnimationComplete}
          />
        ))}
        
      </div>

      {/* NoConnect компонент для проблем с подключением */}
      <NoConnect isVisible={showNoConnect} onRetry={retryConnection} />
    </div>
  );
}
