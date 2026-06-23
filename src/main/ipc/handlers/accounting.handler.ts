import { ipcMain } from 'electron'
import * as models from '../../models'
import { toJSON, createAccountTransaction } from '../helpers'

export function registerAccountingHandlers() {
  // --- Accounts ---
  ipcMain.handle(
    'accounts:getAll',
    async (_event, { storeId, page = 1, pageSize = 20, search = '' }) => {
      try {
        const query: any = { store: storeId }
        if (search) {
          query.accountName = { $regex: search, $options: 'i' }
        }

        const total = await models.Account.countDocuments(query)
        const data = await models.Account.find(query)
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .sort({ accountCode: 1 })
          .lean()

        const allAccounts = await models.Account.find({ store: storeId }).lean()
        const summary = {
          totalAssets: 0,
          totalRevenue: 0,
          totalExpenses: 0
        }

        allAccounts.forEach((acc) => {
          if (acc.accountType === 'ASSET') summary.totalAssets += acc.currentBalance
          if (acc.accountType === 'REVENUE') summary.totalRevenue += acc.currentBalance
          if (acc.accountType === 'EXPENSE') summary.totalExpenses += acc.currentBalance
        })

        return toJSON({
          success: true,
          data,
          total,
          totalPages: Math.ceil(total / pageSize),
          summary
        })
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  )

  ipcMain.handle('accounts:create', async (_event, data) => {
    try {
      const accountData = {
        ...data,
        currentBalance: data.currentBalance || 0,
        openingBalance: data.currentBalance || 0
      }
      const account = await models.Account.create(accountData)
      return toJSON({ success: true, data: account })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('accounts:update', async (_event, { id, data }) => {
    try {
      const account = await models.Account.findByIdAndUpdate(id, data, { new: true })
      return toJSON({ success: true, data: account })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('accounts:delete', async (_event, id) => {
    try {
      const hasExpenses = await models.Expense.exists({ account: id })
      if (hasExpenses) {
        return { success: false, error: 'Cannot delete account with existing transactions' }
      }
      await models.Account.findByIdAndDelete(id)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // --- Expenses ---
  ipcMain.handle(
    'expenses:getAll',
    async (_event, { storeId, page = 1, pageSize = 20, search = '' }) => {
      try {
        const query: any = { store: storeId }
        if (search) {
          query.description = { $regex: search, $options: 'i' }
        }

        const total = await models.Expense.countDocuments(query)
        const data = await models.Expense.find(query)
          .populate('account')
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .sort({ createdAt: -1 })
          .lean()

        return toJSON({
          success: true,
          data,
          total,
          totalPages: Math.ceil(total / pageSize)
        })
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  )

  ipcMain.handle('expenses:create', async (_event, data) => {
    try {
      const count = await models.Expense.countDocuments()
      const expenseNumber = `EXP-${Date.now()}-${count + 1}`

      const expense = await models.Expense.create({ ...data, expenseNumber })

      if (data.account) {
        const delta = data.transactionType === 'DEBIT' ? data.amount : -data.amount
        await models.Account.findByIdAndUpdate(data.account, {
          $inc: { currentBalance: delta }
        })

        await createAccountTransaction({
          storeId: String(data.store),
          createdBy: String(data.createdBy),
          description: `Expense ${expense.expenseNumber}`,
          referenceType: 'EXPENSE',
          referenceId: String(expense._id),
          accountId: String(data.account),
          entryType: data.transactionType === 'DEBIT' ? 'DEBIT' : 'CREDIT',
          amount: data.amount,
          transactionDate: data.expenseDate ? new Date(data.expenseDate) : new Date()
        })
      }

      return toJSON({ success: true, data: expense })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // --- Transactions ---
  ipcMain.handle(
    'transactions:getAll',
    async (_event, { storeId, page = 1, pageSize = 20, search = '', startDate, endDate }) => {
      try {
        const query: any = { store: storeId }
        if (startDate || endDate) {
          const start = startDate ? new Date(startDate) : new Date(0)
          const end = endDate ? new Date(endDate) : new Date()
          end.setHours(23, 59, 59, 999)
          query.transactionDate = { $gte: start, $lte: end }
        }
        if (search) {
          query.$or = [
            { description: { $regex: search, $options: 'i' } },
            { referenceType: { $regex: search, $options: 'i' } }
          ]
        }

        const total = await models.Transaction.countDocuments(query)
        const data = await models.Transaction.find(query)
          .populate('entries.account')
          .populate('createdBy', 'fullName')
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .sort({ transactionDate: -1 })
          .lean()

        return toJSON({
          success: true,
          data,
          total,
          totalPages: Math.ceil(total / pageSize)
        })
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  )
}
