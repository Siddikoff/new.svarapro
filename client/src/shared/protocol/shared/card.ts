/**
 * Card schemas — mirror the 32-card "Свара" deck implemented in
 * `gameRoom/deck.ts`. Kept here so the protocol owns the canonical shape
 * (the deck file is a UI-side concern that happens to match).
 */
import { z } from 'zod';

export const CardRankSchema = z.enum(['7', '8', '9', '10', 'J', 'Q', 'K', 'A']);
export type CardRank = z.infer<typeof CardRankSchema>;

export const CardSuitSchema = z.enum(['spade', 'heart', 'diamond', 'club']);
export type CardSuit = z.infer<typeof CardSuitSchema>;

export const CardSchema = z.object({
  rank: CardRankSchema,
  suit: CardSuitSchema,
});
export type Card = z.infer<typeof CardSchema>;
