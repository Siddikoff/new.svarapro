import { StyledContainer } from '@/components/StyledContainer';
import { ButtonProps } from '@/types/components';
import { useState } from 'react';

export function Button({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  icon,
  typeLeftButton = false,
  iconPosition = 'left',
  layout = 'horizontal',
  iconClassName = 'w-6 h-6',
  isActive = false,
  justify = 'center',
  rightIcon,
  rightText,
  rightContentClassName,
  rightIconClassName,
  ...rest
}: ButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log('🎯 Button click, isPressed:', isPressed);
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);
    onClick?.(e);
  };
  const baseClasses = 'relative flex items-center font-semibold text-white';

  const sizeClasses = {
    sm: 'h-10 text-sm',
    md: 'h-12 text-base',
    lg: 'h-14 text-lg',
    xl: 'h-[55px] text-base',
  };
  const finalSizeClasses = `${sizeClasses[size]}`;

  const fullWidthClass = fullWidth ? 'w-full' : '';

  const iconMargin = layout === 'vertical'
    ? (iconPosition === 'left' ? '-mb-1' : 'mt-0')
    : (iconPosition === 'left' ? 'mr-2' : 'ml-2');

  const renderIcon = (src: string, className: string, type: string) => {
    return type=='left'?<div className='w-8 mr-[7px]'><img src={src} alt="" className={className} /></div>:<img src={src} alt="" className={className} />;
  };
  // const leftIconElement = icon ? renderIcon(icon, `${iconClassName} ${iconMargin}`) : null; - проверим
  const leftIconElement = icon ? 
    typeLeftButton ?
         renderIcon(icon, `${iconClassName} ${iconMargin}`, 'left') 
         : 
         renderIcon(icon, `${iconClassName} ${iconMargin}`, 'center') 
    : null;


  const textElement = <span className="relative z-10">{children}</span>;

  let content;
  if (layout === 'vertical') {
    if (iconPosition === 'right') {
      content = <>{textElement}{leftIconElement}</>;
    } else {
      content = <>{leftIconElement}{textElement}</>;
    }
  } else {
    content = <>{leftIconElement}{textElement}</>;
  }

  const contentLayoutClass = layout === 'vertical' ? 'flex-col' : 'flex-row';
  const justifyClass = `justify-${justify}`;

  if (variant === 'secondary') {
    return (
      <button onClick={handleClick} className={`${baseClasses} ${finalSizeClasses} ${fullWidthClass} ${isPressed ? 'button-press' : ''} ${rest.className || ''}`} {...rest}>
        <StyledContainer
          className="w-full h-full"
          contentClassName={`w-full h-full flex items-center px-3 ${justifyClass} ${contentLayoutClass}`}
          isActive={isActive}
        >
          {content}
          {(rightIcon || rightText) && (
            <div className={`ml-auto flex-shrink-0 flex items-center ${rightContentClassName}`}>
              {rightText && <span>{rightText}</span>}
              {rightIcon && renderIcon(rightIcon, `${rightIconClassName || iconClassName} ml-2`, 'right')}
            </div>
          )}
        </StyledContainer>
      </button>
    );
  }

  const variantClasses = {
    primary: 'bg-gradient-to-b from-yellow-400 to-yellow-600 text-white rounded-lg',
    tertiary: 'bg-transparent text-white rounded-lg',
  };
  const finalVariantClasses = variantClasses[variant] || '';

  return (
    <button onClick={handleClick} className={`${baseClasses} ${finalSizeClasses} ${fullWidthClass} ${finalVariantClasses} ${isPressed ? 'button-press' : ''} ${rest.className || ''}`} {...rest}>
    <div className={`flex items-center px-4 ${justifyClass} ${contentLayoutClass}`}>
      {content}
      {(rightIcon || rightText) && (
        <div className={`ml-auto flex-shrink-0 flex items-center ${rightContentClassName}`}>
          {rightText && <span>{rightText}</span>}
                        {rightIcon && renderIcon(rightIcon, `${rightIconClassName || iconClassName} ml-2`, 'right')}
        </div>
      )}
    </div>
  </button>
  );
}