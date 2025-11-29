import closeIcon from '@/assets/close.png';
import { useTranslation } from 'react-i18next';
import { EulaProps, TextProps } from '@/types/components';

export const EulaHeader = ({ children }: TextProps) => (
  <h2 className="font-bold text-base text-white tracking-tighter leading-tight">{children}</h2>
);

export const EulaBody = ({ children }: TextProps) => (
  <p className="font-normal text-xs text-white tracking-tighter leading-tight">{children}</p>
);

export const EulaSubtext = ({ children }: TextProps) => (
  <p className="font-normal text-[10px] text-[#64646E] tracking-tighter leading-tight">{children}</p>
);

export function Eula({ onClose }: EulaProps) {
  const { t } = useTranslation('common');
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#131217] w-[330px] max-h-[80vh] rounded-lg p-4 relative flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 z-10">
          <img src={closeIcon} alt="Close" className="w-6 h-6" />
        </button>
        <div className="overflow-y-auto flex-grow pr-4 space-y-4">
          <EulaHeader>{t('eula_title')}</EulaHeader>
          <EulaSubtext>{t('eula_date')}</EulaSubtext>
          <EulaHeader>{t('eula_welcome')}</EulaHeader>
          <EulaBody>{t('eula_intro')}</EulaBody>
          <EulaHeader>{t('eula_acceptance_title')}</EulaHeader>
          <EulaBody>{t('eula_acceptance_body')}</EulaBody>
          <EulaHeader>{t('eula_eligibility_title')}</EulaHeader>
          <EulaBody>{t('eula_eligibility_body')}</EulaBody>
          <EulaHeader>{t('eula_account_title')}</EulaHeader>
          <EulaBody>{t('eula_account_body')}</EulaBody>
          <EulaHeader>{t('eula_fairplay_title')}</EulaHeader>
          <EulaBody>{t('eula_fairplay_body')}</EulaBody>
          <EulaHeader>{t('eula_operations_title')}</EulaHeader>
          <EulaBody>{t('eula_operations_body')}</EulaBody>
          <EulaHeader>{t('eula_bonuses_title')}</EulaHeader>
          <EulaBody>{t('eula_bonuses_body')}</EulaBody>
          <EulaHeader>{t('eula_limitation_title')}</EulaHeader>
          <EulaBody>{t('eula_limitation_body')}</EulaBody>
          <EulaHeader>{t('eula_disputes_title')}</EulaHeader>
          <EulaBody>{t('eula_disputes_body')}</EulaBody>
          <EulaHeader>{t('eula_termination_title')}</EulaHeader>
          <EulaBody>{t('eula_termination_body')}</EulaBody>
          <EulaHeader>{t('eula_changes_title')}</EulaHeader>
          <EulaBody>{t('eula_changes_body')}</EulaBody>
        </div>
      </div>
    </div>
  );
}
