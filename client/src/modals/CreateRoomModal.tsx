import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { createRoom } from '../api/rooms';
import { ErrorMsg } from '../components/ui/ErrorMsg';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Sheet } from '../components/ui/Sheet';
import { TextInput } from '../components/ui/TextInput';
import { COLORS } from '../designSystem';
import type { Room } from '../types/domain';
import styles from './CreateRoomModal.module.css';

export type CreateRoomPayload = Room;

export interface CreateRoomModalProps {
  onClose: () => void;
  onBack: () => void;
  onCreate?: (room: CreateRoomPayload) => void;
}

/**
 * Server rule for private rooms: the password is also the room id, so
 * it has to be exactly six digits (see `CreateRoomDto`). We mirror that
 * here client-side so the user gets immediate feedback instead of a
 * 400 from the API.
 */
const PRIVATE_PASSWORD_PATTERN = /^\d{6}$/;

export function CreateRoomModal({ onClose, onBack, onCreate }: CreateRoomModalProps) {
  const { t } = useTranslation();
  const [bet, setBet] = useState('1');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (isSubmitting) return;
    const betValue = Number(bet) || 1;
    if (betValue < 1) {
      setErrorMsg(t('create_min_bet_error'));
      return;
    }
    if (isPrivate && !PRIVATE_PASSWORD_PATTERN.test(password.trim())) {
      setErrorMsg(t('create_password_6_digits_error'));
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const room = await createRoom({
        minBet: betValue,
        type: isPrivate ? 'private' : 'public',
        password: isPrivate ? password.trim() : undefined,
      });
      // The backend always allocates 6 seats, so we surface the server's
      // cap verbatim instead of letting the user pick a phantom value.
      onCreate?.(room);
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('create_room_failed');
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Sheet onClose={onClose}>
      <div className={styles.header}>
        <button onClick={onBack} className={styles.backBtn}>
          {t('back')}
        </button>
        <div className={styles.title}>{t('create_room')}</div>
      </div>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>{t('create_bet_label')}</div>
        <div className={styles.chipRow}>
          {['0.5', '1', '5', '10'].map((value) => (
            <button
              key={value}
              onClick={() => setBet(value)}
              className={`${styles.chip} ${bet === value ? styles.chipActive : ''}`}
            >
              {value}
              {'$'}
            </button>
          ))}
        </div>
        <TextInput
          value={bet}
          onChange={(value) => setBet(value.target.value)}
          placeholder={t('create_bet_placeholder')}
          type="number"
        />
      </div>

      <div
        className={`${styles.privateRow} ${
          isPrivate ? styles.privateRowExpanded : styles.privateRowCollapsed
        } ${isPrivate ? styles.privateRowOn : ''}`}
        onClick={() => setIsPrivate((value) => !value)}
      >
        <div
          className={`${styles.privateIconBox} ${isPrivate ? styles.privateIconBoxOn : ''}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isPrivate ? COLORS.accent : COLORS.hint}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div className={styles.privateLabelWrap}>
          <div className={styles.privateLabel}>{t('private_room_label')}</div>
          <div className={styles.privateHint}>{t('private_room_hint')}</div>
        </div>
        <div className={`${styles.toggle} ${isPrivate ? styles.toggleOn : ''}`}>
          <div className={styles.toggleKnob} />
        </div>
      </div>
      {isPrivate && (
        <div className={styles.passwordWrap}>
          <TextInput
            value={password}
            onChange={(value) =>
              setPassword(value.target.value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder={t('private_room_password_placeholder')}
            type="number"
            className={password ? styles.passwordInputSpaced : undefined}
          />
        </div>
      )}
      <ErrorMsg msg={errorMsg} />
      <PrimaryButton
        onClick={() => {
          void handleCreate();
        }}
        disabled={
          isSubmitting || (isPrivate && !PRIVATE_PASSWORD_PATTERN.test(password.trim()))
        }
      >
        {isSubmitting ? t('create_room_submitting') : t('create_room')}
      </PrimaryButton>
    </Sheet>
  );
}
