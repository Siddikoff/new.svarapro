import { useState, useEffect, useRef } from 'react';
import { GameState, Player } from '@/types/game';
import { UserData } from '@/types/entities';
import { StyledContainer } from '../StyledContainer';
import starIcon from '@/assets/game/star.png';
import defaultAvatar from '@/assets/main_logo.png';
import { useTranslation } from 'react-i18next';

interface SvaraJoinPopupProps {
  gameState: GameState;
  userData: UserData;
  actions: {
    joinSvara: () => void;
    skipSvara: () => void;
  };
}

const SvaraAvatar = ({ player }: { player: Player }) => {
  return (
    <div className="relative flex flex-col items-center mx-2">
      <div 
        className="relative rounded-full flex items-center justify-center"
        style={{ 
          width: '71px', 
          height: '71px', 
          background: '#232228',
          boxShadow: '0px 0px 4px 2px #EC8800'
        }}
      >
        <img 
          src={player.avatar || defaultAvatar}
          alt={player.username}
          className="rounded-full object-cover"
          style={{ width: '65px', height: '65px' }}
        />
      </div>
      {player.score !== undefined && (
        <div 
          className="absolute -bottom-3 flex items-center justify-center text-white"
          style={{
            width: '22px',
            height: '22px',
            backgroundColor: '#FF443A',
            borderRadius: '50%',
            fontWeight: 500,
            fontSize: '14px'
          }}
        >
          {player.score}
        </div>
      )}
    </div>
  );
};

export function SvaraJoinPopup({ gameState, userData, actions }: SvaraJoinPopupProps) {
  const { t } = useTranslation('common');
  const [timer, setTimer] = useState(20);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Automatically skip if timer runs out
          actions.skipSvara();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [actions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        actions.skipSvara();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actions, popupRef]);

  const svaraWinners = gameState.winners || [];
  const isParticipant = svaraWinners.some(p => p.id === userData.id?.toString());
  const hasConfirmed = gameState.svaraConfirmed?.includes(userData.id?.toString() || '') || false;

  const renderAvatars = () => {
    if (svaraWinners.length === 2) {
      return (
        <div className="flex justify-center items-center w-full">
          <SvaraAvatar player={svaraWinners[0]} />
          <div className="flex items-center mx-4">
            <img src={starIcon} alt="*" className="w-6 h-6" />
            <h1 className="font-semibold text-xl mx-2">{t('svara')}</h1>
            <img src={starIcon} alt="*" className="w-6 h-6" />
          </div>
          <SvaraAvatar player={svaraWinners[1]} />
        </div>
      );
    }
    if (svaraWinners.length === 3) {
      return (
        <div className="relative flex flex-col items-center w-full">
          <div className="absolute -top-12">
            <SvaraAvatar player={svaraWinners[2]} />
          </div>
          <div className="flex justify-center items-center w-full mt-8">
            <SvaraAvatar player={svaraWinners[0]} />
            <div className="flex items-center mx-4">
              <img src={starIcon} alt="*" className="w-6 h-6" />
              <h1 className="font-semibold text-xl mx-2">{t('svara')}</h1>
              <img src={starIcon} alt="*" className="w-6 h-6" />
            </div>
            <SvaraAvatar player={svaraWinners[1]} />
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div ref={popupRef}>
        <StyledContainer className="w-[330px] h-[280px]">
          <div className="flex flex-col items-center justify-between h-full p-4">
            {renderAvatars()}

            <div className="text-center">
              {isParticipant ? (
                <>
                  <p className="font-bold text-sm mb-3">
                    {hasConfirmed ? t('waiting_for_other_players') : t('svara_will_you_participate')}
                  </p>
                  <button 
                    onClick={hasConfirmed ? undefined : actions.joinSvara}
                    className={`w-[224px] h-[32px] rounded-lg text-white font-bold text-sm mb-2 ${
                      hasConfirmed 
                        ? 'bg-gray-500 cursor-not-allowed opacity-70' 
                        : 'bg-[#00AF17] hover:bg-[#00AF17]/90 cursor-pointer'
                    }`}
                    disabled={hasConfirmed}
                  >
                    {hasConfirmed ? t('participating') : t('participate_free')}
                  </button>
                  <button 
                    onClick={hasConfirmed ? undefined : actions.skipSvara}
                    className={`w-[224px] h-[32px] rounded-lg text-white font-bold text-sm ${
                      hasConfirmed 
                        ? 'bg-gray-500 cursor-not-allowed opacity-70' 
                        : 'bg-[#FF443A] hover:bg-[#FF443A]/90 cursor-pointer'
                    }`}
                    disabled={hasConfirmed}
                  >
                    {hasConfirmed ? t('decision_made') : t('skip_with_timer', { timer })}
                  </button>
                </>
              ) : (
                <>
                  <p className="font-bold text-sm mb-3">{t('join_or_skip_svara')}</p>
                  <button 
                    onClick={actions.joinSvara}
                    className="w-[224px] h-[32px] rounded-lg bg-[#00AF17] text-white font-bold text-sm mb-2"
                  >
                    {t('join_svara_with_pot', { pot: gameState.pot })}
                  </button>
                  <button 
                    onClick={actions.skipSvara}
                    className="w-[224px] h-[32px] rounded-lg bg-[#FF443A] text-white font-bold text-sm"
                  >
                    {t('skip_with_timer', { timer })}
                  </button>
                </>
              )}
            </div>
          </div>
        </StyledContainer>
      </div>
    </div>
  );
}
