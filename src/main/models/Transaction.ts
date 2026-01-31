import mongoose, { Schema, Document } from 'mongoose';

export interface ITransactionEntry {
    account: mongoose.Types.ObjectId;
    entryType: 'DEBIT' | 'CREDIT';
    amount: number;
}

export interface ITransaction extends Document {
    transactionDate: Date;
    referenceType: string;
    referenceId?: mongoose.Types.ObjectId;
    description: string;
    entries: ITransactionEntry[];
    totalAmount: number;
    store: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
}

const TransactionEntrySchema = new Schema<ITransactionEntry>({
    account: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    },
    entryType: {
        type: String,
        enum: ['DEBIT', 'CREDIT'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false });

const TransactionSchema = new Schema<ITransaction>({
    transactionDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    referenceType: {
        type: String,
        required: true
    },
    referenceId: {
        type: Schema.Types.ObjectId
    },
    description: {
        type: String,
        required: true
    },
    entries: [TransactionEntrySchema],
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    store: {
        type: Schema.Types.ObjectId,
        ref: 'Store',
        required: true
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
TransactionSchema.index({ transactionDate: -1 });
TransactionSchema.index({ store: 1, transactionDate: -1 });
TransactionSchema.index({ referenceType: 1, referenceId: 1 });

const TransactionModel = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

if (mongoose.models.Transaction && !TransactionModel.schema.paths['store']) {
    TransactionModel.schema.add({
        store: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            required: true
        }
    });
}

export default TransactionModel;
