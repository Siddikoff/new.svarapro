import { StyledContainer } from '@/components/StyledContainer';
import { YellowButton } from '@/components/Button/YellowButton';
import { useTranslation } from 'react-i18next';
import { apiService } from '@/services/api/api';
import { useState } from 'react';
import { RoomProps } from '@/types/components';
import { LoadingPage } from '@/components/LoadingPage';

export function Room({ roomId, players, stake, setCurrentPage, balance, setNotification }: RoomProps) {
  const { t } = useTranslation('common');
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async () => {
    setCurrentPage('gameRoom', { roomId, autoSit: true });
    const hasEnoughBalance = parseFloat(balance) >= stake * 10;
    if (!hasEnoughBalance) {
      setNotification('insufficientBalance');
      return;
    }

    setIsJoining(true);
    setIsLoading(true);

    try {
      await apiService.joinRoom(roomId);
      setCurrentPage('gameRoom', { roomId, autoSit: true });
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } } };
      console.error('Failed to join room:', error);
      
      if (error.response?.data?.message?.includes('game already started')) {
        setCurrentPage('gameRoom', { roomId, autoSit: false });
      } else {
        setNotification('gameJoinError');
        setIsLoading(false);
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleWatch = async () => {
    setIsJoining(true);
    setIsLoading(true);
    try {
      setCurrentPage('gameRoom', { roomId, autoSit: false });
    } catch (error) {
      console.error('Failed to watch room:', error);
      setNotification('gameJoinError');
      setIsLoading(false);
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return <LoadingPage isLoading={true} />;
  }

  return (
    <StyledContainer 
      className="w-[100%] h-[105px] p-4 rounded-[15px]"
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gridTemplateRows: 'auto auto',
          gap: '6px 25px',
         
        }}
      >
        <p className="text-sm font-semibold text-[#C9C6CE] text-center m-0">{t('room')}</p>
        <p className="text-sm font-semibold text-[#C9C6CE] text-center m-0">{t('players')}</p>
        <p className="text-sm font-semibold text-[#C9C6CE] text-center m-0">{t('stake')}</p>
        <YellowButton 
          style={{ marginTop: '5px' }} 
          onClick={handleJoin}
          disabled={isJoining}
        >
          {t('enter')}
        </YellowButton>
        <div
          style={{
            position: 'absolute',
            left: '5px',
            right: '30%',
            top: '50%',
            height: '1px',
            background: '#FFFFFF',
            opacity: 0.05,
          }}
        />
        <p className="text-base font-semibold text-white text-left m-0">№{roomId.slice(0, 8)}</p>
        <p className="text-base font-semibold text-center m-0">
          <span style={{ color: '#12B754' }}>{players}</span>
          <span className="text-white"> / 6</span>
        </p>
        <p className="text-base font-semibold text-white text-center m-0">${stake}</p>
        <button
          style={{
            height: '21px',
            fontFamily: 'Inter, sans-serif',
            fontStyle: 'normal',
            fontWeight: 600,
            fontSize: '14px',
            lineHeight: '150%',
            letterSpacing: '-0.011em',
            color: '#808797',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            marginTop: '3px',
          }}
          onClick={handleWatch}
          disabled={isJoining}
        >
          {t('watch')}
        </button>
      </div>
    </StyledContainer>
  );
}