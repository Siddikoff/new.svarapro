import { useLayoutEffect } from 'react';

// Per-chip flight time for the winner sweep. Longer than
// `ANTE_CHIP_DURATION_MS` (the bet-flight duration) so the overall
// sweep reads as a noticeably slower, more deliberate payout rather
// than a quick burst.
const WINNER_CHIP_DURATION_MS = 1400;

export interface WinnerChipsOverlayProps {
  seatId: string;
}

/**
 * Sweep the chips that are currently sitting in the bank pile onto the
 * winner's seat. We don't render any chips of our own — we collect the
 * *actual* on-table chips (rendered by `AnteOverlay` + `BetOverlay`,
 * tagged with `data-table-chip`) and run a new WAAPI animation on each
 * so the player watches the same chips fly to the winner.
 *
 * The motion is a tight cluster (all chips leave within a fixed
 * ~200 ms window) with a slow per-chip flight so the whole bank
 * arrives together but the actual travel time is long enough to read
 * as a deliberate payout, not a flash. Each chip follows a gentle bow
 * at the midpoint instead of a flat slide.
 *
 * Important:
 *   - `.chip` has `opacity: 0` in CSS. The resting animation kept the chip
 *     visible via `fill: 'forwards'`; once we cancel that, the chip would
 *     snap back to CSS opacity 0 and disappear for a frame. We pin inline
 *     `opacity` and `transform` BEFORE cancelling so the visual state
 *     doesn't lapse, and we use `fill: 'both'` on the new animation so the
 *     first keyframe (`opacity: 1`) is applied during the per-chip delay.
 *   - We lift each chip's parent `.layer` (`data-table-chip-layer`) above
 *     the seat stacking context (z-index 10) so the chips travel *over*
 *     the cards during the sweep.
 *   - The animation uses `fill: 'both'` and fades each chip out in its
 *     final ~22 % so the swept chips disappear into the winner's
 *     nameplate instead of piling up there. Previously they remained at
 *     full opacity until the next round reset the chip layers, which
 *     read as a leftover red dot blinking on the player's name plate.
 */
function WinnerChipsOverlayImpl({ seatId }: WinnerChipsOverlayProps) {
  useLayoutEffect(() => {
    const target = document.querySelector(
      `[data-ante-anchor="${CSS.escape(seatId)}"]`,
    ) as HTMLElement | null;
    if (!target) return undefined;

    const targetRect = target.getBoundingClientRect();
    const targetCx = targetRect.left + targetRect.width / 2;
    const targetCy = targetRect.top + targetRect.height / 2;

    const layers = Array.from(
      document.querySelectorAll<HTMLElement>('[data-table-chip-layer="1"]'),
    );
    const restoreLayerZ: Array<[HTMLElement, string]> = layers.map((l) => [
      l,
      l.style.zIndex,
    ]);
    for (const l of layers) {
      l.style.zIndex = '12';
    }

    const rawChips = Array.from(
      document.querySelectorAll<HTMLElement>('[data-table-chip="1"]'),
    );

    // Pre-measure each chip and toss out zero-size nodes (e.g. chips still
    // mid-flight from a bet overlay). Sorting by distance to the winner so
    // the chip closest to the destination leaves first and the rest trail
    // behind — reads as a stream rather than a single clump.
    const chipData = rawChips
      .map((chip) => {
        const rect = chip.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = targetCx - cx;
        const dy = targetCy - cy;
        return { chip, dx, dy, dist: Math.hypot(dx, dy) };
      })
      .filter(
        (entry): entry is { chip: HTMLElement; dx: number; dy: number; dist: number } =>
          entry !== null,
      );

    chipData.sort((a, b) => a.dist - b.dist);

    // Total stagger window is capped at ~200 ms regardless of chip
    // count so 4 chips and 18 chips both leave as a single visible
    // group, not a long serial chain. Per-chip flight is intentionally
    // long (`WINNER_CHIP_DURATION_MS`) so the overall sweep slows down
    // without going back to one-by-one delivery.
    const CLUSTER_SPREAD_MS = 200;
    const perChipStagger =
      chipData.length > 1 ? CLUSTER_SPREAD_MS / (chipData.length - 1) : 0;
    const perChipDuration = WINNER_CHIP_DURATION_MS;

    chipData.forEach(({ chip, dx, dy, dist }, i) => {
      // Pin the resting visual state inline BEFORE we cancel the previous
      // animation. CSS says `opacity: 0` for `.chip`, so without these
      // inline overrides the chip would snap to invisible / scale(1) in the
      // gap between cancelling the old animation and the new one taking
      // over on the next frame.
      chip.style.opacity = '1';
      chip.style.transform = 'translate3d(0, 0, 0) scale(0.8)';
      for (const a of chip.getAnimations()) a.cancel();

      // Gentle upward bow at the midpoint — capped tight so winners below
      // the pot don't see chips arc above the table before dropping back
      // down. Scales with the travel distance so close chips stay nearly
      // straight while long throws read as a clear arc.
      const arcLift = -Math.min(14, dist * 0.045);
      const midX = dx * 0.5;
      const midY = dy * 0.5 + arcLift;
      const delay = i * perChipStagger;

      chip.animate(
        [
          {
            transform: 'translate3d(0, 0, 0) scale(0.8)',
            opacity: 1,
          },
          {
            offset: 0.45,
            transform: `translate3d(${midX}px, ${midY}px, 0) scale(0.86)`,
            opacity: 1,
          },
          {
            offset: 0.78,
            transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.72)`,
            opacity: 1,
          },
          {
            transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.5)`,
            opacity: 0,
          },
        ],
        {
          duration: perChipDuration,
          easing: 'cubic-bezier(0.34, 0.06, 0.32, 1)',
          fill: 'both',
          delay,
        },
      );
    });

    return () => {
      // Don't cancel chip animations — let the swept chips remain at the
      // winner's seat until the next round resets the chip layers.
      for (const [el, z] of restoreLayerZ) {
        el.style.zIndex = z;
      }
    };
  }, [seatId]);

  return null;
}

export const WinnerChipsOverlay = WinnerChipsOverlayImpl;
