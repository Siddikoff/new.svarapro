import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomsService } from './rooms.service';
import { RedisService } from '../../services/redis.service'; // Импортируем RedisService

@WebSocketGateway({ cors: { origin: '*' } })
export class RoomsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly roomsService: RoomsService,
    private readonly redisService: RedisService, // Инжектируем RedisService
  ) {}

  afterInit() {
    void this.redisService.subscribeToRoomUpdates(() => {
      void this.broadcastRoomsUpdate();
    });
  }

  async handleConnection(client: Socket) {
    const rooms = await this.roomsService.getRooms();
    client.emit('rooms', { action: 'initial', rooms });
    // Broadcast the updated online count to everyone (incl. the new
    // socket) so the lobby badge stays in sync without an extra REST
    // round-trip. The count comes straight from the engine so we don't
    // have to maintain a separate Set; reconnects automatically tick
    // the value back up after a transport drop.
    this.broadcastOnlineCount();
  }

  handleDisconnect() {
    // engine.clientsCount is decremented synchronously before this
    // hook runs, so reading it here gives the post-disconnect total.
    this.broadcastOnlineCount();
  }

  @SubscribeMessage('request_rooms')
  async handleRequestRooms(client: Socket) {
    const rooms = await this.roomsService.getRooms();
    client.emit('rooms', { action: 'initial', rooms });
    client.emit('online_count', this.getOnlineCount());
  }

  // Метод для рассылки обновленного списка комнат всем клиентам
  async broadcastRoomsUpdate() {
    const rooms = await this.roomsService.getRooms();
    this.server.emit('rooms', { action: 'update', rooms });
  }

  /**
   * Total number of currently connected sockets across the default
   * namespace. The lobby renders this as «N онлайн». We don't
   * deduplicate by `telegramId` here — each open WebApp tab counts as
   * one online presence, which matches what users see in their own
   * client (one tab = one online).
   */
  private getOnlineCount(): number {
    return this.server?.engine?.clientsCount ?? 0;
  }

  private broadcastOnlineCount() {
    this.server.emit('online_count', this.getOnlineCount());
  }
}
