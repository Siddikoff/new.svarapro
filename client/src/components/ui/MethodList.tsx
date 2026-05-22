import { COLORS } from '../../designSystem';
import { MethodBadge } from '../icons/MethodBadge';
import styles from './MethodList.module.css';

interface MethodListItem {
  id: string;
  label: string;
  color: string;
  rate?: string;
  min?: number | string;
  fee?: string;
}

interface MethodListProps {
  methods: MethodListItem[];
  sel: string | null;
  onSel: (id: string) => void;
}

export function MethodList({ methods, sel, onSel }: MethodListProps) {
  return (
    <>
      {methods.map((E) => {
        const S = sel === E.id;
        return (
          <div
            key={E.id}
            onClick={() => onSel(E.id)}
            className={styles.row}
            style={{
              background: S ? COLORS.tintBlue : COLORS.input,
              border: '1.5px solid ' + (S ? COLORS.accent : COLORS.div),
            }}
          >
            <div className={styles.iconBox} style={{ background: E.color + '22' }}>
              <MethodBadge id={E.id} s={26} />
            </div>
            <div className={styles.info}>
              <div className={styles.label}>{E.label}</div>
              <div className={styles.sub}>{E.rate || 'Min ' + E.min + ' / Fee ' + E.fee}</div>
            </div>
            <div
              className={styles.radio}
              style={{
                border: '2px solid ' + (S ? COLORS.accent : COLORS.hint),
                background: S ? COLORS.accent : 'transparent',
              }}
            >
              {S && <div className={styles.radioDot} />}
            </div>
          </div>
        );
      })}
    </>
  );
}
