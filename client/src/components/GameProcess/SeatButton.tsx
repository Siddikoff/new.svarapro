import sitdownArrowImage from '@/assets/game/sitdown_arrow.png';
import inviteImage from '@/assets/game/invite.png';
import { useTranslation } from 'react-i18next';

interface SeatButtonProps {
  type: 'sitdown' | 'invite';
  position: number;
  onSitDown: (position: number) => void;
  onInvite?: (position: number) => void;
  disabled?: boolean;
  scale?: number;
}

export function SeatButton({ type, position, onSitDown, onInvite, disabled, scale = 1 }: SeatButtonProps) {
  const { t } = useTranslation('common');
  const handleClick = () => {
    if (disabled) return;
    if (type === 'sitdown') {
      onSitDown(position);
    } else if (onInvite) {
      onInvite(position);
    }
  };

  const baseWidth = type === 'sitdown' ? 71 : 71;
  const baseHeight = type === 'sitdown' ? 90 : 71;
  
  const buttonClasses = `
    relative transition-all duration-200 ease-in-out
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'opacity-100 cursor-pointer hover:opacity-80'}
    flex items-center justify-center
  `;

  const containerStyle: React.CSSProperties = {
    width: `${baseWidth * scale}px`,
    height: `${baseHeight * scale}px`,
  };

  const sitDownTextStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: `${13 * scale}px`,
    lineHeight: '100%',
    textAlign: 'center',
    color: '#FFFFFFCC',
  };

  const inviteTextStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 700,
    fontSize: `${8 * scale}px`,
    lineHeight: '100%',
    textAlign: 'center',
    color: 'white',
    marginTop: `${15 * scale}px`, // Position below center
  };

  return (
    type === 'sitdown' ? 
    <button 
      onClick={handleClick}
      className={buttonClasses}
      disabled={disabled}
      style={containerStyle}
    >
      <div className='absolute w-[71px] h-[71px] border-4 border-[#FFFFFF1A] rounded-full bg-[#232228]'></div>
      <img src={sitdownArrowImage} className='absolute top-[-5px] object-contain w-[46px] h-[46px] animate-bounce' alt="" />
      <div className="absolute" style={sitDownTextStyle}>
        {t('sit_down')}
      </div>
    </button>
    :
    <button 
      onClick={handleClick}
      className={buttonClasses}
      disabled={disabled}
      style={containerStyle}
    >
      <img 
        src={inviteImage} 
        alt={t('invite')} 
        className="absolute inset-0 w-full h-full object-contain"
      />
      <div className="absolute" style={inviteTextStyle}>
        {t('invite')}
      </div>
    </button>
  );
}