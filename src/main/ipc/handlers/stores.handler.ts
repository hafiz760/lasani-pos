import { ipcMain } from 'electron'
import * as models from '../../models'
import { toJSON } from '../helpers'

export function registerStoreHandlers() {
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
}
