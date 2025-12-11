import { IsNotEmpty, IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { RubPaymentMethod } from '../../../services/noros.service';

export class GetBanksDto {
  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsEnum(RubPaymentMethod)
  method?: RubPaymentMethod;
}
