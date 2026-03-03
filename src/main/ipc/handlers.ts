import mongoose from 'mongoose'
import { registerAuthHandlers } from './handlers/auth.handler'
import { registerStoreHandlers } from './handlers/stores.handler'
import { registerUserHandlers, registerRoleHandlers, registerProfileHandlers } from './handlers/users.handler'
import { registerInventoryHandlers } from './handlers/inventory.handler'
import { registerSupplierHandlers } from './handlers/suppliers.handler'
import { registerCustomerHandlers } from './handlers/customers.handler'
import { registerPurchaseOrderHandlers } from './handlers/purchase-orders.handler'
import { registerSalesHandlers } from './handlers/sales.handler'
import { registerAccountingHandlers } from './handlers/accounting.handler'
import { registerDashboardHandlers, registerMediaHandlers, registerConfigHandlers } from './handlers/dashboard.handler'

export function registerIpcHandlers() {
  console.log('📡 Registering IPC handlers...')
  console.log('Available models:', mongoose.modelNames())

  registerAuthHandlers()
  registerStoreHandlers()
  registerUserHandlers()
  registerRoleHandlers()
  registerProfileHandlers()
  registerInventoryHandlers()
  registerSupplierHandlers()
  registerCustomerHandlers()
  registerPurchaseOrderHandlers()
  registerSalesHandlers()
  registerAccountingHandlers()
  registerDashboardHandlers()
  registerMediaHandlers()
  registerConfigHandlers()

  console.log('✅ IPC handlers registered')
}
