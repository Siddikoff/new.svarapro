import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ReferralData, ServerReferralEntry } from '../../../api/user';
import { Sheet } from '../../../components/ui/Sheet';
import { hapticTap } from '../../../services/haptics';
import { shareToTelegram } from '../../../services/telegram';
import { SheetCloseButton } from '../components/SheetCloseButton';
import type { AffiliateLevelRow } from '../profileData';
import { AFFILIATE_LEVELS } from '../profileData';
import styles from './PartnerSheet.module.css';

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.statBlock}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
}

function LevelTable() {
  const { t } = useTranslation();
  return (
    <div className={styles.levelBox}>
      <div className={styles.levelHead}>
        <div>{t('levels')}</div>
        <div>{t('refrules_table_deposits')}</div>
        <div className={styles.levelHeadRight}>%</div>
      </div>
      {AFFILIATE_LEVELS.map((row: AffiliateLevelRow, i: number) => (
        <div
          key={row[0]}
          className={`${styles.levelRow} ${i === 0 ? styles.first : ''}`}
        >
          <div>{row[0]}</div>
          <div className={styles.levelHint}>{row[1]}</div>
          <div className={styles.levelPercent}>{row[2]}</div>
        </div>
      ))}
    </div>
  );
}

function ReferralList({
  referrals,
  emptyLabel,
  headLabel,
  profitLabel,
}: {
  referrals: ServerReferralEntry[];
  emptyLabel: string;
  headLabel: string;
  profitLabel: string;
}) {
  return (
    <div className={styles.refList}>
      <div className={styles.refHead}>
        <div>{headLabel}</div>
        <div>{profitLabel}</div>
      </div>
      {referrals.length === 0 ? (
        <div className={styles.refEmpty}>{emptyLabel}</div>
      ) : (
        referrals.map((r, i) => (
          <div
            key={(r.username ?? 'guest') + i}
            className={`${styles.refRow} ${i === 0 ? styles.first : ''}`}
          >
            <div>{r.username ?? '—'}</div>
            <div className={styles.refProfit}>—</div>
          </div>
        ))
      )}
    </div>
  );
}

/**
 * "Партнерская программа" sheet. Renders the level/% table, the user's
 * referral link (when available) and the referrals fetched from the
 * server. Local UI state is limited to the "copied" pulse so re-renders
 * stay scoped.
 */
interface PartnerSheetProps {
  referralLink: string | null;
  referralData: ReferralData | null;
  onClose: () => void;
}

function PartnerSheetImpl({ referralLink, referralData, onClose }: PartnerSheetProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const referrals = useMemo(
    () => referralData?.referrals ?? [],
    [referralData],
  );
  const refBonusLabel = referralData
    ? `${referralData.refBonus.toFixed(0)}%`
    : '0%';
  const refBalanceLabel = referralData
    ? `$ ${referralData.refBalance.toFixed(2)}`
    : '$ 0.00';

  const copyLink = () => {
    if (!referralLink) return;
    try {
      navigator.clipboard?.writeText(referralLink);
    } catch {
      // Best-effort; clipboard is unavailable in some embeds.
    }
    hapticTap();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const share = () => {
    if (!referralLink) return;
    hapticTap();
    shareToTelegram({
      url: referralLink,
      text: t('partner_subtitle'),
    });
  };

  return (
    <Sheet onClose={onClose}>
      <div className={`profileSheetClose ${styles.closeWrap}`}>
        <SheetCloseButton onClick={onClose} />
      </div>
      <div className={styles.title}>{t('referral_program')}</div>
      <div className={styles.statsRow}>
        <StatBlock label={t('partner_level')} value={refBonusLabel} />
        <StatBlock label={t('partner_earnings')} value={refBalanceLabel} />
      </div>
      <div className={styles.linkLabel}>{t('your_referral_link')}</div>
      <div
        className={styles.linkBox}
        style={{ color: 'var(--' + (referralLink ? 'text' : 'hint') + ')' }}
      >
        {referralLink ?? t('referral_load_error')}
      </div>
      <div className={styles.actionsRow}>
        <button
          disabled={!referralLink}
          onClick={copyLink}
          className={`${styles.actionBtn} ${copied ? styles.copied : ''}`}
        >
          {copied ? `✓ ${t('copied')}` : t('copy_link')}
        </button>
        <button
          disabled={!referralLink}
          onClick={share}
          className={styles.actionBtn}
        >
          {t('share')}
        </button>
      </div>
      <div className={styles.h1}>{t('earn_together')}</div>
      <div className={styles.descr}>{t('partner_intro')}</div>
      <div className={styles.h2}>{t('levels')}</div>
      <LevelTable />
      <div className={styles.h3}>{t('conditions')}</div>
      <ul className={styles.rules}>
        <li className={styles.rule}>· {t('rule_deposit')}</li>
        <li className={styles.rule}>· {t('rule_percent')}</li>
        <li className={styles.rule}>· {t('rule_more')}</li>
        <li className={styles.rule}>· {t('rule_invite')}</li>
        <li>· {t('rule_threshold')}</li>
      </ul>
      <div className={styles.refsHead}>
        <div className={styles.refsTitle}>{t('your_referrals')}</div>
        <div className={styles.refsBadge}>{referrals.length}</div>
      </div>
      <ReferralList
        referrals={referrals}
        emptyLabel={t('no_referrals')}
        headLabel={t('referrals')}
        profitLabel={t('partner_earnings')}
      />
    </Sheet>
  );
}

export const PartnerSheet = memo(PartnerSheetImpl);
