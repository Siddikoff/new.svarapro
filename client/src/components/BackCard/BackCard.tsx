import backImage from '@/assets/game/back.png';
import { cn } from '@/utils/cn';
import { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
    classNameImage?: string;
}

export function BackCard({className, classNameImage, ...props}: Props) {
    return(
        <div className={cn(className)} {...props}>
            <img className={cn("w-8 h-11", classNameImage)} src={backImage} alt="Back" />
        </div>
    )
}