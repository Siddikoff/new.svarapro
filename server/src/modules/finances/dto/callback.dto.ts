import { IsString, IsOptional } from 'class-validator';

export class CallbackDto {
  @IsString()
  @IsOptional()
  tracker_id?: string;

  @IsString()
  @IsOptional()
  uid?: string;

  @IsString()
  @IsOptional()
  client_transaction_id?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString() // It's a string that needs to be parsed
  @IsOptional()
  amountInFact?: string;

  @IsString()
  @IsOptional()
  txId?: string;

  @IsString()
  @IsOptional()
  currencyInCode?: string;

  @IsString()
  @IsOptional()
  currencyOutCode?: string;
}
