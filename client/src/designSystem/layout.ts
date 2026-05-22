/**
 * Layout tokens — viewport and bar dimensions.
 */
export const LAYOUT = {
  appMaxWidth: 480,
  bottomBarHeight: 80,
  gameTableMaxWidth: 460,
} as const;

export type LayoutToken = keyof typeof LAYOUT;

export const layout = LAYOUT;

export type TelegramPlatform = 'ios' | 'android' | 'default';

export const PLATFORM_HEADER_TOP: Record<TelegramPlatform, number> = {
  ios: 124,
  android: 106,
  default: 14,
};
export const TABLE_MAX_HEIGHT = { android: 649, default: 748 } as const;
export const CHAT_BUTTON_BOTTOM = 138;
