import mongoose, { Schema, Document } from 'mongoose'

export interface IPurchaseOrderItem {
  product: mongoose.Types.ObjectId
  productName: string
  quantity: number
  unitCost: number
  sellingPrice: number
  discountAmount: number
  totalCost: number
  receivedQuantity: number
}

export interface IPurchaseOrder extends Document {
  poNumber: string
  supplier: mongoose.Types.ObjectId
  purchaseDate: Date
  status: 'DRAFT' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED'
  items: IPurchaseOrderItem[]
  subtotal: number
  discountAmount: number
  discountPercent?: number
  taxAmount: number
  shippingCost: number
  totalAmount: number
  paidAmount: number
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID'
  paymentMethod?: string
  notes?: string
  store: mongoose.Types.ObjectId
  receivedBy?: mongoose.Types.ObjectId
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const PurchaseOrderItemSchema = new Schema<IPurchaseOrderItem>(
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
    unitCost: {
      type: Number,
      required: true,
      min: 0
    },
    sellingPrice: {
      type: Number,
      min: 0
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalCost: {
      type: Number,
      required: true
    },
    receivedQuantity: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
)

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    poNumber: {
      type: String,
      required: true,
      unique: true
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true
    },
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['DRAFT', 'CONFIRMED', 'RECEIVED', 'CANCELLED'],
      default: 'DRAFT'
    },
    items: [PurchaseOrderItemSchema],
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
    shippingCost: {
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
      default: 0,
      min: 0
    },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PARTIAL', 'PAID'],
      default: 'UNPAID'
    },
    paymentMethod: {
      type: String
    },
    notes: {
      type: String
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true
    },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
)

// Indexes

PurchaseOrderSchema.index({ supplier: 1 })
PurchaseOrderSchema.index({ status: 1 })
PurchaseOrderSchema.index({ purchaseDate: -1 })

const PurchaseOrderModel =
  mongoose.models.PurchaseOrder ||
  mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema)

if (mongoose.models.PurchaseOrder && !PurchaseOrderModel.schema.paths['store']) {
  PurchaseOrderModel.schema.add({
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true
    }
  })
}

export default PurchaseOrderModel
