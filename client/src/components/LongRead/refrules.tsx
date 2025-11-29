import closeIcon from '@/assets/close.png';
import referralsIcon from '@/assets/referrals.svg';
import { useTranslation } from 'react-i18next';
import { RefrulesProps, TextProps } from '@/types/components';

export const RefrulesHeader = ({ children }: TextProps) => (
  <h2 className="font-bold text-base text-white tracking-tighter leading-tight">{children}</h2>
);

export const RefrulesBody = ({ children }: TextProps) => (
  <p className="font-normal text-xs text-white tracking-tighter leading-tight">{children}</p>
);

export const RefrulesSubtext = ({ children }: TextProps) => (
  <p className="font-normal text-[10px] text-[#64646E] tracking-tighter leading-tight">{children}</p>
);

export function Refrules({ onClose }: RefrulesProps) {
  const { t } = useTranslation('common');
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#131217] w-[330px] max-h-[80vh] rounded-lg p-4 relative flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 z-10">
          <img src={closeIcon} alt="Close" className="w-6 h-6" />
        </button>
        <div className="overflow-y-auto flex-grow pr-4 space-y-4">
          <RefrulesHeader>{t('refrules_title')}</RefrulesHeader>
          <RefrulesBody>{t('refrules_intro')}</RefrulesBody>
          <RefrulesHeader>{t('refrules_level_title')}</RefrulesHeader>
          <table
            className="w-full"
            style={{
              border: '0.5px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr>
                <th className="p-2"><RefrulesSubtext>{t('refrules_table_level')}</RefrulesSubtext></th>
                <th className="p-2"><RefrulesSubtext>{t('refrules_table_deposits')}</RefrulesSubtext></th>
                <th className="p-2"><RefrulesSubtext>%</RefrulesSubtext></th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '0.5px solid rgba(255, 255, 255, 0.1)' }}>
                <td className="p-2"><RefrulesBody>{t('refrules_table_row_1_col_1')}</RefrulesBody></td>
                <td className="p-2"><RefrulesBody>{t('refrules_table_row_1_col_2')}</RefrulesBody></td>
                <td className="p-2"><RefrulesBody>{t('refrules_table_row_1_col_3')}</RefrulesBody></td>
              </tr>
              <tr style={{ borderBottom: '0.5px solid rgba(255, 255, 255, 0.1)' }}>
                <td className="p-2 flex items-center gap-1">
                  <RefrulesBody>{t('refrules_table_row_2_col_1')}</RefrulesBody>
                  <img src={referralsIcon} alt="Referrals" className="w-[14px] h-[10px]" />
                </td>
                <td className="p-2"><RefrulesBody>{t('refrules_table_row_2_col_2')}</RefrulesBody></td>
                <td className="p-2"><RefrulesBody>{t('refrules_table_row_2_col_3')}</RefrulesBody></td>
              </tr>
              <tr style={{ borderBottom: '0.5px solid rgba(255, 255, 255, 0.1)' }}>
                <td className="p-2 flex items-center gap-1">
                  <RefrulesBody>{t('refrules_table_row_3_col_1')}</RefrulesBody>
                  <img src={referralsIcon} alt="Referrals" className="w-[14px] h-[10px]" />
                </td>
                <td className="p-2"><RefrulesBody>{t('refrules_table_row_3_col_2')}</RefrulesBody></td>
                <td className="p-2"><RefrulesBody>{t('refrules_table_row_3_col_3')}</RefrulesBody></td>
              </tr>
              <tr>
                <td className="p-2 flex items-center gap-1">
                  <RefrulesBody>{t('refrules_table_row_4_col_1')}</RefrulesBody>
                  <img src={referralsIcon} alt="Referrals" className="w-[14px] h-[10px]" />
                </td>
                <td className="p-2"><RefrulesBody>{t('refrules_table_row_4_col_2')}</RefrulesBody></td>
                <td className="p-2"><RefrulesBody>{t('refrules_table_row_4_col_3')}</RefrulesBody></td>
              </tr>
            </tbody>
          </table>
          <RefrulesHeader>{t('refrules_conditions_title')}</RefrulesHeader>
          <RefrulesBody>{t('refrules_condition1')}</RefrulesBody>
          <RefrulesBody>{t('refrules_condition2')}</RefrulesBody>
          <RefrulesBody>{t('refrules_condition3')}</RefrulesBody>
          <RefrulesBody>{t('refrules_condition4')}</RefrulesBody>
          <RefrulesBody>{t('refrules_space')}</RefrulesBody>
          <RefrulesBody>{t('refrules_condition5')}</RefrulesBody>
        </div>
      </div>
    </div>
  );
}
