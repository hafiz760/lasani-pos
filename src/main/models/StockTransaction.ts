import mongoose, { Schema, Document } from 'mongoose';

export interface IStockTransaction extends Document {
    product: mongoose.Types.ObjectId;
    transactionType: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE';
    referenceType: string;
    referenceId: mongoose.Types.ObjectId;
    quantity: number;
    unitCost?: number;
    balanceAfter: number;
    notes?: string;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
}

const StockTransactionSchema = new Schema<IStockTransaction>({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    transactionType: {
        type: String,
        enum: ['PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN', 'DAMAGE'],
        required: true
    },
    referenceType: {
        type: String,
        required: true
    },
    referenceId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    unitCost: {
        type: Number,
        min: 0
    },
    balanceAfter: {
        type: Number,
        required: true,
        min: 0
    },
    notes: {
        type: String
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

// Indexes
StockTransactionSchema.index({ product: 1, createdAt: -1 });
StockTransactionSchema.index({ transactionType: 1 });
StockTransactionSchema.index({ referenceType: 1, referenceId: 1 });

export default mongoose.models.StockTransaction || mongoose.model<IStockTransaction>('StockTransaction', StockTransactionSchema);
