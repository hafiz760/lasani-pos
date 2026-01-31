import mongoose, { Schema, Document } from 'mongoose'

export interface ISaleItem {
  product: mongoose.Types.ObjectId
  productName: string
  quantity: number
  costPrice: number
  sellingPrice: number
  discountAmount: number
  totalAmount: number
  profitAmount: number
}

export interface IPaymentRecord {
  date: Date
  amount: number
  method: string
  notes?: string
  recordedBy: mongoose.Types.ObjectId
}

export interface ISale extends Document {
  invoiceNumber: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  saleDate: Date
  items: ISaleItem[]
  subtotal: number
  discountAmount: number
  discountPercent?: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL'
  paymentMethod: string
  profitAmount: number
  notes?: string
  soldBy: mongoose.Types.ObjectId
  store: mongoose.Types.ObjectId
  paymentHistory: IPaymentRecord[]
  createdAt: Date
  updatedAt: Date
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productName: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    profitAmount: {
      type: Number,
      required: true
    }
  },
  { _id: false }
)

const SaleSchema = new Schema<ISale>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true
    },
    customerName: {
      type: String
    },
    customerPhone: {
      type: String
    },
    customerEmail: {
      type: String,
      lowercase: true
    },
    saleDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    items: [SaleItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    discountPercent: {
      type: Number,
      min: 0,
      max: 100
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    paidAmount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PENDING', 'PARTIAL'],
      default: 'PAID'
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['Cash', 'Card', 'Bank Transfer', 'Installment', 'Credit']
    },
    profitAmount: {
      type: Number,
      required: true
    },
    notes: {
      type: String
    },
    soldBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true
    },
    paymentHistory: [
      {
        date: {
          type: Date,
          required: true,
          default: Date.now
        },
        amount: {
          type: Number,
          required: true,
          min: 0
        },
        method: {
          type: String,
          required: true
        },
        notes: {
          type: String
        },
        recordedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true
        }
      }
    ]
  },
  {
    timestamps: true
  }
)

// Indexes

SaleSchema.index({ saleDate: -1 })
SaleSchema.index({ soldBy: 1 })
SaleSchema.index({ paymentStatus: 1 })

const SaleModel = mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema)

if (mongoose.models.Sale && !SaleModel.schema.paths['store']) {
  SaleModel.schema.add({
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true
    }
  })
}

export default SaleModel
