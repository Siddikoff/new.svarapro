import type { ComponentType } from 'react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { featureFlags } from '../../constants/featureFlags';
import { COLORS, layout, zIndex } from '../../designSystem';
import { hapticTap } from '../../services/haptics';
import type { ScreenName } from '../../store/uiStore';
import { MODALS, SCREENS, useUiStore } from '../../store/uiStore';
import styles from './NavigationBar.module.css';
import {
  CreateActionIcon,
  LobbyIcon,
  type NavigationIconProps,
  ProfileIcon,
  RatingIcon,
  TournamentIcon,
} from './NavigationIcons';

interface NavTabConfig {
  id: ScreenName;
  /** i18n key under the `common` namespace. */
  labelKey: string;
  Icon: ComponentType<NavigationIconProps>;
}

// Tabs are filtered through the feature flags so the bar can scale down
// to lobby + profile when the tournaments / rating screens are hidden
// (e.g. in production before the backend ships those endpoints). When a
// flag is off the corresponding chunk also tree-shakes out of the
// `ScreenRouter` switch.
const SCREEN_TABS_LEFT: NavTabConfig[] = [
  { id: SCREENS.lobby, labelKey: 'tab_lobby', Icon: LobbyIcon },
  ...(featureFlags.ratingEnabled
    ? [{ id: SCREENS.rating, labelKey: 'tab_rating', Icon: RatingIcon }]
    : []),
];

const SCREEN_TABS_RIGHT: NavTabConfig[] = [
  ...(featureFlags.tournamentsEnabled
    ? [{ id: SCREENS.tournament, labelKey: 'tab_tournaments', Icon: TournamentIcon }]
    : []),
  { id: SCREENS.profile, labelKey: 'tab_profile', Icon: ProfileIcon },
];

interface NavTabProps {
  tab: NavTabConfig;
  isActive: boolean;
  onSelect: (id: ScreenName) => void;
}

function NavTab({ tab, isActive, onSelect }: NavTabProps) {
  const { t } = useTranslation();
  const color = isActive ? COLORS.accent : COLORS.hint;
  return (
    <button onClick={() => onSelect(tab.id)} className={styles.button}>
      <tab.Icon stroke={color} />
      <span
        className={`${styles.label} ${isActive ? styles.labelActive : ''}`}
        style={{ color }}
      >
        {t(tab.labelKey)}
      </span>
    </button>
  );
}

function NavigationBarImpl() {
  const { t } = useTranslation();
  const activeScreen = useUiStore((state) => state.activeScreen);
  const setActiveScreen = useUiStore((state) => state.setActiveScreen);
  const openModal = useUiStore((state) => state.openModal);

  const handleTabSelect = useCallback(
    (screenId: ScreenName) => {
      hapticTap();
      setActiveScreen(screenId);
    },
    [setActiveScreen],
  );

  const handleCreateClick = useCallback(() => {
    hapticTap();
    openModal(MODALS.action);
  }, [openModal]);

  return (
    <div
      className={styles.bar}
      style={{ maxWidth: layout.appMaxWidth, zIndex: zIndex.bottomBar }}
    >
      {SCREEN_TABS_LEFT.map((tab) => (
        <NavTab
          key={tab.id}
          tab={tab}
          isActive={activeScreen === tab.id}
          onSelect={handleTabSelect}
        />
      ))}
      <button onClick={handleCreateClick} className={styles.button}>
        <CreateActionIcon stroke={COLORS.hint} />
        <span className={styles.label} style={{ color: COLORS.hint }}>
          {t('tab_create')}
        </span>
      </button>
      {SCREEN_TABS_RIGHT.map((tab) => (
        <NavTab
          key={tab.id}
          tab={tab}
          isActive={activeScreen === tab.id}
          onSelect={handleTabSelect}
        />
      ))}
    </div>
  );
}

export const NavigationBar = memo(NavigationBarImpl);
