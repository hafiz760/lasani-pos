import mongoose, { Schema, Document } from 'mongoose';

export interface IUserStore extends Document {
    user: mongoose.Types.ObjectId;
    store: mongoose.Types.ObjectId;
    role: 'OWNER' | 'MANAGER' | 'CASHIER';
    permissions: string[];
    isActive: boolean;
    assignedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserStoreSchema = new Schema<IUserStore>({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    store: {
        type: Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    role: {
        type: String,
        enum: ['OWNER', 'MANAGER', 'CASHIER'],
        default: 'CASHIER'
    },
    permissions: [{
        type: String
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    assignedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Ensure unique user-store combination
UserStoreSchema.index({ user: 1, store: 1 }, { unique: true });
UserStoreSchema.index({ store: 1 });
UserStoreSchema.index({ user: 1 });

export default mongoose.models.UserStore || mongoose.model<IUserStore>('UserStore', UserStoreSchema);
