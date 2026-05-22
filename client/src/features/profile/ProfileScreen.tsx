import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BalanceCard } from '../../components/BalanceCard';
import { MOCK_TELEGRAM_USER_ID as MOCK_TG_ID } from '../../constants/bets';
import { COLORS } from '../../designSystem';
import type { ThemeName, ThemePref } from '../../hooks/useTheme';
import { hapticTap } from '../../services/haptics';
import { getTelegramUserId } from '../../services/telegram';
import { useProfileStore } from '../../store/profileStore';
import type { User } from '../../types/domain';
import type { TransactionFilter } from './components/HistoryPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { MenuItemRow } from './components/MenuItemRow';
import { LanguageRow, MyIdRow, ThemeRow } from './components/SettingsRows';
import { StatsTriplet } from './components/StatsTriplet';
import { WithdrawWalletCard } from './components/WithdrawWalletCard';
import {
  AgreementMenuIcon,
  HistoryMenuIcon,
  HowToPlayMenuIcon,
  NewsMenuIcon,
  PartnerMenuIcon,
  SupportMenuIcon,
} from './icons/MenuIcons';
import css from './Profile.module.css';
import { buildChevronUrl } from './profileData';
import { AgreementSheet } from './sheets/AgreementSheet';
import { GameRulesSheet } from './sheets/GameRulesSheet';
import { PartnerSheet } from './sheets/PartnerSheet';
import { WalletSheet } from './sheets/WalletSheet';

const NEWS_CHANNEL_URL = 'https://t.me/SvaraPro';
const SUPPORT_CHAT_URL = 'https://t.me/SvaraProSupportbot';

const openTelegramExternal = (url: string): void => {
  if (typeof window === 'undefined') return;
  const tg = window.Telegram?.WebApp;
  // Prefer the Telegram WebApp helper so the link opens inside the
  // Telegram client (correct UX for a mini-app). Fall back to a regular
  // window.open when the helper isn't available (preview in a browser).
  if (tg?.openTelegramLink) {
    try {
      tg.openTelegramLink(url);
      return;
    } catch {
      // ignore — fall through to window.open
    }
  }
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    // ignore
  }
};

/**
 * Profile screen orchestrator.
 *
 * Owns three pieces of UI state that span multiple children:
 *   - `historyOpen`        — whether the deposit-history panel is expanded
 *   - which sheet is open  — wallet / partner / agreement
 *   - the local language pref (mirrors i18n's current language)
 *
 * Per-component concerns (network selection in WalletSheet, copied state in
 * PartnerSheet, the history filter, ID-copy toast) all live inside the
 * children themselves so re-renders stay scoped.
 *
 * The actual user data (transactions, referral info, wallet address) is
 * loaded into `profileStore` / `authStore` and read here via selectors,
 * keeping this orchestrator free of network concerns.
 */
interface ProfileScreenProps {
  user: User;
  onDeposit: () => void;
  onWithdraw: () => void;
  theme: ThemeName;
  themePref: ThemePref;
  onSetThemePref: (next: ThemePref) => void;
  onToggleTheme: () => void;
}

interface MenuItem {
  icon: ReactNode;
  bg: string;
  label: string;
  onClick: () => void;
}

export function ProfileScreen({
  user,
  onDeposit,
  onWithdraw,
  theme,
  themePref,
  onSetThemePref,
  onToggleTheme,
}: ProfileScreenProps) {
  const { t, i18n } = useTranslation();
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const [walletSheetOpen, setWalletSheetOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const transactions = useProfileStore((s) => s.transactions);
  const transactionsStatus = useProfileStore((s) => s.transactionsStatus);
  const referralData = useProfileStore((s) => s.referralData);
  const loadTransactions = useProfileStore((s) => s.loadTransactions);
  const loadReferralData = useProfileStore((s) => s.loadReferralData);
  const saveWalletAddress = useProfileStore((s) => s.saveWalletAddress);
  const clearWalletAddress = useProfileStore((s) => s.clearWalletAddress);

  // Hydrate the auxiliary profile data once the screen mounts. Re-renders
  // won't refetch (the store ignores duplicate "loading" transitions
  // because both loaders set the status before kicking off the request).
  useEffect(() => {
    void loadTransactions();
    void loadReferralData();
  }, [loadTransactions, loadReferralData]);

  // Reset copied-flag toast after a short window so users see feedback
  // without it lingering forever.
  useEffect(() => {
    if (!idCopied) return undefined;
    const timer = setTimeout(() => setIdCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [idCopied]);

  // Prefer the real Telegram user id (when running inside Telegram). Falls
  // back to MOCK_TG_ID for display so the demo still renders something in
  // the browser preview — the referral link is hidden in that case to
  // avoid attributing every preview user to the same ID.
  const realTgUserId = getTelegramUserId();
  const displayedTgId = realTgUserId ?? MOCK_TG_ID;
  // The server's referral link is the canonical source of truth (it
  // encodes the bot username and the referrer's telegramId). Fall back to
  // a synthesised link when running inside Telegram without the server.
  const referralLink =
    referralData?.referralLink ??
    (realTgUserId ? `https://t.me/MySvaraBot?startapp=${realTgUserId}` : null);

  const chevronUrl = useMemo(() => buildChevronUrl(theme), [theme]);

  const winRatePercent =
    user.played > 0 ? Math.round((user.won / user.played) * 100) : 0;

  const copyTelegramId = () => {
    try {
      navigator.clipboard?.writeText(String(displayedTgId));
    } catch {
      // Best-effort: clipboard is unavailable in some embeds.
    }
    hapticTap();
    setIdCopied(true);
  };

  const changeLanguage = (next: string) => {
    if (next !== 'ru' && next !== 'en') return;
    void i18n.changeLanguage(next);
  };

  const historyLabel = t('deposit_history');
  const menuItems = useMemo<MenuItem[]>(
    () => [
      {
        icon: <HistoryMenuIcon />,
        bg: COLORS.tintGreen,
        label: historyLabel,
        onClick: () => setHistoryOpen((open) => !open),
      },
      {
        icon: <PartnerMenuIcon />,
        bg: COLORS.tintGold,
        label: t('referral_program'),
        onClick: () => setPartnerOpen(true),
      },
      {
        icon: <NewsMenuIcon />,
        bg: COLORS.tintRed,
        label: t('news_channel'),
        onClick: () => openTelegramExternal(NEWS_CHANNEL_URL),
      },
      {
        icon: <AgreementMenuIcon />,
        bg: COLORS.tintPurple,
        label: t('user_agreement'),
        onClick: () => setAgreementOpen(true),
      },
      {
        icon: <HowToPlayMenuIcon />,
        bg: COLORS.tintGold,
        label: t('how_to_play'),
        onClick: () => setRulesOpen(true),
      },
      {
        icon: <SupportMenuIcon />,
        bg: COLORS.tintBlue,
        label: t('support_chat'),
        onClick: () => openTelegramExternal(SUPPORT_CHAT_URL),
      },
    ],
    [t, historyLabel],
  );

  return (
    <div className={css.screen}>
      <BalanceCard user={user} onDeposit={onDeposit} onWithdraw={onWithdraw} />
      <StatsTriplet
        played={user.played}
        winRatePercent={winRatePercent}
        earned={user.earned}
      />
      <div className={css.menu}>
        {idCopied && <div className={css.toast}>✓ {t('id_copied')}</div>}
        <MyIdRow id={displayedTgId} copied={idCopied} onCopy={copyTelegramId} />
        <LanguageRow
          value={i18n.language}
          onChange={changeLanguage}
          chevronUrl={chevronUrl}
        />
        <ThemeRow
          theme={theme}
          themePref={themePref}
          onSetThemePref={onSetThemePref}
          onToggleTheme={onToggleTheme}
          chevronUrl={chevronUrl}
        />
        {menuItems.map((item) => (
          <div key={item.label}>
            <MenuItemRow
              icon={item.icon}
              bg={item.bg}
              label={item.label}
              expanded={item.label === historyLabel && historyOpen}
              onClick={item.onClick}
            />
            {item.label === historyLabel && historyOpen && (
              <HistoryPanel
                transactions={transactions}
                filter={transactionFilter}
                onFilterChange={setTransactionFilter}
                loading={transactionsStatus === 'loading' && transactions.length === 0}
              />
            )}
          </div>
        ))}
        <WithdrawWalletCard
          walletAddress={user.walletAddress ?? ''}
          onEdit={() => setWalletSheetOpen(true)}
        />
        {walletSheetOpen && (
          <WalletSheet
            initialAddress={user.walletAddress ?? ''}
            onSave={saveWalletAddress}
            onDelete={clearWalletAddress}
            onClose={() => setWalletSheetOpen(false)}
          />
        )}
        {partnerOpen && (
          <PartnerSheet
            referralLink={referralLink}
            referralData={referralData}
            onClose={() => setPartnerOpen(false)}
          />
        )}
        {agreementOpen && <AgreementSheet onClose={() => setAgreementOpen(false)} />}
        {rulesOpen && <GameRulesSheet onClose={() => setRulesOpen(false)} />}
      </div>
    </div>
  );
}
