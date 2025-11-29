import React, { useState, useEffect } from 'react';
import coinImage from '@/assets/game/coin.png';

interface ChipsStackProps {
  totalChips: number;
  gameStatus?: string;
  pot?: number;
}

interface ChipPosition {
  x: number;
  y: number;
  opacity: number;
  zIndex: number;
}

const ChipsStack: React.FC<ChipsStackProps> = ({ totalChips, gameStatus, pot }) => {
  const [chipPositions, setChipPositions] = useState<ChipPosition[]>([]);
  const [shouldHide, setShouldHide] = useState(false);
 
  // Вычисляем позиции фишек в столбиках
  useEffect(() => {

    const positions = chipPositions;
    
    
      
      
    // Позиции столбиков (относительно центра стола)
    let baseX = -12 + Math.random()*16-8;;
    let baseY = 10 + Math.random()*16-8;
    
    
    
    // Позиция фишки в столбике (слой за слоем)
    const x = baseX;
    const y = baseY; // 4px шаг между слоями
    
    // Прозрачность: верхняя фишка полная, нижние затемнены
    const opacity = 1;
    
    let zIndex = 1
    
    positions.push({ x, y, opacity, zIndex });
    
    
    setChipPositions(positions);
    
      
  }, [totalChips]);

    // Логика для скрытия фишек после завершения раунда
  useEffect(() => {
    if (pot === 0 || gameStatus === 'finished') {
      // Задержка для анимации исчезновения
      const timer = setTimeout(() => {
        setShouldHide(true);
      }, 1000); // 1 секунда задержки
      
      return () => clearTimeout(timer);
    } else {
      setShouldHide(false);
    }
  }, [pot, gameStatus]);

  // Скрываем фишки если банк пустой или игра завершена
  if (totalChips === 0 || shouldHide) return null;

 

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 1, marginTop: '30px' }}>
      {chipPositions.map((position, index) => (
        <div
          key={index}
          className="absolute transition-all duration-1000"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            opacity: position.opacity,
            zIndex: position.zIndex,
            width: '22px',
            height: '18px',
          }}
        >
          <img 
            src={coinImage} 
            alt="chip" 
            className="w-full h-full object-contain"
          />
        </div>
      ))}
    </div>
  );
};

export default ChipsStack; 
