import mongoose, { Schema, Document } from 'mongoose'

export interface IProductStock extends Document {
  product: mongoose.Types.ObjectId
  quantityInHand: number
  avgCostPrice: number
  reorderLevel: number
  maxStockLevel?: number
  lastPurchaseDate?: Date
  lastSaleDate?: Date
  updatedAt: Date
}

const ProductStockSchema = new Schema<IProductStock>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true
    },
    quantityInHand: {
      type: Number,
      default: 0,
      min: 0
    },
    avgCostPrice: {
      type: Number,
      default: 0,
      min: 0
    },
    reorderLevel: {
      type: Number,
      default: 5,
      min: 0
    },
    maxStockLevel: {
      type: Number,
      min: 0
    },
    lastPurchaseDate: {
      type: Date
    },
    lastSaleDate: {
      type: Date
    }
  },
  {
    timestamps: { createdAt: false, updatedAt: true }
  }
)

// Index for fast queries

ProductStockSchema.index({ quantityInHand: 1 })

export default mongoose.models.ProductStock ||
  mongoose.model<IProductStock>('ProductStock', ProductStockSchema)
