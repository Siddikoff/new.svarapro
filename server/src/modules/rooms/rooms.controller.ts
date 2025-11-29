import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';
import { User } from '../../entities/user.entity';

interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async getRooms() {
    return this.roomsService.getRooms();
  }

  @Get(':roomId/details')
  async getRoomDetails(@Param('roomId') roomId: string) {
    const details = await this.roomsService.getRoomDetails(roomId);
    if (!details) {
      throw new NotFoundException('Room not found');
    }
    return details;
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createRoom(
    @Body() createRoomDto: CreateRoomDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.roomsService.createRoom(createRoomDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  join(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.roomsService.joinRoom(id, req.user);
  }
}
