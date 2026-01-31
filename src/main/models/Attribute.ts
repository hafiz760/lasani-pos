import mongoose, { Schema, Document } from 'mongoose';

export interface IAttribute extends Document {
    name: string;
    value?: string;
    type: 'FABRIC' | 'PATTERN' | 'COLLECTION' | 'PIECE_COUNT' | 'COLOR' | 'SIZE' | 'OTHER';
    store: mongoose.Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const AttributeSchema = new Schema<IAttribute>({
    name: {
        type: String,
        required: true,
        trim: true
    },
    value: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['FABRIC', 'PATTERN', 'COLLECTION', 'PIECE_COUNT', 'COLOR', 'SIZE', 'OTHER'],
        required: true
    },
    store: {
        type: Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes
AttributeSchema.index({ store: 1, type: 1, name: 1 }, { unique: true });

// Forces model to be re-compiled with new schema in development
if (mongoose.models.Attribute) {
    delete mongoose.models.Attribute;
}

const AttributeModel = mongoose.model<IAttribute>('Attribute', AttributeSchema);

export default AttributeModel;
