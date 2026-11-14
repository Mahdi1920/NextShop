import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { isUUID } from 'class-validator';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { NotificationsGateway } from './notifications.gateway';
import { UserRole } from '../common/enums/role.enum';

export interface CreateNotificationParams {
  recipientId?: string | null;
  role?: UserRole | null;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly gateway: NotificationsGateway,
  ) {}

  async createAndSend(params: CreateNotificationParams): Promise<NotificationDocument> {
    const doc = new this.notificationModel({
      recipientId: params.recipientId ?? null,
      role: params.role || null,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data || {},
      isRead: false,
    });

    const saved = await doc.save();
    const payload = saved.toObject();

    // Emit live notification
    if (params.recipientId) {
      this.gateway.sendToUser(params.recipientId.toString(), 'notification', payload);
    }
    if (params.role) {
      this.gateway.sendToRole(params.role, 'notification', payload);
    }

    this.logger.log(`Sent notification [${params.type}] to user:${params.recipientId || 'none'} role:${params.role || 'none'}`);
    return saved;
  }

  // Live event helper without saving to DB
  emitLiveEvent(target: { userId?: string; role?: string; broadcast?: boolean }, event: string, payload: any) {
    if (target.userId) {
      this.gateway.sendToUser(target.userId, event, payload);
    }
    if (target.role) {
      this.gateway.sendToRole(target.role, event, payload);
    }
    if (target.broadcast || event.startsWith('dashboard:refresh:')) {
      this.gateway.broadcast(event, payload);
    }
  }

  async listForUser(userId: string, role?: string, limit: number = 50): Promise<Notification[]> {
    const userUuid = isUUID(userId, '4') ? userId : null;
    const filter: any = {
      $or: [
        ...(userUuid ? [{ recipientId: userUuid }] : []),
        ...(role ? [{ role }] : []),
      ],
    };

    if (!filter.$or.length) {
      return [];
    }

    return this.notificationModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getUnreadCount(userId: string, role?: string): Promise<number> {
    const userUuid = isUUID(userId, '4') ? userId : null;
    const filter: any = {
      isRead: false,
      $or: [
        ...(userUuid ? [{ recipientId: userUuid }] : []),
        ...(role ? [{ role }] : []),
      ],
    };

    if (!filter.$or.length) return 0;
    return this.notificationModel.countDocuments(filter).exec();
  }

  async markAsRead(notificationId: string): Promise<Notification | null> {
    if (!isUUID(notificationId, '4')) return null;
    return this.notificationModel
      .findByIdAndUpdate(notificationId, { isRead: true }, { new: true })
      .exec();
  }

  async markAllAsRead(userId: string, role?: string): Promise<{ modifiedCount: number }> {
    const userUuid = isUUID(userId, '4') ? userId : null;
    const filter: any = {
      isRead: false,
      $or: [
        ...(userUuid ? [{ recipientId: userUuid }] : []),
        ...(role ? [{ role }] : []),
      ],
    };

    if (!filter.$or.length) return { modifiedCount: 0 };
    const res = await this.notificationModel.updateMany(filter, { $set: { isRead: true } }).exec();
    return { modifiedCount: res.modifiedCount };
  }
}
