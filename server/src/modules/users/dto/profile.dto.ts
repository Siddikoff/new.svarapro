export class ProfileDto {
  id: string;
  telegramId: string;
  username: string | null;
  avatar: string | null;
  balance: number;
  walletAddress: string | null;
}
