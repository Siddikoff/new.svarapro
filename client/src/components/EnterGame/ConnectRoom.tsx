import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import lockIcon from '@/assets/lock.png';
import incompleteIcon from '@/assets/completeSmallGrey.png';
import completeIcon from '@/assets/completeSmallGreen.png';
import { apiService } from '@/services/api/api';
import { ConnectRoomProps } from '@/types/components';
import { LoadingPage } from '@/components/LoadingPage';

export const ConnectRoom: React.FC<ConnectRoomProps> = ({ onClose, openModal, setCurrentPage }) => {
  const { t } = useTranslation('common');
  const [inputValue, setInputValue] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setInputValue(value);
      setIsValid(value.length >= 6);
    }
  };

  const handleJoin = async () => {
    if (!isValid) return;
    setIsJoining(true);
    setIsLoading(true);
    setError(null);
    try {
      if (!window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        throw new Error('Telegram user ID not found');
      }
      await apiService.joinRoom(inputValue);
      onClose();
      setCurrentPage('gameRoom', { roomId: inputValue });
    } catch (error: unknown) {
      setError((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to join room');
      setIsLoading(false);
    } finally {
      setIsJoining(false);
    }
  };

  const handleCancel = () => {
    onClose();
    openModal();
  };

  if (isLoading) {
    return <LoadingPage isLoading={true} />;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#47444C] w-[316px] h-[172px] rounded-lg flex flex-col items-center py-4 px-4 relative ">
        <h2 className="text-white font-semibold text-lg mb-4">{t('join_room')}</h2>
        {error && (
          <p className="text-red-500 text-sm mb-2">{error}</p>
        )}
        <div className="relative w-full mb-4">
          <img src={lockIcon} alt="lock" className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6" />
          <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={t('password_for_entry')}
            className="bg-[#13121780] text-white text-center text-base font-normal w-full h-12 rounded-lg pl-10 pr-10"
          />
          <img src={isValid ? completeIcon : incompleteIcon} alt="complete" className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6" />
        </div>
        <div className="absolute bottom-0 left-0 w-full flex">
          <button 
            className="w-[164px] h-[49px] text-[#5F8BE7] border-t border-r border-white border-opacity-10 disabled:opacity-50"
            onClick={handleJoin}
            disabled={!isValid || isJoining}
          >
            {t('enter')}
          </button>
          <button 
            className="w-[164px] h-[49px] text-[#5F8BE7] border-t border-white border-opacity-10"
            onClick={handleCancel}
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
