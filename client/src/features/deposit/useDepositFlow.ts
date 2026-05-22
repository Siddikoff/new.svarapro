import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { initiateDeposit, type PaymentInstructions } from '../../api/payments';
import { DEPOSIT_METHODS } from '../../data/mocks';
import { hapticSuccess, hapticTap } from '../../services/haptics';
import { playSound } from '../../services/sound';
import type { DepositMethod } from '../../types/domain';

export type { DepositMethod };

export interface UseDepositFlowOptions {
  onDeposited?: (amount: number) => void;
}

export interface UseDepositFlowResult {
  step: number;
  methodId: string | null;
  setMethodId: (next: string | null) => void;
  amountInput: string;
  setAmountInput: (next: string) => void;
  errorMsg: string;
  setErrorMsg: (next: string) => void;
  secondsLeft: number;
  success: boolean;
  currentMethod: DepositMethod | null;
  isCard: boolean;
  instructions: PaymentInstructions | null;
  goToAmount: () => void;
  validateAndAdvance: () => void;
  confirmAndAdvance: () => void;
  goBackToMethod: () => void;
}

/**
 * Step machine for the deposit flow.
 *
 * Step 3 (`ProcessingScreen`) used to be a fixed-delay placeholder.
 * Stage 5 wires it to the real svarapro backend — when the user
 * advances from amount → processing, we call `initiateDeposit` to get
 * the on-chain address + tracker id, then move to step 4 only once the
 * server responds. Card payments still take the pre-existing mock path
 * (step 6) since the backend doesn't expose a card-acquirer flow yet.
 */
export function useDepositFlow({ onDeposited }: UseDepositFlowOptions): UseDepositFlowResult {
  const { t } = useTranslation();
  const [step, setStep] = useState<number>(1);
  const [methodId, setMethodId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState<number>(3600);
  const [success, setSuccess] = useState<boolean>(false);
  const [instructions, setInstructions] = useState<PaymentInstructions | null>(null);
  // Guard against double-fire if React StrictMode replays the effect or
  // the user hammers the button — keeps a single `initiateDeposit`
  // request in-flight per step-3 entry.
  const requestKeyRef = useRef<string | null>(null);

  const methods = DEPOSIT_METHODS as unknown as DepositMethod[];
  const currentMethod = methods.find((m) => m.id === methodId) ?? null;
  const isCard = methodId === 'card';

  useEffect(() => {
    if (step !== 3 || !methodId) return undefined;
    let cancelled = false;

    if (isCard) {
      // Card flow still uses the mocked confirmation pause until the
      // backend exposes a card-acquirer endpoint.
      const delay = 1800;
      const timer = setTimeout(() => {
        if (!cancelled) setStep(6);
      }, delay);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    // Crypto path → hit the server.
    const key = `${methodId}:${amountInput}:${Date.now()}`;
    requestKeyRef.current = key;
    setInstructions(null);
    setErrorMsg('');

    (async () => {
      try {
        const result = await initiateDeposit({ methodId });
        if (cancelled || requestKeyRef.current !== key) return;
        setInstructions(result);
        setStep(4);
      } catch (error) {
        if (cancelled || requestKeyRef.current !== key) return;
        const message =
          error instanceof Error ? error.message : t('deposit_failed');
        setErrorMsg(message);
        // Roll back to the amount step so the user can retry without
        // losing their input.
        setStep(2);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, methodId, isCard, amountInput, t]);

  useEffect(() => {
    if (step !== 5) {
      setSuccess(false);
      return undefined;
    }
    const timer = setTimeout(() => {
      setSuccess(true);
      hapticSuccess();
      playSound('success');
    }, 6500);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    const isCryptoStep = step === 4 && methodId && !isCard;
    const isCardStep = step === 6 && isCard;
    if (!isCryptoStep && !isCardStep) return undefined;
    setSecondsLeft(isCardStep ? 900 : 3600);
    const interval = setInterval(
      () => setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0)),
      1000,
    );
    return () => clearInterval(interval);
  }, [step, methodId, isCard]);

  const validateAndAdvance = (): void => {
    setErrorMsg('');
    const parsedAmount = parseFloat(amountInput);
    if (!amountInput || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Введите корректную сумму');
      return;
    }
    hapticTap();
    setStep(3);
  };

  const confirmAndAdvance = (): void => {
    onDeposited?.(parseFloat(amountInput));
    setStep(5);
  };

  const goBackToMethod = (): void => {
    setStep(1);
    setErrorMsg('');
    setInstructions(null);
  };

  // Method → amount transition. Exposed as a named action instead of
  // leaking `setStep` so callers can't jump to arbitrary steps and the
  // flow stays the single owner of step transitions.
  const goToAmount = (): void => {
    setStep(2);
  };

  return {
    step,
    methodId,
    setMethodId,
    amountInput,
    setAmountInput,
    errorMsg,
    setErrorMsg,
    secondsLeft,
    success,
    currentMethod,
    isCard,
    instructions,
    goToAmount,
    validateAndAdvance,
    confirmAndAdvance,
    goBackToMethod,
  };
}
