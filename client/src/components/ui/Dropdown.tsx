import { type CSSProperties,useEffect, useRef, useState } from 'react';

import { BRAND, RADIUS } from '../../designSystem';

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  triggerStyle?: CSSProperties;
  panelStyle?: CSSProperties;
  optionStyle?: CSSProperties;
  optionActiveStyle?: CSSProperties;
  panelBg?: string;
  textColor?: string;
  accentColor?: string;
  chevronUrl?: string;
  align?: 'left' | 'right';
  minPanelWidth?: number;
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ reports as MacIntel but exposes touch.
  if (platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  return false;
}

// Click-to-open dropdown that replaces native <select> on Android, where the
// Telegram WebView occasionally fails to open the native popup.  On iOS the
// native picker wheel is preferred, so we fall back to a real <select>.
export function Dropdown({
  value,
  options,
  onChange,
  triggerStyle,
  panelStyle,
  optionStyle,
  optionActiveStyle,
  panelBg = '#1f1f22',
  textColor = BRAND.white,
  accentColor = BRAND.accent,
  chevronUrl,
  align = 'right',
  minPanelWidth = 140,
}: DropdownProps) {
  const ios = isIOS();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const current = options.find((o) => o.value === value) || options[0];
  // Strip the `background` shorthand from triggerStyle and reroute it to
  // `backgroundColor`. Mixing the shorthand with `backgroundImage` /
  // `backgroundRepeat` longhands here used to trigger an Android WebView
  // bug where the chevron icon tiled across the trigger and visually
  // struck through the label text (the `background` shorthand resets
  // every longhand to its initial value — `background-repeat: repeat`
  // included — and the WebView didn't always honour the longhand
  // overrides written immediately after).
  const { background: triggerBgShorthand, backgroundColor: triggerBgColor, ...triggerRest } =
    triggerStyle || {};
  const triggerBgRaw = triggerBgColor ?? triggerBgShorthand;
  const triggerBg = typeof triggerBgRaw === 'string' ? triggerBgRaw : undefined;

  useEffect(() => {
    if (!open || ios) return undefined;
    const onDocClick = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', onDocClick);
      document.addEventListener('touchstart', onDocClick, { passive: true });
      document.addEventListener('keydown', onKey);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, ios]);

  if (ios) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          backgroundColor: triggerBg,
          border: 'none',
          color: textColor,
          fontSize: 12,
          fontWeight: 500,
          borderRadius: RADIUS.sm,
          padding: '5px 24px 5px 12px',
          cursor: 'pointer',
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          backgroundImage: chevronUrl,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 7px center',
          backgroundSize: '10px 14px',
          ...triggerRest,
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={{
          backgroundColor: triggerBg,
          border: 'none',
          color: textColor,
          fontSize: 12,
          fontWeight: 500,
          borderRadius: RADIUS.sm,
          padding: '5px 24px 5px 12px',
          cursor: 'pointer',
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          backgroundImage: chevronUrl,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 7px center',
          backgroundSize: '10px 14px',
          whiteSpace: 'nowrap',
          textAlign: 'left',
          ...triggerRest,
        }}
      >
        {current ? current.label : ''}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            ...(align === 'right' ? { right: 0 } : { left: 0 }),
            minWidth: minPanelWidth,
            background: panelBg,
            color: textColor,
            borderRadius: RADIUS.md,
            boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
            border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden',
            zIndex: 100,
            ...(panelStyle || {}),
          }}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                type="button"
                key={opt.value}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  background: active ? `${accentColor}26` : 'transparent',
                  color: textColor,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  ...(optionStyle || {}),
                  ...(active ? optionActiveStyle || {} : {}),
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
