import { useCallback } from 'react';

import { ProcessingScreen } from '../../components/ui/ProcessingScreen';
import { Sheet } from '../../components/ui/Sheet';
import { DepositSuccessOverlay } from './DepositSuccessOverlay';
import { CardPaymentStep } from './steps/CardPaymentStep';
import { CryptoPaymentStep } from './steps/CryptoPaymentStep';
import { EnterAmountStep } from './steps/EnterAmountStep';
import { SelectMethodStep } from './steps/SelectMethodStep';
import { useDepositFlow } from './useDepositFlow';

/**
 * Top-level deposit flow. Orchestrates the step machine (see
 * `useDepositFlow`) and renders the matching step component.
 *
 * Steps:
 *   1 — SelectMethodStep    (Sheet)
 *   2 — EnterAmountStep     (Sheet)
 *   3 — ProcessingScreen    (Sheet — "ждём подтверждения" pre-flight)
 *   4 — CryptoPaymentStep   (Sheet — non-card methods)
 *   5 — DepositSuccessOverlay (fullscreen overlay above the sheet)
 *   6 — CardPaymentStep     (Sheet — card method only)
 */
interface DepositModalProps {
  onClose: () => void;
  onDeposited?: (amount: number) => void;
}

export function DepositModal({ onClose, onDeposited }: DepositModalProps) {
  const flow = useDepositFlow({ onDeposited });
  const {
    step,
    methodId,
    setMethodId,
    amountInput,
    setAmountInput,
    setErrorMsg,
    errorMsg,
    secondsLeft,
    success,
    currentMethod,
    instructions,
    goToAmount,
    validateAndAdvance,
    confirmAndAdvance,
    goBackToMethod,
  } = flow;

  const handleSelectMethod = useCallback((id: string) => setMethodId(id), [setMethodId]);
  const handleAmountChange = useCallback(
    (value: string) => {
      setAmountInput(value);
      setErrorMsg('');
    },
    [setAmountInput, setErrorMsg],
  );

  if (step === 5) {
    return (
      <DepositSuccessOverlay
        method={currentMethod}
        amount={amountInput}
        success={success}
        onClose={onClose}
      />
    );
  }

  return (
    <Sheet onClose={onClose} scrollKey={step}>
      {step === 1 && (
        <SelectMethodStep
          methodId={methodId}
          onSelectMethod={handleSelectMethod}
          onAdvance={goToAmount}
        />
      )}

      {step === 2 && currentMethod && (
        <EnterAmountStep
          method={currentMethod}
          amountInput={amountInput}
          errorMsg={errorMsg}
          onChangeAmount={handleAmountChange}
          onBack={goBackToMethod}
          onAdvance={validateAndAdvance}
        />
      )}

      {step === 3 && currentMethod && <ProcessingScreen id={currentMethod.id} />}

      {step === 4 && currentMethod && currentMethod.id !== 'card' && instructions && (
        <CryptoPaymentStep
          method={currentMethod}
          amount={amountInput}
          secondsLeft={secondsLeft}
          address={instructions.address}
          trackerId={instructions.trackerId}
          onConfirm={confirmAndAdvance}
          onCancel={onClose}
        />
      )}

      {step === 6 && currentMethod && currentMethod.id === 'card' && (
        <CardPaymentStep
          method={currentMethod}
          amount={amountInput}
          secondsLeft={secondsLeft}
          onConfirm={confirmAndAdvance}
          onCancel={onClose}
        />
      )}
    </Sheet>
  );
}
