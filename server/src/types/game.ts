// Существующий тип Room
export interface Room {
  roomId: string;
  minBet: number;
  type: 'public' | 'private';
  players: string[];
  spectators: string[];
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  createdAt: Date;
  finishedAt?: Date;
  password?: string;
  winner?: string; // telegramId победителя
  isSystem?: boolean; // флаг системной комнаты
}

// Новые типы для игры
export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7';
  isJoker?: boolean; // флаг для 7 треф (джокер)
  value: number; // числовое значение карты
}

export interface Pot {
  amount: number;
  eligiblePlayers: string[];
}

export interface Player {
  id: string; // telegramId
  username: string;
  avatar: string | null;
  balance: number; // общий баланс игрока
  tableBalance: number; // баланс на столе
  cards: Card[]; // карты в руке
  isActive: boolean; // активен ли игрок в текущей игре
  isDealer: boolean; // является ли дилером
  hasFolded: boolean; // сбросил ли карты
  hasLooked: boolean; // посмотрел ли карты (для ставок вслепую)
  totalBet: number; // общая ставка в игре
  score?: number; // очки игрока (вычисляются при вскрытии)
  position: number; // позиция за столом (0-5)
  hasLookedAndMustAct?: boolean; // флаг для игрока, который посмотрел карты и должен действовать
  lastAction?: 'fold' | 'check' | 'call' | 'raise' | 'blind' | 'look'; // последнее действие
  lastWinAmount?: number;
  inactivityCount?: number; // счетчик бездействия (fold по таймеру)
  availableActions?: any[]; // Dynamically added for the client
}

export interface GameState {
  roomId: string;
  status:
    | 'waiting'
    | 'ante'
    | 'blind_betting'
    | 'betting'
    | 'showdown'
    | 'svara'
    | 'svara_pending' // Ожидание решения игроков по сваре
    | 'finished';
  players: Player[];
  deck: Card[]; // колода
  pot: number; // банк
  pots?: Pot[]; // For side pots
  currentPlayerIndex: number; // индекс текущего игрока
  dealerIndex: number; // индекс дилера
  lastRaiseIndex?: number; // индекс последнего повысившего ставку
  lastBlindBettorIndex?: number; // индекс последнего, кто ставил вслепую
  minBet: number; // минимальная ставка
  currentBet: number; // текущая ставка в раунде
  lastBlindBet: number; // последняя ставка вслепую
  lastActionAmount: number; // сумма последнего действия (call или raise)
  rake: number; // комиссия (налог)
  winners: Player[]; // победители
  isSvara: boolean; // объявлена ли "свара"
  svaraParticipants?: string[]; // Игроки, участвующие в сваре (включая тех, кто докупил)
  svaraConfirmed?: string[]; // Игроки, подтвердившие участие в сваре
  svaraDeclined?: string[]; // Игроки, отказавшиеся от свары
  svaraOriginalPot?: number; // Изначальный банк свары для расчета входа
  hasRaiseMax?: boolean; // Флаг того, что кто-то сделал raise max (баланс = 0)
  raiseMaxPlayerIndex?: number; // Индекс игрока, который сделал raise max
  round: number; // номер раунда
  timer?: number; // таймер для хода
  turnStartTime?: number; // время начала текущего хода (timestamp)
  log: GameAction[]; // лог действий
  isAnimating?: boolean; // флаг анимации (блокирует действия)
  animationType?: 'chip_fly' | 'win_animation'; // тип текущей анимации
  showWinnerAnimation?: boolean; // флаг для показа анимации победы
  potInfo?: any;
  chipCount: number; // Количество фишек в банке для анимации
}

export interface GameAction {
  type:
    | 'join'
    | 'leave'
    | 'ante'
    | 'blind_bet'
    | 'look'
    | 'bet'
    | 'call'
    | 'raise'
    | 'fold'
    | 'win'
    | 'svara'
    | 'return_bet';
  telegramId: string;
  amount?: number;
  timestamp: number;
  message?: string; // текстовое описание действия
}

export interface GameActionResult {
  success: boolean;
  error?: string;
  gameState?: GameState | null;
  events?: { name: string; payload?: any; to?: string | string[] }[];
  // Дополнительные флаги для координации между сервисами
  shouldEndGame?: boolean;
  shouldStartGame?: boolean;
  shouldEndBettingRound?: boolean;
  shouldStartTimer?: boolean;
  shouldKickPlayer?: boolean;
  shouldProcessFold?: boolean;
  player?: Player;
}