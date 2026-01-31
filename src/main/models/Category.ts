import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
    name: string;
    slug: string;
    store: mongoose.Types.ObjectId;
    description?: string;
    imageUrl?: string;
    parent?: mongoose.Types.ObjectId;
    isActive: boolean;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>({
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
    description: {
        type: String
    },
    imageUrl: {
        type: String
    },
    parent: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    displayOrder: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

CategorySchema.index({ store: 1, slug: 1 }, { unique: true });
CategorySchema.index({ store: 1, name: 1 }, { unique: true });
CategorySchema.index({ parent: 1 });

const CategoryModel = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

if (mongoose.models.Category && !CategoryModel.schema.paths['store']) {
    CategoryModel.schema.add({
        store: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            required: true
        }
    });
}

export default CategoryModel;
