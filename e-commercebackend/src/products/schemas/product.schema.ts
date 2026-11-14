import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { randomUUID } from 'node:crypto';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ type: String, default: () => randomUUID() })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ trim: true })
  brand?: string;

  @Prop({ trim: true })
  color?: string;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: {} })
  attributes: Record<string, string>;

  @Prop({ default: 0, min: 0 })
  stock: number;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: String, ref: 'User', required: true, index: true })
  sellerId: string;

  @Prop({ type: String, ref: 'Category', required: true, index: true })
  categoryId: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
