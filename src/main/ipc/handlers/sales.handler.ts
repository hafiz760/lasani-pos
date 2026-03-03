import { ipcMain } from 'electron'
import * as models from '../../models'
import mongoose from 'mongoose'
import { toJSON, createAccountTransaction, ensureDefaultAccounts } from '../helpers'

export function registerSalesHandlers() {
    ipcMain.handle('sales:create', async (_event, data) => {
        try {
            const saleData = { ...data }
            const totalAmount = Number(saleData.totalAmount) || 0
            const paidAmount = Math.min(Number(saleData.paidAmount) || 0, totalAmount)
            saleData.paidAmount = paidAmount

            let customerId: mongoose.Types.ObjectId | null = null
            if (saleData.customer) {
                customerId = new mongoose.Types.ObjectId(String(saleData.customer))
            }

            if (
                saleData.paymentMethod === 'Credit' &&
                !saleData.customer &&
                saleData.customerName &&
                saleData.customerPhone
            ) {
                const trimmedName = String(saleData.customerName).trim()
                const trimmedPhone = String(saleData.customerPhone).trim()

                const customer = await models.Customer.findOneAndUpdate(
                    { store: saleData.store, phone: trimmedPhone },
                    {
                        $set: {
                            name: trimmedName,
                            phone: trimmedPhone
                        },
                        $setOnInsert: {
                            balance: 0,
                            store: saleData.store
                        }
                    },
                    { new: true, upsert: true }
                )

                customerId = customer._id
                saleData.customer = customerId
            }

            delete saleData.customerName
            delete saleData.customerPhone
            delete saleData.customerEmail

            const remainingAmount = Math.max(0, totalAmount - paidAmount)
            if (saleData.paymentMethod === 'Credit') {
                saleData.paymentStatus =
                    remainingAmount === 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING'
            }

            if (saleData.paymentMethod === 'Credit' && paidAmount > 0) {
                saleData.paymentHistory = [
                    {
                        date: new Date(),
                        amount: paidAmount,
                        method: saleData.paymentMethod,
                        notes: 'Initial payment',
                        recordedBy: saleData.soldBy
                    }
                ]
            }

            const sale = await models.Sale.create(saleData)

            if (sale.items && sale.items.length > 0) {
                for (const item of sale.items) {
                    if (item.product) {
                        const product = await models.Product.findById(item.product).select('productKind')
                        const stockInc: any = { stockLevel: -item.quantity }
                        if (product?.productKind === 'RAW_MATERIAL') {
                            stockInc.totalMeters = -item.quantity
                        }
                        await models.Product.findByIdAndUpdate(item.product, {
                            $inc: stockInc
                        })
                    }
                }
            }

            if (customerId && remainingAmount > 0) {
                await models.Customer.findByIdAndUpdate(customerId, {
                    $inc: { balance: remainingAmount }
                })
            }

            if (paidAmount > 0) {
                const accounts = await ensureDefaultAccounts(String(saleData.store))
                const accountId =
                    saleData.paymentMethod === 'Bank Transfer'
                        ? String(accounts.bank._id)
                        : String(accounts.cash._id)
                if (saleData.paymentMethod === 'Bank Transfer') {
                    await models.Account.findByIdAndUpdate(accounts.bank._id, {
                        $inc: { currentBalance: paidAmount }
                    })
                } else {
                    await models.Account.findByIdAndUpdate(accounts.cash._id, {
                        $inc: { currentBalance: paidAmount }
                    })
                }

                await createAccountTransaction({
                    storeId: String(saleData.store),
                    createdBy: String(saleData.soldBy),
                    description: `Sale ${sale.invoiceNumber || sale._id}`,
                    referenceType: 'SALE',
                    referenceId: String(sale._id),
                    accountId,
                    entryType: 'DEBIT',
                    amount: paidAmount,
                    transactionDate: sale.saleDate || new Date()
                })
            }

            return toJSON({ success: true, data: sale })
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('sales:delete', async (_event, id) => {
        try {
            const sale = await models.Sale.findById(id)
            if (!sale) return { success: false, error: 'Sale record not found' }

            if (sale.items && sale.items.length > 0) {
                for (const item of sale.items) {
                    if (item.product) {
                        const product = await models.Product.findById(item.product).select('productKind')
                        const stockInc: any = { stockLevel: item.quantity }
                        if (product?.productKind === 'RAW_MATERIAL') {
                            stockInc.totalMeters = item.quantity
                        }
                        await models.Product.findByIdAndUpdate(item.product, {
                            $inc: stockInc
                        })
                    }
                }
            }

            const remainingAmount = Math.max(0, sale.totalAmount - sale.paidAmount)
            if (sale.customer && remainingAmount > 0) {
                await models.Customer.findByIdAndUpdate(sale.customer, {
                    $inc: { balance: -remainingAmount }
                })
            }

            await models.Sale.findByIdAndDelete(id)
            return { success: true }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle(
        'sales:refund',
        async (_event, { saleId, refundItems, method, reason, processedBy }) => {
            try {
                const sale = await models.Sale.findById(saleId)
                if (!sale) return { success: false, error: 'Sale not found' }

                const refundItemsNormalized = (refundItems || [])
                    .map((item: any) => ({
                        product: String(item.product),
                        quantity: Number(item.quantity || 0)
                    }))
                    .filter((item: any) => item.product && item.quantity > 0)

                if (refundItemsNormalized.length === 0) {
                    return { success: false, error: 'Select at least one item to refund.' }
                }

                const refundedQtyByProduct = new Map<string, number>()
                if (sale.refundHistory?.length) {
                    sale.refundHistory.forEach((record) => {
                        record.items?.forEach((item: any) => {
                            const key = String(item.product)
                            refundedQtyByProduct.set(key, (refundedQtyByProduct.get(key) || 0) + item.quantity)
                        })
                    })
                }

                let totalRefund = 0
                const refundLineItems = [] as Array<{ product: any; quantity: number; amount: number }>

                for (const refundItem of refundItemsNormalized) {
                    const saleItem = sale.items.find(
                        (item: any) => String(item.product) === refundItem.product
                    )
                    if (!saleItem) {
                        return { success: false, error: 'Invalid refund item.' }
                    }

                    const alreadyRefunded = refundedQtyByProduct.get(refundItem.product) || 0
                    const availableQty = saleItem.quantity - alreadyRefunded
                    if (refundItem.quantity > availableQty) {
                        return { success: false, error: 'Refund quantity exceeds sold quantity.' }
                    }

                    const lineAmount = (saleItem.sellingPrice || 0) * refundItem.quantity
                    totalRefund += lineAmount
                    refundLineItems.push({
                        product: saleItem.product,
                        quantity: refundItem.quantity,
                        amount: lineAmount
                    })
                }

                if (totalRefund <= 0) {
                    return { success: false, error: 'Refund amount must be greater than 0.' }
                }

                const currentPending = Math.max(0, sale.totalAmount - sale.paidAmount)
                const debtReduction = Math.min(totalRefund, currentPending)
                const cashPayout = totalRefund - debtReduction

                let totalCostToRevert = 0
                for (const refundItem of refundLineItems) {
                    const itemInSale = sale.items.find((i: any) => String(i.product) === String(refundItem.product))
                    if (itemInSale) {
                        totalCostToRevert += (itemInSale.costPrice || 0) * refundItem.quantity
                    }
                    const product = await models.Product.findById(refundItem.product).select('productKind')
                    const stockInc: any = { stockLevel: refundItem.quantity }
                    if (product?.productKind === 'RAW_MATERIAL') {
                        stockInc.totalMeters = refundItem.quantity
                    }
                    await models.Product.findByIdAndUpdate(refundItem.product, {
                        $inc: stockInc
                    })
                }

                sale.totalAmount = Math.max(0, sale.totalAmount - totalRefund)
                sale.paidAmount = Math.max(0, sale.paidAmount - cashPayout)
                sale.refundedAmount = Number(sale.refundedAmount || 0) + cashPayout
                sale.profitAmount = Math.max(0, sale.profitAmount - (totalRefund - totalCostToRevert))

                if (sale.customer && debtReduction > 0) {
                    await models.Customer.findByIdAndUpdate(sale.customer, {
                        $inc: { balance: -debtReduction }
                    })
                }

                if (sale.paidAmount >= sale.totalAmount) {
                    sale.paymentStatus = 'PAID'
                } else if (sale.paidAmount > 0) {
                    sale.paymentStatus = 'PARTIAL'
                } else {
                    sale.paymentStatus = 'PENDING'
                }

                sale.refundHistory = sale.refundHistory || []
                sale.refundHistory.push({
                    date: new Date(),
                    amount: totalRefund,
                    cashAmount: cashPayout,
                    debtAdjustment: debtReduction,
                    method: method || 'Cash',
                    reason,
                    processedBy,
                    items: refundLineItems
                } as any)

                await sale.save()

                if (cashPayout > 0) {
                    const accounts = await ensureDefaultAccounts(String(sale.store))
                    const accountId =
                        method === 'Bank Transfer' ? String(accounts.bank._id) : String(accounts.cash._id)
                    await models.Account.findByIdAndUpdate(accountId, {
                        $inc: { currentBalance: -cashPayout }
                    })

                    await createAccountTransaction({
                        storeId: String(sale.store),
                        createdBy: String(processedBy || sale.soldBy),
                        description: `Refund (Cash Payout) ${sale.invoiceNumber || sale._id}`,
                        referenceType: 'REFUND',
                        referenceId: String(sale._id),
                        accountId,
                        entryType: 'CREDIT',
                        amount: cashPayout
                    })
                }

                return toJSON({ success: true, data: sale })
            } catch (error: any) {
                return { success: false, error: error.message }
            }
        }
    )

    ipcMain.handle(
        'sales:getAll',
        async (_event, { storeId, page = 1, pageSize = 20, search = '', status = '' }) => {
            try {
                const query: any = { store: storeId }

                if (status && status !== 'All') {
                    query.paymentStatus = status.toUpperCase()
                }

                if (search) {
                    const searchRegex = new RegExp(search, 'i')
                    const customers = await models.Customer.find({
                        store: storeId,
                        $or: [{ name: searchRegex }, { phone: searchRegex }]
                    })
                        .select('_id')
                        .lean()
                    const customerIds = customers.map((customer) => customer._id)
                    query.$or = [{ invoiceNumber: { $regex: search, $options: 'i' } }]
                    if (customerIds.length > 0) {
                        query.$or.push({ customer: { $in: customerIds } })
                    }
                }

                const total = await models.Sale.countDocuments(query)
                const sales = await models.Sale.find(query)
                    .populate('customer', 'name phone')
                    .populate('soldBy', 'fullName')
                    .skip((page - 1) * pageSize)
                    .limit(pageSize)
                    .sort({ saleDate: -1 })
                    .lean()

                return toJSON({
                    success: true,
                    data: sales,
                    total,
                    page,
                    totalPages: Math.ceil(total / pageSize)
                })
            } catch (error: any) {
                return { success: false, error: error.message }
            }
        }
    )

    ipcMain.handle(
        'sales:getReport',
        async (_event, { storeId, startDate, endDate, groupBy = 'day' }) => {
            try {
                const start = startDate ? new Date(startDate) : new Date(0)
                const end = endDate ? new Date(endDate) : new Date()
                end.setHours(23, 59, 59, 999)

                const query = {
                    store: storeId,
                    saleDate: {
                        $gte: start,
                        $lte: end
                    }
                }

                const sales = await models.Sale.find(query)
                    .populate('customer', 'name phone')
                    .sort({ saleDate: -1 })
                    .lean()

                const summary = sales.reduce(
                    (acc, sale) => {
                        acc.totalSales += sale.totalAmount || 0
                        acc.totalPaid += sale.paidAmount || 0
                        acc.totalDiscount += sale.discountAmount || 0
                        acc.totalTax += sale.taxAmount || 0
                        acc.totalProfit += sale.profitAmount || 0
                        acc.totalCount += 1

                        if (sale.paymentStatus === 'PAID') acc.paidCount += 1
                        if (sale.paymentStatus === 'PENDING') acc.pendingCount += 1
                        if (sale.paymentStatus === 'PARTIAL') acc.partialCount += 1
                        return acc
                    },
                    {
                        totalSales: 0,
                        totalPaid: 0,
                        totalDiscount: 0,
                        totalTax: 0,
                        totalProfit: 0,
                        totalCount: 0,
                        paidCount: 0,
                        pendingCount: 0,
                        partialCount: 0
                    }
                )

                summary.totalPending = Math.max(0, summary.totalSales - summary.totalPaid)

                const formatMap = {
                    day: '%Y-%m-%d',
                    week: '%G-W%V',
                    month: '%Y-%m'
                }

                const periodFormat = formatMap[groupBy] || formatMap.day

                const grouped = await models.Sale.aggregate([
                    { $match: query },
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: periodFormat,
                                    date: '$saleDate'
                                }
                            },
                            totalAmount: { $sum: '$totalAmount' },
                            paidAmount: { $sum: '$paidAmount' },
                            discountAmount: { $sum: '$discountAmount' },
                            taxAmount: { $sum: '$taxAmount' },
                            profitAmount: { $sum: '$profitAmount' },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } }
                ])

                return toJSON({
                    success: true,
                    data: {
                        summary,
                        grouped,
                        sales
                    }
                })
            } catch (error: any) {
                return { success: false, error: error.message }
            }
        }
    )

    ipcMain.handle('sales:getById', async (_event, id) => {
        try {
            const sale = await models.Sale.findById(id)
                .populate('customer', 'name phone')
                .populate('soldBy', 'fullName')
                .populate('paymentHistory.recordedBy', 'fullName')
                .lean()

            if (!sale) return { success: false, error: 'Sale not found' }

            if (sale.items && sale.items.length > 0) {
                for (let i = 0; i < sale.items.length; i++) {
                    const item = sale.items[i] as any
                    if (item.product) {
                        const product = await models.Product.findById(item.product)
                            .select('productKind baseUnit sellByUnit')
                            .lean()
                        if (product) {
                            item.productKind = product.productKind
                            item.baseUnit = product.baseUnit || 'pcs'
                            item.sellByUnit = product.sellByUnit || 'pcs'
                        }
                    }
                }
            }

            return toJSON({ success: true, data: sale })
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('sales:recordPayment', async (_event, { saleId, paymentData }) => {
        try {
            const sale = await models.Sale.findById(saleId)
            if (!sale) return { success: false, error: 'Sale not found' }

            const remaining = Math.max(0, sale.totalAmount - sale.paidAmount)
            const appliedAmount = Math.min(Number(paymentData.amount) || 0, remaining)
            if (appliedAmount <= 0) {
                return { success: false, error: 'No outstanding balance for this sale' }
            }

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
            } else if (sale.paidAmount > 0) {
                sale.paymentStatus = 'PARTIAL'
            }

            await sale.save()

            if (sale.customer) {
                await models.Customer.findByIdAndUpdate(sale.customer, {
                    $inc: { balance: -appliedAmount }
                })
            }

            if (appliedAmount > 0) {
                const accounts = await ensureDefaultAccounts(String(sale.store))
                const method = String(paymentData?.method || '')
                const accountId =
                    method === 'Bank Transfer' ? String(accounts.bank._id) : String(accounts.cash._id)
                if (method === 'Bank Transfer') {
                    await models.Account.findByIdAndUpdate(accounts.bank._id, {
                        $inc: { currentBalance: appliedAmount }
                    })
                } else {
                    await models.Account.findByIdAndUpdate(accounts.cash._id, {
                        $inc: { currentBalance: appliedAmount }
                    })
                }

                await createAccountTransaction({
                    storeId: String(sale.store),
                    createdBy: String(paymentData?.recordedBy || sale.soldBy),
                    description: `Payment for ${sale.invoiceNumber || sale._id}`,
                    referenceType: 'PAYMENT',
                    referenceId: String(sale._id),
                    accountId,
                    entryType: 'DEBIT',
                    amount: appliedAmount
                })
            }

            return toJSON({ success: true, data: sale })
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('sales:getPendingStats', async (_event, { storeId }) => {
        try {
            const pendingSales = await models.Sale.find({
                store: storeId,
                paymentStatus: { $in: ['PENDING', 'PARTIAL'] }
            }).lean()

            const totalPending = pendingSales.reduce((sum, sale) => {
                return sum + (sale.totalAmount - sale.paidAmount)
            }, 0)

            const totalCreditSales = pendingSales.reduce((sum, sale) => sum + sale.totalAmount, 0)

            return toJSON({
                success: true,
                data: {
                    pendingCount: pendingSales.length,
                    totalPendingAmount: totalPending,
                    totalCreditSalesAmount: totalCreditSales,
                    recentPending: pendingSales.slice(0, 5)
                }
            })
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })
}
