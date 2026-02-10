import mongoose, { Schema, Document } from 'mongoose'

export interface ICustomer extends Document {
  name: string
  phone: string
  email?: string
  balance: number
  store: Schema.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const CustomerSchema = new Schema<ICustomer>(
  {
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    balance: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
)

CustomerSchema.index({ store: 1, phone: 1 }, { unique: true })
CustomerSchema.index({ name: 1 })

const CustomerModel =
  mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema)

if (mongoose.models.Customer && !CustomerModel.schema.paths['store']) {
  CustomerModel.schema.add({
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true
    }
  })
}

export default CustomerModel
