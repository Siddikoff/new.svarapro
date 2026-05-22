import type { CSSProperties } from 'react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { MethodIcon } from '../../../components/icons/MethodIcon';
import { COLORS } from '../../../designSystem';
import type { Transaction } from '../../../types/domain';
import css from '../Profile.module.css';

export type TransactionFilter = 'all' | 'deposit' | 'withdraw';

function ArrowIcon({ isDeposit }: { isDeposit: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={isDeposit ? COLORS.green : COLORS.red}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {isDeposit ? (
        <>
          <path d="M12 5 L12 19" />
          <polyline points="6 13 12 19 18 13" />
        </>
      ) : (
        <>
          <path d="M12 19 L12 5" />
          <polyline points="18 11 12 5 6 11" />
        </>
      )}
    </svg>
  );
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const { t } = useTranslation();
  const isDeposit = tx.type === 'deposit';
  const isPending = tx.status === 'pending';
  return (
    <div className={css.txRow}>
      <div
        className={css.txIcon}
        style={{
          background: isDeposit ? 'rgba(38,161,123,0.14)' : 'rgba(224,92,92,0.14)',
        } as CSSProperties}
      >
        <ArrowIcon isDeposit={isDeposit} />
      </div>
      <div className={css.txBody}>
        <div className={css.txAmountRow}>
          <span className={css.txAmount}>
            {isDeposit ? '+' : '−'}${tx.amount.toFixed(2)}
          </span>
          <span
            className={css.txBadge}
            style={{
              background: isPending ? 'rgba(245,166,35,0.15)' : 'rgba(38,161,123,0.15)',
              color: isPending ? COLORS.gold : COLORS.green,
            } as CSSProperties}
          >
            {isPending ? t('status_pending') : t('status_done')}
          </span>
        </div>
        <div className={css.txMeta}>
          {isDeposit ? t('transaction_deposit') : t('transaction_withdraw')} · {tx.method} · {tx.date}
        </div>
      </div>
      <div style={{ flexShrink: 0 } as CSSProperties}>
        <MethodIcon method={tx.method} s={26} />
      </div>
    </div>
  );
}

/**
 * Panel that opens below the "История депозитов" menu row.
 * Owns the type filter ("all" / "deposit" / "withdraw") and renders the
 * filtered transactions in a stacked list.
 */
interface HistoryPanelProps {
  transactions: Transaction[];
  filter: TransactionFilter;
  onFilterChange: (next: TransactionFilter) => void;
  loading?: boolean;
}

function HistoryPanelImpl({
  transactions,
  filter,
  onFilterChange,
  loading = false,
}: HistoryPanelProps) {
  const { t } = useTranslation();
  const filters: Array<[TransactionFilter, string]> = useMemo(
    () => [
      ['all', t('filter_all')],
      ['deposit', t('filter_deposits')],
      ['withdraw', t('filter_withdrawals')],
    ],
    [t],
  );
  const list =
    filter === 'all'
      ? transactions
      : transactions.filter((item: Transaction) => item.type === filter);
  return (
    <div className={css.historyPanel}>
      <div className={css.historyTabs}>
        {filters.map(([key, label]) => (
          <button
            key={key}
            onClick={(event) => {
              event.stopPropagation();
              onFilterChange(key);
            }}
            className={
              filter === key ? `${css.historyTab} ${css.historyTabActive}` : css.historyTab
            }
          >
            {label}
          </button>
        ))}
      </div>
      <div className={css.historyList}>
        {loading && list.length === 0 ? (
          <div className={css.txMeta} style={{ padding: 16, textAlign: 'center' }}>
            {t('loading')}
          </div>
        ) : list.length === 0 ? (
          <div className={css.txMeta} style={{ padding: 16, textAlign: 'center' }}>
            {t('no_transactions')}
          </div>
        ) : (
          list.map((tx: Transaction) => <TransactionRow key={tx.id} tx={tx} />)
        )}
      </div>
    </div>
  );
}

export const HistoryPanel = memo(HistoryPanelImpl);
