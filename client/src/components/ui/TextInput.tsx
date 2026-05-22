import type { ChangeEvent, CSSProperties, HTMLInputTypeAttribute, InputHTMLAttributes } from 'react';

import { COLORS, RADIUS } from '../../designSystem';

export interface TextInputProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: HTMLInputTypeAttribute;
  style?: CSSProperties;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
  maxLength?: number;
  className?: string;
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type,
  style,
  inputMode,
  autoComplete,
  maxLength,
  className,
}: TextInputProps) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type || 'text'}
      inputMode={inputMode}
      autoComplete={autoComplete}
      maxLength={maxLength}
      className={className}
      style={{
        background: COLORS.input,
        border: '1.5px solid ' + COLORS.div,
        borderRadius: RADIUS.md,
        color: COLORS.text,
        fontSize: 16,
        padding: '12px 14px',
        width: '100%',
        outline: 'none',
        WebkitTextSizeAdjust: 'none',
        ...style,
      }}
    />
  );
}
