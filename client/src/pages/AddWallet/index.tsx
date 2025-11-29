import { useState } from 'react';
import { YellowButton } from '@/components/Button/YellowButton';
import { Notification } from '@/components/Notification';
import tetherIcon from '@/assets/tether.png';
import warningIcon from '@/assets/warning.svg';
import { apiService } from '@/services/api/api';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/types/entities';
import { AddWalletProps } from '@/types/components';

export function AddWallet({ setCurrentPage, setWalletAddress }: AddWalletProps) {
  const [address, setAddress] = useState('');
  const [notification, setNotification] = useState<'invalidAddress' | 'addressAlreadyUsed' | 'addressAdded' | null>(null);
  const { t } = useTranslation('common');

  const handleAddWallet = async () => {
    if (address.length !== 48) {
      setNotification('invalidAddress');
      return;
    }

    try {
      await apiService.addWalletAddress(address);
      setNotification('addressAdded');
      
      // Обновляем состояние кошелька и переходим на страницу вывода
      setWalletAddress(address);
      setTimeout(() => {
        setCurrentPage('withdraw');
      }, 2000); // Даем время пользователю увидеть уведомление
    } catch (error: unknown) {
      const apiError = error as ApiError;
      if (typeof apiError === 'string') {
        setNotification('invalidAddress');
      } else {
        const errorMessage = (apiError as { response?: { data?: { message: string } } }).response?.data?.message;
        if (errorMessage === 'Wallet address already in use') {
          setNotification('addressAlreadyUsed');
        } else if (errorMessage === 'Invalid TON address format') {
          setNotification('invalidAddress');
        } else {
          setNotification('invalidAddress');
        }
      }
    }
  };

  return (
    <div className="bg-primary min-h-screen flex flex-col items-center pt-4 px-4">
      <div className="w-[93vw]">
        <h2 className="text-xl font-semibold text-white mb-2 flex items-center text-left leading-tight tracking-tighter">
          {t('add_wallet_title')} <img src={tetherIcon} alt="USDT-TON" className="w-6 h-6 ml-2" />
        </h2>
        <p className="text-xl font-semibold text-white mb-4 text-left leading-tight tracking-tighter">
          {t('add_wallet_subtitle')}
        </p>
      </div>

      <div className="bg-black bg-opacity-30 rounded-lg px-4 w-[93vw] flex items-center mb-4 h-[53px]">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t('usdt_ton_address_placeholder')}
          className="bg-transparent text-white text-left font-inter text-[17px] w-full focus:outline-none placeholder-white placeholder-opacity-60"
          maxLength={48}
        />
      </div>

      <div className="bg-red-900 bg-opacity-30 rounded-lg p-3 mb-4 w-[93vw] flex items-center text-left">
        <img src={warningIcon} alt="Warning" className="w-6 h-6 mr-2" />
        <span className="text-white font-inter text-xs">
          {t('memo_warning')}
        </span>
      </div>

      <YellowButton
        size="lg"
        onClick={handleAddWallet}
        className="w-[93vw]"
        isActive={address.length === 48}
      >
        {t('add')}
      </YellowButton>
      
      

      <Notification type={notification} onClose={() => setNotification(null)} />
    </div>
  );
}
