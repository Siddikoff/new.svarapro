import { type ReactNode,useEffect, useLayoutEffect, useRef, useState } from 'react';

import { COLORS } from '../../designSystem';

export interface SheetProps {
  onClose: () => void;
  children: ReactNode;
  scrollKey?: string | number;
}

export function Sheet({ onClose, children, scrollKey }: SheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [_vvH, _setVvH] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  useLayoutEffect(() => {
    if (sheetRef.current) sheetRef.current.scrollTop = 0;
  }, [scrollKey]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    const up = () => _setVvH(vv ? vv.height : window.innerHeight);
    up();
    if (vv) {
      vv.addEventListener('resize', up);
      vv.addEventListener('scroll', up);
      return () => {
        vv.removeEventListener('resize', up);
        vv.removeEventListener('scroll', up);
      };
    }
    window.addEventListener('resize', up);
    return () => window.removeEventListener('resize', up);
  }, []);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement,
      body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      scrollY: window.scrollY,
    };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = '-' + prev.scrollY + 'px';
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      window.scrollTo(0, prev.scrollY);
    };
  }, []);
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        animation: 'svrFade .22s ease-out',
        overscrollBehavior: 'contain',
      } as React.CSSProperties}
    >
      <div
        ref={sheetRef}
        onClick={(u) => u.stopPropagation()}
        style={{
          position: 'relative',
          background: COLORS.bg2,
          borderRadius: '20px 20px 0 0',
          // Floor of 48px keeps the original visual spacing on devices
          // without a home-indicator inset; on iPhones with a notch the
          // safe-area grows the bottom padding so content clears the bar.
          padding: '20px 20px max(env(safe-area-inset-bottom), 48px)',
          width: '100%',
          maxWidth: 480,
          maxHeight: _vvH * 0.9,
          overflowY: 'auto',
          animation: 'svrSlideUp .28s cubic-bezier(.22,.94,.36,1)',
        } as React.CSSProperties}
      >
        <div
          style={{
            width: 36,
            height: 4,
            background: COLORS.div,
            borderRadius: 2,
            margin: '0 auto 20px',
          } as React.CSSProperties}
        />
        {children}
      </div>
    </div>
  );
}
