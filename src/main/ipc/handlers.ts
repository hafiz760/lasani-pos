import { ipcMain, BrowserWindow } from 'electron'
import * as models from '../models'
import * as bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import * as fs from 'fs'
import * as path from 'path'

// Helper to ensure data is cloneable for Electron IPC (Structured Clone Algorithm)
// Mongoose ObjectIds and other internal types can cause "An object could not be cloned" errors.
const toJSON = (data: any) => {
  if (data === undefined || data === null) return data
  try {
    return JSON.parse(JSON.stringify(data))
  } catch (error) {
    console.error('Serialization error:', error)
    return data
  }
}

export function registerIpcHandlers() {
  console.log('📡 Registering IPC handlers...')
  console.log('Available models:', mongoose.modelNames())

  // Auth Handlers
  ipcMain.handle('auth:login', async (_event, { email, password }) => {
    try {
      console.log(email, password)
      const user = await models.User.findOne({ email }).populate('role')
      if (!user) {
        return { success: false, error: 'Invalid email' }
      }

      const isMatch = await bcrypt.compare(password, user.password)
      if (!isMatch) {
        return { success: false, error: 'Invalid password' }
      }

      if (!user.isActive) {
        return { success: false, error: 'Account is deactivated' }
      }

      // Update last login
      user.lastLogin = new Date()
      await user.save()

      // Don't send password to renderer
      const userObj = user.toObject()
      delete userObj.password

      return toJSON({ success: true, data: userObj })
    } catch (error: any) {
      console.error('Login IPC error:', error)
      return { success: false, error: error.message }
    }
  })

  // Store Handlers
  ipcMain.handle(
    'stores:getAll',
    async (_event, { page = 1, pageSize = 20, includeInactive = false, search = '' } = {}) => {
      try {
        const query: any = {}
        if (!includeInactive) query.isActive = true
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } }
          ]
        }

        const total = await models.Store.countDocuments(query)
        const stores = await models.Store.find(query)
          .limit(pageSize)
          .skip((page - 1) * pageSize)
          .sort({ createdAt: -1 })
          .lean()

        return toJSON({
          success: true,
          data: stores,
          total,
          page,
          totalPages: Math.ceil(total / pageSize)
        })
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  )

  ipcMain.handle('stores:create', async (_event, data) => {
    try {
      const store = await models.Store.create(data)
      return toJSON({ success: true, data: store.toObject() })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('stores:update', async (_event, { id, data }) => {
    try {
      const store = await models.Store.findByIdAndUpdate(id, data, { new: true }).lean()
      return toJSON({ success: true, data: store })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('stores:getById', async (_event, id) => {
    try {
      const store = await models.Store.findById(id).lean()
      if (!store) return { success: false, error: 'Store not found' }
      return toJSON({ success: true, data: store })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('stores:toggleStatus', async (_event, id) => {
    try {
      const store = await models.Store.findById(id)
      if (!store) return { success: false, error: 'Store not found' }
      store.isActive = !store.isActive
      await store.save()
      return toJSON({ success: true, data: store.toObject() })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // User Handlers
  ipcMain.handle('users:getAll', async (_event, { page = 1, pageSize = 12, search = '' } = {}) => {
    try {
      const query: any = {}
      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }

      const total = await models.User.countDocuments(query)
      const users = await models.User.find(query)
        .populate('role')
        .limit(pageSize)
        .skip((page - 1) * pageSize)
        .sort({ createdAt: -1 })
        .lean()

      return toJSON({
        success: true,
        data: users,
        total,
        page,
        totalPages: Math.ceil(total / pageSize)
      })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('users:create', async (_event, data) => {
    try {
      const hashedPassword = await bcrypt.hash(data.password, 10)
      const user = await models.User.create({ ...data, password: hashedPassword })
      const userObj = user.toObject()
      delete userObj.password
      return toJSON({ success: true, data: userObj })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('users:update', async (_event, { id, data }) => {
    try {
      const updateData = { ...data }
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10)
      } else {
        delete updateData.password
      }
      const user = await models.User.findByIdAndUpdate(id, updateData, { new: true })
        .populate('role')
        .lean()
      if (user) delete (user as any).password
      return toJSON({ success: true, data: user })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('users:delete', async (_event, id) => {
    try {
      await models.User.findByIdAndDelete(id)
      await models.UserStore.deleteMany({ user: id })
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('users:getStores', async (_event, userId) => {
    try {
      const userStores = await models.UserStore.find({ user: userId }).populate('store').lean()
      return toJSON({ success: true, data: userStores })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('users:assignStore', async (_event, { userId, storeId, role }) => {
    try {
      const userStore = await models.UserStore.findOneAndUpdate(
        { user: userId, store: storeId },
        { role },
        { upsert: true, new: true }
      )
        .populate('store')
        .lean()
      return toJSON({ success: true, data: userStore })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('users:removeStore', async (_event, { userId, storeId }) => {
    try {
      await models.UserStore.findOneAndDelete({ user: userId, store: storeId })
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('users:updateStoreRole', async (_event, { userId, storeId, role }) => {
    try {
      const userStore = await models.UserStore.findOneAndUpdate(
        { user: userId, store: storeId },
        { role },
        { new: true }
      )
        .populate('store')
        .lean()
      return toJSON({ success: true, data: userStore })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Role Handlers
  ipcMain.handle('roles:getAll', async () => {
    try {
      const roles = await models.Role.find().sort({ name: 1 }).lean()
      return toJSON({ success: true, data: roles })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('roles:getById', async (_event, id) => {
    try {
      const role = await models.Role.findById(id).lean()
      if (!role) return { success: false, error: 'Role not found' }
      return toJSON({ success: true, data: role })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('roles:create', async (_event, data) => {
    try {
      const role = await models.Role.create(data)
      return toJSON({ success: true, data: role.toObject() })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('roles:update', async (_event, { id, data }) => {
    try {
      const role = await models.Role.findByIdAndUpdate(id, data, { new: true }).lean()
      return toJSON({ success: true, data: role })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('roles:delete', async (_event, id) => {
    try {
      // Check if any user is using this role
      const userCount = await models.User.countDocuments({ role: id })
      if (userCount > 0) {
        return { success: false, error: 'Cannot delete role assigned to users' }
      }
      await models.Role.findByIdAndDelete(id)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Profile Handlers
  ipcMain.handle('profile:update', async (_event, { id, data }) => {
    try {
      const updateData: any = {}
      if (data.fullName) updateData.fullName = data.fullName
      if (data.avatarUrl) updateData.avatarUrl = data.avatarUrl
      if (data.avatar && !data.avatarUrl) updateData.avatarUrl = data.avatar // Compatibility

      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10)
      }

      const user = await models.User.findByIdAndUpdate(id, updateData, { new: true }).populate(
        'role'
      )

      if (!user) {
        return { success: false, error: 'User not found' }
      }

      const userObj = user.toObject()
      delete userObj.password
      return toJSON({ success: true, data: userObj })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('profile:changePassword', async (_event, { id, currentPassword, newPassword }) => {
    try {
      const user = await models.User.findById(id)
      if (!user) return { success: false, error: 'User not found' }

      const isMatch = await bcrypt.compare(currentPassword, user.password)
      if (!isMatch) return { success: false, error: 'Current password does not match' }

      user.password = await bcrypt.hash(newPassword, 10)
      await user.save()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // --- Inventory Handlers ---
  // ============================================================
  // INVENTORY HANDLERS
  // ============================================================

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

      console.log(`✅ Retrieved ${history.length} inventory history records for product ${productId}`)

      return { success: true, data: history }
    } catch (error: any) {
      console.error('❌ Failed to get inventory history:', error)
      return { success: false, error: error.message, data: [] }
    }
  })



  // Category Handlers
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
      // Check for subcategories or products
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

  // Brand Handlers
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

  // Attribute Handlers
  ipcMain.handle('attributes:getAll', async (_event, { storeId, type, includeInactive = false } = {}) => {
    try {
      const query: any = { store: storeId }
      if (type) query.type = type
      if (!includeInactive) query.isActive = true
      const attributes = await models.Attribute.find(query).sort({ type: 1, name: 1 }).lean()
      return toJSON({ success: true, data: attributes })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

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

  // Product Handlers
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
        initialQuantity, // For SIMPLE products only
        invoiceNumber,
        purchaseDate,
        notes,
        ...productData
      } = data

      // ============================================================
      // VALIDATION: SKU & BARCODE (keep existing)
      // ============================================================
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

      // ============================================================
      // PRODUCT TYPE SPECIFIC HANDLING
      // ============================================================

      let stockQuantity = 0
      let totalCost = 0
      const buyingPrice = productData.buyingPrice || 0

      if (productData.productKind === 'SIMPLE') {
        // ✅ SIMPLE PRODUCT - Use quantity (pieces/units)
        productData.baseUnit = productData.baseUnit || 'pcs'
        productData.sellByUnit = productData.sellByUnit || 'pcs'
        // For simple products, we use stockLevel
        productData.stockLevel = initialQuantity && initialQuantity > 0 ? initialQuantity : 0

        stockQuantity = initialQuantity || 0
        totalCost = buyingPrice * stockQuantity

      } else if (productData.productKind === 'RAW_MATERIAL') {
        // ✅ RAW MATERIAL - Use METERS only (no suit calculation)
        productData.baseUnit = 'meter'
        productData.sellByUnit = 'meter' // ← CHANGED: Sell in meters, not suits

        // Store total meters
        productData.totalMeters = productData.totalMeters || 0
        productData.metersPerUnit = productData.metersPerUnit || 0

        // ❌ DON'T calculate suits - just store meters as stockLevel
        productData.stockLevel = productData.totalMeters // ← Stock IS meters
        productData.calculatedUnits = 0 // Not used anymore

        stockQuantity = productData.totalMeters
        totalCost = buyingPrice * productData.totalMeters // ← Cost per meter

      } else if (productData.productKind === 'COMBO_SET') {
        // COMBO SET - Handle later
        productData.baseUnit = 'set'
        productData.sellByUnit = 'set'
        productData.isComboSet = true
        // ... combo logic
      }

      // ============================================================
      // CREATE PRODUCT
      // ============================================================
      // Removed session
      const product = await models.Product.create(productData)
      // product is not an array when created without array argument, but create(data) returns document
      // Wait, create([data], {session}) returns array. create(data) returns doc.
      // Let's safe check. If we pass object, it returns object.
      const createdProduct = product

      // ============================================================
      // CREATE STOCK ENTRY & UPDATE SUPPLIER
      // ============================================================
      if (stockQuantity > 0) {
        // Create stock entry record
        await models.StockEntry.create({
          store: productData.store,
          product: createdProduct._id,
          supplier: supplier || null,
          quantity: stockQuantity, // Meters for raw material, pieces for simple
          unit: productData.baseUnit, // Store the unit for reference
          buyingPrice: buyingPrice,
          totalCost: totalCost,
          invoiceNumber: invoiceNumber || null,
          purchaseDate: purchaseDate || new Date(),
          entryType: 'INITIAL_STOCK',
          notes: notes || `Initial stock - ${productData.productKind} product`
        })

        // Update supplier balance
        if (supplier && supplier !== null && totalCost > 0) {
          await models.Supplier.findByIdAndUpdate(
            supplier,
            {
              $inc: { currentBalance: totalCost },
              $addToSet: { products: createdProduct._id }
            }
          )

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


  ipcMain.handle('products:restock', async (_event, { productId, supplierId, quantity, unitCost, sellingPrice }) => {
    try {
      // 1. Find product first
      const product = await models.Product.findById(productId)

      if (!product) {
        return { success: false, error: 'Product not found' }
      }

      // 2. Update fields based on product type
      if (product.productKind === 'RAW_MATERIAL') {
        // For Raw Material, quantity represents meters
        product.totalMeters = (product.totalMeters || 0) + quantity
        // stockLevel will be auto-calculated in pre-save hook
      } else {
        // For Simple Product, quantity represents units
        product.stockLevel = (product.stockLevel || 0) + quantity
      }

      // Update prices
      product.buyingPrice = unitCost
      product.sellingPrice = sellingPrice

      // 3. Save product (triggers pre-save hook for calculations)
      await product.save()

      // 4. Update supplier balance and add product to supplier's products array
      // For Raw Material: unitCost (per meter) * quantity (meters) = Total Cost
      // For Simple: unitCost (per unit) * quantity (units) = Total Cost
      const totalCost = unitCost * quantity

      await models.Supplier.findByIdAndUpdate(supplierId, {
        $inc: { currentBalance: totalCost },
        $addToSet: { products: productId }
      })

      return toJSON({ success: true, data: product.toObject() })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })


  // ============================================================
  // PRODUCT UPDATE HANDLER
  // ============================================================

  // ============================================================
  // PRODUCT UPDATE HANDLER - WITH SALES-BASED LOCKING
  // ============================================================

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
        // Stock fields
        stockLevel,
        totalMeters,
        // Raw material specific
        metersPerUnit,
        // ✅ NEW: Supplier field
        supplier,
        // Combo specific
        isComboSet,
        totalComboMeters,
        canSellSeparate,
        canSellPartialSet,
        comboComponents,
        twoComponentPrices,
        // Additional
        color,
        fabricType,
        pattern,
        designNumber,
        isActive
      } = data

      // Find existing product
      const existingProduct = await models.Product.findById(id)
      if (!existingProduct) {
        return { success: false, error: 'Product not found' }
      }

      // ============================================================
      // CHECK IF SALES EXIST - SINGLE SOURCE OF TRUTH
      // ============================================================
      const salesCount = await models.Sale.countDocuments({
        'items.product': id
      })

      const hasSales = salesCount > 0
      console.log(`📊 Product has ${salesCount} sales - Locked: ${hasSales}`)

      // ============================================================
      // VALIDATION: SKU & BARCODE
      // ============================================================
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

      // ============================================================
      // DETERMINE WHAT CAN BE UPDATED
      // ============================================================
      let finalStockLevel = existingProduct.stockLevel
      let finalTotalMeters = existingProduct.totalMeters || 0
      let finalBuyingPrice = existingProduct.buyingPrice
      let finalSellingPrice = existingProduct.sellingPrice
      let finalSupplier: string | null = null // ✅ Track supplier
      let stockChanged = false
      let priceChanged = false
      let supplierChanged = false // ✅ NEW

      if (hasSales) {
        // 🔒 LOCKED MODE - Sales exist
        console.log('🔒 Sales exist - Prices, stock, and supplier are LOCKED')

        // Keep existing prices, stock, and supplier
        finalBuyingPrice = existingProduct.buyingPrice
        finalSellingPrice = existingProduct.sellingPrice
        finalStockLevel = existingProduct.stockLevel
        finalTotalMeters = existingProduct.totalMeters || 0
        // Supplier cannot be changed - we'll just ignore it

      } else {
        // ✏️ FULL EDIT MODE - No sales yet
        console.log('✏️ No sales - Full editing allowed')

        // Allow price changes
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

        // Allow stock changes based on product type
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

        // ✅ NEW: Check if supplier changed
        const newSupplier = supplier || null

        // Get old supplier from stock entry
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

        // ============================================================
        // UPDATE STOCK ENTRY & SUPPLIER BALANCE IF CHANGED
        // ============================================================
        if (stockChanged || priceChanged || supplierChanged) {
          await updateInitialStockEntry({
            productId: id,
            storeId,
            productKind,
            oldQuantity:
              productKind === 'RAW_MATERIAL'
                ? existingProduct.totalMeters || 0
                : existingProduct.stockLevel,
            newQuantity: productKind === 'RAW_MATERIAL' ? finalTotalMeters : finalStockLevel,
            oldBuyingPrice: existingProduct.buyingPrice,
            newBuyingPrice: finalBuyingPrice,
            oldSupplier: oldSupplier, // ✅ NEW
            newSupplier: finalSupplier, // ✅ NEW
            unit:
              productKind === 'RAW_MATERIAL' ? 'meter' : productKind === 'COMBO_SET' ? 'set' : 'pcs'
          })
        }
      }

      // ============================================================
      // BUILD UPDATE DATA
      // ============================================================
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

      // Type-specific fields
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

      // ============================================================
      // UPDATE THE PRODUCT
      // ============================================================
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




  // ============================================================
  // CHECK IF PRODUCT HAS SALES
  // ============================================================
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



  // ============================================================
// GET INITIAL STOCK ENTRY WITH SUPPLIER
// ============================================================
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







  // ============================================================
  // HELPER: UPDATE INITIAL STOCK ENTRY & SUPPLIER BALANCE
  // ============================================================
  // ============================================================
  // HELPER: UPDATE INITIAL STOCK ENTRY & SUPPLIER BALANCE
  // ============================================================
  async function updateInitialStockEntry({
    productId,
    storeId,
    productKind,
    oldQuantity,
    newQuantity,
    oldBuyingPrice,
    newBuyingPrice,
    oldSupplier, // ✅ NEW
    newSupplier, // ✅ NEW
    unit
  }: {
    productId: string
    storeId: string
    productKind: string
    oldQuantity: number
    newQuantity: number
    oldBuyingPrice: number
    newBuyingPrice: number
    oldSupplier: string | null // ✅ NEW
    newSupplier: string | null // ✅ NEW
    unit: string
  }) {
    try {
      // Find the INITIAL_STOCK entry
      const initialStockEntry = await models.StockEntry.findOne({
        product: productId,
        store: storeId,
        entryType: 'INITIAL_STOCK'
      }).sort({ createdAt: 1 })

      if (!initialStockEntry) {
        console.warn('⚠️ No initial stock entry found')
        return
      }

      // Calculate old and new totals
      const oldTotal = oldQuantity * oldBuyingPrice
      const newTotal = newQuantity * newBuyingPrice
      const difference = newTotal - oldTotal

      console.log(`📊 Stock Entry Update:`)
      console.log(`   Old: ${oldQuantity} × Rs.${oldBuyingPrice} = Rs.${oldTotal}`)
      console.log(`   New: ${newQuantity} × Rs.${newBuyingPrice} = Rs.${newTotal}`)
      console.log(`   Difference: Rs.${difference}`)

      // ✅ Check if supplier changed
      const supplierChanged = oldSupplier !== newSupplier

      if (supplierChanged) {
        console.log(`🏢 Supplier Change Detected:`)
        console.log(`   Old Supplier: ${oldSupplier || 'None'}`)
        console.log(`   New Supplier: ${newSupplier || 'None'}`)

        // Remove balance from old supplier
        if (oldSupplier) {
          await models.Supplier.findByIdAndUpdate(oldSupplier, {
            $inc: { currentBalance: -oldTotal }, // Reverse the old amount
            $pull: { products: productId } // Remove product from old supplier
          })
          console.log(`✅ Removed Rs.${oldTotal} from old supplier balance`)
        }

        // Add balance to new supplier
        if (newSupplier) {
          await models.Supplier.findByIdAndUpdate(newSupplier, {
            $inc: { currentBalance: newTotal }, // Add new amount
            $addToSet: { products: productId } // Add product to new supplier
          })
          console.log(`✅ Added Rs.${newTotal} to new supplier balance`)
        }

        // Update stock entry with new supplier
        await models.StockEntry.findByIdAndUpdate(initialStockEntry._id, {
          quantity: newQuantity,
          buyingPrice: newBuyingPrice,
          totalCost: newTotal,
          supplier: newSupplier // ✅ Update supplier in stock entry
        })

      } else {
        // Supplier didn't change, just adjust the balance
        if (initialStockEntry.supplier) {
          await models.Supplier.findByIdAndUpdate(initialStockEntry.supplier, {
            $inc: { currentBalance: difference }
          })
          console.log(`✅ Supplier balance adjusted by Rs.${difference}`)
        }

        // Update the stock entry
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
      // In a real POS, we might want to check for dependency in sales or purchases
      // For now, let's just delete or deactivate
      await models.Product.findByIdAndDelete(id)
      return { success: true }
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

  // Suppliers Handlers
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

  // Purchase Orders Handlers
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

      // Update product stock and prices
      if (po.items && po.items.length > 0) {
        for (const item of po.items) {
          const updateData: any = {
            $inc: { stockLevel: item.quantity },
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
      // 1. Get the existing PO to revert stock changes
      const oldPO = await models.PurchaseOrder.findById(id)

      if (oldPO && oldPO.items && oldPO.items.length > 0) {
        // Revert stock from old items
        for (const item of oldPO.items) {
          await models.Product.findByIdAndUpdate(item.product, {
            $inc: { stockLevel: -item.quantity }
          })
        }
      }

      // 2. Update the PO
      const po = await models.PurchaseOrder.findByIdAndUpdate(id, data, { new: true })

      // 3. Apply new stock and price changes
      if (po && po.items && po.items.length > 0) {
        for (const item of po.items) {
          const updateData: any = {
            $inc: { stockLevel: item.quantity },
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

  // Sales Handlers

  ipcMain.handle('sales:create', async (_event, data) => {
    try {
      // 1. Create Sale
      const sale = await models.Sale.create(data)

      // 2. Update Product Stock (Decrease)
      if (sale.items && sale.items.length > 0) {
        for (const item of sale.items) {
          if (item.product) {
            await models.Product.findByIdAndUpdate(item.product, {
              $inc: { stockLevel: -item.quantity }
            })
          }
        }
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

      // Revert stock (Increase back)
      if (sale.items && sale.items.length > 0) {
        for (const item of sale.items) {
          if (item.product) {
            await models.Product.findByIdAndUpdate(item.product, {
              $inc: { stockLevel: item.quantity }
            })
          }
        }
      }

      await models.Sale.findByIdAndDelete(id)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(
    'sales:getAll',
    async (_event, { storeId, page = 1, pageSize = 20, search = '', status = '' }) => {
      try {
        const query: any = { store: storeId }

        // Filter by payment status
        if (status && status !== 'All') {
          query.paymentStatus = status.toUpperCase()
        }

        // Search by invoice number or customer name
        if (search) {
          query.$or = [
            { invoiceNumber: { $regex: search, $options: 'i' } },
            { customerName: { $regex: search, $options: 'i' } }
          ]
        }

        const total = await models.Sale.countDocuments(query)
        const sales = await models.Sale.find(query)
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

  ipcMain.handle('sales:getById', async (_event, id) => {
    try {
      const sale = await models.Sale.findById(id)
        .populate('soldBy', 'fullName')
        .populate('paymentHistory.recordedBy', 'fullName')
        .lean()

      if (!sale) return { success: false, error: 'Sale not found' }
      return toJSON({ success: true, data: sale })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('sales:recordPayment', async (_event, { saleId, paymentData }) => {
    try {
      const sale = await models.Sale.findById(saleId)
      if (!sale) return { success: false, error: 'Sale not found' }

      // Update paid amount and add to payment history
      sale.paidAmount += paymentData.amount
      sale.paymentHistory.push({
        date: new Date(),
        amount: paymentData.amount,
        method: paymentData.method,
        notes: paymentData.notes || '',
        recordedBy: paymentData.recordedBy
      })

      // Update payment status
      if (sale.paidAmount >= sale.totalAmount) {
        sale.paymentStatus = 'PAID'
      } else if (sale.paidAmount > 0) {
        sale.paymentStatus = 'PARTIAL'
      }

      await sale.save()
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

  // Accounts Handlers
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

        // Calculate Summary
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
      // Set opening balance as initial current balance
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
      // Check for transactions (optional but recommended)
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

  // Expenses Handlers
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
      // Generate unique expense number
      const count = await models.Expense.countDocuments()
      const expenseNumber = `EXP-${Date.now()}-${count + 1}`

      const expense = await models.Expense.create({ ...data, expenseNumber })

      // Update Account Balance (Decrease)
      if (data.account) {
        await models.Account.findByIdAndUpdate(data.account, {
          $inc: { currentBalance: -data.amount }
        })
      }

      return toJSON({ success: true, data: expense })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Printer Handler
  ipcMain.handle('printer:printReceipt', async (_event, html) => {
    console.log('🖨️ printer:printReceipt IPC handler called')
    return new Promise((resolve) => {
      const win = new BrowserWindow({
        show: true,
        width: 400,
        height: 600,
        title: 'Printing Receipt...',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      const tempPath = path.join(require('os').tmpdir(), `receipt-${Date.now()}.html`)
      fs.writeFileSync(tempPath, html, 'utf-8')
      const fileUrl = require('url').pathToFileURL(tempPath).href
      win.loadURL(fileUrl)
      win.webContents.on('did-finish-load', () => {
        setTimeout(() => {
          win.webContents.print(
            {
              silent: false,
              printBackground: true,
              deviceName: '',
              pageSize: {
                width: 80000,
                height: 3000000
              },
              margins: { marginType: 'none' }
            },
            (success, errorType) => {
              if (!success) {
                console.error('Print failed:', errorType)
                resolve({ success: false, error: errorType })
              } else {
                resolve({ success: true })
              }
              setTimeout(() => {
                if (!win.isDestroyed()) win.close()
              }, 500)
              try {
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
              } catch (e) {
                console.error('Failed to cleanup temp print file:', e)
              }
            }
          )
        }, 800)
      })

      // Handle load errors
      win.webContents.on('did-fail-load', (_event, _errorCode, errorDescription) => {
        console.error('Print window failed to load:', errorDescription)
        resolve({ success: false, error: errorDescription })
        win.close()
        try {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
        } catch (e) {
          console.error(e)
        }
      })
    })
  })

  // Image Upload Handler
  ipcMain.handle('app:uploadImage', async (_event, { base64Data, fileName }) => {
    try {
      const { app } = require('electron')
      const uploadsDir = path.join(app.getPath('userData'), 'Uploads')
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
      }

      // Extract extension from fileName or default to .png
      const ext = path.extname(fileName) || '.png'
      const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
      const filePath = path.join(uploadsDir, uniqueFileName)

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64')
      fs.writeFileSync(filePath, buffer)

      // Return the public URL path (we'll serve this via protocol or dev server)
      return { success: true, url: `media://${uniqueFileName}` }
    } catch (error: any) {
      console.error('Image upload error:', error)
      return { success: false, error: error.message }
    }
  })

  // Dashboard Handlers
  ipcMain.handle('dashboard:getStats', async (_event, storeId) => {
    try {
      const sales = await models.Sale.find({ store: storeId })
      const products = await models.Product.find({ store: storeId })

      const revenue = sales.reduce((acc, sale) => acc + (sale.totalAmount || 0), 0)
      const profit = sales.reduce((acc, sale) => acc + (sale.profitAmount || 0), 0)
      const salesCount = sales.length

      const lowStockCount = products.filter((p) => p.stockLevel <= p.minStockLevel).length

      // Calculate total pending from unpaid sales
      const pendingSales = sales.filter(s => s.paymentStatus !== 'PAID')
      const totalPending = pendingSales.reduce((acc, sale) => acc + (sale.totalAmount - sale.paidAmount), 0)

      // Get last 7 days chart data
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      sevenDaysAgo.setHours(0, 0, 0, 0)

      const recentSalesForChart = await models.Sale.find({
        store: storeId,
        createdAt: { $gte: sevenDaysAgo }
      }).lean()

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const chartDataMap = new Map()

      // Initialize last 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dayName = days[date.getDay()]
        chartDataMap.set(dayName, 0)
      }

      recentSalesForChart.forEach((sale) => {
        const dayName = days[new Date(sale.createdAt).getDay()]
        if (chartDataMap.has(dayName)) {
          chartDataMap.set(dayName, chartDataMap.get(dayName) + (sale.totalAmount || 0))
        }
      })

      const chartData = Array.from(chartDataMap.entries())
        .map(([name, sales]) => ({ name, sales }))
        .reverse()

      const recentSales = await models.Sale.find({ store: storeId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
        .then((sales) =>
          sales.map((s) => ({
            customerName: s.customerName,
            createdAt: s.createdAt,
            totalAmount: s.totalAmount,
            paymentStatus: s.paymentStatus
          }))
        )

      return toJSON({
        success: true,
        data: {
          revenue,
          profit,
          salesCount,
          lowStockCount,
          totalPending,
          recentSales,
          chartData
        }
      })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  console.log('✅ IPC handlers registered')
}
