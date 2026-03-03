import { ipcMain } from 'electron'
import * as models from '../../models'
import { toJSON } from '../helpers'

// ============================================================
// HELPER: UPDATE INITIAL STOCK ENTRY & SUPPLIER BALANCE
// ============================================================
async function updateInitialStockEntry({
    productId,
    storeId,
    oldQuantity,
    newQuantity,
    oldBuyingPrice,
    newBuyingPrice,
    oldSupplier,
    newSupplier,
    unit
}: {
    productId: string
    storeId: string
    oldQuantity: number
    newQuantity: number
    oldBuyingPrice: number
    newBuyingPrice: number
    oldSupplier: string | null
    newSupplier: string | null
    unit: string
}) {
    try {
        const initialStockEntry = await models.StockEntry.findOne({
            product: productId,
            store: storeId,
            entryType: 'INITIAL_STOCK'
        }).sort({ createdAt: 1 })

        if (!initialStockEntry) {
            console.warn('⚠️ No initial stock entry found')
            return
        }

        const oldTotal = oldQuantity * oldBuyingPrice
        const newTotal = newQuantity * newBuyingPrice
        const difference = newTotal - oldTotal

        console.log(`📊 Stock Entry Update:`)
        console.log(`   Old: ${oldQuantity} × Rs.${oldBuyingPrice} = Rs.${oldTotal}`)
        console.log(`   New: ${newQuantity} × Rs.${newBuyingPrice} = Rs.${newTotal}`)
        console.log(`   Difference: Rs.${difference}`)

        const supplierChanged = oldSupplier !== newSupplier

        if (supplierChanged) {
            console.log(`🏢 Supplier Change Detected:`)
            console.log(`   Old Supplier: ${oldSupplier || 'None'}`)
            console.log(`   New Supplier: ${newSupplier || 'None'}`)

            if (oldSupplier) {
                await models.Supplier.findByIdAndUpdate(oldSupplier, {
                    $inc: { currentBalance: -oldTotal },
                    $pull: { products: productId }
                })
                console.log(`✅ Removed Rs.${oldTotal} from old supplier balance`)
            }

            if (newSupplier) {
                await models.Supplier.findByIdAndUpdate(newSupplier, {
                    $inc: { currentBalance: newTotal },
                    $addToSet: { products: productId }
                })
                console.log(`✅ Added Rs.${newTotal} to new supplier balance`)
            }

            await models.StockEntry.findByIdAndUpdate(initialStockEntry._id, {
                quantity: newQuantity,
                buyingPrice: newBuyingPrice,
                totalCost: newTotal,
                supplier: newSupplier
            })
        } else {
            if (initialStockEntry.supplier) {
                await models.Supplier.findByIdAndUpdate(initialStockEntry.supplier, {
                    $inc: { currentBalance: difference }
                })
                console.log(`✅ Supplier balance adjusted by Rs.${difference}`)
            }

            await models.StockEntry.findByIdAndUpdate(initialStockEntry._id, {
                quantity: newQuantity,
                buyingPrice: newBuyingPrice,
                totalCost: newTotal
            })
        }

        console.log(`✅ Stock entry updated: ${newQuantity} ${unit}`)
    } catch (error) {
        console.error('❌ Failed to update stock entry:', error)
        throw error
    }
}

export function registerInventoryHandlers() {
    // --- Inventory History ---
    ipcMain.handle('inventory:getHistory', async (_event, data) => {
        try {
            const { productId, storeId, limit = 20 } = data

            const history = await models.StockEntry.find({
                product: productId,
                store: storeId
            })
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate('supplier', 'name')
                .lean()

            console.log(
                `✅ Retrieved ${history.length} inventory history records for product ${productId}`
            )

            return { success: true, data: history }
        } catch (error: any) {
            console.error('❌ Failed to get inventory history:', error)
            return { success: false, error: error.message, data: [] }
        }
    })

    // --- Category Handlers ---
    ipcMain.handle('categories:getAll', async (_event, { storeId, includeInactive = false } = {}) => {
        try {
            const query: any = { store: storeId }
            if (!includeInactive) query.isActive = true
            const categories = await models.Category.find(query)
                .populate('parent')
                .sort({ displayOrder: 1, name: 1 })
                .lean()
            return toJSON({ success: true, data: categories })
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('categories:create', async (_event, data) => {
        try {
            if (!data.slug && data.name) {
                data.slug = data.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '')
            }
            const category = await models.Category.create(data)
            return toJSON({ success: true, data: category.toObject() })
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('categories:update', async (_event, { id, data }) => {
        try {
            if (data.name && !data.slug) {
                data.slug = data.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '')
            }
            const category = await models.Category.findByIdAndUpdate(id, data, { new: true })
                .populate('parent')
                .lean()
            return toJSON({ success: true, data: category })
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('categories:delete', async (_event, id) => {
        try {
            const childCount = await models.Category.countDocuments({ parent: id })
            if (childCount > 0)
                return { success: false, error: 'Cannot delete category with subcategories' }

            const productCount = await models.Product.countDocuments({ category: id })
            if (productCount > 0)
                return { success: false, error: 'Cannot delete category assigned to products' }

            await models.Category.findByIdAndDelete(id)
            return { success: true }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    // --- Brand Handlers ---
    ipcMain.handle('brands:getAll', async (_event, { storeId, includeInactive = false } = {}) => {
        try {
            const query: any = { store: storeId }
            if (!includeInactive) query.isActive = true
            const brands = await models.Brand.find(query).sort({ name: 1 }).lean()
            return toJSON({ success: true, data: brands })
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('brands:create', async (_event, data) => {
        try {
            if (!data.slug && data.name) {
                data.slug = data.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '')
            }
            const brand = await models.Brand.create(data)
            return toJSON({ success: true, data: brand.toObject() })
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('brands:update', async (_event, { id, data }) => {
        try {
            const brand = await models.Brand.findByIdAndUpdate(id, data, { new: true }).lean()
            return toJSON({ success: true, data: brand })
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('brands:delete', async (_event, id) => {
        try {
            const productCount = await models.Product.countDocuments({ brand: id })
            if (productCount > 0)
                return { success: false, error: 'Cannot delete brand assigned to products' }

            await models.Brand.findByIdAndDelete(id)
            return { success: true }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    // --- Attribute Handlers ---
    ipcMain.handle(
        'attributes:getAll',
        async (_event, { storeId, type, includeInactive = false } = {}) => {
            try {
                const query: any = { store: storeId }
                if (type) query.type = type
                if (!includeInactive) query.isActive = true
                const attributes = await models.Attribute.find(query).sort({ type: 1, name: 1 }).lean()
                return toJSON({ success: true, data: attributes })
            } catch (error: any) {
                return { success: false, error: error.message }
            }
        }
    )

    ipcMain.handle('attributes:create', async (_event, data) => {
        try {
            const attribute = await models.Attribute.create(data)
            return toJSON({ success: true, data: attribute.toObject() })
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('attributes:update', async (_event, { id, data }) => {
        try {
            const attribute = await models.Attribute.findByIdAndUpdate(id, data, { new: true }).lean()
            return toJSON({ success: true, data: attribute })
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('attributes:delete', async (_event, id) => {
        try {
            await models.Attribute.findByIdAndDelete(id)
            return { success: true }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    // --- Product Handlers ---
    ipcMain.handle(
        'products:getAll',
        async (
            _event,
            {
                storeId,
                page = 1,
                pageSize = 20,
                search = '',
                categoryId = '',
                brandId = '',
                includeInactive = false
            } = {}
        ) => {
            try {
                const query: any = { store: storeId }
                if (!includeInactive) query.isActive = true
                if (categoryId) query.category = categoryId
                if (brandId) query.brand = brandId
                if (search) {
                    query.$or = [
                        { name: { $regex: search, $options: 'i' } },
                        { sku: { $regex: search, $options: 'i' } },
                        { barcode: { $regex: search, $options: 'i' } }
                    ]
                }

                const total = await models.Product.countDocuments(query)
                const products = await models.Product.find(query)
                    .populate('category')
                    .populate('brand')
                    .sort({ createdAt: -1 })
                    .skip((page - 1) * pageSize)
                    .limit(pageSize)
                    .lean()

                return toJSON({
                    success: true,
                    data: products,
                    total,
                    page,
                    totalPages: Math.ceil(total / pageSize)
                })
            } catch (error: any) {
                return { success: false, error: error.message }
            }
        }
    )

    ipcMain.handle('products:create', async (_event, data) => {
        try {
            const {
                supplier,
                initialQuantity,
                invoiceNumber,
                purchaseDate,
                notes,
                ...productData
            } = data

            if (productData.sku) {
                const sku = productData.sku.trim().toUpperCase()
                const existingSku = await models.Product.findOne({
                    store: productData.store,
                    sku: sku
                })
                if (existingSku) {
                    return { success: false, error: `SKU "${sku}" already exists` }
                }
                productData.sku = sku
            }

            let stockQuantity = 0
            let totalCost = 0
            const buyingPrice = productData.buyingPrice || 0

            if (productData.productKind === 'SIMPLE') {
                productData.baseUnit = productData.baseUnit || 'pcs'
                productData.sellByUnit = productData.sellByUnit || 'pcs'
                productData.stockLevel = initialQuantity && initialQuantity > 0 ? initialQuantity : 0

                stockQuantity = initialQuantity || 0
                totalCost = buyingPrice * stockQuantity
            } else if (productData.productKind === 'RAW_MATERIAL') {
                productData.baseUnit = 'meter'
                productData.sellByUnit = 'meter'

                productData.totalMeters = productData.totalMeters || 0
                productData.metersPerUnit = productData.metersPerUnit || 0

                productData.stockLevel = productData.totalMeters
                productData.calculatedUnits = 0

                stockQuantity = productData.totalMeters
                totalCost = buyingPrice * productData.totalMeters
            } else if (productData.productKind === 'COMBO_SET') {
                productData.baseUnit = 'set'
                productData.sellByUnit = 'set'
                productData.isComboSet = true
            }

            const product = await models.Product.create(productData)
            const createdProduct = product

            if (stockQuantity > 0) {
                await models.StockEntry.create({
                    store: productData.store,
                    product: createdProduct._id,
                    supplier: supplier || null,
                    quantity: stockQuantity,
                    unit: productData.baseUnit,
                    buyingPrice: buyingPrice,
                    totalCost: totalCost,
                    invoiceNumber: invoiceNumber || null,
                    purchaseDate: purchaseDate || new Date(),
                    entryType: 'INITIAL_STOCK',
                    notes: notes || `Initial stock - ${productData.productKind} product`
                })

                if (supplier && supplier !== null && totalCost > 0) {
                    await models.Supplier.findByIdAndUpdate(supplier, {
                        $inc: { currentBalance: totalCost },
                        $addToSet: { products: createdProduct._id }
                    })

                    console.log(`✅ Supplier balance increased by Rs. ${totalCost}`)
                }
            }

            console.log(`✅ Product created: ${productData.name}`)
            console.log(`   Type: ${productData.productKind}`)
            console.log(`   Stock: ${productData.stockLevel} ${productData.baseUnit}`)

            return { success: true, data: createdProduct.toObject() }
        } catch (error: any) {
            console.error('❌ Product creation failed:', error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle(
        'products:restock',
        async (_event, { productId, supplierId, quantity, unitCost, sellingPrice }) => {
            try {
                const product = await models.Product.findById(productId)

                if (!product) {
                    return { success: false, error: 'Product not found' }
                }

                if (product.productKind === 'RAW_MATERIAL') {
                    product.totalMeters = (product.totalMeters || 0) + quantity
                } else {
                    product.stockLevel = (product.stockLevel || 0) + quantity
                }

                product.buyingPrice = unitCost
                product.sellingPrice = sellingPrice

                await product.save()

                const totalCost = unitCost * quantity

                await models.Supplier.findByIdAndUpdate(supplierId, {
                    $inc: { currentBalance: totalCost },
                    $addToSet: { products: productId }
                })

                return toJSON({ success: true, data: product.toObject() })
            } catch (error: any) {
                return { success: false, error: error.message }
            }
        }
    )

    ipcMain.handle('products:update', async (_event, { id, data }) => {
        try {
            const {
                storeId,
                name,
                sku,
                barcode,
                category,
                subcategory,
                brand,
                description,
                specifications,
                images,
                productKind,
                baseUnit,
                sellByUnit,
                buyingPrice,
                sellingPrice,
                minStockLevel,
                stockLevel,
                totalMeters,
                metersPerUnit,
                supplier,
                totalComboMeters,
                canSellSeparate,
                canSellPartialSet,
                comboComponents,
                twoComponentPrices,
                color,
                fabricType,
                pattern,
                designNumber,
                isActive
            } = data

            const existingProduct = await models.Product.findById(id)
            if (!existingProduct) {
                return { success: false, error: 'Product not found' }
            }

            const salesCount = await models.Sale.countDocuments({
                'items.product': id
            })

            const hasSales = salesCount > 0
            console.log(`📊 Product has ${salesCount} sales - Locked: ${hasSales}`)

            if (sku !== existingProduct.sku) {
                const skuExists = await models.Product.findOne({
                    store: storeId,
                    sku: sku,
                    _id: { $ne: id }
                })
                if (skuExists) {
                    return { success: false, error: 'SKU already exists for another product in this store' }
                }
            }

            if (barcode && barcode !== existingProduct.barcode) {
                const barcodeExists = await models.Product.findOne({
                    store: storeId,
                    barcode: barcode,
                    _id: { $ne: id }
                })
                if (barcodeExists) {
                    return { success: false, error: 'Barcode already exists for another product' }
                }
            }

            let finalStockLevel = existingProduct.stockLevel
            let finalTotalMeters = existingProduct.totalMeters || 0
            let finalBuyingPrice = existingProduct.buyingPrice
            let finalSellingPrice = existingProduct.sellingPrice
            let finalSupplier: string | null = null
            let stockChanged = false
            let priceChanged = false
            let supplierChanged = false

            if (hasSales) {
                console.log('🔒 Sales exist - Prices, stock, and supplier are LOCKED')

                finalBuyingPrice = existingProduct.buyingPrice
                finalSellingPrice = existingProduct.sellingPrice
                finalStockLevel = existingProduct.stockLevel
                finalTotalMeters = existingProduct.totalMeters || 0
            } else {
                console.log('✏️ No sales - Full editing allowed')

                const newBuyingPrice = Number(buyingPrice) || 0
                const newSellingPrice = Number(sellingPrice) || 0

                if (
                    newBuyingPrice !== existingProduct.buyingPrice ||
                    newSellingPrice !== existingProduct.sellingPrice
                ) {
                    priceChanged = true
                    finalBuyingPrice = newBuyingPrice
                    finalSellingPrice = newSellingPrice
                    console.log(`💰 Prices updated: Buy ${newBuyingPrice}, Sell ${newSellingPrice}`)
                }

                if (productKind === 'RAW_MATERIAL') {
                    const newTotalMeters = Number(totalMeters) || 0
                    if (newTotalMeters !== (existingProduct.totalMeters || 0)) {
                        stockChanged = true
                        finalTotalMeters = newTotalMeters
                        finalStockLevel = newTotalMeters
                        console.log(`📏 Meters updated: ${newTotalMeters}`)
                    }
                } else {
                    const newStockLevel = Number(stockLevel) || 0
                    if (newStockLevel !== existingProduct.stockLevel) {
                        stockChanged = true
                        finalStockLevel = newStockLevel
                        console.log(`📦 Stock updated: ${newStockLevel}`)
                    }
                }

                const newSupplier = supplier || null

                const oldStockEntry = await models.StockEntry.findOne({
                    product: id,
                    store: storeId,
                    entryType: 'INITIAL_STOCK'
                }).sort({ createdAt: 1 })

                const oldSupplier = oldStockEntry?.supplier?.toString() || null

                if (newSupplier !== oldSupplier) {
                    supplierChanged = true
                    finalSupplier = newSupplier
                    console.log(`🏢 Supplier changed: ${oldSupplier} → ${newSupplier}`)
                } else {
                    finalSupplier = oldSupplier
                }

                if (stockChanged || priceChanged || supplierChanged) {
                    await updateInitialStockEntry({
                        productId: id,
                        storeId,
                        oldQuantity:
                            productKind === 'RAW_MATERIAL'
                                ? existingProduct.totalMeters || 0
                                : existingProduct.stockLevel,
                        newQuantity: productKind === 'RAW_MATERIAL' ? finalTotalMeters : finalStockLevel,
                        oldBuyingPrice: existingProduct.buyingPrice,
                        newBuyingPrice: finalBuyingPrice,
                        oldSupplier: oldSupplier,
                        newSupplier: finalSupplier,
                        unit:
                            productKind === 'RAW_MATERIAL' ? 'meter' : productKind === 'COMBO_SET' ? 'set' : 'pcs'
                    })
                }
            }

            const updateData: any = {
                name,
                sku,
                barcode: barcode || '',
                store: storeId,
                category: category || null,
                subcategory: subcategory || null,
                brand: brand || null,
                description: description || '',
                specifications: specifications || {},
                images: images || [],
                productKind,
                baseUnit,
                sellByUnit,
                buyingPrice: finalBuyingPrice,
                sellingPrice: finalSellingPrice,
                stockLevel: finalStockLevel,
                minStockLevel: Number(minStockLevel) || 5,
                color: color || '',
                fabricType: fabricType || '',
                pattern: pattern || '',
                designNumber: designNumber || '',
                isActive: isActive !== undefined ? isActive : true
            }

            if (productKind === 'RAW_MATERIAL') {
                updateData.totalMeters = finalTotalMeters
                updateData.metersPerUnit = Number(metersPerUnit) || 0
                updateData.calculatedUnits =
                    metersPerUnit > 0 ? Math.floor(finalTotalMeters / Number(metersPerUnit)) : 0
                updateData.isComboSet = false
                updateData.totalComboMeters = 0
                updateData.canSellSeparate = false
                updateData.canSellPartialSet = false
                updateData.comboComponents = []
                updateData.twoComponentPrices = []
            } else if (productKind === 'COMBO_SET') {
                updateData.isComboSet = true
                updateData.totalComboMeters = Number(totalComboMeters) || 0
                updateData.canSellSeparate = canSellSeparate || false
                updateData.canSellPartialSet = canSellPartialSet || false
                updateData.comboComponents = comboComponents || []
                updateData.twoComponentPrices = twoComponentPrices || []
                updateData.totalMeters = 0
                updateData.metersPerUnit = 0
                updateData.calculatedUnits = 0
            } else {
                updateData.totalMeters = 0
                updateData.metersPerUnit = 0
                updateData.calculatedUnits = 0
                updateData.isComboSet = false
                updateData.totalComboMeters = 0
                updateData.canSellSeparate = false
                updateData.canSellPartialSet = false
                updateData.comboComponents = []
                updateData.twoComponentPrices = []
            }

            const updatedProduct = await models.Product.findByIdAndUpdate(id, updateData, {
                new: true,
                runValidators: true
            })
                .populate('category')
                .populate('subcategory')
                .populate('brand')

            if (!updatedProduct) {
                return { success: false, error: 'Failed to update product' }
            }

            console.log(`✅ Product updated: ${updatedProduct.name} (${updatedProduct.sku})`)
            if (hasSales) {
                console.log(`🔒 Prices, stock & supplier preserved (sales exist)`)
            } else {
                if (stockChanged) console.log(`✅ Stock corrected`)
                if (priceChanged) console.log(`✅ Prices updated`)
                if (supplierChanged) console.log(`✅ Supplier updated`)
            }

            return { success: true, data: updatedProduct.toObject() }
        } catch (error: any) {
            console.error('❌ Failed to update product:', error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('products:checkSales', async (_event, productId) => {
        try {
            const salesCount = await models.Sale.countDocuments({
                'items.product': productId
            })

            return {
                success: true,
                hasSales: salesCount > 0,
                salesCount
            }
        } catch (error: any) {
            console.error('❌ Failed to check sales:', error)
            return { success: false, error: error.message, hasSales: false, salesCount: 0 }
        }
    })

    ipcMain.handle('products:getInitialStockEntry', async (_event, productId) => {
        try {
            const stockEntry = await models.StockEntry.findOne({
                product: productId,
                entryType: 'INITIAL_STOCK'
            })
                .sort({ createdAt: 1 })
                .populate('supplier')
                .lean()

            if (!stockEntry) {
                return { success: true, data: null }
            }

            return { success: true, data: stockEntry }
        } catch (error: any) {
            console.error('❌ Failed to get stock entry:', error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('products:getById', async (_event, id) => {
        try {
            const product = await models.Product.findById(id)
                .populate('category')
                .populate('brand')
                .lean()
            if (!product) return { success: false, error: 'Product not found' }
            return toJSON({ success: true, data: product })
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('products:delete', async (_event, id) => {
        try {
            const hasSales = await models.Sale.exists({ 'items.product': id })
            if (hasSales) {
                const product = await models.Product.findByIdAndUpdate(
                    id,
                    { isActive: false },
                    { new: true }
                )
                return {
                    success: true,
                    data: product,
                    archived: true
                }
            }
            await models.Product.findByIdAndDelete(id)
            return { success: true, archived: false }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('products:getBySku', async (_event, { storeId, sku }) => {
        try {
            const product = await models.Product.findOne({ store: storeId, sku: sku.toUpperCase() })
                .populate('category')
                .populate('brand')
                .lean()
            return toJSON({ success: true, data: product })
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('products:getByBarcode', async (_event, { storeId, barcode }) => {
        try {
            const product = await models.Product.findOne({ store: storeId, barcode })
                .populate('category')
                .populate('brand')
                .lean()
            return toJSON({ success: true, data: product })
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('products:checkBarcode', async (_event, { storeId, barcode, excludeId }) => {
        try {
            const trimmedBarcode = (barcode || '').trim()
            if (!trimmedBarcode) return { success: true, exists: false }

            const storeIdStr = storeId?.toString() || storeId
            const query: any = { store: storeIdStr, barcode: trimmedBarcode }
            if (excludeId) {
                query._id = { $ne: excludeId }
            }
            const product = await models.Product.findOne(query).select('name').lean()
            if (product) {
                return { success: true, exists: true, productName: product.name }
            }
            return { success: true, exists: false }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })
}
