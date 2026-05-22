import { COLORS, RADIUS, SPACING, Z_INDEX } from '../designSystem';
import { type Toast, type ToastTone,useToastStore } from '../store/toastStore';

/**
 * ToastViewport — minimal renderer for transient `toastStore` notifications.
 *
 * Design intent:
 *   - Server `ERROR` frames pushed by the WS bridge become user-visible
 *     here. The viewport is mounted once at the App root so any code
 *     can call `useToastStore.getState().pushToast(...)` and have the
 *     message appear without prop-drilling.
 *   - Auto-dismissal is handled by the store; the component is pure
 *     render — it just reads `state.toasts`.
 *   - Layout: fixed at the top of the viewport, above the main content
 *     and below the GameRoom overlay. Pointer events fall through to the
 *     page; each toast pill captures clicks for dismiss.
 *   - Styling: design tokens only (colors / radius / spacing / z-index),
 *     no inline magic numbers. Accent stripe per `tone`.
 */
const TONE_ACCENT: Record<ToastTone, string> = {
  info: COLORS.accent,
  success: COLORS.green,
  warning: COLORS.gold,
  error: COLORS.red,
};

const viewportStyle: React.CSSProperties = {
  position: 'fixed',
  top: SPACING.md,
  left: 0,
  right: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: SPACING.xs,
  padding: `0 ${SPACING.md}px`,
  zIndex: Z_INDEX.toast,
  pointerEvents: 'none',
};

const toastBase: React.CSSProperties = {
  pointerEvents: 'auto',
  minWidth: 220,
  maxWidth: 480,
  width: '100%',
  background: COLORS.bg2,
  color: COLORS.text,
  borderRadius: RADIUS.lg,
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  fontSize: 14,
  lineHeight: 1.35,
  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  display: 'flex',
  alignItems: 'center',
  gap: SPACING.sm,
  cursor: 'pointer',
};

const accentBar = (color: string): React.CSSProperties => ({
  width: 3,
  alignSelf: 'stretch',
  borderRadius: RADIUS.pill,
  background: color,
  flexShrink: 0,
});

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div style={viewportStyle} role="status" aria-live="polite">
      {toasts.map((toast: Toast) => (
        <div
          key={toast.id}
          style={toastBase}
          onClick={() => dismissToast(toast.id)}
          role="button"
          aria-label={`Dismiss ${toast.tone} message`}
        >
          <div style={accentBar(TONE_ACCENT[toast.tone] ?? COLORS.accent)} />
          <span style={{ flex: 1 }}>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
