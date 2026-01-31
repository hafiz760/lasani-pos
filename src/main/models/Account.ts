import mongoose, { Schema, Document } from 'mongoose';

export interface IAccount extends Document {
    accountCode: string;
    accountName: string;
    accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    store: mongoose.Types.ObjectId;
    parent?: mongoose.Types.ObjectId;
    openingBalance: number;
    currentBalance: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>({
    accountCode: {
        type: String,
        required: true
    },
    accountName: {
        type: String,
        required: true
    },
    accountType: {
        type: String,
        enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'],
        required: true
    },
    store: {
        type: Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    parent: {
        type: Schema.Types.ObjectId,
        ref: 'Account'
    },
    openingBalance: {
        type: Number,
        default: 0
    },
    currentBalance: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes
AccountSchema.index({ store: 1, accountCode: 1 }, { unique: true });
AccountSchema.index({ accountType: 1 });
AccountSchema.index({ store: 1 });

const AccountModel = mongoose.models.Account || mongoose.model<IAccount>('Account', AccountSchema);

// Dynamic check for store field (important for dev-mode caching)
if (mongoose.models.Account && !AccountModel.schema.paths['store']) {
    AccountModel.schema.add({
        store: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            required: true
        }
    });
}

export default AccountModel;
