import { memo, type ReactNode } from 'react';

import { Dropdown, type DropdownOption } from '../../../components/ui/Dropdown';
import { BRAND } from '../../../designSystem';
import { type RoomThemeColors,TABLE_PRESETS } from '../constants';
import styles from './Menu.module.css';

type Theme = 'light' | 'dark';
type ThemePref = 'light' | 'dark' | 'system';
type FeltPresetKey = keyof typeof TABLE_PRESETS;

export type RoomThemeStyle = RoomThemeColors;

interface ConfirmExitProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  theme: Theme;
  t: RoomThemeStyle;
}

function ConfirmExitImpl({ open, onCancel, onConfirm, theme, t }: ConfirmExitProps) {
  if (!open) return null;
  const isLight = theme === 'light';
  return (
    <div onClick={onCancel} className={styles.confirmOverlay}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={styles.confirmCard}
        style={{
          background: t.chatBg,
          color: t.text,
          border: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          className={styles.confirmIcon}
          style={{ background: isLight ? 'rgba(226,59,59,0.10)' : 'rgba(226,59,59,0.18)' }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#e23b3b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>
        <div className={styles.confirmTitle}>Выйти из игры?</div>
        <div className={styles.confirmDescr} style={{ color: t.textDim }}>
          Вы действительно хотите покинуть стол?
        </div>
        <div className={styles.confirmBtnRow}>
          <button
            onClick={onCancel}
            className={styles.confirmBtn}
            style={{
              background: isLight ? '#e1e8ed' : 'rgba(255,255,255,0.10)',
              color: t.text,
            }}
          >
            Нет
          </button>
          <button onClick={onConfirm} className={`${styles.confirmBtn} ${styles.danger}`}>
            Да
          </button>
        </div>
      </div>
    </div>
  );
}
export const ConfirmExit = memo(ConfirmExitImpl);

interface GameMenuProps {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  themePref: ThemePref;
  onSetThemePref: (pref: ThemePref) => void;
  feltPreset: FeltPresetKey;
  onSetFeltPreset: (preset: FeltPresetKey) => void;
  sound: boolean;
  onToggleSound: () => void;
  vibration: boolean;
  onToggleVibration: () => void;
  onExit: () => void;
  t: RoomThemeStyle;
}

// NOTE: Toggle, ThemeSelect, TablePresetControl are defined at module scope
// (not inside GameMenuImpl). Defining them as local sub-components causes
// React to unmount/remount their DOM on every parent re-render (it sees a
// new component type each time). The turn-timer RAF re-renders GameRoom
// ~60 fps, so a local sub-component's DOM would be replaced every frame —
// taps inside the menu would race the unmount and never fire.
function Toggle({
  on,
  onClick,
  isLight,
}: {
  on: boolean;
  onClick: () => void;
  isLight: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={styles.toggle}
      style={{
        background: on ? BRAND.accent : isLight ? '#c4ccd6' : 'rgba(255,255,255,0.18)',
      }}
    >
      <div className={styles.toggleKnob} style={{ left: on ? 18 : 2 }} />
    </div>
  );
}

function ThemeSelect({
  value,
  options,
  onChange,
  chevronUrl,
  textColor,
  panelBg,
  isLight,
}: {
  value: ThemePref;
  options: DropdownOption[];
  onChange: (next: ThemePref) => void;
  chevronUrl: string;
  textColor: string;
  panelBg: string;
  isLight: boolean;
}) {
  return (
    <Dropdown
      value={value}
      options={options}
      onChange={(v) => onChange(v as ThemePref)}
      chevronUrl={chevronUrl}
      textColor={textColor}
      panelBg={panelBg}
      triggerStyle={{
        background: isLight ? '#e9eef4' : 'rgba(255,255,255,0.10)',
      }}
    />
  );
}

function TablePresetControl({
  feltPreset,
  onSetFeltPreset,
}: {
  feltPreset: FeltPresetKey;
  onSetFeltPreset: (preset: FeltPresetKey) => void;
}) {
  return (
    <div className={styles.presetRow}>
      {(Object.entries(TABLE_PRESETS) as Array<[FeltPresetKey, typeof TABLE_PRESETS[FeltPresetKey]]>).map(([key, preset]) => {
        const active = feltPreset === key;
        return (
          <button
            key={key}
            onClick={(e) => {
              e.stopPropagation();
              onSetFeltPreset(key);
            }}
            title={preset.label}
            className={styles.presetSwatch}
            style={{
              border: active ? '2px solid #ffffff' : '2px solid rgba(255,255,255,0.18)',
              boxShadow: active ? `0 0 0 2px ${BRAND.accent}` : 'none',
              background: preset.swatch,
            }}
          />
        );
      })}
    </div>
  );
}

function GameMenuImpl({
  open,
  onClose,
  theme,
  themePref,
  onSetThemePref,
  feltPreset,
  onSetFeltPreset,
  sound,
  onToggleSound,
  vibration,
  onToggleVibration,
  onExit,
  t,
}: GameMenuProps) {
  if (!open) return null;
  const isLight = theme === 'light';
  const divider = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';

  const row = (
    icon: ReactNode,
    label: string,
    control: ReactNode,
    onClick?: () => void,
    danger?: boolean,
  ) => (
    <div
      onClick={onClick}
      className={styles.row}
      style={{
        borderTop: '1px solid ' + divider,
        cursor: onClick ? 'pointer' : 'default',
        color: danger ? '#e23b3b' : t.text,
      }}
    >
      <div className={styles.rowIcon}>{icon}</div>
      <div className={styles.rowLabel} style={{ fontWeight: danger ? 600 : 500 }}>
        {label}
      </div>
      {control}
    </div>
  );

  const themeIcon =
    themePref === 'system' ? (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M8 20h8" />
        <path d="M12 16v4" />
      </svg>
    ) : theme === 'dark' ? (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ) : (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  const chevronStroke = isLight ? '%231a2533' : '%23ffffff';
  const chevronUrl =
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='14' viewBox='0 0 10 14' fill='none' stroke='" +
    chevronStroke +
    "' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='2,5 5,2 8,5'/><polyline points='2,9 5,12 8,9'/></svg>\")";
  const soundIcon = sound ? (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  ) : (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
  const vibrIcon = (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="7" y="4" width="10" height="16" rx="1.5" />
      <path d="M3 9v6M21 9v6" />
    </svg>
  );
  const exitIcon = (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );

  return (
    <div onClick={onClose} className={styles.menuOverlay}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={styles.menuCard}
        style={{
          background: t.chatBg,
          color: t.text,
          border: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className={styles.menuHead} style={{ color: t.textDim }}>
          Настройки
        </div>
        {row(
          themeIcon,
          'Тема',
          <ThemeSelect
            value={themePref}
            onChange={onSetThemePref}
            options={[
              { value: 'dark', label: 'Тёмная' },
              { value: 'light', label: 'Светлая' },
              { value: 'system', label: 'Системная' },
            ]}
            chevronUrl={chevronUrl}
            textColor={t.text}
            panelBg={t.chatBg}
            isLight={isLight}
          />,
        )}
        {row(
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="6" width="18" height="12" rx="6" />
            <path d="M8 12h8" />
          </svg>,
          'Цвет стола',
          <TablePresetControl feltPreset={feltPreset} onSetFeltPreset={onSetFeltPreset} />,
        )}
        {row(soundIcon, 'Звук', <Toggle on={sound} onClick={onToggleSound} isLight={isLight} />)}
        {row(vibrIcon, 'Вибрация', <Toggle on={vibration} onClick={onToggleVibration} isLight={isLight} />)}
        {row(exitIcon, 'Выйти из игры', null, onExit, true)}
      </div>
    </div>
  );
}
export const GameMenu = memo(GameMenuImpl);

interface HeaderProps {
  roomNum: string | number;
  onMenu: () => void;
  theme: Theme;
  t: RoomThemeStyle;
  topPadding?: number;
  sidePadding?: number;
}

function HeaderImpl({ roomNum, onMenu, theme, t, topPadding = 14, sidePadding = 18 }: HeaderProps) {
  const isLight = theme === 'light';
  return (
    <div
      className={styles.header}
      style={{ padding: `${topPadding}px ${sidePadding}px 10px` }}
    >
      <div
        className={styles.roomBadge}
        style={{
          background: isLight ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)',
          border: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span
          className={styles.roomBadgeText}
          style={{ color: isLight ? '#17212b' : BRAND.white }}
        >
          №{roomNum} · v3
        </span>
      </div>
      <button
        onClick={onMenu}
        className={styles.menuBtn}
        style={{ color: t.menuColor }}
        aria-label="settings"
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.14 7.14 0 0 0-1.63-.94L14.4 2.8a.5.5 0 0 0-.49-.4h-3.82a.5.5 0 0 0-.49.4L9.25 5.32c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.39 1.05.71 1.63.94l.35 2.52a.5.5 0 0 0 .49.4h3.82a.5.5 0 0 0 .49-.4l.35-2.52c.58-.23 1.12-.54 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
        </svg>
      </button>
    </div>
  );
}
export const Header = memo(HeaderImpl);
