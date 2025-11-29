import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import lockIcon from '@/assets/lock.png';
import dollarIcon from '@/assets/dollar.png';
import incompleteIcon from '@/assets/completeSmallGrey.png';
import completeIcon from '@/assets/completeSmallGreen.png';
import { apiService } from '@/services/api/api';
import { CreatePrivateProps } from '@/types/components';

export const CreatePrivate: React.FC<CreatePrivateProps> = ({ onClose, openModal, setCurrentPage, balance, setNotification, setIsCreatingRoom }) => {
  const { t } = useTranslation('common');
  const [password, setPassword] = useState('');
  const [stake, setStake] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [isStakeValid, setIsStakeValid] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setPassword(value);
      setIsPasswordValid(value.length >= 6);
    }
  };

  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setStake(value);
      const numValue = parseFloat(value);
      setIsStakeValid(!isNaN(numValue) && numValue >= 1);
    }
  };

  const hasEnoughBalance = parseFloat(balance) >= parseFloat(stake) * 10;

  const handleCreate = async () => {
    const bet = parseFloat(stake);
    const userBalance = parseFloat(balance);

    if (userBalance < bet * 10) {
      setNotification('insufficientBalance');
      return;
    }

    if (!isPasswordValid || !isStakeValid) return;

    setIsProcessing(true);
    setError(null);
    setIsCreatingRoom(true);
    onClose(); // Close the modal

    const startTime = Date.now();
    try {
      const room = await apiService.createRoom(bet, 'private', password);
      
      const elapsedTime = Date.now() - startTime;
      const remainingTime = 3000 - elapsedTime;

      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }

      setCurrentPage('gameRoom', { roomId: room.roomId, autoSit: true });
    } catch (error: unknown) {
      setError((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create room');
      setIsCreatingRoom(false); // Hide loading on error
    } 
  };

  const handleCancel = () => {
    onClose();
    openModal();
  };

  const isFormValid = isPasswordValid && isStakeValid;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#47444C] w-[316px] h-[215px] rounded-lg flex flex-col items-center py-4 px-4 relative">
        <h2 className="text-white font-semibold text-lg mb-4">{t('create_private_room')}</h2>
        {error && (
          <p className="text-red-500 text-sm mb-2">{error}</p>
        )}
        <div className="relative w-full mb-4">
          <img src={lockIcon} alt="lock" className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6" />
          <input
            type="text"
            inputMode="numeric"
            value={password}
            onChange={handlePasswordChange}
            placeholder={t('come_up_with_a_password')}
            className="bg-[#13121780] text-white text-center text-base font-normal w-full h-[36px] rounded-lg pl-10 pr-10"
          />
          <img src={isPasswordValid ? completeIcon : incompleteIcon} alt="complete" className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6" />
        </div>
        <div className="relative w-full mb-4">
          <img src={dollarIcon} alt="dollar" className="absolute left-3 top-1/2 -translate-y-1/2 w-[11px] h-[17px]" />
          <input
            type="text"
            inputMode="decimal"
            value={stake}
            onChange={handleStakeChange}
            placeholder={t('min_stake')}
            className="bg-[#13121780] text-white text-center text-base font-normal w-full h-[36px] rounded-lg pl-10 pr-10"
          />
          <img src={hasEnoughBalance ? completeIcon : incompleteIcon} alt="complete" className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6" />
        </div>
        <div className="absolute bottom-0 left-0 w-full flex">
          <button 
            className="w-[164px] h-[49px] text-[#5F8BE7] border-t border-r border-white border-opacity-10 disabled:opacity-50"
            onClick={handleCreate}
            disabled={!isFormValid || isProcessing}
          >
            {t('create')}
          </button>
          <button 
            className="w-[164px] h-[49px] text-[#5F8BE7] border-t border-white border-opacity-10"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};