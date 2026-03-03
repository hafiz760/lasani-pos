import { ipcMain } from 'electron'
import * as models from '../../models'
import { toJSON } from '../helpers'

export function registerPurchaseOrderHandlers() {
    ipcMain.handle(
        'purchaseOrders:getAll',
        async (_event, { storeId, page = 1, pageSize = 20, search = '', status }) => {
            try {
                const query: any = { store: storeId }
                if (search) {
                    query.poNumber = { $regex: search, $options: 'i' }
                }
                if (status) {
                    query.status = status
                }
                const pos = await models.PurchaseOrder.find(query)
                    .populate('supplier')
                    .sort({ createdAt: -1 })
                    .skip((page - 1) * pageSize)
                    .limit(pageSize)
                    .lean()
                const total = await models.PurchaseOrder.countDocuments(query)
                return toJSON({ success: true, data: pos, total, totalPages: Math.ceil(total / pageSize) })
            } catch (error: any) {
                return { success: false, error: error.message }
            }
        }
    )

    ipcMain.handle('purchaseOrders:getById', async (_event, id) => {
        try {
            const po = await models.PurchaseOrder.findById(id)
                .populate('supplier')
                .populate('items.product')
                .lean()
            return toJSON({ success: true, data: po })
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('purchaseOrders:getLastSupply', async (_event, { storeId, productId }) => {
        try {
            const po = await models.PurchaseOrder.findOne({
                store: storeId,
                'items.product': productId
            })
                .sort({ createdAt: -1 })
                .populate('supplier')
                .lean()

            if (po && po.supplier) {
                const item = po.items.find((i: any) => i.product.toString() === productId)
                return toJSON({
                    success: true,
                    data: {
                        supplier: po.supplier,
                        lastCost: item?.unitCost || 0
                    }
                })
            }
            return { success: true, data: null }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('purchaseOrders:create', async (_event, data) => {
        try {
            if (!data.poNumber) {
                data.poNumber = `PO-${Date.now()}`
            }

            const po = await models.PurchaseOrder.create(data)

            if (po.items && po.items.length > 0) {
                for (const item of po.items) {
                    const product = await models.Product.findById(item.product).select('productKind')
                    const stockInc: any = { stockLevel: item.quantity }
                    if (product?.productKind === 'RAW_MATERIAL') {
                        stockInc.totalMeters = item.quantity
                    }

                    const updateData: any = {
                        $inc: stockInc,
                        $set: { buyingPrice: item.unitCost }
                    }

                    if (item.sellingPrice && item.sellingPrice > 0) {
                        updateData.$set.sellingPrice = item.sellingPrice
                    }

                    await models.Product.findByIdAndUpdate(item.product, updateData)
                }
            }

            return toJSON({ success: true, data: po })
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('purchaseOrders:update', async (_event, { id, data }) => {
        try {
            const oldPO = await models.PurchaseOrder.findById(id)

            if (oldPO && oldPO.items && oldPO.items.length > 0) {
                for (const item of oldPO.items) {
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

            const po = await models.PurchaseOrder.findByIdAndUpdate(id, data, { new: true })

            if (po && po.items && po.items.length > 0) {
                for (const item of po.items) {
                    const product = await models.Product.findById(item.product).select('productKind')
                    const stockInc: any = { stockLevel: item.quantity }
                    if (product?.productKind === 'RAW_MATERIAL') {
                        stockInc.totalMeters = item.quantity
                    }

                    const updateData: any = {
                        $inc: stockInc,
                        $set: { buyingPrice: item.unitCost }
                    }

                    if (item.sellingPrice && item.sellingPrice > 0) {
                        updateData.$set.sellingPrice = item.sellingPrice
                    }

                    await models.Product.findByIdAndUpdate(item.product, updateData)
                }
            }

            return toJSON({ success: true, data: po })
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('purchaseOrders:delete', async (_event, id) => {
        try {
            await models.PurchaseOrder.findByIdAndDelete(id)
            return { success: true }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })
}
