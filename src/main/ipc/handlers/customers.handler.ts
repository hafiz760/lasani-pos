import { ipcMain } from 'electron'
import * as models from '../../models'
import { toJSON, createAccountTransaction, ensureDefaultAccounts } from '../helpers'

export function registerCustomerHandlers() {
  ipcMain.handle(
    'customers:getAll',
    async (_event, { storeId, page = 1, pageSize = 20, search = '' } = {}) => {
      try {
        const query: any = { store: storeId }
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
          ]
        }

        const total = await models.Customer.countDocuments(query)
        const customers = await models.Customer.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean()

        return toJSON({
          success: true,
          data: customers,
          total,
          page,
          totalPages: Math.ceil(total / pageSize)
        })
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  )

  ipcMain.handle('customers:create', async (_event, data) => {
    try {
      const customer = await models.Customer.create(data)
      return toJSON({ success: true, data: customer })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('customers:update', async (_event, { id, data }) => {
    try {
      const customer = await models.Customer.findByIdAndUpdate(id, data, { new: true }).lean()
      return toJSON({ success: true, data: customer })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('customers:delete', async (_event, id) => {
    try {
      const salesCount = await models.Sale.countDocuments({ customer: id })
      if (salesCount > 0) {
        return { success: false, error: 'Cannot delete customer with sales history' }
      }
      await models.Customer.findByIdAndDelete(id)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('customers:getById', async (_event, id) => {
    try {
      const customer = await models.Customer.findById(id).lean()
      if (!customer) return { success: false, error: 'Customer not found' }
      return toJSON({ success: true, data: customer })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(
    'customers:getDetails',
    async (_event, { customerId, page = 1, pageSize = 20 }) => {
      try {
        const customer = await models.Customer.findById(customerId).lean()
        if (!customer) return { success: false, error: 'Customer not found' }

        const salesQuery = { customer: customerId }
        const totalSales = await models.Sale.countDocuments(salesQuery)
        const sales = await models.Sale.find(salesQuery)
          .sort({ saleDate: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean()

        // Aggregate stats across ALL sales for this customer
        const allSales = await models.Sale.find(salesQuery)
          .select('totalAmount paidAmount paymentStatus profitAmount refundedAmount')
          .lean()

        const stats = {
          totalSalesCount: allSales.length,
          totalRevenue: allSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
          totalPaid: allSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0),
          totalPending: allSales.reduce(
            (sum, s) => sum + Math.max(0, (s.totalAmount || 0) - (s.paidAmount || 0)),
            0
          ),
          totalProfit: allSales.reduce((sum, s) => sum + (s.profitAmount || 0), 0),
          totalRefunded: allSales.reduce((sum, s) => sum + (s.refundedAmount || 0), 0),
          paidCount: allSales.filter((s) => s.paymentStatus === 'PAID').length,
          pendingCount: allSales.filter((s) => s.paymentStatus === 'PENDING').length,
          partialCount: allSales.filter((s) => s.paymentStatus === 'PARTIAL').length
        }

        return toJSON({
          success: true,
          customer,
          sales,
          stats,
          totalSales,
          page,
          totalPages: Math.ceil(totalSales / pageSize)
        })
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  )

  ipcMain.handle('customers:recordPayment', async (_event, { customerId, paymentData }) => {
    try {
      const customer = await models.Customer.findById(customerId)
      if (!customer) return { success: false, error: 'Customer not found' }

      const outstandingSales = await models.Sale.find({
        customer: customerId,
        paymentStatus: { $in: ['PENDING', 'PARTIAL'] }
      }).sort({ saleDate: 1 })

      const totalOutstanding = outstandingSales.reduce(
        (sum, sale) => sum + Math.max(0, sale.totalAmount - sale.paidAmount),
        0
      )

      if (totalOutstanding <= 0) {
        return { success: false, error: 'Customer has no outstanding balance' }
      }

      let remainingPayment = Math.min(Number(paymentData.amount) || 0, totalOutstanding)
      if (remainingPayment <= 0) {
        return { success: false, error: 'Payment amount must be greater than zero' }
      }

      for (const sale of outstandingSales) {
        if (remainingPayment <= 0) break

        const saleRemaining = Math.max(0, sale.totalAmount - sale.paidAmount)
        if (saleRemaining <= 0) continue

        const appliedAmount = Math.min(remainingPayment, saleRemaining)
        sale.paidAmount += appliedAmount
        sale.paymentHistory.push({
          date: new Date(),
          amount: appliedAmount,
          method: paymentData.method,
          notes: paymentData.notes || '',
          recordedBy: paymentData.recordedBy
        })

        if (sale.paidAmount >= sale.totalAmount) {
          sale.paymentStatus = 'PAID'
        } else {
          sale.paymentStatus = 'PARTIAL'
        }

        await sale.save()
        remainingPayment -= appliedAmount
      }

      const appliedTotal = Math.min(Number(paymentData.amount) || 0, totalOutstanding)
      customer.balance = Math.max(0, customer.balance - appliedTotal)
      await customer.save()

      if (appliedTotal > 0) {
        const storeId = String((customer as any).store?._id || customer.store)
        const accounts = await ensureDefaultAccounts(storeId)
        const method = String(paymentData?.method || 'Cash')
        const useBank = method === 'Bank Transfer' || method === 'Card'
        const resolvedAccountId = paymentData?.accountId
          ? String(paymentData.accountId)
          : useBank
            ? String(accounts.bank._id)
            : String(accounts.cash._id)
        const transactionDate = paymentData?.paymentDate
          ? new Date(paymentData.paymentDate)
          : new Date()

        if (resolvedAccountId) {
          await models.Account.findByIdAndUpdate(resolvedAccountId, {
            $inc: { currentBalance: appliedTotal }
          })

          await createAccountTransaction({
            storeId,
            createdBy: String(paymentData?.recordedBy || customer._id),
            description: `Customer payment ${customer.name}`,
            referenceType: 'PAYMENT',
            referenceId: String(customer._id),
            accountId: resolvedAccountId,
            entryType: 'DEBIT',
            amount: appliedTotal,
            transactionDate
          })
        }
      }

      return toJSON({
        success: true,
        data: customer.toObject(),
        appliedAmount: appliedTotal
      })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}
