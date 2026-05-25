import { Injectable } from '@nestjs/common';
import { RedisService } from '../../services/redis.service';
import { Room } from '../../types/game';
import { CreateRoomDto } from './dto/create-room.dto';
import { GameStateService } from '../game/services/game-state.service';
import { User } from '../../entities/user.entity';
import { UsersService } from '../users/users.service';
import { TelegramService } from '../../services/telegram.service';
import { SystemRoomsService } from '../system-rooms/system-rooms.service';

@Injectable()
export class RoomsService {
  constructor(
    private readonly redisService: RedisService,
    private readonly gameStateService: GameStateService,
    private readonly usersService: UsersService,
    private readonly telegramService: TelegramService,
    private readonly systemRoomsService: SystemRoomsService,
  ) {}

  async getRooms(): Promise<Room[]> {
    // Получаем системные комнаты (они всегда показываются первыми)
    const systemRooms = await this.systemRoomsService.getSystemRooms();

    // Получаем пользовательские комнаты
    const roomIds = await this.redisService.getActiveRooms();
    const userRooms: Room[] = [];

    for (const roomId of roomIds) {
      // Пропускаем системные комнаты, так как они уже получены выше
      if (this.systemRoomsService.isSystemRoom(roomId)) {
        continue;
      }

      const room = await this.redisService.getRoom(roomId);
      if (room) {
        userRooms.push(room);
      }
    }

    // Объединяем: сначала системные комнаты, потом пользовательские
    return [...systemRooms, ...userRooms];
  }

  async getRoomDetails(
    roomId: string,
  ): Promise<(Partial<Room> & { playerCount: number }) | null> {
    const room = await this.redisService.getRoom(roomId);
    if (!room) {
      return null;
    }

    return {
      minBet: room.minBet,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      status: room.status,
    };
  }

  async createRoom(createRoomDto: CreateRoomDto, user: User): Promise<Room> {
    let roomId: string;

    if (createRoomDto.type === 'private') {
      // Для приватных комнат ID = пароль
      roomId = createRoomDto.password!;
    } else {
      // Для публичных комнат генерируем случайный 4-значный ID
      roomId = Math.floor(1000 + Math.random() * 9000).toString();
    }

    const newRoom: Room = {
      roomId,
      minBet: createRoomDto.minBet,
      type: createRoomDto.type,
      players: [],
      spectators: [],
      status: 'waiting',
      maxPlayers: 6,
      createdAt: new Date(),
      password: createRoomDto.password,
    };

    await this.redisService.setRoom(roomId, newRoom);
    await this.redisService.addToActiveRooms(roomId);
    // Broadcast room creation so the lobby sees the new public room
    // without having to wait for a follow-up sit_down / leave / win
    // to trigger a publish.
    await this.redisService.publishRoomUpdate(roomId, newRoom);

    const initialGameState = this.gameStateService.createInitialGameState(
      roomId,
      createRoomDto.minBet,
    );
    await this.redisService.setGameState(roomId, initialGameState);

    // Отправляем уведомление в Telegram о создании приватной комнаты
    if (createRoomDto.type === 'private' && createRoomDto.password) {
      try {
        const message =
          `🎮 *Новая приватная комната создана!*\n\n` +
          `🔐 *Пароль:* \`${createRoomDto.password}\`\n` +
          `💰 *Минимальная ставка:* $${createRoomDto.minBet}\n\n` +
          `Присоединяйтесь к игре, используя пароль выше!`;

        // Отправляем сообщение в чат с ботом
        await this.telegramService.sendMessage(user.telegramId, message);
      } catch (error) {
        console.error(
          `Failed to send Telegram notification for private room ${roomId}:`,
          error,
        );
        // Не прерываем создание комнаты из-за ошибки уведомления
      }
    }

    return newRoom;
  }

  async joinRoom(roomId: string, user: User): Promise<Room> {
    // Ищем комнату по ID
    const room = await this.redisService.getRoom(roomId);

    if (!room) {
      throw new Error('Room not found');
    }

    if (room.players.includes(user.telegramId)) {
      // User is already in the room, just return the room
      return room;
    }

    if (room.players.length >= room.maxPlayers) {
      // Room is full, add as spectator
      if (!room.spectators.includes(user.telegramId)) {
        room.spectators.push(user.telegramId);
        await this.redisService.setRoom(room.roomId, room);
        await this.redisService.publishRoomUpdate(room.roomId, room);
      }
      return room;
    }

    // Add to room players list, but not to gameState players
    room.players.push(user.telegramId);
    await this.redisService.setRoom(room.roomId, room);
    // Broadcast the new player count so every lobby observer sees the
    // delta immediately instead of waiting for the in-room socket
    // `join_room` (which short-circuits because the player is already
    // in `room.players` from this REST handler).
    await this.redisService.publishRoomUpdate(room.roomId, room);

    return room;
  }
}
