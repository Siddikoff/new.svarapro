import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation('common');
  return (
    <div
      className="font-inter"
      style={{
        boxSizing: 'border-box',
        width: '300px',
        height: '21px',
        margin: '50px auto 16px', // 50px сверху, 16px снизу, центрирование
        fontStyle: 'normal',
        fontWeight: 600, // Как в ButtonGroup
        fontSize: '14px', // Фиксированный размер
        lineHeight: '150%', // 21px
        textAlign: 'center',
        letterSpacing: '-0.011em', // Как в ButtonGroup
        color: 'rgba(201, 198, 206, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        whiteSpace: 'nowrap', // Убираем перенос текста
      }}
    >
      <span style={{ fontSize: '14px' }}>© 2024 | {t('all_rights_reserved')}</span>
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ marginLeft: '8px' }} // Отступ справа от текста
      >
        <mask
          id="mask0_76_552"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="22"
          height="22"
          style={{ maskType: 'luminance' }} // Используем объект стилей
        >
          <path d="M0 0H22V22H0V0Z" fill="white" />
        </mask>
        <g mask="url(#mask0_76_552)">
          <path d="M11 1.56005C5.79505 1.56005 1.56005 5.79505 1.56005 11C1.56005 16.2049 5.79505 20.4399 11 20.4399C16.2049 20.4399 20.4399 16.2049 20.4399 11C20.4399 5.79505 16.2049 1.56005 11 1.56005ZM11 22C9.51557 22 8.07469 21.709 6.71802 21.1355C5.40833 20.5809 4.23156 19.788 3.22151 18.7779C2.21203 17.7684 1.41911 16.5917 0.864531 15.282C0.291042 13.9253 0 12.4844 0 11C0 9.51557 0.291042 8.07469 0.864531 6.71802C1.41911 5.40833 2.21203 4.23156 3.22151 3.22208C4.23156 2.21203 5.40833 1.41911 6.71802 0.864531C8.07469 0.291042 9.51557 0 11 0C12.4844 0 13.9253 0.291042 15.282 0.864531C16.5917 1.41911 17.7684 2.21203 18.7779 3.22208C19.788 4.23156 20.5809 5.40833 21.1355 6.71802C21.709 8.07469 22 9.51557 22 11C22 12.4844 21.709 13.9253 21.1355 15.282C20.5809 16.5917 19.788 17.7684 18.7779 18.7779C17.7684 19.788 16.5917 20.5809 15.282 21.1355C13.9253 21.709 12.4844 22 11 22Z" fill="white" fill-opacity="0.7" />
        </g>
        <text
          x="50%"
          y="53%"
          textAnchor="middle"
          dy=".3em"
          fill="#C9C6CE"
          style={{
            fontStyle: 'normal',
            fontWeight: 600, // Как в ButtonGroup
            fontSize: '10px', // Фиксированный размер
          }}  
        >
          18+
        </text>
      </svg>
    </div>
  );
}
