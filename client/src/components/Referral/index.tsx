import { StyledContainer } from '@/components/StyledContainer';
import { Button } from '@/components/Button/Button';
import { Refrules } from '@/components/LongRead/refrules';
import closeIcon from '@/assets/close.png';
import copyIcon from '@/assets/copy.png';
import { useEffect, useState } from 'react';
import { apiService } from '@/services/api/api';
import { PopSuccess } from '@/components/PopSuccess';
import { useTranslation } from 'react-i18next';
import { ReferralProps } from '@/types/components';
import { ReferralData } from '@/types/entities';
import WebApp from '@twa-dev/sdk';

const truncateUsername = (username: string | null | undefined) => {
  if (!username) return 'N/A';
  return username.length > 12 ? `${username.slice(0, 12)}...` : username;
};

export function Referral({ onClose }: ReferralProps) {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isRefrulesVisible, setIsRefrulesVisible] = useState(false);
  const { t } = useTranslation('common');

  const handleCopy = () => {
    if (referralData?.referralLink) {
      navigator.clipboard.writeText(referralData.referralLink).then(() => {
        setShowSuccess(true);
      });
    }
  };

  const handleShare = () => {
    if (referralData?.referralLink) {
      const text = t('share_referral_text', 'Присоединяйся ко мне в Svara Pro! Используй мою ссылку для регистрации.');
      WebApp.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(
          referralData.referralLink
        )}&text=${encodeURIComponent(text)}`
      );
    }
  };

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        setLoading(true);
        const data = (await apiService.getReferralLink()) as ReferralData;
        setReferralData(data);
      } catch (err) {
        setError(t('referral_load_error'));
        console.error('Error fetching referral data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReferralData();
  }, [t]);

  if (loading) return <div className="fixed inset-0 flex items-center justify-center">{t('loading')}</div>;
  if (error) return <div className="fixed inset-0 flex items-center justify-center text-white">{error}</div>;
  if (!referralData) return null;

  const { refBalance, refBonus, referralCount, referrals } = referralData;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {showSuccess && <PopSuccess onClose={() => setShowSuccess(false)} />}
      {isRefrulesVisible && <Refrules onClose={() => setIsRefrulesVisible(false)} />}
      <div className="bg-[#2E2B33] w-[330px] rounded-lg p-4 relative flex flex-col items-center gap-4">
        <h2 className="text-white font-bold text-lg text-center">{t('referral_program')}</h2>
        <button onClick={onClose} className="absolute top-4 right-4 z-10">
          <img src={closeIcon} alt="Close" className="w-6 h-6" />
        </button>

        {/* Статистика */}
        <div className="flex justify-between gap-2 w-full">
          <button
            className="w-[150px] h-[55px]"
            onClick={() => setIsRefrulesVisible(true)}
          >
            <StyledContainer
              className="w-full h-full"
              >
              <div className="flex flex-col items-center justify-center h-full">
                <span className="text-sm text-gray-400">{t('level')}</span>
                <span className="text-lg font-semibold text-white">{refBonus}%</span>
              </div>
              
            </StyledContainer>
          </button>
          <StyledContainer className="w-[150px] h-[55px]">
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-sm text-gray-400">{t('earnings')}</span>
              <span className="text-lg font-semibold text-white">${refBalance}</span>
            </div>
          </StyledContainer>
        </div>

        {/* Реферальная ссылка */}
        <StyledContainer className="w-[298px] h-[141px]">
          <div className="flex flex-col items-center justify-between h-full p-2">
            <p className="font-semibold text-base leading-tight tracking-tighter text-white">{t('your_referral_link')}</p>
            <p className="text-xs text-gray-400 break-all text-center">{referralData.referralLink}</p>
            <div className="flex justify-between gap-2 w-full">
              <Button 
                variant="tertiary" 
                onClick={handleCopy}
                className="w-[140px] h-[36px] !bg-[#2E2B33] font-medium text-sm leading-normal tracking-tighter rounded-lg"
                icon={copyIcon}
                iconClassName="w-4 h-4"
              >
                {t('copy')}
              </Button>
              <Button 
                variant="tertiary" 
                onClick={handleShare}
                className="w-[140px] h-[36px] !bg-[#2E2B33] font-medium text-sm leading-normal tracking-tighter rounded-lg"
              >
                {t('share')}
              </Button>
            </div>
          </div>
        </StyledContainer>

        {/* Список рефералов */}
        <div className="w-[298px]">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-base leading-tight tracking-tighter text-white">{t('your_referrals')}</h3>
            <div className="bg-[#46434B] w-[26px] h-[21px] rounded-lg flex items-center justify-center">
              <span className="font-semibold text-[13px] leading-tight tracking-tighter text-white">{referralCount}</span>
            </div>
          </div>
          <StyledContainer className="w-full h-[141px]">
            <div className="p-2 w-full h-full flex flex-col">
              <div className="flex justify-between text-xs text-gray-400 w-full">
                <span>{t('referrals')}</span>
                <span>{t('profit')}</span>
              </div>
              <hr className="border-t border-white opacity-10 my-2 w-full" />
              {referrals?.map((ref, index) => (
                <div key={index} className="flex justify-between text-xs text-white my-1">
                  <span>{truncateUsername(ref.username)}</span>
                  <span>$0.00</span>
                </div>
              ))}
            </div>
          </StyledContainer>
        </div>
      </div>
    </div>
  );
}