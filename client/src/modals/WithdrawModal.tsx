import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { initiateWithdraw } from '../api/payments';
import { MethodBadge } from '../components/icons/MethodBadge';
import { ErrorMsg } from '../components/ui/ErrorMsg';
import { InfoRows } from '../components/ui/InfoRows';
import { MethodList } from '../components/ui/MethodList';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { QuickAmount } from '../components/ui/QuickAmount';
import { Sheet } from '../components/ui/Sheet';
import { TextInput } from '../components/ui/TextInput';
import { WITHDRAW_METHODS } from '../data/mocks';
import { COLORS } from '../designSystem';
import { hapticSuccess, hapticTap } from '../services/haptics';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import styles from './WithdrawModal.module.css';

export interface WithdrawModalProps {
  onClose: () => void;
  balance: number;
  onWithdrawn: (amount: number) => void;
}

export function WithdrawModal({ onClose, balance, onWithdrawn }: WithdrawModalProps) {
  const { t } = useTranslation();
  const savedWalletAddress = useAuthStore((state) => state.user.walletAddress);
  const saveWalletAddress = useProfileStore((state) => state.saveWalletAddress);

  const [step, setStep] = useState(1);
  const [methodId, setMethodId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentMethod = WITHDRAW_METHODS.find((value) => value.id === methodId);

  // Pre-fill the address field with the user's saved wallet (if any)
  // whenever they switch to a non-card method. Card numbers are
  // entered fresh every time.
  useEffect(() => {
    if (!currentMethod) return;
    if (currentMethod.id === 'card') return;
    if (savedWalletAddress && !addressInput) {
      setAddressInput(savedWalletAddress);
    }
  }, [currentMethod, savedWalletAddress, addressInput]);

  function validate() {
    setErrorMsg('');
    const value = parseFloat(amountInput);
    if (!amountInput || Number.isNaN(value) || value <= 0) {
      setErrorMsg(t('withdraw_invalid_amount'));
      return;
    }
    if (!currentMethod) {
      setErrorMsg(t('withdraw_select_method'));
      return;
    }
    if (value < currentMethod.min) {
      setErrorMsg(t('withdraw_min_amount', { min: currentMethod.min }));
      return;
    }
    if (value > balance) {
      setErrorMsg(t('withdraw_insufficient_funds'));
      return;
    }
    if (!addressInput.trim()) {
      setErrorMsg(t('withdraw_enter_address'));
      return;
    }
    if (currentMethod.id === 'card' && addressInput.replace(/\s/g, '').length < 16) {
      setErrorMsg(t('withdraw_card_incomplete'));
      return;
    }
    hapticTap();
    setStep(3);
  }
  async function submitWithdrawal() {
    if (!currentMethod || isSubmitting) return;
    const value = parseFloat(amountInput);
    if (!Number.isFinite(value) || value <= 0) {
      setErrorMsg(t('withdraw_invalid_amount'));
      setStep(2);
      return;
    }

    if (currentMethod.id === 'card') {
      // Card payouts have no server flow yet — fall back to the
      // pre-existing optimistic success behaviour so the UI doesn't
      // regress until the acquirer integration lands.
      hapticSuccess();
      setSubmitted(true);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await initiateWithdraw({
        methodId: currentMethod.id,
        amount: value,
        address: addressInput.trim(),
      });
      // Persist the wallet address server-side so subsequent
      // withdrawals can pre-fill it. Failures here shouldn't block
      // the success UI — the withdrawal itself already went through.
      if (addressInput.trim() && addressInput.trim() !== savedWalletAddress) {
        try {
          await saveWalletAddress(addressInput.trim());
        } catch {
          /* ignore — non-critical persistence */
        }
      }
      hapticSuccess();
      setSubmitted(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('withdraw_failed');
      setErrorMsg(message);
      setStep(2);
    } finally {
      setIsSubmitting(false);
    }
  }
  function closeAfterSubmit() {
    onWithdrawn(parseFloat(amountInput));
    onClose();
  }

  if (submitted) {
    return (
      <div onClick={closeAfterSubmit} className={styles.successOverlay}>
        <div onClick={(event) => event.stopPropagation()} className={styles.successCard}>
          <div className={styles.successBadge}>
            <svg
              width={36}
              height={36}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth={3.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={styles.successCheck}
            >
              <polyline points="4 13 9 18 20 6" />
            </svg>
          </div>
          <div className={styles.successKicker}>{'ЗАЯВКА СОЗДАНА'}</div>
          <div className={styles.successAmount}>
            {'−'}
            {parseFloat(amountInput || '0').toFixed(2)}
            {' USDT'}
          </div>
          <div className={styles.successHint}>{'Заявка на вывод успешно создана'}</div>
          <button onClick={closeAfterSubmit} className={styles.successBtn}>
            {'Понятно'}
          </button>
        </div>
      </div>
    );
  }
  return (
    <Sheet onClose={onClose} scrollKey={step}>
      {step === 1 && (
        <div>
          <div className={styles.title}>{'Вывести USDT'}</div>
          <div className={styles.subtitle}>{'Выберите способ вывода'}</div>
          <MethodList methods={WITHDRAW_METHODS} sel={methodId} onSel={setMethodId} />
          <PrimaryButton
            onClick={() => methodId && setStep(2)}
            disabled={!methodId}
            color={COLORS.red}
          >
            {'Далее'}
          </PrimaryButton>
        </div>
      )}
      {step === 2 && currentMethod && (
        <div>
          <div className={styles.headerRow}>
            <button
              onClick={() => {
                setStep(1);
                setErrorMsg('');
              }}
              className={styles.backBtn}
            >
              {'Назад'}
            </button>
            <div className={styles.methodRow}>
              <MethodBadge id={currentMethod.id} s={22} />
              {currentMethod.label}
            </div>
          </div>
          <div className={styles.fieldLabel}>{'Сумма (USDT)'}</div>
          <QuickAmount
            value={amountInput}
            onChange={(value) => {
              setAmountInput(value);
              setErrorMsg('');
            }}
          />
          <TextInput
            value={amountInput}
            onChange={(value) => {
              setAmountInput(value.target.value);
              setErrorMsg('');
            }}
            placeholder={'Мин. ' + currentMethod.min + ' USDT'}
            type="tel"
            inputMode="decimal"
            className={styles.fieldGap}
          />
          <div className={styles.fieldLabel}>
            {currentMethod.id === 'card' ? 'Номер карты' : 'Адрес кошелька'}
          </div>
          <TextInput
            value={addressInput}
            onChange={(value) => {
              if (currentMethod.id === 'card') {
                const me = value.target.value.replace(/\D/g, '').slice(0, 16);
                setAddressInput(me.replace(/(.{4})/g, '$1 ').trim());
              } else setAddressInput(value.target.value);
              setErrorMsg('');
            }}
            placeholder={
              currentMethod.id === 'card'
                ? '0000 0000 0000 0000'
                : currentMethod.id === 'ton'
                  ? 'UQ...'
                  : 'TRX...'
            }
            type={currentMethod.id === 'card' ? 'tel' : 'text'}
            inputMode={currentMethod.id === 'card' ? 'numeric' : 'text'}
            autoComplete={currentMethod.id === 'card' ? 'cc-number' : 'off'}
            maxLength={currentMethod.id === 'card' ? 19 : undefined}
            className={styles.fieldGap}
          />
          <InfoRows
            rows={[
              ['Сумма', amountInput ? amountInput + ' USDT' : '—', undefined],
              ['Комиссия', currentMethod.fee, COLORS.red],
              ['Доступно', balance.toFixed(2) + ' USDT', COLORS.green],
            ]}
          />
          <ErrorMsg msg={errorMsg} />
          <PrimaryButton onClick={validate} color={COLORS.red}>
            {'Вывести USDT'}
          </PrimaryButton>
        </div>
      )}
      {step === 3 && currentMethod && (
        <div>
          <div className={`${styles.headerRow} ${styles.tight}`}>
            <button
              onClick={() => {
                setStep(2);
                setErrorMsg('');
              }}
              className={styles.backBtn}
            >
              {'Назад'}
            </button>
            <div className={styles.confirmTitle}>{'Подтверждение вывода'}</div>
          </div>
          <div className={styles.methodLine}>
            <MethodBadge id={currentMethod.id} s={18} />
            {currentMethod.label}
          </div>
          <div className={styles.summaryBox}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{'Сумма к выводу'}</span>
              <span className={styles.summaryValueBig}>
                {parseFloat(amountInput).toFixed(2) + ' USDT'}
              </span>
            </div>
            <div className={`${styles.summaryRow} ${styles.start}`}>
              <span className={`${styles.summaryLabel} ${styles.fixed}`}>
                {currentMethod.id === 'card' ? 'Номер карты' : 'Адрес'}
              </span>
              <span className={styles.summaryAddress}>{addressInput}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>
                {currentMethod.id === 'card' ? 'Платёжная система' : 'Сеть'}
              </span>
              <span className={styles.summaryValue}>{currentMethod.label}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{'Комиссия'}</span>
              <span className={styles.summaryFee}>{currentMethod.fee}</span>
            </div>
            <div className={`${styles.summaryRow} ${styles.last}`}>
              <span className={styles.summaryLabel}>{'К получению'}</span>
              <span className={styles.summaryReceive}>
                {parseFloat(amountInput).toFixed(2) + ' USDT'}
              </span>
            </div>
          </div>
          <div className={styles.noticeBox}>
            {'Проверьте данные. После подтверждения вывод отменить нельзя.'}
          </div>
          <ErrorMsg msg={errorMsg} />
          <PrimaryButton
            onClick={() => {
              void submitWithdrawal();
            }}
            color={COLORS.red}
            disabled={isSubmitting}
            className={styles.confirmBtn}
          >
            {isSubmitting ? t('withdraw_submitting') : t('withdraw_confirm_button')}
          </PrimaryButton>
          <button
            onClick={() => {
              setStep(2);
              setErrorMsg('');
            }}
            className={styles.cancelBtn}
          >
            {'Отменить'}
          </button>
        </div>
      )}
    </Sheet>
  );
}
