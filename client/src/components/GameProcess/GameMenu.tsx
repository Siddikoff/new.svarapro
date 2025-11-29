import { useState, useEffect } from 'react';
import exitIcon from '@/assets/game/exit.svg';
import volumeIcon from '@/assets/game/volume.svg';
import languageIcon from '@/assets/language.png';
import { StyledContainer } from '../StyledContainer';
import { GameMenuProps } from '@/types/components';
import { ExitMenu } from './ExitMenu';
import { useSoundContext } from '@/context/SoundContext';
import { useLanguage } from '@/hooks/useLanguage';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../Language';
import slideDownIcon from '@/assets/slideDown.png';

const languageKeyMap: { [key: string]: string } = {
  ru: 'russian',
  en: 'english',
};

export function GameMenu({ isOpen, onClose, onExit }: GameMenuProps) {
  const [showExitMenu, setShowExitMenu] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const { isSoundEnabled, toggleSound } = useSoundContext();
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation('common');

  useEffect(() => {
    if (!isOpen) {
      setShowExitMenu(false);
      setShowLanguageSelector(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExitClick = () => {
    setShowExitMenu(true);
  };

  const handleExitConfirm = () => {
    setShowExitMenu(false);
    onExit();
  };

  const handleExitCancel = () => {
    setShowExitMenu(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[999999]"
      onClick={onClose}
    >
      <div
        className="w-[250px] h-[150px]"
        onClick={(e) => e.stopPropagation()}
      >
        <StyledContainer
          className="w-full h-full rounded-lg"
          contentClassName="flex flex-col items-center justify-center px-4 space-y-2"
        >
          <div
            className="w-[225px] h-8 rounded-lg flex items-center justify-between px-3 transition-all duration-200 ease-in-out"
            style={{ backgroundColor: 'rgba(19, 18, 23, 0.7)' }}
            onClick={() => setShowLanguageSelector(true)}
          >
            <div className="flex items-center space-x-2">
              <img src={languageIcon} alt="Language" className="w-4 h-4" />
              <span className="text-white" style={{ fontWeight: 500, fontSize: '12px' }}>{t('current_language')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-white" style={{ fontWeight: 500, fontSize: '12px' }}>{t(languageKeyMap[currentLanguage] || 'russian')}</span>
              <img src={slideDownIcon} alt="arrow" className="w-[15px] h-[7px]" />
            </div>
          </div>
          {/* Sound Toggle */}
          <div
            className="w-[225px] h-8 rounded-lg flex items-center justify-between px-3 transition-all duration-200 ease-in-out"
            style={{ backgroundColor: 'rgba(19, 18, 23, 0.7)' }}
          >
            <div className="flex items-center space-x-2">
              <img src={volumeIcon} alt="Звук" className="w-4 h-4" />
              <span className="text-white" style={{ fontWeight: 500, fontSize: '12px' }}>{t('sound')}</span>
            </div>
            <div
              className="relative w-[40px] h-[20px] rounded-full flex items-center p-0.5 cursor-pointer transition-colors duration-300"
              style={{ background: isSoundEnabled ? '#31EA3D' : '#2F2E35' }}
              onClick={toggleSound}
            >
              <div
                className="w-[16px] h-[16px] bg-white rounded-full transition-all duration-300"
                style={{ transform: isSoundEnabled ? 'translateX(20px)' : 'translateX(0)' }}
              ></div>
            </div>
          </div>

          {/* Exit Button */}
          <button
            onClick={handleExitClick}
            className="w-[225px] h-8 rounded-lg flex items-center justify-start px-3 space-x-2 transition-all duration-200 ease-in-out hover:opacity-80"
            style={{ backgroundColor: 'rgba(19, 18, 23, 0.7)' }}
          >
            <img src={exitIcon} alt="Выйти" className="w-4 h-4" />
            <span className="text-white" style={{ fontWeight: 500, fontSize: '12px' }}>{t('exit')}</span>
          </button>
        </StyledContainer>
      </div>

      {showExitMenu && (
        <ExitMenu
          onClose={handleExitCancel}
          onConfirm={handleExitConfirm}
        />
      )}
            <LanguageSelector isOpen={showLanguageSelector} onClose={() => setShowLanguageSelector(false)} zIndex={60} />
    </div>
  );
}