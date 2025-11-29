import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { ErrorAlertProps } from '@/types/components';

export function ErrorAlert({
  code,
  customMessage,
  className = '',
  severity = 'error',
}: ErrorAlertProps) {
  const { t } = useTranslation('errors');

  return (
    <div className={clsx(
      'p-3 rounded-lg border',
      severity === 'error' 
        ? 'bg-error-muted border-error' 
        : 'bg-warning-muted border-warning',
      className
    )}>
      <p className={severity === 'error' ? 'text-error' : 'text-warning'}>
        {customMessage || (code ? t(code) : t('unknown_error'))}
      </p>
    </div>
  );
}
