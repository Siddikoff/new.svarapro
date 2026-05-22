/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_SOCKET_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Telegram WebApp is injected by the host. We only annotate the surface we
// actually call from `services/telegram.ts`; everything else stays optional.
interface TelegramWebAppBackButton {
  show?: () => void;
  hide?: () => void;
  onClick?: (handler: () => void) => void;
  offClick?: (handler: () => void) => void;
}

interface TelegramWebAppHapticFeedback {
  impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred?: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged?: () => void;
}

interface TelegramWebAppInitDataUnsafe {
  user?: {
    id?: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
  };
  start_param?: string;
}

interface TelegramWebApp {
  initData?: string;
  initDataUnsafe?: TelegramWebAppInitDataUnsafe;
  platform?: string;
  BackButton?: TelegramWebAppBackButton;
  HapticFeedback?: TelegramWebAppHapticFeedback;
  ready?: () => void;
  expand?: () => void;
  requestFullscreen?: () => void;
  exitFullscreen?: () => void;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  openTelegramLink?: (url: string) => void;
  onEvent?: (eventName: string, handler: (...args: unknown[]) => void) => void;
  offEvent?: (eventName: string, handler: (...args: unknown[]) => void) => void;
  showConfirm?: (message: string, callback?: (confirmed: boolean) => void) => void;
  showAlert?: (message: string, callback?: () => void) => void;
  colorScheme?: string;
}

interface TelegramWindow {
  WebApp?: TelegramWebApp;
}

interface Window {
  Telegram?: TelegramWindow;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.mp3' {
  const src: string;
  export default src;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
