import type { CSSProperties, ReactNode } from 'react';
import { memo } from 'react';

import { COLORS } from '../../../designSystem';
import css from '../Profile.module.css';

interface MenuItemRowProps {
  icon: ReactNode;
  bg: string;
  label: string;
  expanded?: boolean;
  onClick: () => void;
}

/**
 * Row for the menu list (history, partner program, etc.).
 *
 * `expanded` controls whether the chevron rotates and whether the bottom
 * radius is squared off (so a panel can dock against it).
 */
function MenuItemRowImpl({ icon, bg, label, expanded, onClick }: MenuItemRowProps) {
  return (
    <div
      onClick={onClick}
      className={[
        css.menuRow,
        expanded ? css.menuRowTop : css.menuRowDefault,
      ].join(' ')}
    >
      <div className={css.rowIcon} style={{ background: bg } as CSSProperties}>
        {icon}
      </div>
      <span className={css.rowLabel}>{label}</span>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={COLORS.hint}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={expanded ? `${css.menuChevron} ${css.menuChevronOpen}` : css.menuChevron}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  );
}

export const MenuItemRow = memo(MenuItemRowImpl);
