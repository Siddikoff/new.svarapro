import type { ReactNode } from 'react';
import { memo } from 'react';

import styles from './Actions.module.css';
import { Chip } from './Dice';

// Button surfaces: vertical gradient + inset top highlight + bottom dark line
// give the bar a tactile, raised look instead of flat coloured blocks.
const BTN_FILL = {
  blue: 'linear-gradient(180deg, #3293db 0%, #1c6cae 100%)',
  red: 'linear-gradient(180deg, #ec5959 0%, #c52d2d 100%)',
  green: 'linear-gradient(180deg, #6cd87a 0%, #3eb24f 100%)',
};
const BTN_SHADOW = {
  blue:
    'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.20), 0 2px 8px rgba(36,129,204,0.40)',
  red:
    'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.20), 0 2px 8px rgba(226,59,59,0.40)',
  green:
    'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.20), 0 2px 8px rgba(77,205,94,0.40)',
};

function SpectatorBarImpl() {
  return (
    <div className={styles.barSlot}>
      <div className={styles.barInner}>
        <div className={styles.spectatorPill}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7fc4ff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Режим наблюдателя
        </div>
      </div>
    </div>
  );
}
export const SpectatorBar = memo(SpectatorBarImpl);

interface ActionButtonsProps {
  blindAmount: number;
  onOpen: () => void;
  onBlind: () => void;
}

function ActionButtonsImpl({ blindAmount, onOpen, onBlind }: ActionButtonsProps) {
  return (
    <div className={styles.barSlot}>
      <div className={`${styles.barInner} ${styles.gap10}`}>
        <button
          onClick={onOpen}
          className={styles.actionBtn}
          style={{ background: BTN_FILL.blue, boxShadow: BTN_SHADOW.blue }}
        >
          <div className={styles.iconRow}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div className={styles.btnLabel}>Посмотреть</div>
        </button>
        <button
          onClick={onBlind}
          className={styles.actionBtn}
          style={{ background: BTN_FILL.blue, boxShadow: BTN_SHADOW.blue }}
        >
          <div className={`${styles.iconRow} ${styles.big}`}>${blindAmount}</div>
          <div className={styles.btnLabel}>Вслепую</div>
        </button>
      </div>
    </div>
  );
}
export const ActionButtons = memo(ActionButtonsImpl);

// Post-open action set: replaces ActionButtons once the current player has
// revealed their cards. Visual layout (button width, padding, icon-row,
// font sizes) matches ActionButtons one-to-one — only the colors/labels
// differ.
interface PostOpenButtonProps {
  background: string;
  shadow: string;
  children: ReactNode;
  onClick: () => void;
}

function PostOpenButton({ background, shadow, children, onClick }: PostOpenButtonProps) {
  return (
    <button onClick={onClick} className={styles.actionBtn} style={{ background, boxShadow: shadow }}>
      {children}
    </button>
  );
}

interface PostOpenButtonsProps {
  callAmount?: number;
  onPass: () => void;
  onCall: () => void;
  onRaise: () => void;
}

function PostOpenButtonsImpl({
  callAmount = 10,
  onPass,
  onCall,
  onRaise,
}: PostOpenButtonsProps) {
  return (
    <div className={styles.barSlot}>
      <div className={`${styles.barInner} ${styles.gap10}`}>
        <PostOpenButton background={BTN_FILL.red} shadow={BTN_SHADOW.red} onClick={onPass}>
          <div className={styles.iconRow}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </div>
          <div className={styles.btnLabel}>Пас</div>
        </PostOpenButton>
        <PostOpenButton background={BTN_FILL.blue} shadow={BTN_SHADOW.blue} onClick={onCall}>
          <div className={`${styles.iconRow} ${styles.big}`}>${callAmount}</div>
          <div className={styles.btnLabel}>Заплатить</div>
        </PostOpenButton>
        <PostOpenButton background={BTN_FILL.green} shadow={BTN_SHADOW.green} onClick={onRaise}>
          <div className={styles.iconRow}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 17 10 10 14 14 21 7" />
              <polyline points="14 7 21 7 21 14" />
            </svg>
          </div>
          <div className={styles.btnLabel}>Повысить</div>
        </PostOpenButton>
      </div>
    </div>
  );
}
export const PostOpenButtons = memo(PostOpenButtonsImpl);

function ActiveBetChipImpl({ amount }: { amount: number }) {
  return (
    <div className={styles.activeBetChip}>
      <div className={styles.activeBetAmount}>${amount}</div>
      <Chip size={18} color="#d8313f" />
    </div>
  );
}
export const ActiveBetChip = memo(ActiveBetChipImpl);
