
import { useState } from 'react';
import { YellowButton } from '@/components/Button/YellowButton';
import { ConfirmWithdrawProps } from '@/types/components';
import { apiService } from '@/services/api/api';

export function ConfirmWithdraw({ withdrawAmount, walletAddress }: ConfirmWithdrawProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirmWithdraw = async () => {
    if (!walletAddress) {
      alert('Адрес кошелька не указан');
      return;
    }

    setIsProcessing(true);
    try {
      const amount = parseFloat(withdrawAmount);
      await apiService.initiateWithdraw('USDTTON', amount, walletAddress);
      alert('Заявка на вывод создана успешно!');
      // Здесь можно добавить переход на другую страницу или обновление состояния
    } catch (error) {
      console.error('Failed to initiate withdraw:', error);
      alert('Ошибка при создании заявки на вывод. Попробуйте еще раз.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-primary min-h-screen flex flex-col items-center pt-4 px-4">
      <div className="w-full max-w-[331px]">
        <h2 className="text-2xl font-semibold text-white mb-4 tracking-tighter leading-tight text-left">
          Подтвердить вывод
        </h2>
        <p className="font-medium text-xs text-gray-400 mb-2 tracking-tighter leading-tight text-left">
          Адрес для вывода
        </p>
        <div className="bg-black bg-opacity-30 rounded-lg w-full h-[53px] flex items-center justify-start px-4 mb-4">
          <p className="text-white font-semibold text-sm tracking-tighter leading-tight">
            {walletAddress}
          </p>
        </div>
        <p className="font-medium text-xs text-gray-400 mb-2 tracking-tighter leading-tight text-left">
          Сеть
        </p>
        <div className="bg-black bg-opacity-30 rounded-lg w-full h-[53px] flex items-center justify-start px-4 mb-4">
          <p className="text-white font-semibold text-sm tracking-tighter leading-tight">
            TON
          </p>
        </div>
        <p className="font-medium text-xs text-gray-400 mb-2 tracking-tighter leading-tight text-left">
          Вы получите
        </p>
        <div className="bg-black bg-opacity-30 rounded-lg w-full h-[53px] flex items-center justify-start px-4 mb-4">
          <p className="text-white font-semibold text-sm tracking-tighter leading-tight">
            {withdrawAmount} USDT
          </p>
        </div>
      </div>
      <div className="mt-auto pb-6 w-[93vw]">
        <YellowButton 
          size="lg" 
          onClick={handleConfirmWithdraw} 
          className="w-full"
          isActive={!isProcessing}
        >
          {isProcessing ? 'Обработка...' : 'Подтвердить'}
        </YellowButton>
      </div>
    </div>
  );
}
