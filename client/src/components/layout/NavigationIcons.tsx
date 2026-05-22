import type { SVGProps } from 'react';

/**
 * SVG icons rendered in the bottom navigation bar.
 *
 * Each export accepts a single `stroke` prop so the parent can highlight the
 * active tab via colour. Splitting them out keeps `NavigationBar` readable.
 */
const baseProps: SVGProps<SVGSVGElement> = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export interface NavigationIconProps {
  stroke: string;
}

export const LobbyIcon = ({ stroke }: NavigationIconProps) => (
  <svg {...baseProps} stroke={stroke}>
    <rect x="1.8" y="6.5" width="8" height="13" rx="1.4" transform="rotate(-18 5.8 13)" />
    <rect x="14.2" y="6.5" width="8" height="13" rx="1.4" transform="rotate(18 18.2 13)" />
    <rect x="8" y="3.5" width="8" height="15" rx="1.4" fill="var(--bg)" />
  </svg>
);

export const RatingIcon = ({ stroke }: NavigationIconProps) => (
  <svg {...baseProps} stroke={stroke}>
    <polyline points="18 20 18 10" />
    <polyline points="12 20 12 4" />
    <polyline points="6 20 6 14" />
  </svg>
);

export const TournamentIcon = ({ stroke }: NavigationIconProps) => (
  <svg {...baseProps} stroke={stroke}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
  </svg>
);

export const ProfileIcon = ({ stroke }: NavigationIconProps) => (
  <svg {...baseProps} stroke={stroke}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const CreateActionIcon = ({ stroke }: NavigationIconProps) => (
  <svg {...baseProps} stroke={stroke}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);
