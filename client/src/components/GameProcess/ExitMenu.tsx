import React from 'react';
import { ExitMenuProps } from '@/types/components';
import { useTranslation } from 'react-i18next';

export const ExitMenu: React.FC<ExitMenuProps> = ({ onClose, onConfirm }) => {
  const { t } = useTranslation('common');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#47444C] w-[316px] h-[172px] rounded-lg flex flex-col items-center py-4 px-4 relative">
       
        
        <div className="h-[91px] flex items-center justify-center text-center">
          <p className="text-white leading-relaxed text-lg font-semibold px-[16px]">
            {t('exit_confirmation_text')}
          </p>
        </div>
        
        <div className="absolute bottom-0 left-0 w-full flex">
          <button 
            className="w-[164px] h-[49px] text-white font-semibold border-t border-r border-white border-opacity-10 hover:bg-white hover:bg-opacity-5 transition-colors duration-200"
            onClick={onConfirm}
          >
            {t('yes')}
          </button>
          <button 
            className="w-[164px] h-[49px] text-white font-semibold border-t border-white border-opacity-10 hover:bg-white hover:bg-opacity-5 transition-colors duration-200"
            onClick={onClose}
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};