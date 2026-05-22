import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Dropdown } from '../../../components/ui/Dropdown';
import { BRAND, COLORS } from '../../../designSystem';
import css from '../Profile.module.css';

const SETTINGS_ICON_STROKE = BRAND.accent;

interface MyIdRowProps {
  id: number | string;
  copied: boolean;
  onCopy: () => void;
}

/**
 * `Мой ID` row with copy button. The toast shown on copy is rendered by the
 * parent so this row stays self-contained.
 */
function MyIdRowImpl({ id, copied, onCopy }: MyIdRowProps) {
  const { t } = useTranslation();
  return (
    <div className={css.rowCard}>
      <div className={css.rowIcon} style={{ background: COLORS.tintBlue }}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={SETTINGS_ICON_STROKE}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="9" x2="20" y2="9" />
          <line x1="4" y1="15" x2="20" y2="15" />
          <line x1="10" y1="3" x2="8" y2="21" />
          <line x1="16" y1="3" x2="14" y2="21" />
        </svg>
      </div>
      <span className={css.rowLabel}>{t('my_id')}</span>
      <span className={css.rowSubtext}>{id}</span>
      <button
        onClick={onCopy}
        className={copied ? `${css.copyChip} ${css.copyChipActive}` : css.copyChip}
      >
        {copied ? `✓ ${t('copied')}` : t('copy')}
      </button>
    </div>
  );
}

export const MyIdRow = memo(MyIdRowImpl);

interface LanguageRowProps {
  value: string;
  onChange: (value: string) => void;
  chevronUrl?: string;
}

/**
 * Language selector row. Uses the shared Dropdown UI primitive — the
 * dropdown owns its own popover state. Options are i18n-localised so
 * Russian users see "Русский / English" while English users see
 * "Russian / English".
 */
function LanguageRowImpl({ value, onChange, chevronUrl }: LanguageRowProps) {
  const { t } = useTranslation();
  const options = useMemo(
    () => [
      { value: 'ru', label: `🇷🇺 ${t('russian')}` },
      { value: 'en', label: `🇬🇧 ${t('english')}` },
    ],
    [t],
  );
  return (
    <div className={css.rowCard}>
      <div className={css.rowIcon} style={{ background: COLORS.tintBlue }}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={SETTINGS_ICON_STROKE}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </div>
      <span className={css.rowLabel}>{t('current_language')}</span>
      <Dropdown
        value={value}
        onChange={onChange}
        chevronUrl={chevronUrl}
        textColor={COLORS.text}
        panelBg={COLORS.bg2}
        triggerStyle={{ background: COLORS.bg3 }}
        options={options}
      />
    </div>
  );
}

export const LanguageRow = memo(LanguageRowImpl);

/**
 * Theme selector row (dark / light / system). The leading icon swaps to a
 * moon in light mode and a sun in dark mode for consistency with how the
 * rest of the app signals the active theme.
 */
type ThemeName = 'light' | 'dark';
type ThemePref = 'light' | 'dark' | 'system';

interface ThemeRowProps {
  theme: ThemeName;
  themePref?: ThemePref | string;
  onSetThemePref?: (pref: ThemePref) => void;
  onToggleTheme?: () => void;
  chevronUrl?: string;
}

function ThemeRowImpl({ theme, themePref, onSetThemePref, onToggleTheme, chevronUrl }: ThemeRowProps) {
  const { t } = useTranslation();
  const themeOptions = useMemo(
    () => [
      { value: 'dark', label: t('dark_theme') },
      { value: 'light', label: t('light_theme') },
      { value: 'system', label: t('system_theme') },
    ],
    [t],
  );
  const pref: ThemePref =
    themePref === 'system' || themePref === 'light' || themePref === 'dark' ? themePref : 'dark';
  const setPref = (value: string) => {
    if (onSetThemePref) {
      onSetThemePref(value as ThemePref);
    } else if (onToggleTheme) {
      onToggleTheme();
    }
  };
  const iconBg = theme === 'dark' ? COLORS.tintGold : COLORS.tintBlue;
  const headIcon =
    theme === 'dark' ? (
      <svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke={COLORS.gold}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx={12} cy={12} r={4} />
        <line x1={12} y1={2} x2={12} y2={5} />
        <line x1={12} y1={19} x2={12} y2={22} />
        <line x1={2} y1={12} x2={5} y2={12} />
        <line x1={19} y1={12} x2={22} y2={12} />
        <line x1={4.93} y1={4.93} x2={7.05} y2={7.05} />
        <line x1={16.95} y1={16.95} x2={19.07} y2={19.07} />
        <line x1={4.93} y1={19.07} x2={7.05} y2={16.95} />
        <line x1={16.95} y1={7.05} x2={19.07} y2={4.93} />
      </svg>
    ) : (
      <svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke={SETTINGS_ICON_STROKE}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  return (
    <div className={css.rowCard}>
      <div className={css.rowIcon} style={{ background: iconBg }}>
        {headIcon}
      </div>
      <span className={css.rowLabel}>{t('theme')}</span>
      <Dropdown
        value={pref}
        onChange={(v) => setPref(v)}
        chevronUrl={chevronUrl}
        textColor={COLORS.text}
        panelBg={COLORS.bg2}
        triggerStyle={{ background: COLORS.bg3 }}
        options={themeOptions}
      />
    </div>
  );
}

export const ThemeRow = memo(ThemeRowImpl);
