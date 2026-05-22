export const BASE_NOW: Date = new Date();

export const addHoursFromNow = (hours: number): Date =>
  new Date(BASE_NOW.getTime() + hours * 36e5);

export const MONTHS_RU = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
] as const;

export const pad2 = (value: number | string): string => String(value).padStart(2, '0');

export const formatDateTime = (date: Date): string =>
  `${pad2(date.getDate())} ${MONTHS_RU[date.getMonth()]} ${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

/**
 * Generate a collision-resistant client-side ID for transient objects.
 *
 * `Date.now()` collides when two actions happen in the same millisecond
 * (e.g. two users creating a room at once). When `crypto.randomUUID` is
 * available we use it; otherwise we fall back to time + a random suffix
 * which is still good enough to avoid collisions in practice.
 */
export const generateClientId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};
