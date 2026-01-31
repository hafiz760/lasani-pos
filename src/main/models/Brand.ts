import mongoose, { Schema, Document } from 'mongoose';

export interface IBrand extends Document {
    name: string;
    slug: string;
    store: mongoose.Types.ObjectId;
    logoUrl?: string;
    description?: string;
    website?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const BrandSchema = new Schema<IBrand>({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        lowercase: true
    },
    store: {
        type: Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    logoUrl: {
        type: String
    },
    description: {
        type: String
    },
    website: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes
BrandSchema.index({ store: 1, slug: 1 }, { unique: true });
BrandSchema.index({ store: 1, name: 1 }, { unique: true });

const BrandModel = mongoose.models.Brand || mongoose.model<IBrand>('Brand', BrandSchema);

if (mongoose.models.Brand && !BrandModel.schema.paths['store']) {
    BrandModel.schema.add({
        store: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            required: true
        }
    });
}

export default BrandModel;
