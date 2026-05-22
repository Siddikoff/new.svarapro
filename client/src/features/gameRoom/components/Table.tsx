import { memo } from 'react';

import { C } from '../constants';
import styles from './Table.module.css';

/* Pure-visual felt table.
 *
 * The room renders this as a fixed visual layer. All seats / pot / cards
 * are absolutely positioned children rendered on top of it by GameRoom.
 *
 * Layered structure (bottom → top):
 *   1. floor shadow + top shadow (radial blurred ovals)
 *   2. outer rail (dark rim)
 *   3. rail gloss (subtle 175° highlight)
 *   4. inner bevel (deep groove between rail and felt)
 *   5. velvet felt + diagonal repeating texture + lamp bloom + side vignettes
 *      + inner decorative ring + watermark
 */
export interface TableProps {
  feltInner: string;
  // Optional rail override (e.g. the cyan preset uses a cream/beige rail
  // to contrast against the turquoise felt). Falls back to the default
  // brown rail when omitted.
  feltOuter?: string;
  // When true, fades in a translucent dark overlay over the felt so that
  // revealed cards / chips / score badges read with more contrast. The
  // overlay sits inside `.felt`'s stacking context (z=4), so seats
  // (z=10), pot (z=5), cards (z=6/7) and chips stay at full brightness.
  dim?: boolean;
}

function TableImpl({ feltInner, feltOuter, dim }: TableProps) {
  return (
    <>
      <div className={styles.floorShadow} />
      <div className={styles.topShadow} />
      <div className={styles.outerRail} style={{ background: feltOuter ?? C.feltOuter }} />
      <div className={styles.railGloss} />
      <div className={styles.innerBevel} />
      <div className={styles.felt} style={{ background: feltInner }}>
        <div className={styles.velvetTexture} />
        <div className={styles.lampBloom} />
        <div className={styles.vignetteLeft} />
        <div className={styles.vignetteRight} />
        <div className={styles.decorRing} />
        <div aria-hidden className={styles.watermark}>
          @MySvaraBot
        </div>
        <div
          aria-hidden
          className={`${styles.dimOverlay}${dim ? ' ' + styles.dimOverlayActive : ''}`}
        />
      </div>
    </>
  );
}

export const Table = memo(TableImpl);
