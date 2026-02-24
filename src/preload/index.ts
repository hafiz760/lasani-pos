import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { LoginFormData } from '../renderer/src/lib/validations/user.validation'

const api = {
  auth: {
    login: (credentials: LoginFormData) => ipcRenderer.invoke('auth:login', credentials)
  },
  products: {
    getAll: (params) => ipcRenderer.invoke('products:getAll', params),
    create: (data) => ipcRenderer.invoke('products:create', data),
    update: (id, data) => ipcRenderer.invoke('products:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('products:delete', id),
    getById: (id) => ipcRenderer.invoke('products:getById', id),
    getBySku: (params) => ipcRenderer.invoke('products:getBySku', params),
    getByBarcode: (params) => ipcRenderer.invoke('products:getByBarcode', params),
    checkBarcode: (params) => ipcRenderer.invoke('products:checkBarcode', params),
    restock: (data) => ipcRenderer.invoke('products:restock', data),
    checkSales: (id) => ipcRenderer.invoke('products:checkSales', id),
    getInitialStockEntry: (id) => ipcRenderer.invoke('products:getInitialStockEntry', id)
  },
  inventory: {
    getHistory: (params) => ipcRenderer.invoke('inventory:getHistory', params)
  },
  suppliers: {
    getAll: (params) => ipcRenderer.invoke('suppliers:getAll', params),
    getByProductId: (params) => ipcRenderer.invoke('suppliers:getByProductId', params),
    getById: (id) => ipcRenderer.invoke('suppliers:getById', id),
    create: (data) => ipcRenderer.invoke('suppliers:create', data),
    update: (id, data) => ipcRenderer.invoke('suppliers:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('suppliers:delete', id),
    recordPayment: (supplierId, paymentData) =>
      ipcRenderer.invoke('suppliers:recordPayment', { supplierId, paymentData })
  },
  customers: {
    getAll: (params) => ipcRenderer.invoke('customers:getAll', params),
    getById: (id) => ipcRenderer.invoke('customers:getById', id),
    create: (data) => ipcRenderer.invoke('customers:create', data),
    update: (id, data) => ipcRenderer.invoke('customers:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('customers:delete', id),
    recordPayment: (customerId, paymentData) =>
      ipcRenderer.invoke('customers:recordPayment', { customerId, paymentData }),
    getDetails: (params) => ipcRenderer.invoke('customers:getDetails', params)
  },
  purchaseOrders: {
    getAll: (params) => ipcRenderer.invoke('purchaseOrders:getAll', params),
    getLastSupply: (params) => ipcRenderer.invoke('purchaseOrders:getLastSupply', params),
    getById: (id) => ipcRenderer.invoke('purchaseOrders:getById', id),
    create: (data) => ipcRenderer.invoke('purchaseOrders:create', data),
    update: (id, data) => ipcRenderer.invoke('purchaseOrders:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('purchaseOrders:delete', id)
  },
  categories: {
    getAll: (params) => ipcRenderer.invoke('categories:getAll', params),
    create: (data) => ipcRenderer.invoke('categories:create', data),
    update: (id, data) => ipcRenderer.invoke('categories:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('categories:delete', id)
  },
  brands: {
    getAll: (params) => ipcRenderer.invoke('brands:getAll', params),
    create: (data) => ipcRenderer.invoke('brands:create', data),
    update: (id, data) => ipcRenderer.invoke('brands:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('brands:delete', id)
  },
  attributes: {
    getAll: (params) => ipcRenderer.invoke('attributes:getAll', params),
    create: (data) => ipcRenderer.invoke('attributes:create', data),
    update: (id, data) => ipcRenderer.invoke('attributes:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('attributes:delete', id)
  },
  stores: {
    getAll: (params) => ipcRenderer.invoke('stores:getAll', params),
    create: (data) => ipcRenderer.invoke('stores:create', data),
    update: (id, data) => ipcRenderer.invoke('stores:update', { id, data }),
    toggleStatus: (id) => ipcRenderer.invoke('stores:toggleStatus', id),
    getById: (id) => ipcRenderer.invoke('stores:getById', id)
  },
  users: {
    getAll: (params) => ipcRenderer.invoke('users:getAll', params),
    create: (data) => ipcRenderer.invoke('users:create', data),
    update: (id, data) => ipcRenderer.invoke('users:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('users:delete', id),
    getStores: (userId) => ipcRenderer.invoke('users:getStores', userId),
    assignStore: (userId, storeId, role) =>
      ipcRenderer.invoke('users:assignStore', { userId, storeId, role }),
    removeStore: (userId, storeId) => ipcRenderer.invoke('users:removeStore', { userId, storeId }),
    updateStoreRole: (userId, storeId, role) =>
      ipcRenderer.invoke('users:updateStoreRole', { userId, storeId, role })
  },
  roles: {
    getAll: () => ipcRenderer.invoke('roles:getAll'),
    getById: (id) => ipcRenderer.invoke('roles:getById', id),
    create: (data) => ipcRenderer.invoke('roles:create', data),
    update: (id, data) => ipcRenderer.invoke('roles:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('roles:delete', id)
  },
  profile: {
    update: (id, data) => ipcRenderer.invoke('profile:update', { id, data }),
    changePassword: (id, currentPassword, newPassword) =>
      ipcRenderer.invoke('profile:changePassword', { id, currentPassword, newPassword })
  },
  app: {
    uploadImage: (data: { base64Data: string; fileName: string }) =>
      ipcRenderer.invoke('app:uploadImage', data)
  },
  sales: {
    create: (data) => ipcRenderer.invoke('sales:create', data),
    getAll: (params) => ipcRenderer.invoke('sales:getAll', params),
    getById: (id) => ipcRenderer.invoke('sales:getById', id),
    delete: (id) => ipcRenderer.invoke('sales:delete', id),
    recordPayment: (saleId, paymentData) =>
      ipcRenderer.invoke('sales:recordPayment', { saleId, paymentData }),
    getPendingStats: (storeId) => ipcRenderer.invoke('sales:getPendingStats', { storeId }),
    getReport: (params) => ipcRenderer.invoke('sales:getReport', params),
    refund: (saleId, payload) => ipcRenderer.invoke('sales:refund', { saleId, ...payload })
  },
  accounts: {
    getAll: (params) => ipcRenderer.invoke('accounts:getAll', params),
    create: (data) => ipcRenderer.invoke('accounts:create', data),
    update: (id, data) => ipcRenderer.invoke('accounts:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('accounts:delete', id)
  },
  expenses: {
    getAll: (params) => ipcRenderer.invoke('expenses:getAll', params),
    create: (data) => ipcRenderer.invoke('expenses:create', data)
  },
  transactions: {
    getAll: (params) => ipcRenderer.invoke('transactions:getAll', params)
  },
  printer: {
    printReceipt: (html: string) => ipcRenderer.invoke('printer:printReceipt', html)
  },
  dashboard: {
    getStats: (storeId, period?: string) => ipcRenderer.invoke('dashboard:getStats', storeId, period)
  },
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    save: (data) => ipcRenderer.invoke('config:save', data),
    testConnection: (mongoUri: string) => ipcRenderer.invoke('config:testConnection', mongoUri),
    getConnectionStatus: () => ipcRenderer.invoke('config:getConnectionStatus')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
