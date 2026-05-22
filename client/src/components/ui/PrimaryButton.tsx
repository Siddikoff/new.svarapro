
import type { CSSProperties, ReactNode } from 'react';

import { BRAND, COLORS, RADIUS } from '../../designSystem';

interface PrimaryButtonProps {
  onClick?: () => void;
  color?: string;
  disabled?: boolean;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export function PrimaryButton({
  onClick,
  color,
  disabled,
  children,
  style,
  className,
}: PrimaryButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        background: disabled ? COLORS.div : color || COLORS.accent,
        color: disabled ? COLORS.hint : BRAND.white,
        border: 'none',
        borderRadius: RADIUS.md,
        fontSize: 15,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: '100%',
        height: 50,
        opacity: disabled ? 0.6 : 1,
        ...style,
      } as CSSProperties}
    >
      {children}
    </button>
  );
}
