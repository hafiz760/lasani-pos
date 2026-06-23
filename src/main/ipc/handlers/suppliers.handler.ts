import { ipcMain } from 'electron'
import * as models from '../../models'
import { toJSON, createAccountTransaction, ensureDefaultAccounts } from '../helpers'

export function registerSupplierHandlers() {
  ipcMain.handle(
    'suppliers:getAll',
    async (_event, { storeId, page = 1, pageSize = 20, search = '' }) => {
      try {
        const query: any = { store: storeId }
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { contactPerson: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
          ]
        }
        const suppliers = await models.Supplier.find(query)
          .sort({ name: 1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean()
        const total = await models.Supplier.countDocuments(query)
        return toJSON({
          success: true,
          data: suppliers,
          total,
          totalPages: Math.ceil(total / pageSize)
        })
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  )

  ipcMain.handle('suppliers:getByProductId', async (_event, { storeId, productId }) => {
    try {
      const supplier = await models.Supplier.findOne({
        store: storeId,
        products: productId
      }).lean()
      if (!supplier) return { success: true, data: null }
      return toJSON({ success: true, data: supplier })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('suppliers:create', async (_event, data) => {
    try {
      const supplier = await models.Supplier.create(data)
      return toJSON({ success: true, data: supplier })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('suppliers:update', async (_event, { id, data }) => {
    try {
      const supplier = await models.Supplier.findByIdAndUpdate(id, data, { new: true })
      return toJSON({ success: true, data: supplier })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('suppliers:delete', async (_event, id) => {
    try {
      await models.Supplier.findByIdAndDelete(id)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('suppliers:getById', async (_event, id) => {
    try {
      const supplier = await models.Supplier.findById(id)
        .populate({
          path: 'products',
          populate: [
            { path: 'category', select: 'name' },
            { path: 'brand', select: 'name' }
          ]
        })
        .lean()
      if (!supplier) return { success: false, error: 'Supplier not found' }
      return toJSON({ success: true, data: supplier })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('suppliers:recordPayment', async (_event, { supplierId, paymentData }) => {
    try {
      const { amount, accountId, notes, paymentDate, recordedBy, method } = paymentData || {}
      const paymentAmount = Number(amount || 0)
      if (!supplierId || paymentAmount <= 0) {
        return { success: false, error: 'Invalid supplier payment data' }
      }

      const supplier = await models.Supplier.findById(supplierId)
      if (!supplier) {
        return { success: false, error: 'Supplier not found' }
      }

      const accounts = await ensureDefaultAccounts(String(supplier.store))
      const resolvedAccountId = accountId
        ? String(accountId)
        : String(accounts.cash?._id || accounts.bank?._id)

      await models.Supplier.findByIdAndUpdate(supplierId, {
        $inc: { currentBalance: -paymentAmount }
      })

      if (resolvedAccountId) {
        await models.Account.findByIdAndUpdate(resolvedAccountId, {
          $inc: { currentBalance: -paymentAmount }
        })
      }

      const descriptionParts = [`Supplier payment: ${supplier.name}`]
      if (notes) descriptionParts.push(String(notes))

      const expenseCount = await models.Expense.countDocuments()
      const expenseNumber = `EXP-${Date.now()}-${expenseCount + 1}`

      const expense = await models.Expense.create({
        expenseNumber,
        store: supplier.store,
        description: descriptionParts.join(' - '),
        amount: paymentAmount,
        category: 'Supplier Payment',
        account: resolvedAccountId,
        transactionType: 'CREDIT',
        expenseDate: paymentDate ? new Date(paymentDate) : new Date(),
        createdBy: recordedBy,
        paymentMethod: method || 'Account Transfer'
      })

      if (resolvedAccountId) {
        await createAccountTransaction({
          storeId: String(supplier.store),
          createdBy: recordedBy ? String(recordedBy) : String(supplier._id),
          description: `Supplier payment ${supplier.name}`,
          referenceType: 'SUPPLIER_PAYMENT',
          referenceId: String(expense._id),
          accountId: resolvedAccountId,
          entryType: 'CREDIT',
          amount: paymentAmount,
          transactionDate: paymentDate ? new Date(paymentDate) : new Date()
        })
      }

      return toJSON({ success: true, data: expense })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}
