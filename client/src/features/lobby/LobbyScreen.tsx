import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BalanceCard } from '../../components/BalanceCard';
import { COLORS } from '../../designSystem';
import { useRooms } from '../../hooks/useRooms';
import type { RoomMode } from '../../store/roomStore';
import { useRoomStore } from '../../store/roomStore';
import type { Room, User } from '../../types/domain';
import { ActiveRoomsHeader } from './ActiveRoomsHeader';
import { LobbyFilterBar } from './LobbyFilterBar';
import { LobbyFilterSheet } from './LobbyFilterSheet';
import { RoomCard } from './RoomCard';

const screenStyle : React.CSSProperties = {
  paddingBottom: 12,
  paddingTop: 12,
};

const listContainerStyle : React.CSSProperties = {
  padding: '0 12px',
};

const emptyStateStyle : React.CSSProperties = {
  color: COLORS.hint,
  fontSize: 14,
  textAlign: 'center',
  padding: '30px 0',
};

/**
 * Top-level lobby screen.
 *
 * Composition only — all room data and filters live in `roomStore`, exposed
 * through `useRooms`. Per-room interactions go through the `onRoom` prop so
 * the screen stays decoupled from `gameStore` / loader sequencing.
 */
interface LobbyScreenProps {
  user: User;
  onDeposit: () => void;
  onWithdraw: () => void;
  onRoom: (room: Room, mode: RoomMode) => void;
}

export function LobbyScreen({ user, onDeposit, onWithdraw, onRoom }: LobbyScreenProps) {
  const { t } = useTranslation();
  const { rooms, filteredRooms, filters, activeFilterCount } = useRooms();
  const isLoadingRooms = useRoomStore((state) => state.isLoadingRooms);
  const setFilter = useRoomStore((state) => state.setFilter);
  const resetFilters = useRoomStore((state) => state.resetFilters);

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const onlineCount = useMemo(
    () => rooms.reduce((total: number, room: Room) => total + room.players, 0),
    [rooms],
  );

  const handleSearchChange = useCallback(
    (value: string) => setFilter('search', value),
    [setFilter],
  );

  const handleToggleAvailable = useCallback(
    () => setFilter('onlyAvailable', !filters.onlyAvailable),
    [setFilter, filters.onlyAvailable],
  );

  const handleJoinRoom = useCallback((room: Room) => onRoom(room, 'join'), [onRoom]);
  const handleWatchRoom = useCallback((room: Room) => onRoom(room, 'watch'), [onRoom]);

  return (
    <div style={screenStyle}>
      <BalanceCard user={user} onDeposit={onDeposit} onWithdraw={onWithdraw} />

      <LobbyFilterBar
        searchValue={filters.search}
        onlyAvailable={filters.onlyAvailable}
        activeFilterCount={activeFilterCount}
        onSearchChange={handleSearchChange}
        onToggleOnlyAvailable={handleToggleAvailable}
        onOpenFilters={() => setIsFilterSheetOpen(true)}
      />

      <div style={listContainerStyle}>
        <ActiveRoomsHeader onlineCount={onlineCount} />
        {filteredRooms.length === 0 ? (
          // While the first `fetchRooms()` / socket push is in flight we
          // show a neutral loading line instead of "rooms not found" so
          // the lobby doesn't flash an empty-state error before any data
          // has arrived.
          <div style={emptyStateStyle}>
            {isLoadingRooms && rooms.length === 0 ? t('loading') : t('rooms_not_found')}
          </div>
        ) : (
          filteredRooms.map((room: Room) => (
            <RoomCard key={room.id} room={room} onJoin={handleJoinRoom} onWatch={handleWatchRoom} />
          ))
        )}
      </div>

      {isFilterSheetOpen && (
        <LobbyFilterSheet
          filters={filters}
          activeFilterCount={activeFilterCount}
          filteredCount={filteredRooms.length}
          onClose={() => setIsFilterSheetOpen(false)}
          onChangeFilter={setFilter}
          onReset={resetFilters}
        />
      )}
    </div>
  );
}
