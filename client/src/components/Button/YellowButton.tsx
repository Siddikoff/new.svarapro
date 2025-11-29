import { clsx } from 'clsx';
import { ButtonProps } from '@/types/components';
import { useState } from 'react';

export function YellowButton({
  children,
  onClick,
  icon,
  iconPosition = 'left',
  size = 'sm', // По умолчанию 'sm' (28px)
  isActive = true, // По умолчанию активна
  className,
  ...rest
}: ButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);
    onClick?.(e);
  };
  const sizeClasses: Record<string, string> = {
    sm: 'h-[28px] px-3 text-[13px]',
    lg: 'h-[47px] px-4 text-[16px]',
  };
  const finalSizeClasses = sizeClasses[size];

  const activeClasses = 'text-black bg-[linear-gradient(180deg,#FFC53F_7.5%,#AF6600_100%)]';
  const inactiveClasses = 'bg-[#48454D] text-[#3B3846]';

  const buttonClasses = clsx(
    finalSizeClasses,
    'rounded-[6px]',
    'border-none',
    'cursor-pointer',
    'font-inter',
    'font-semibold',
    'tracking-[-0.011em]',
    isActive ? activeClasses : inactiveClasses,
    'flex',
    'items-center',
    'justify-center',
    isPressed ? 'button-press' : '',
    className
  );

  return (
    <button
      onClick={handleClick}
      className={buttonClasses}
      disabled={!isActive}
      {...rest}
    >
      {icon && iconPosition === 'left' && (
        <img src={icon} alt="" className="w-[24px] h-[24px] mr-2" />
      )}
      {children}
      {icon && iconPosition === 'right' && (
        <img src={icon} alt="" className="w-[24px] h-[24px] ml-2" />
      )}
    </button>
  );
}
