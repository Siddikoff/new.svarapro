import { useTranslation } from 'react-i18next';

interface ActionNotificationProps {
  action?: 'blind' | 'paid' | 'pass' | 'rais' | 'win' | 'look' | null;
  visible: boolean;
}

export function ActionNotification({ action, visible }: ActionNotificationProps) {
  const { t } = useTranslation('common');

  const actionConfig = {
    blind: { text: t('blind_action'), color: '#0E5C89' },
    paid: { text: t('paid_action'), color: '#0E5C89' },
    pass: { text: t('pass_action'), color: '#FF3131' },
    rais: { text: t('raise_action'), color: '#56BF00' },
    win: { text: t('win_action'), color: '#56BF00' },
    look: { text: t('look_action'), color: '#0E5C89' },
  };

  if (!action || !visible) {
    return null;
  }

  const config = actionConfig[action];

  return (
    <div 
      className="absolute bottom-0 left-1/2 transform -translate-x-1/2 z-50 flex items-center justify-center"
      style={{ 
        width: '62px',
        height: '18px',
        borderRadius: '4px',
        backgroundColor: config.color,
        bottom: '38px', 
      }}
    >
      <span className="text-white text-[10px] font-extrabold leading-none text-center">{config.text}</span>
    </div>
  );
}