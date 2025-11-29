import { Button } from '@/components/Button/Button';
import { YellowButton } from '@/components/Button/YellowButton';
import { StyledContainer } from '@/components/StyledContainer';
import { Eula } from '@/components/LongRead/eula';
import { Referral } from '@/components/Referral';
import { Gamerules } from '@/components/LongRead/gamerules';
import { PopSuccess } from '@/components/PopSuccess';
import { Footer } from '@/components/Footer';
import sharpIcon from '@/assets/sharp.png';
import languageIcon from '@/assets/language.png';
import depositHistoryIcon from '@/assets/deposit_history.png';
import refIcon from '@/assets/ref.png';
import channelIcon from '@/assets/channel.png';
import licenseIcon from '@/assets/license.png';
import helpIcon from '@/assets/help.png';
import supportIcon from '@/assets/support.png';
import rightIcon from '@/assets/right.png';
import copyIcon from '@/assets/copy.png';
import tetherIcon from '@/assets/tether.png';
import slideDownIcon from '@/assets/slideDown.png';
import { useMemo, useState } from 'react';
import LanguageSelector from '@/components/Language';
import { useTranslation } from 'react-i18next';
import { openTelegramLink } from '@telegram-apps/sdk';
import { useLanguage } from '@/hooks/useLanguage';
import { MoreProps } from '@/types/components';

const languageKeyMap: { [key: string]: string } = {
  ru: 'russian',
  en: 'english',
};

export function More({ userData, setCurrentPage }: MoreProps) {
  const { t } = useTranslation('common');
  const { currentLanguage } = useLanguage();
  const userId = useMemo(() => userData?.id?.toString() || 'N/A', [userData?.id]);
  const [isEulaVisible, setIsEulaVisible] = useState(false);
  const [isReferralVisible, setIsReferralVisible] = useState(false);
  const [isGamerulesVisible, setIsGamerulesVisible] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  
  const handleCopy = () => {
    navigator.clipboard.writeText(userId).then(() => {
      setShowSuccess(true);
    });
  };

  const handleOpenNewsChannel = () => {
    openTelegramLink('https://t.me/SvaraPro');
  };

  const handleOpenSupportChat = () => {
    openTelegramLink('https://t.me/SvaraProSupportbot');
  };

  return (
    <div className="bg-primary min-h-screen flex flex-col">
      <div className="flex-1">
        {showSuccess && <PopSuccess onClose={() => setShowSuccess(false)} />}
        {/* Blur overlay and modal for language selector */}
        
        <div className="mx-auto w-[93vw] flex flex-col items-center space-y-3 mt-6">
          <Button
            variant="secondary"
            fullWidth
            icon={sharpIcon}
            typeLeftButton={true}
            justify="start"
            onClick={handleCopy}
            rightText={userId}
            rightIcon={copyIcon}
            rightContentClassName="text-[#BBB9BD] text-[15px] font-medium"
            rightIconClassName="ml-[14px] w-[15.48px] h-[18px]"
            iconClassName="w-[18px] h-[22px]"
            style={{ height: '53px' }}
          >
            {t('my_id')}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            icon={languageIcon}
            typeLeftButton={true}
            justify="start"
            rightText={t(languageKeyMap[currentLanguage] || 'russian')}
            rightIcon={slideDownIcon}
            rightContentClassName="text-[#BBB9BD] text-[15px] font-medium"
            iconClassName="w-[23px] h-[21px]"
            rightIconClassName="w-[15px] h-[7px] ml-[14px]"
            onClick={() => setShowLanguageSelector(true)}
            style={{ height: '53px' }}
          >
            {t('current_language')}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            icon={depositHistoryIcon}
            typeLeftButton={true}
            rightIcon={rightIcon}
            justify="start"
            iconClassName="w-[26px] h-[26px]"
            rightIconClassName="w-[6px] h-[17px]"
            onClick={() => setCurrentPage('depositHistory')}
            style={{ height: '53px' }}
          >
            {t('deposit_history')}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            icon={refIcon}
            typeLeftButton={true}
            rightIcon={rightIcon}
            justify="start"
            iconClassName="w-[24px] h-[24px]"
            rightIconClassName="w-[6px] h-[17px]"
            onClick={() => setIsReferralVisible(true)}
            style={{ height: '53px' }}
          >
            {t('referral_program')}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            icon={channelIcon}
            typeLeftButton={true}
            rightIcon={rightIcon}
            justify="start"
            iconClassName="w-[21px] h-[21px]"
            rightIconClassName="w-[6px] h-[17px]"
            onClick={handleOpenNewsChannel}
            style={{ height: '53px' }}
          >
            {t('news_channel')}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            icon={licenseIcon}
            typeLeftButton={true}
            rightIcon={rightIcon}
            justify="start"
            iconClassName="w-[23px] h-[23px]"
            rightIconClassName="w-[6px] h-[17px]"
            onClick={() => setIsEulaVisible(true)}
            style={{ height: '53px' }}
          >
            {t('user_agreement')}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            icon={helpIcon}
            typeLeftButton={true}
            rightIcon={rightIcon}
            justify="start"
            iconClassName="w-[27px] h-[27px]"
            rightIconClassName="w-[6px] h-[17px]"
            onClick={() => setIsGamerulesVisible(true)}
            style={{ height: '53px' }}
          >
            {t('how_to_play')}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            icon={supportIcon}
            typeLeftButton={true}
            rightIcon={rightIcon}
            justify="start"
            iconClassName="w-[32px] h-[31px]"
            rightIconClassName="w-[6px] h-[17px]"
            onClick={handleOpenSupportChat}
            style={{ height: '53px' }}
          >
            {t('support_chat')}
          </Button>

          <div className="pt-4 w-full">
            <h3 className="font-semibold text-lg text-white tracking-tighter leading-tight mb-2 text-left">{t('wallet_for_withdraw')}</h3>
            <hr className="w-full border-t border-white opacity-50 mb-4" />
            <StyledContainer className="h-12">
              <div className="flex items-center justify-between w-full px-4">
                <div className="flex items-center">
                  <img src={tetherIcon} alt="USDT TON" className="w-6 h-6 mr-2" />
                  <span>USDT TON</span>
                </div>
                <YellowButton size="sm" onClick={() => setCurrentPage('addWallet')} className="w-[88px]">
                  {t('add')}
                </YellowButton>
              </div>
            </StyledContainer>
          </div>
        </div>
      </div>
      <LanguageSelector isOpen={showLanguageSelector} onClose={() => setShowLanguageSelector(false)} zIndex={60} />
      <Footer />
      {isEulaVisible && <Eula onClose={() => setIsEulaVisible(false)} />}
      {isReferralVisible && <Referral onClose={() => setIsReferralVisible(false)} />}
      {isGamerulesVisible && <Gamerules onClose={() => setIsGamerulesVisible(false)} />}
    </div>
  );
}
