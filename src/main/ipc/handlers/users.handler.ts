import { ipcMain } from 'electron'
import * as models from '../../models'
import * as bcrypt from 'bcryptjs'
import { toJSON } from '../helpers'

export function registerUserHandlers() {
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
}

export function registerRoleHandlers() {
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
}

export function registerProfileHandlers() {
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
}
