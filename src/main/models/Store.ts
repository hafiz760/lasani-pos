import mongoose, { Schema, Document } from 'mongoose'

export interface IStore extends Document {
  name: string
  code: string
  address: string
  phone: string
  email: string
  settings: {
    currency: string
    taxRate: number
    timezone: string
    logo?: string
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const StoreSchema = new Schema<IStore>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    address: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    settings: {
      currency: {
        type: String,
        default: 'PKR'
      },
      taxRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      timezone: {
        type: String,
        default: 'Asia/Karachi'
      },
      logo: String
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
)

StoreSchema.index({ isActive: 1 })

export default mongoose.models.Store || mongoose.model<IStore>('Store', StoreSchema)
