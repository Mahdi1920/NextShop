import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { randomUUID } from 'node:crypto';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ type: String, default: () => randomUUID() })
  _id: string;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop()
  description?: string;

  @Prop({ type: String, default: null, index: true })
  parentId?: string | null;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
