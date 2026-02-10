import mongoose, { Schema, Document } from 'mongoose'

export interface IExpense extends Document {
  expenseNumber: string
  expenseDate: Date
  category: string
  amount: number
  paymentMethod: string
  transactionType: 'DEBIT' | 'CREDIT'
  description?: string
  receiptUrl?: string
  account?: mongoose.Types.ObjectId
  store: mongoose.Types.ObjectId
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const ExpenseSchema = new Schema<IExpense>(
  {
    expenseNumber: {
      type: String,
      required: true,
      unique: true
    },
    expenseDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    category: {
      type: String,
      required: true,
      enum: ['Rent', 'Utilities', 'Salary', 'Marketing', 'Maintenance', 'Supplier Payment', 'Other']
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMethod: {
      type: String,
      required: true
    },
    transactionType: {
      type: String,
      enum: ['DEBIT', 'CREDIT'],
      default: 'CREDIT'
    },
    description: {
      type: String
    },
    receiptUrl: {
      type: String
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    account: {
      type: Schema.Types.ObjectId,
      ref: 'Account'
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true
    }
  },
  {
    timestamps: true
  }
)

ExpenseSchema.index({ expenseDate: -1 })
ExpenseSchema.index({ category: 1 })
ExpenseSchema.index({ store: 1 })

const ExpenseModel = mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema)

if (mongoose.models.Expense && !ExpenseModel.schema.paths['store']) {
  ExpenseModel.schema.add({
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true
    }
  })
}

export default ExpenseModel
