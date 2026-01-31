import mongoose, { Schema, Document } from "mongoose";

export interface ISupplier extends Document {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  taxNumber?: string;
  creditLimit?: number;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  store: Schema.Types.ObjectId;
  products: Schema.Types.ObjectId[]; // Track products from this supplier
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    store: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactPerson: {
      type: String,
    },
    phone: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      lowercase: true,
    },
    address: {
      type: String,
    },
    city: {
      type: String,
    },
    taxNumber: {
      type: String,
    },
    creditLimit: {
      type: Number,
      default: 0,
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  {
    timestamps: true,
  }
);

SupplierSchema.index({ name: 1 });
SupplierSchema.index({ phone: 1 });

// In development, the model might be cached with an old schema.
// This ensures we always have the store field and phone is optional if the model exists.
const SupplierModel =
  mongoose.models.Supplier ||
  mongoose.model<ISupplier>("Supplier", SupplierSchema);

if (mongoose.models.Supplier) {
  if (!SupplierModel.schema.paths["store"]) {
    SupplierModel.schema.add({
      store: {
        type: Schema.Types.ObjectId,
        ref: "Store",
        required: true,
      },
    });
  }
  // Force phone to be optional if it was previously required
  if (SupplierModel.schema.paths["phone"]) {
    (SupplierModel.schema.paths["phone"] as any).options.required = false;
    SupplierModel.schema.paths["phone"].required(false);
  }
}

export default SupplierModel;
