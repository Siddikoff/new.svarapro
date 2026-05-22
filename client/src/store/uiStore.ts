import { create } from 'zustand';

import type { Tournament } from '../types/domain';

/**
 * uiStore — top-level navigation, active modal, splash flag.
 *
 * Separating UI state from data state (auth/rooms/game) keeps the surface
 * small and the actions easy to reason about. Components subscribe to just
 * the slices they need with `useUiStore(state => state.activeScreen)`.
 */

export const SCREENS = {
  lobby: 'lobby',
  rating: 'rating',
  tournament: 'tournament',
  profile: 'profile',
} as const;

export type ScreenName = (typeof SCREENS)[keyof typeof SCREENS];

export const MODALS = {
  none: null,
  action: 'action',
  deposit: 'deposit',
  withdraw: 'withdraw',
  create: 'create',
  join: 'join',
} as const;

export type ModalName = (typeof MODALS)[keyof typeof MODALS];

export const TOURNAMENT_TABS = {
  info: 'info',
  play: 'play',
} as const;

export type TournamentTab = (typeof TOURNAMENT_TABS)[keyof typeof TOURNAMENT_TABS];

export interface UiStoreState {
  activeScreen: ScreenName;
  activeModal: ModalName;
  activeTournament: Tournament | null;
  tournamentTab: TournamentTab;
  isSplashVisible: boolean;
  setActiveScreen: (screen: ScreenName) => void;
  openModal: (modal: ModalName) => void;
  closeModal: () => void;
  setActiveTournament: (tournament: Tournament | null) => void;
  setTournamentTab: (tab: TournamentTab) => void;
  hideSplash: () => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  activeScreen: SCREENS.lobby,
  activeModal: MODALS.none,
  activeTournament: null,
  tournamentTab: TOURNAMENT_TABS.info,
  isSplashVisible: true,

  setActiveScreen: (screen) => set({ activeScreen: screen }),
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: MODALS.none }),
  setActiveTournament: (tournament) => set({ activeTournament: tournament }),
  setTournamentTab: (tab) => set({ tournamentTab: tab }),
  hideSplash: () => set({ isSplashVisible: false }),
}));
