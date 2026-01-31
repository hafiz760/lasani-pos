// In your models folder (e.g., models/StockEntry.ts)
import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IStockEntry extends Document {
    store: mongoose.Types.ObjectId
    product: mongoose.Types.ObjectId
    supplier?: mongoose.Types.ObjectId

    quantity: number
    unit: string // 'pcs', 'meter', 'set'
    buyingPrice: number
    totalCost: number

    invoiceNumber?: string
    purchaseDate: Date

    entryType: 'INITIAL_STOCK' | 'RESTOCK' | 'ADJUSTMENT' | 'RETURN'
    notes?: string

    createdAt: Date
    updatedAt: Date
}

const StockEntrySchema = new Schema<IStockEntry>(
    {
        store: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            required: true
        },
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        supplier: {
            type: Schema.Types.ObjectId,
            ref: 'Supplier'
        },

        quantity: {
            type: Number,
            required: true
        },
        unit: {
            type: String,
            default: 'pcs'
        },
        buyingPrice: {
            type: Number,
            required: true
        },
        totalCost: {
            type: Number,
            required: true
        },

        invoiceNumber: String,
        purchaseDate: {
            type: Date,
            default: Date.now
        },

        entryType: {
            type: String,
            enum: ['INITIAL_STOCK', 'RESTOCK', 'ADJUSTMENT', 'RETURN'],
            default: 'INITIAL_STOCK'
        },

        notes: String
    },
    {
        timestamps: true
    }
)

// Indexes
StockEntrySchema.index({ store: 1, product: 1, createdAt: -1 })
StockEntrySchema.index({ supplier: 1 })
StockEntrySchema.index({ purchaseDate: -1 })

const StockEntryModel: Model<IStockEntry> =
    mongoose.models.StockEntry || mongoose.model<IStockEntry>('StockEntry', StockEntrySchema)

export default StockEntryModel
