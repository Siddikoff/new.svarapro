import { memo } from 'react';

import { Sheet } from '../../../components/ui/Sheet';
import { SheetCloseButton } from '../components/SheetCloseButton';
import { AGREEMENT_SECTIONS } from '../profileData';
import styles from './AgreementSheet.module.css';

/**
 * "Пользовательское соглашение" sheet — static document with a list of
 * sections rendered from `profileData.AGREEMENT_SECTIONS`.
 */
interface AgreementSection {
  title: string;
  body: string;
}

function AgreementSheetImpl({ onClose }: { onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <div className={styles.closeWrap}>
        <SheetCloseButton onClick={onClose} />
      </div>
      <div className={styles.title}>Пользовательское соглашение</div>
      <div className={styles.date}>Действительно с 01.01.2025</div>
      <div className={styles.welcomeTitle}>Добро пожаловать в Svara!</div>
      <div className={styles.welcomeBody}>
        Настоящее Пользовательское соглашение регулирует использование вами наших услуг, включая
        онлайн-платформу для карточной игры, доступную в Telegram. Получая доступ к сервису, вы
        соглашаетесь с условиями ниже.
      </div>
      {AGREEMENT_SECTIONS.map((section: AgreementSection) => (
        <div key={section.title} className={styles.section}>
          <div className={styles.sectionTitle}>{section.title}</div>
          <div className={styles.sectionBody}>{section.body}</div>
        </div>
      ))}
    </Sheet>
  );
}

export const AgreementSheet = memo(AgreementSheetImpl);
