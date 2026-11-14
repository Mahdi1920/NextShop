import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  async listMine(
    @Req() req: Request & { user?: any },
    @Query('limit') limitStr?: string,
  ) {
    const limit = limitStr ? Math.min(Math.max(1, parseInt(limitStr, 10)), 100) : 50;
    const userId = req.user.sub;
    const role = req.user.role;
    return this.notificationsService.listForUser(userId, role, limit);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: Request & { user?: any }) {
    const userId = req.user.sub;
    const role = req.user.role;
    const count = await this.notificationsService.getUnreadCount(userId, role);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    const result = await this.notificationsService.markAsRead(id);
    return { ok: true, notification: result };
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Req() req: Request & { user?: any }) {
    const userId = req.user.sub;
    const role = req.user.role;
    const result = await this.notificationsService.markAllAsRead(userId, role);
    return { ok: true, modifiedCount: result.modifiedCount };
  }
}

