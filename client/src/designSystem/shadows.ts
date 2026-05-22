/**
 * Elevation / shadow tokens.
 */
export const SHADOWS = {
  card: '0 4px 16px rgba(0, 0, 0, 0.12)',
  modal: '0 -8px 40px rgba(0, 0, 0, 0.45)',
  toggle: '0 1px 4px rgba(0, 0, 0, 0.3)',
  avatar: '0 2px 6px rgba(0, 0, 0, 0.45)',
  // Game table specific (felt / rail / floor).
  tableRail:
    '0 28px 72px rgba(0,0,0,0.92), 0 8px 24px rgba(0,0,0,0.65),' +
    ' inset 0 5px 14px rgba(0,0,0,0.8), inset 0 -5px 14px rgba(0,0,0,0.8),' +
    ' inset 8px 0 18px rgba(0,0,0,0.6), inset -8px 0 18px rgba(0,0,0,0.6)',
  tableBevel: 'inset 0 5px 20px rgba(0,0,0,1), inset 0 -3px 8px rgba(0,0,0,0.8)',
  tableFelt:
    'inset 0 10px 40px rgba(0,0,0,0.35), inset 0 -10px 40px rgba(0,0,0,0.35),' +
    ' inset 30px 0 50px rgba(0,0,0,0.18), inset -30px 0 50px rgba(0,0,0,0.18)',
} as const;

export type ShadowToken = keyof typeof SHADOWS;

export const shadows = SHADOWS;
