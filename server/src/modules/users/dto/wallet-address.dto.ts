import { IsString, Length } from 'class-validator';

export class WalletAddressDto {
  @IsString()
  @Length(48, 48, {
    message: 'Wallet address must be exactly 48 characters long',
  })
  walletAddress: string;
}
