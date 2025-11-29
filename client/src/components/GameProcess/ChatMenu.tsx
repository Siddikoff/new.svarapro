import React from 'react';
import chatButtonBg from '@/assets/game/chat.png';
import { useTranslation } from 'react-i18next';
import { Slider } from '../Slider';

interface ChatMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhrase: (phrase: string) => void;
}

export function ChatMenu({ isOpen, onClose, onSelectPhrase }: ChatMenuProps) {
  const { t } = useTranslation('common');

  const chatPhrases = [
    t('chat.phrase1'), t('chat.phrase2'), t('chat.phrase3'), t('chat.phrase4'),
    t('chat.phrase5'), t('chat.phrase6'), t('chat.phrase7'), t('chat.phrase8'),
    t('chat.phrase9'), t('chat.phrase10'), t('chat.phrase11'), t('chat.phrase12'),
    t('chat.phrase13'), t('chat.phrase14'), t('chat.phrase15'), t('chat.phrase16'),
    t('chat.phrase17'), t('chat.phrase18'), t('chat.phrase19'),
  ];

  const buttonTextStyle: React.CSSProperties = {
    fontWeight: 700,
    fontSize: '9px',
    lineHeight: '100%',
    textAlign: 'center',
    color: 'black',
    textShadow: '0px 0.5px 1px rgba(255, 255, 255, 0.5)', // Lighter shadow for dark text
  };

  return (
    <Slider isOpen={isOpen} onClose={onClose} height="317px">
      {/* Content Grid */}
      <div className="relative z-10 p-4 h-full flex items-center justify-center">
        <div className="grid grid-cols-4 gap-x-2 gap-y-3">
          {chatPhrases.map((phrase, index) => (
            <button 
              key={index}
              onClick={() => onSelectPhrase(phrase)}
              className="flex items-center justify-center p-1"
              style={{
                width: '75px',
                height: '38px',
                backgroundImage: `url(${chatButtonBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                ...buttonTextStyle,
                paddingBottom: '13px' // Поднимаем текст на 5px выше
              }}
            >
              {phrase}
            </button>
          ))}
        </div>
      </div>
    </Slider>
  );
}
