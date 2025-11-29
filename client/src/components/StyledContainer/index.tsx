import { StyledContainerProps } from '@/types/components';

export function StyledContainer({ 
  children, 
  className = '', 
  contentClassName = 'w-full h-full flex items-center justify-center',
  isActive = false, // По умолчанию неактивен
  ...rest 
}: StyledContainerProps) {

  const innerBackground = isActive ? '#2E2B33' : '#48454D';
  const borderRadius = className.includes('rounded-lg') ? '8px' : className.includes('rounded-[15px]') ? '15px' : '8px';

  return (
    <div
      className={`relative box-border overflow-hidden text-white ${className}`}
      style={{
        background: 'linear-gradient(180deg, #48454D 0%, rgba(255, 255, 255, 0.3) 50%, #2D2B31 100%)',
        boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
        borderRadius: borderRadius,
        paddingTop: '18px',
        paddingBottom: '18px',
        ...rest.style,
      }}
      {...rest}
    >
      {/* Внутренний фон */}
      <div
        style={{
          position: 'absolute',
          inset: '1px',
          background: innerBackground,
          borderRadius: borderRadius,
          zIndex: 0,
        }}
      />
      {/* Контейнер для контента */}
      <div className={`relative z-10 ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}
