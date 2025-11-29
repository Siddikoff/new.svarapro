import './AddWalletWindow.css';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { AddWalletWindowProps } from '@/types/components';

export function AddWalletWindow({ onClose, onAdd }: AddWalletWindowProps) {
  const { t } = useTranslation('common');
  const [isCancelPressed, setIsCancelPressed] = useState(false);

  const cancelBackground = isCancelPressed ? '#bebebe' : 'transparent';

  return (
    <div className="add-wallet-window">
      <div className="add-wallet-content">
        <p className="add-wallet-text">
          {t('add_wallet_window_text')}
        </p>
      </div>
      <div className="add-wallet-buttons">
        <button className="add-wallet-button add-wallet-add-button" onClick={onAdd}>
          {t('add')}
        </button>
        <button 
          className="add-wallet-button add-wallet-cancel-button"
          onClick={onClose}
          style={{ background: cancelBackground, transition: 'background 0.2s' }}
          onMouseDown={() => setIsCancelPressed(true)}
          onMouseUp={() => setIsCancelPressed(false)}
          onTouchStart={() => setIsCancelPressed(true)}
          onTouchEnd={() => setIsCancelPressed(false)}
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}
