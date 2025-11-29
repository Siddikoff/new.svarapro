import { useState } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { useTranslation } from 'react-i18next';
import { SlidePanelProps } from '@/types/components';

export function SlidePanel({ isOpen, onRangeChange }: SlidePanelProps) {
  const { t } = useTranslation('common');
  const [rangeValues, setRangeValues] = useState<[number, number]>([0, 1000000]);
  const [colorRange, setColorRange] = useState('#807C7C');
  const handleRangeChange = (value: number | number[]) => {
    const newRange = Array.isArray(value) ? value as [number, number] : [0, 1000000];
    // Ограничиваем значения в пределах [0, 1000000] и гарантируем порядок
    const [minVal, maxVal] = [
      Math.max(0, Math.min(newRange[0], 1000000)),
      Math.max(0, Math.min(newRange[1], 1000000)),
    ].sort((a, b) => a - b) as [number, number];
    const validRange: [number, number] = [minVal, Math.max(minVal, maxVal)]; // Убеждаемся, что max >= min

    if (minVal == 0 && maxVal == 1000000) {
      setColorRange('#807C7C');
      console.log(minVal, maxVal)
    } else {
      setColorRange('#00D600');
    }

    setRangeValues(validRange);
    onRangeChange(validRange); // Передаём родителю
  };

  if (!isOpen) return null;

  return (
    <div
      className="shadow-lg rounded-b-lg p-2 mx-auto w-[93vw] relative"
      style={{
        boxShadow: '0px 5.5px 10px rgba(0, 0, 0, 0.25), 0px -2px 8px rgba(0, 0, 0, 0.3)',
        borderRadius: '0 0 8px 8px',
        background: '#48454D',
        position: 'relative',
        overflow: 'visible',
        zIndex: -1,
        marginTop: '0'
      }}
    >
      <div className="relative z-10">
        <p 
          className="text-white text-center mb-2"
          style={{
            fontWeight: 600,
            fontStyle: 'normal',
            fontSize: '13px',
            lineHeight: '150%',
            letterSpacing: '-1.1%',
            verticalAlign: 'middle'
          }}
        >{t('show_only')}</p>
        <div
          className="p-1 rounded-lg relative"
          style={{
            boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
            borderRadius: '15px',
            width: '100%',
            marginLeft: '6px',
            marginRight: '6px',
            height: '34px',
            margin: '0 auto',
            maxWidth: '320px',
            background: '#48454D',
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div style={{ position: 'relative', height: '22px', width: '100%', paddingLeft: '23px', paddingRight: '23px', zIndex: 10, margin: '0 auto', display: 'flex', alignItems: 'center' }}>
            <Slider
              range
              min={0}
              max={1000000}
              value={rangeValues}
              onChange={handleRangeChange}
              railStyle={{ background: '#807C7C', borderRadius: '15px', height: '4px' }}
              trackStyle={[{ background: colorRange, height: '4px' }]}
              handleStyle={[
                { 
                  boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)', 
                  border: 'none', 
                  width: '20px', 
                  height: '20px',
                  background: 'linear-gradient(0deg, #666666 0%, #FFFFFF 100%)',
                  opacity: 1,
                  transform: 'translateY(-3px)'
                },
                { 
                  boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)', 
                  border: 'none', 
                  width: '20px', 
                  height: '20px',
                  background: 'linear-gradient(0deg, #666666 0%, #FFFFFF 100%)',
                  opacity: 1,
                  transform: 'translate(-15px, -3px)'
                },
              ]}
              style={{ width: '100%', position: 'relative', height: '4px' }}
            />
          </div>
        </div>
        <div className="flex justify-around mt-2 mx-auto" style={{ width: '281px' }}>
          <span 
            className="text-white"
            style={{
              fontWeight: 600,
              fontStyle: 'normal',
              fontSize: '15px',
              lineHeight: '150%',
              letterSpacing: '-1.1%',
              verticalAlign: 'middle'
            }}
          >1</span>
          <span 
            className="text-white"
            style={{
              fontWeight: 600,
              fontStyle: 'normal',
              fontSize: '15px',
              lineHeight: '150%',
              letterSpacing: '-1.1%',
              verticalAlign: 'middle'
            }}
          >100</span>
          <span 
            className="text-white"
            style={{
              fontWeight: 600,
              fontStyle: 'normal',
              fontSize: '15px',
              lineHeight: '150%',
              letterSpacing: '-1.1%',
              verticalAlign: 'middle'
            }}
          >500</span>
          <span 
            className="text-white"
            style={{
              fontWeight: 600,
              fontStyle: 'normal',
              fontSize: '15px',
              lineHeight: '150%',
              letterSpacing: '-1.1%',
              verticalAlign: 'middle'
            }}
          >1K</span>
          <span 
            className="text-white"
            style={{
              fontWeight: 600,
              fontStyle: 'normal',
              fontSize: '15px',
              lineHeight: '150%',
              letterSpacing: '-1.1%',
              verticalAlign: 'middle'
            }}
          >10K</span>
          <span 
            className="text-white"
            style={{
              fontWeight: 600,
              fontStyle: 'normal',
              fontSize: '15px',
              lineHeight: '150%',
              letterSpacing: '-1.1%',
              verticalAlign: 'middle'
            }}
          >100K</span>
          <span 
            className="text-white"
            style={{
              fontWeight: 600,
              fontStyle: 'normal',
              fontSize: '15px',
              lineHeight: '150%',
              letterSpacing: '-1.1%',
              verticalAlign: 'middle'
            }}
          >1M</span>
        </div>
      </div>
    </div>
  );
}
