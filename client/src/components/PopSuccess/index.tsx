import { useEffect } from 'react';
import './PopSuccess.css';
import completeIcon from '@/assets/complete.png';
import { useTranslation } from 'react-i18next';
import { PopSuccessProps } from '@/types/components';

export function PopSuccess({ message, onClose }: PopSuccessProps) {
  const { t } = useTranslation('common');
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  return (
    <div className="pop-success">
      <img src={completeIcon} alt="Success" className="pop-success-icon" />
      <span>{message || t('success_copied')}</span>
    </div>
  );
}
