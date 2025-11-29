import { useState, useEffect } from 'react';
import { Room as RoomComponent } from './Room';
import { Button } from '@/components/Button/Button';
import { useTranslation } from 'react-i18next';
import { Room } from '@/types/game';
import { RoomsListProps } from '@/types/components';

import './RoomsList.css'

const ITEMS_PER_PAGE = 10;

export function RoomsList({ searchId, isAvailableFilter, stakeRange, socket, setCurrentPage, balance, setNotification }: RoomsListProps) {
  const { t } = useTranslation('common');
  const [currentPage, setPage] = useState(1);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (socket) {
      const handleRoomsUpdate = (data: { action: string; rooms?: Room[] }) => {
        if (data.action === 'initial' || data.action === 'update') {
          if (data.rooms) {
            setRooms(data.rooms);
          }
        }
      };

      socket.on('rooms', handleRoomsUpdate);
      socket.emit('request_rooms');

      return () => {
        socket.off('rooms', handleRoomsUpdate);
      };
    }
  }, [socket]);

  useEffect(() => {
    setPage(1); // Сбрасываем страницу при изменении фильтров
  }, [searchId, isAvailableFilter, stakeRange]);

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = searchId === '' || room.roomId === searchId;
    const matchesAvailability = !isAvailableFilter || room.players.length < room.maxPlayers;
    const matchesStake = room.minBet >= stakeRange[0] && room.minBet <= stakeRange[1];
    return matchesSearch && matchesAvailability && matchesStake && room.type === 'public'; // Только публичные
  });

  const totalPages = Math.ceil(filteredRooms.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRooms = filteredRooms.slice(startIndex, startIndex + ITEMS_PER_PAGE);



  return (
    <div className="space-y-4 mx-auto w-[93vw]">
     
      
      <p className="adaprive_font text-white text-center mb-2">{t('join_game_now')}</p>
      {paginatedRooms.length > 0 ? (
        paginatedRooms.map((room) => (
          <RoomComponent
            key={room.roomId}
            roomId={room.roomId}
            players={room.players.length}
            stake={room.minBet}
            setCurrentPage={setCurrentPage}
            balance={balance}
            setNotification={setNotification}
          />
        ))
      ) : (
        <p className="text-white text-center">{t('rooms_not_found')}</p>
      )}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2 mt-4">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
            <Button
              key={page}
              variant="secondary"
              className="w-[32px] h-[25px] text-sm text-gray-400"
              isActive={page === currentPage}
              onClick={() => setPage(page)}
            >
              {page}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
