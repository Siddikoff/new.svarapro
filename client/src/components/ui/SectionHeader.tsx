import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  title: string;
  label: string;
  accent: string;
  count: number | string;
  countLabel: string;
}

export function SectionHeader({ title, label, accent, count, countLabel }: SectionHeaderProps) {
  const dotImage = 'radial-gradient(circle at 1px 1px, ' + accent + '44 1px, transparent 0)';
  return (
    <div className={styles.root}>
      <div className={styles.dotPattern} style={{ backgroundImage: dotImage }} />
      <div
        className={styles.bloom}
        style={{ background: 'radial-gradient(circle, ' + accent + '55, transparent 70%)' }}
      />
      <div className={styles.row}>
        <div>
          <div className={styles.title}>{title}</div>
          <div className={styles.label}>{label}</div>
        </div>
        <div className={styles.countCol}>
          <div className={styles.count} style={{ color: accent }}>
            {count}
          </div>
          <div className={styles.countLabel}>{countLabel}</div>
        </div>
      </div>
    </div>
  );
}
