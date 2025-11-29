import { Button } from '@/components/Button/Button';
import createIcon from '@/assets/create.png';
import tournamentsIcon from '@/assets/tournaments.png';
import moreIcon from '@/assets/more.png';
import { useTranslation } from 'react-i18next';
import { ButtonGroupProps } from '@/types/components';

export function ButtonGroup({ onMoreClick, onComingSoonClick, onCreateRoomClick }: ButtonGroupProps) {
  const { t } = useTranslation('common');
  return (
    <div className="flex items-center gap-2 mx-auto mt-6 w-[93vw]">
      <Button layout="vertical" icon={createIcon} className="flex-1 h-[57px]" onClick={onCreateRoomClick}>{t('create')}</Button>
      <Button layout="vertical" icon={tournamentsIcon} className="flex-1 h-[57px]" onClick={onComingSoonClick}>{t('tournaments')}</Button>
      <Button layout="vertical" icon={moreIcon} onClick={onMoreClick} className="flex-1 h-[57px]" >{t('more')}</Button>
    </div>
  );
}
