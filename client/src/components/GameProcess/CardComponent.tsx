
import { Card } from '@/types/game';

// Импортируем изображения карт
import backImage from '@/assets/game/back.png';

// Импортируем все изображения карт
import ah from '@/assets/game/ah.png';
import kh from '@/assets/game/kh.png';
import qh from '@/assets/game/qh.png';
import jh from '@/assets/game/jh.png';
import _10h from '@/assets/game/10h.png';
import _9h from '@/assets/game/9h.png';
import _8h from '@/assets/game/8h.png';
import _7h from '@/assets/game/7h.png';
import ad from '@/assets/game/ad.png';
import kd from '@/assets/game/kd.png';
import qd from '@/assets/game/qd.png';
import jd from '@/assets/game/jd.png';
import _10d from '@/assets/game/10d.png';
import _9d from '@/assets/game/9d.png';
import _8d from '@/assets/game/8d.png';
import _7d from '@/assets/game/7d.png';
import ac from '@/assets/game/ac.png';
import kc from '@/assets/game/kc.png';
import qc from '@/assets/game/qc.png';
import jc from '@/assets/game/jc.png';
import _10c from '@/assets/game/10c.png';
import _9c from '@/assets/game/9c.png';
import _8c from '@/assets/game/8c.png';
import _7c from '@/assets/game/7c.png';
import as from '@/assets/game/as.png';
import ks from '@/assets/game/ks.png';
import qs from '@/assets/game/qs.png';
import js from '@/assets/game/js.png';
import _10s from '@/assets/game/10s.png';
import _9s from '@/assets/game/9s.png';
import _8s from '@/assets/game/8s.png';
import _7s from '@/assets/game/7s.png';

const cardImages = {
  ah,
  kh,
  qh,
  jh,
  '10h': _10h,
  '9h': _9h,
  '8h': _8h,
  '7h': _7h,
  ad,
  kd,
  qd,
  jd,
  '10d': _10d,
  '9d': _9d,
  '8d': _8d,
  '7d': _7d,
  ac,
  kc,
  qc,
  jc,
  '10c': _10c,
  '9c': _9c,
  '8c': _8c,
  '7c': _7c,
  as,
  ks,
  qs,
  js,
  '10s': _10s,
  '9s': _9s,
  '8s': _8s,
  '7s': _7s,
};

interface CardComponentProps {
  card?: Card;
  hidden?: boolean;
  size?: 'small' | 'medium' | 'large';
  scale?: number;
  customWidth?: number;
  customHeight?: number;
}

export function CardComponent({ card, hidden = false, size = 'medium', scale = 1, customWidth, customHeight }: CardComponentProps) {
  const baseSizes = {
    small: { width: 48, height: 64 },
    medium: { width: 64, height: 88 },
    large: { width: 96, height: 128 },
  };

  // Используем кастомные размеры, если они переданы, иначе используем стандартные
  const finalWidth = customWidth || baseSizes[size].width * scale;
  const finalHeight = customHeight || baseSizes[size].height * scale;

  const cardStyle: React.CSSProperties = {
    width: `${finalWidth}px`,
    height: `${finalHeight}px`,
  };

  const cardClasses = `overflow-hidden rounded-lg`;

  // Функция для получения пути к изображению карты
  const getCardImagePath = (card: Card): string => {
    const { rank, suit } = card;
    const suitCode = getSuitCode(suit);
    const rankCode = getRankCode(rank);
    const imageName = `${rankCode}${suitCode}`;
    return cardImages[imageName as keyof typeof cardImages] || backImage;
  };

  // Получение кода масти
  const getSuitCode = (suit: string): string => {
    switch (suit) {
      case 'hearts': return 'h';
      case 'diamonds': return 'd';
      case 'clubs': return 'c';
      case 'spades': return 's';
      default: return 'h';
    }
  };

  // Получение кода ранга
  const getRankCode = (rank: string): string => {
    switch (rank) {
      case 'A': return 'a';
      case 'K': return 'k';
      case 'Q': return 'q';
      case 'J': return 'j';
      default: return rank;
    }
  };

  if (hidden || !card) {
    return (
      <div style={cardStyle} className={cardClasses}>
        <img src={backImage} alt="Card back" className="w-full h-full object-contain" />
      </div>
    );
  }

  return (
    <div style={cardStyle} className={cardClasses}>
      <img 
        src={getCardImagePath(card)} 
        alt={`${card.rank} of ${card.suit}`} 
        className="w-full h-full object-contain"
      />
    </div>
  );
}
