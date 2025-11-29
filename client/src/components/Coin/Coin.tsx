import { cn } from "@/utils/cn"
import { HTMLAttributes } from "react"
import coinImage from '@/assets/game/coin.png';

interface Props extends HTMLAttributes<HTMLDivElement> {
    classNameImage?: string;
}

export const Coin = ({className, classNameImage, ...props}: Props) => {
    return(
        <div className={cn(className)} {...props}>
            <img className={cn('min-w-[20px] w-[20px] h-[16px]', classNameImage)} src={coinImage} alt="Coin" />
        </div>
    )
}