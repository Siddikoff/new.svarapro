import type React from 'react';

import { COLORS, layout } from '../../designSystem';
import { GlobalStyles } from './GlobalStyles';

const rootStyle : React.CSSProperties = {
  minHeight: '100vh',
  background: COLORS.bg,
  color: COLORS.text,
  fontFamily: 'system-ui, sans-serif',
  maxWidth: layout.appMaxWidth,
  margin: '0 auto',
  paddingBottom: layout.bottomBarHeight,
  boxSizing: 'border-box',
};

/**
 * Centred mobile-width container that hosts every screen, plus the global
 * `<style>` block.
 */
export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={rootStyle}>
      <GlobalStyles />
      {children}
    </div>
  );
}
