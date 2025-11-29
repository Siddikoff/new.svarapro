import React from 'react';
import { GameState } from '@/types/game';
import tableImage from '../../assets/game/table.jpg';
import ChipsStack from './ChipsStack';
import { useTranslation } from 'react-i18next';

const formatAmount = (amount: number): string => {
  const num = Number(amount);
  const fixed = num.toFixed(2);
  if (fixed.endsWith('.00')) {
    return String(Math.round(num));
  }
  if (fixed.endsWith('0')) {
    return fixed.slice(0, -1);
  }
  return fixed;
};

interface GameTableProps {
  gameState: GameState;
  currentUserId: string;
  showCards: boolean;
  onSitDown: (position: number) => void;
  onInvite: () => void;
  onChatOpen: () => void;
  maxPlayers: number;
  scale?: number;
  showChipStack?: boolean;
  savedChipCount?: number;
}

const GameTable: React.FC<GameTableProps> = ({ 
  gameState, 
  scale = 1, 
  showChipStack = true,
  savedChipCount = 0
}) => {
  const { t } = useTranslation('common');
  const baseWidth = 315;
  const baseHeight = 493;
  
  const formattedPot = formatAmount(gameState.pot);
  
  // Считаем количество фишек на основе лога действий
  const totalChips = React.useMemo(() => {
    if (gameState.status === 'finished') {
      return savedChipCount;
    }
    if (!gameState.log) {
      return 0;
    }
    const bettingActions = ['ante', 'blind_bet', 'bet', 'call', 'raise'];
    return gameState.log.filter(action => bettingActions.includes(action.type)).length;
  }, [gameState.status, gameState.log, savedChipCount]);
  
  

  const containerStyle: React.CSSProperties = {
    width: `${baseWidth * scale}px`,
    height: `${baseHeight * scale}px`,
    borderRadius: `${149 * scale}px`,
    border: `${16 * scale}px solid #333238`,
    position: 'relative',
    overflow: 'hidden', // This is important to contain the rotated background
    boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25), 0px 5.5px 10px 0px rgba(0, 0, 0, 0.25), 0px 0px 4px 11px rgba(0, 0, 0, 0.05), 0px -1px 4px 3px rgba(0, 0, 0, 0.25), 0px 0px 5.5px 10px rgba(0, 0, 0, 0.05)',
  };

  const backgroundStyle: React.CSSProperties = {
    position: 'absolute',
    width: `${baseHeight * scale}px`, // Swap width and height for rotation
    height: `${baseWidth * scale}px`, // Swap width and height for rotation
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(90deg)',
    backgroundImage: `url(${tableImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  const tableClasses = "relative game-table";

  // Стили для дополнительной рамки (65% от размера стола)
  const outerBorderStyle: React.CSSProperties = {
    width: `${baseWidth * scale * 0.65}px`,
    height: `${baseHeight * scale * 0.65}px`,
    borderRadius: `${164 * scale}px`,
    border: `${1 * scale}px solid rgba(158, 158, 159, 0.4)`,
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none', // Чтобы рамка не мешала взаимодействию
    zIndex: 2,
  };

  const potContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: '42%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(19, 18, 23, 0.35)',
    paddingLeft: '5px',
    paddingRight: '5px',
    height: `${23 * scale}px`,
    borderRadius: `${2 * scale}px`,
    border: `${0.5 * scale}px solid rgba(255, 255, 255, 0.1)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    zIndex: 2,
  };

  // Стили для надписи "Svarapro"
  const logoStyle: React.CSSProperties = {
    position: 'absolute',
    top: '70%', // 30% от низа = 70% от верха
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: 'rgba(255, 255, 255, 0.16)', // #FFFFFF 16%
    fontWeight: 800,
    fontStyle: 'normal',
    fontSize: `${20 * scale}px`,
    lineHeight: '100%',
    letterSpacing: '0%',
    textAlign: 'center',
    pointerEvents: 'none', // Чтобы текст не мешала взаимодействию
    zIndex: 2,
  };



  // Стили для надписи "налог 5%"
  const taxStyle: React.CSSProperties = {
    position: 'absolute',
    top: '47%', // Ближе к контейнеру банка
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#fff', // #FFFFFF 60%
    fontWeight: 400,
    fontStyle: 'semibold',
    fontSize: `${11 * scale}px`,
    lineHeight: '100%',
    letterSpacing: '0%',
    textAlign: 'center',
    pointerEvents: 'none', // Чтобы текст не мешала взаимодействию
    zIndex: 2,
  };

  return (
    <div style={containerStyle} className={tableClasses}>
      <div style={backgroundStyle}></div>
      
      {/* Дополнительная рамка вокруг стола */}
      <div style={outerBorderStyle}></div>
      
      {/* Надпись "Svarapro" */}
      <div style={logoStyle}>
        Svarapro
      </div>
      
      <div style={potContainerStyle}>
        <span className="text-sm font-semibold text-white" style={{ fontSize: `${14 * scale}px` }}>{t('pot', { amount: formattedPot })}</span>
      </div>
      
      {/* Надпись "налог 5%" */}
      <div style={taxStyle}>
        {t('tax_5_percent')}
      </div>
      
      {/* Стоп
      ки фишек */}
      {showChipStack && (
        <ChipsStack 
          totalChips={totalChips} 
          gameStatus={gameState.status}
          pot={gameState.pot}
        />
      )}
      
      
      

    </div>
  );
};

export default GameTable;