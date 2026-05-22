import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { joinRoom } from '../api/rooms';
import { ErrorMsg } from '../components/ui/ErrorMsg';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Sheet } from '../components/ui/Sheet';
import { TextInput } from '../components/ui/TextInput';
import type { Room } from '../types/domain';
import styles from './JoinByCodeModal.module.css';

export interface JoinByCodeModalProps {
  onClose: () => void;
  onBack: () => void;
  onJoin?: (room: Room) => void;
}

/**
 * "Войти по коду" sheet. On the server the room id IS the code — for
 * private rooms it's literally the 6-digit password, for public rooms
 * it's the auto-generated 4-digit id — so a successful `joinRoom(code)`
 * is the only thing we need to do here. The server will surface a 4xx
 * if the room doesn't exist or the user is banned.
 */
export function JoinByCodeModal({ onClose, onBack, onJoin }: JoinByCodeModalProps) {
  const { t } = useTranslation();
  const [roomCode, setRoomCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoin = async () => {
    const code = roomCode.trim();
    if (!code || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const room = await joinRoom(code);
      onJoin?.(room);
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('join_room_failed');
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
        <div className={styles.title}>{t('join_by_code_title')}</div>
      </div>
      <div className={styles.hint}>{t('join_by_code_hint')}</div>
      <TextInput
        value={roomCode}
        onChange={(event) => {
          setRoomCode(event.target.value.toUpperCase());
          if (errorMsg) setErrorMsg('');
        }}
        placeholder="ABC123"
        style={{
          marginBottom: 14,
          textAlign: 'center',
          letterSpacing: 4,
          fontWeight: 700,
        }}
      />
      <ErrorMsg msg={errorMsg} />
      <PrimaryButton
        onClick={() => {
          void handleJoin();
        }}
        disabled={!roomCode.trim() || isSubmitting}
      >
        {isSubmitting ? t('join_room_submitting') : t('join_room_button')}
      </PrimaryButton>
    </Sheet>
  );
}
