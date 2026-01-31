import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
    name: string;
    description?: string;
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
}

const RoleSchema = new Schema<IRole>({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String
    },
    permissions: [{
        type: String,
        required: true
    }]
}, {
    timestamps: true
});

export default mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema);
