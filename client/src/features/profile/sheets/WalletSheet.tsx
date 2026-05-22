import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { Sheet } from '../../../components/ui/Sheet';
import { TextInput } from '../../../components/ui/TextInput';
import { COLORS } from '../../../designSystem';
import { hapticSuccess } from '../../../services/haptics';
import styles from './WalletSheet.module.css';

const NETWORKS = ['USDT TRC20', 'TON'] as const;
type NetworkName = (typeof NETWORKS)[number];

interface WalletSavedConfirmationProps {
  network: NetworkName;
  address: string;
  successTitle: string;
}

function WalletSavedConfirmation({
  network,
  address,
  successTitle,
}: WalletSavedConfirmationProps) {
  return (
    <div className={styles.successWrap}>
      <div className={styles.successCircle}>
        <svg
          width="46"
          height="46"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="4 12 10 18 20 7" className={styles.successCheck} />
        </svg>
      </div>
      <div className={styles.successTitle}>{successTitle}</div>
      <div className={styles.successSub}>
        {network} · {address.slice(0, 6)}…{address.slice(-4)}
      </div>
    </div>
  );
}

/**
 * "Кошелек для вывода" sheet.
 *
 * Owns its own input/network state. On save, calls `onSave` which is
 * expected to persist the address against the backend; the success
 * animation only plays after the promise resolves. The parent passes
 * a delete callback for the "remove wallet" affordance — the current
 * backend has no DELETE route, so deletion just clears the cached
 * value locally.
 */
export interface WalletSheetProps {
  initialAddress?: string;
  onClose: () => void;
  onSave: (address: string) => Promise<void>;
  onDelete?: () => void;
}

function WalletSheetImpl({
  initialAddress,
  onClose,
  onSave,
  onDelete,
}: WalletSheetProps) {
  const { t } = useTranslation();
  const [address, setAddress] = useState<string>(initialAddress ?? '');
  const [network, setNetwork] = useState<NetworkName>('USDT TRC20');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!savedSuccess) return undefined;
    const timer = setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1800);
    return () => clearTimeout(timer);
  }, [savedSuccess, onClose]);

  const handleSave = async () => {
    if (!address.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(address.trim());
      hapticSuccess();
      setSavedSuccess(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('invalid_address');
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (onDelete) onDelete();
    onClose();
  };

  return (
    <Sheet
      onClose={() => {
        if (!savedSuccess && !saving) onClose();
      }}
    >
      {savedSuccess ? (
        <WalletSavedConfirmation
          network={network}
          address={address}
          successTitle={t('address_saved')}
        />
      ) : (
        <>
          <div className={styles.title}>{t('wallet_address_for_withdraw')}</div>
          <div className={styles.sub}>{t('enter_usdt_or_ton')}</div>
          <div className={styles.networkRow}>
            {NETWORKS.map((item) => {
              const active = network === item;
              return (
                <button
                  key={item}
                  onClick={() => setNetwork(item)}
                  className={styles.networkBtn}
                  style={{
                    border: '1.5px solid ' + (active ? COLORS.accent : COLORS.div),
                    background: active ? COLORS.accent : COLORS.input,
                    color: active ? '#fff' : COLORS.text,
                    fontWeight: active ? 700 : 600,
                    opacity: active ? 1 : 0.85,
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <TextInput
            value={address}
            onChange={(item) => setAddress(item.target.value)}
            placeholder={network === 'TON' ? 'UQ...' : 'TRX...'}
            style={{ marginBottom: 8, fontFamily: 'monospace', fontSize: 13 }}
          />
          <div className={styles.warn}>{t('warn_address_irreversible')}</div>
          {error && (
            <div className={styles.warn} style={{ color: COLORS.red }}>
              {error}
            </div>
          )}
          <PrimaryButton onClick={handleSave} disabled={!address.trim() || saving}>
            {saving ? t('loading') : t('save')}
          </PrimaryButton>
          {initialAddress && (
            <button onClick={handleDelete} className={styles.removeBtn}>
              {t('delete_wallet')}
            </button>
          )}
        </>
      )}
    </Sheet>
  );
}

export const WalletSheet = memo(WalletSheetImpl);
