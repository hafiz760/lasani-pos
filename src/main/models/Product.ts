import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IComboComponent {
  name: string
  meters: number
  buyingPrice: number
  sellingPrice: number
  stockLevel: number
}

export interface IProduct extends Document {
  name: string
  sku: string
  barcode?: string
  store: mongoose.Types.ObjectId
  category: mongoose.Types.ObjectId
  subcategory?: mongoose.Types.ObjectId
  brand?: mongoose.Types.ObjectId
  description?: string
  specifications: Map<string, any>
  images: string[]

  // Product Type & Units
  productKind: 'SIMPLE' | 'RAW_MATERIAL' | 'COMBO_SET'
  baseUnit: string
  sellByUnit: string

  // Simple Product
  buyingPrice: number
  sellingPrice: number
  stockLevel: number
  minStockLevel: number

  // Raw Material Product
  totalMeters?: number
  metersPerUnit?: number
  calculatedUnits?: number

  // Combo Set Product
  isComboSet?: boolean
  comboComponents?: IComboComponent[]
  totalComboMeters?: number
  canSellSeparate?: boolean
  canSellPartialSet?: boolean

  // Partial set pricing (for 2-piece combos)
  twoComponentPrices?: Array<{
    components: string[]
    sellingPrice: number
  }>

  // Common fields
  warrantyMonths?: number
  isActive: boolean
  color?: string
  fabricType?: string
  productType?: string
  pieceCount?: string
  pattern?: string
  size?: string
  collectionName?: string
  designNumber?: string

  createdAt: Date
  updatedAt: Date
}

const ComboComponentSchema = new Schema({
  name: {
    type: String,
    required: true,
    enum: ['Dupatta', 'Shalwar', 'Qameez', 'Trouser', 'Kurta', 'Waistcoat']
  },
  meters: {
    type: Number,
    required: true,
    min: 0
  },
  buyingPrice: {
    type: Number,
    required: true,
    default: 0
  },
  sellingPrice: {
    type: Number,
    required: true,
    default: 0
  },
  stockLevel: {
    type: Number,
    required: true,
    default: 0
  }
})

const TwoComponentPriceSchema = new Schema({
  components: {
    type: [String],
    required: true,
    validate: {
      validator: function (v: string[]) {
        return v.length === 2
      },
      message: 'Two-component price must have exactly 2 components'
    }
  },
  sellingPrice: {
    type: Number,
    required: true
  }
})

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    sku: {
      type: String,
      required: true,
      uppercase: true
    },
    barcode: {
      type: String,
      trim: true
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    subcategory: {
      type: Schema.Types.ObjectId,
      ref: 'Category'
    },
    brand: {
      type: Schema.Types.ObjectId,
      ref: 'Brand'
    },
    description: {
      type: String
    },
    specifications: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {}
    },
    images: [String],

    // Product Type
    productKind: {
      type: String,
      enum: ['SIMPLE', 'RAW_MATERIAL', 'COMBO_SET'],
      default: 'SIMPLE',
      required: true
    },
    baseUnit: {
      type: String,
      default: 'piece',
      required: true
    },
    sellByUnit: {
      type: String,
      default: 'piece',
      required: true
    },

    // Simple Product Fields
    buyingPrice: {
      type: Number,
      default: 0
    },
    sellingPrice: {
      type: Number,
      default: 0
    },
    stockLevel: {
      type: Number,
      default: 0
    },
    minStockLevel: {
      type: Number,
      default: 5
    },

    // Raw Material Fields
    totalMeters: {
      type: Number,
      default: 0,
      min: 0
    },
    metersPerUnit: {
      type: Number,
      default: 0,
      min: 0
    },
    calculatedUnits: {
      type: Number,
      default: 0
    },

    // Combo Set Fields
    isComboSet: {
      type: Boolean,
      default: false
    },
    comboComponents: [ComboComponentSchema],
    totalComboMeters: {
      type: Number,
      default: 0
    },
    canSellSeparate: {
      type: Boolean,
      default: false
    },
    canSellPartialSet: {
      type: Boolean,
      default: false
    },
    twoComponentPrices: [TwoComponentPriceSchema],

    // Common Fields
    warrantyMonths: Number,
    isActive: {
      type: Boolean,
      default: true
    },
    color: String,
    fabricType: String,
    productType: String,
    pieceCount: String,
    pattern: String,
    collectionName: String,
    size: String,
    designNumber: String
  },
  {
    timestamps: true
  }
)

// Indexes
ProductSchema.index({ store: 1, sku: 1 }, { unique: true })
ProductSchema.index({ store: 1, barcode: 1 }, {
  partialFilterExpression: { barcode: { $type: 'string' } }
})
ProductSchema.index({ store: 1 })
ProductSchema.index({ category: 1 })
ProductSchema.index({ productKind: 1 })
ProductSchema.index({ name: 'text', sku: 'text' })
ProductSchema.index({ isActive: 1 })

// Pre-save hook - Next.js compatible (no callback)
// Pre-save hook - Updated logic
ProductSchema.pre('save', function () {
  // RAW_MATERIAL calculations
  if (this.productKind === 'RAW_MATERIAL') {
    // ✅ Stock level IS the meters (no suit calculation)
    this.stockLevel = this.totalMeters || 0

    // Keep calculatedUnits for reference but don't use it for stock
    if (this.totalMeters && this.metersPerUnit && this.metersPerUnit > 0) {
      this.calculatedUnits = Math.floor(this.totalMeters / this.metersPerUnit)
    } else {
      this.calculatedUnits = 0
    }
  }

  // COMBO_SET calculations (unchanged)
  if (
    this.productKind === 'COMBO_SET' &&
    this.comboComponents &&
    this.comboComponents.length > 0
  ) {
    this.totalComboMeters = this.comboComponents.reduce((total, comp) => {
      return total + comp.meters
    }, 0)

    // Calculate full set stock (minimum of all components)
    if (this.comboComponents.length > 0) {
      this.stockLevel = Math.min(...this.comboComponents.map((c) => c.stockLevel))
    }
  }
})


// Next.js-friendly model export - prevents recompilation issues
const ProductModel: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)

export default ProductModel
