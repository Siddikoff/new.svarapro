import React from 'react';

import turn_the_phone_over from '@/assets/turn_the_phone_over.gif';

export function TurnPhoneOver() {
    return (
        <div className='fixed top-[0] left-[0] w-full h-full z-[1000000] bg-black'>
            <img className='absolute top-[0] left-[0] w-full h-full object-contain' src={turn_the_phone_over} alt="Поверните свой телефон" />
        </div>
    );
};

