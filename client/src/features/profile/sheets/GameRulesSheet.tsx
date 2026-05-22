import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { Sheet } from '../../../components/ui/Sheet';
import { SheetCloseButton } from '../components/SheetCloseButton';
import styles from './GameRulesSheet.module.css';

/**
 * "Правила игры" sheet.
 *
 * All copy comes from the i18n `gamerules_*` keys in `locales/<lang>/common.json`.
 * Mirrors the section structure of the original repo's `LongRead/gamerules.tsx`
 * (deal → bets → ante → blind → normal bets → svara → count → combos → special
 * → examples → terms), but rendered inside a v143-style bottom sheet to match
 * the redesigned profile screen.
 */
function GameRulesSheetImpl({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <Sheet onClose={onClose}>
      <div className={styles.closeWrap}>
        <SheetCloseButton onClick={onClose} />
      </div>
      <div className={styles.title}>{t('gamerules_title')}</div>

      <div className={styles.sectionTitle}>{t('gamerules_deal_title')}</div>
      <div className={styles.sectionBody}>{t('gamerules_deal_body')}</div>

      <div className={styles.sectionTitle}>{t('gamerules_bets_title')}</div>
      <div className={styles.sectionBody}>{t('gamerules_bets_body')}</div>

      <div className={styles.sectionTitle}>{t('gamerules_ante_title')}</div>
      <div className={styles.sectionBody}>{t('gamerules_ante_body')}</div>

      <div className={styles.sectionTitle}>{t('gamerules_blind_title')}</div>
      <div className={styles.sectionBody}>{t('gamerules_blind_body')}</div>

      <div className={styles.sectionTitle}>{t('gamerules_normalbets_title')}</div>
      <div className={styles.sectionBody}>{t('gamerules_normalbets_body1')}</div>
      <div className={styles.sectionBody}>{t('gamerules_normalbets_body2')}</div>

      <div className={styles.sectionTitle}>{t('gamerules_svara_title')}</div>
      <div className={styles.sectionBody}>{t('gamerules_svara_body1')}</div>
      <div className={styles.sectionBody}>{t('gamerules_svara_body2')}</div>

      <div className={styles.sectionTitle}>{t('gamerules_count_title')}</div>
      <div className={styles.sectionBody}>{t('gamerules_count_body')}</div>
      <ul className={styles.list}>
        <li>{t('gamerules_table_row_1')}</li>
        <li>{t('gamerules_table_row_2')}</li>
        <li>{t('gamerules_table_row_3')}</li>
        <li>{t('gamerules_table_row_4')}</li>
        <li>{t('gamerules_table_row_5')}</li>
        <li>{t('gamerules_table_row_6')}</li>
        <li>{t('gamerules_table_row_7')}</li>
        <li>{t('gamerules_table_row_8')}</li>
        <li>{t('gamerules_table_row_9')}</li>
      </ul>

      <div className={styles.sectionTitle}>{t('gamerules_combos_title')}</div>
      <div className={styles.sectionBody}>{t('gamerules_combos_body1')}</div>
      <div className={styles.sectionBody}>{t('gamerules_combos_body2')}</div>
      <div className={styles.sectionBody}>{t('gamerules_combos_body3')}</div>
      <div className={styles.sectionBody}>{t('gamerules_combos_body4')}</div>

      <div className={styles.sectionTitle}>{t('gamerules_special_title')}</div>
      <div className={styles.sectionBody}>{t('gamerules_special_body1')}</div>
      <div className={styles.sectionBody}>{t('gamerules_special_body2')}</div>
      <div className={styles.sectionBody}>{t('gamerules_special_body3')}</div>
      <div className={styles.sectionBody}>{t('gamerules_special_body4')}</div>

      <div className={styles.sectionTitle}>{t('gamerules_examples_title')}</div>
      <ul className={styles.list}>
        <li>{t('gamerules_example1')}</li>
        <li>{t('gamerules_example2')}</li>
        <li>{t('gamerules_example3')}</li>
        <li>{t('gamerules_example4')}</li>
        <li>{t('gamerules_example5')}</li>
        <li>{t('gamerules_example6')}</li>
        <li>{t('gamerules_example7')}</li>
        <li>{t('gamerules_example8')}</li>
      </ul>

      <div className={styles.sectionTitle}>{t('gamerules_terms_title')}</div>
      <ul className={styles.list}>
        <li>{t('gamerules_terms_body1')}</li>
        <li>{t('gamerules_terms_body2')}</li>
        <li>{t('gamerules_terms_body3')}</li>
        <li>{t('gamerules_terms_body4')}</li>
        <li>{t('gamerules_terms_body5')}</li>
        <li>{t('gamerules_terms_body6')}</li>
        <li>{t('gamerules_terms_body7')}</li>
      </ul>
      <div className={styles.sectionBody}>{t('gamerules_terms_body8')}</div>
    </Sheet>
  );
}

export const GameRulesSheet = memo(GameRulesSheetImpl);
