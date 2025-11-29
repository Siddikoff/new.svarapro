import { ButtonProps } from '@/types/components';
import { useState } from 'react';

export function GreenButton({ children, onClick, ...rest }: ButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);
    onClick?.(e);
  };
  return (
    <button
      className={`text-white rounded-[6px] w-[85px] h-[28px] flex items-center justify-center ${isPressed ? 'button-press' : ''}`}
      style={{
        ...rest.style,
        backgroundColor: 'rgb(18 183 84)',
        textShadow: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px rgba(0, 0, 0, 0.15)',
      }}
      onClick={handleClick}
    >
      <span className="font-inter font-semibold text-[13px] leading-[20px] text-center">
        {children}
      </span>
    </button>
  );
}
