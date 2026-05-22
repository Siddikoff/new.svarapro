export function CardIcon({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="28" fill="#3a4a5e" />
      <rect x="14" y="20" width="28" height="20" rx="3" fill="none" stroke="#fff" strokeWidth="2" />
      <line x1="14" y1="26" x2="42" y2="26" stroke="#fff" strokeWidth="2" />
      <rect x="18" y="32" width="6" height="3" rx="0.5" fill="#f5a623" />
    </svg>
  );
}
