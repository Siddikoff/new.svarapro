import completeIcon from '@/assets/complete.png';
import errorIcon from '@/assets/error.png';
import cupIcon from '@/assets/cup.png';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { NotificationProps } from '@/types/components';

const notificationContent = {
  invalidAddress: {
    icon: errorIcon,
    textKey: 'invalid_address',
  },
  addressAlreadyUsed: {
    icon: errorIcon,
    textKey: 'address_already_used',
  },
  addressAdded: {
    icon: completeIcon,
    textKey: 'address_added',
  },
  comingSoon: {
    icon: cupIcon,
    textKey: 'coming_soon',
  },
  insufficientBalance: {
    icon: errorIcon,
    textKey: 'insufficient_balance_x3_error',
  },
  gameJoinError: {
    icon: errorIcon,
    textKey: 'game_join_error',
  },
};

export function Notification({ type, onClose }: NotificationProps) {
  const { t } = useTranslation('common');
  const [isPressed, setIsPressed] = useState(false);

  if (!type) {
    return null;
  }

  const { icon, textKey } = notificationContent[type];

  const background = isPressed ? '#bebebe' : 'transparent';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#47444C] w-[277px] h-[155px] rounded-lg flex flex-col items-center py-4 px-4 relative">
        <div className="flex flex-col items-center text-center mt-2">
          <img src={icon} alt={type} className="w-8 h-8 mb-4" />
          <p className="text-white font-semibold text-sm">{t(textKey)}</p>
        </div>
        <div className="absolute bottom-[41px] left-1/2 -translate-x-1/2 w-[270px] h-px bg-white opacity-50" />
        <button 
          onClick={onClose} 
          className="absolute bottom-0 left-0 text-white font-semibold text-[17px] w-full h-[39px] flex items-center justify-center"
          style={{ background: background, transition: 'background 0.2s', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onTouchStart={() => setIsPressed(true)}
          onTouchEnd={() => setIsPressed(false)}
        >
          {t('ok')}
        </button>
      </div>
    </div>
  );
}
