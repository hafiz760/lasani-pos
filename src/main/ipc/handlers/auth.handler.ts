import { ipcMain } from 'electron'
import * as models from '../../models'
import * as bcrypt from 'bcryptjs'
import { toJSON } from '../helpers'

export function registerAuthHandlers() {
  ipcMain.handle('auth:login', async (_event, { email, password }) => {
    try {
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
}
