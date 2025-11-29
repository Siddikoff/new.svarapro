import { Socket } from 'socket.io-client';
import { Page } from './page';
import { UserData } from './entities';
import React from 'react';

export type DashboardProps = {
  onMoreClick: () => void;
  setCurrentPage: (page: Page, data?: Record<string, unknown>) => void;
  balance: string;
  walletAddress: string | null;
  socket: Socket | null;
};

export type CreatePublicProps = {
  onClose: () => void;
  openModal: () => void;
  setCurrentPage: (page: Page, data?: Record<string, unknown>) => void;
  balance: string;
  setNotification: (type: NotificationType | null) => void;
  setIsCreatingRoom: (isCreating: boolean) => void;
};

export type CreatePrivateProps = {
  onClose: () => void;
  openModal: () => void;
  setCurrentPage: (page: Page, data?: Record<string, unknown>) => void;
  balance: string;
  setNotification: (type: NotificationType | null) => void;
  setIsCreatingRoom: (isCreating: boolean) => void;
};

export type ConnectRoomProps = {
  onClose: () => void;
  openModal: () => void;
  setCurrentPage: (page: Page, data?: Record<string, unknown>) => void;
};

export type RoomsListProps = {
  searchId: string;
  isAvailableFilter: boolean;
  stakeRange: [number, number];
  socket: Socket | null;
  setCurrentPage: (page: Page, data?: Record<string, unknown>) => void;
  balance: string;
  setNotification: (type: NotificationType | null) => void;
};

export type RoomProps = {
  roomId: string;
  players: number;
  stake: number;
  setCurrentPage: (page: Page, data?: Record<string, unknown>) => void;
  balance: string;
  setNotification: (type: NotificationType | null) => void;
};

export type ReferralProps = {
  onClose: () => void;
};

export type PopSuccessProps = {
  message?: string;
  onClose: () => void;
};

export type NotificationType = 'invalidAddress' | 'addressAlreadyUsed' | 'addressAdded' | 'comingSoon' | 'insufficientBalance' | 'gameJoinError';

export type NotificationProps = {
  type: NotificationType | null;
  onClose: () => void;
};

export type RefrulesProps = {
  onClose: () => void;
};

export type TextProps = {
  children: React.ReactNode;
};

export type GamerulesProps = {
  onClose: () => void;
};

export type EulaProps = {
  onClose: () => void;
};

export type ErrorAlertProps = {
  code?: keyof typeof import('@/locales/en/errors.json');
  customMessage?: string;
  className?: string;
  severity?: 'error' | 'warning';
};

export type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  icon?: string;
  typeLeftButton?: boolean;
  iconPosition?: 'left' | 'right';
  layout?: 'horizontal' | 'vertical';
  iconClassName?: string;
  isActive?: boolean;
  justify?: 'start' | 'center' | 'end';
  rightIcon?: string;
  rightText?: string;
  rightContentClassName?: string;
  rightIconClassName?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export type EnterGameMenuProps = {
  onClose: () => void;
  openModal: (modal: 'createPublic' | 'createPrivate' | 'connectRoom') => void;
};

export type HeaderProps = {
  user?: UserData;
  balance: string | number;
  onWithdrawClick: () => void;
  setCurrentPage: (page: Page, data?: Record<string, unknown>) => void;
};

export type FilterProps = {
  onSearchChange: (searchId: string) => void;
  onAvailabilityChange: (isAvailable: boolean) => void;
  onRangeChange: (range: [number, number]) => void;
};

export type ButtonGroupProps = {
  onMoreClick: () => void;
  onComingSoonClick: () => void;
  onCreateRoomClick: () => void;
};

export type ConfirmDepositProps = {
  address: string;
  currency: string;
  trackerId: string;
};

export type ConfirmWithdrawProps = {
  withdrawAmount: string;
  walletAddress: string;
};

export type DepositHistoryProps = {
  setCurrentPage: (page: Page, data?: Record<string, unknown>) => void;
  userId: string;
};

export type DepositProps = {
  setCurrentPage: (page: Page, data?: Record<string, unknown>) => void;
};

export type WithdrawProps = {
  balance: string;
  setCurrentPage: (page: Page, data?: Record<string, unknown>) => void;
  setWithdrawAmount: (amount: string) => void;
};

export type AddWalletProps = {
  setCurrentPage: (page: Page, data?: Record<string, unknown>) => void;
  setWalletAddress: (address: string) => void;
};

export type MoreProps = {
  userData?: UserData;
  setCurrentPage: (page: Page, data?: Record<string, unknown>) => void;
};

export type GameRoomProps = {
  roomId: string;
  socket: Socket | null;
  balance: string;
};

export type GameMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  onExit: () => void;
};

export type ExitMenuProps = {
  onClose: () => void;
  onConfirm: () => void;
};

export type SlidePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onRangeChange: (range: [number, number]) => void;
};

export type AddWalletWindowProps = {
  onClose: () => void;
  onAdd: () => void;
};

export type StyledContainerProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  isActive?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;
