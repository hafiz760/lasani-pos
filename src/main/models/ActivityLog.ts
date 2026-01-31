import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
    user: mongoose.Types.ObjectId;
    action: string;
    module: string;
    recordId?: mongoose.Types.ObjectId;
    changes?: any;
    ipAddress?: string;
    createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT']
    },
    module: {
        type: String,
        required: true
    },
    recordId: {
        type: Schema.Types.ObjectId
    },
    changes: {
        type: Schema.Types.Mixed
    },
    ipAddress: {
        type: String
    }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

// Indexes
ActivityLogSchema.index({ user: 1, createdAt: -1 });
ActivityLogSchema.index({ module: 1, action: 1 });

export default mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
