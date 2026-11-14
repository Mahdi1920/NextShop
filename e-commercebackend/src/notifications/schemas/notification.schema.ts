import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { UserRole } from '../../common/enums/role.enum';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: String, default: () => randomUUID() })
  _id: string;

  @Prop({ type: String, ref: 'User', default: null, index: true })
  recipientId?: string | null;

  @Prop({ enum: UserRole, default: null, index: true })
  role?: UserRole | null;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: {} })
  data?: Record<string, any>;

  @Prop({ default: false, index: true })
  isRead: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

