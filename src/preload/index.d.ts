import { ElectronAPI } from '@electron-toolkit/preload'
import { StoreFormData } from '@renderer/lib/validations/store.validation'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      auth: {
        login: (credentials: { email: string; password: string }) => Promise<{
          success: boolean
          data?: any
          error?: string
        }>
      }
      products: {
        getAll: (params?: any) => Promise<any>
        create: (data: any) => Promise<any>
        update: (id: string, data: any) => Promise<any>
        delete: (id: string) => Promise<any>
        getById: (id: string) => Promise<any>
        getBySku: (params: { storeId: string; sku: string }) => Promise<any>
        getByBarcode: (params: { storeId: string; barcode: string }) => Promise<any>
        checkBarcode: (params: {
          storeId: string
          barcode: string
          excludeId?: string
        }) => Promise<any>
        restock: (data: {
          productId: string
          supplierId: string
          quantity: number
          unitCost: number
          sellingPrice: number
        }) => Promise<any>
        checkSales: (id: string) => Promise<any>
        getInitialStockEntry: (id: string) => Promise<any>
      }
      suppliers: {
        getAll: (params?: any) => Promise<any>
        getByProductId: (params: { storeId: string; productId: string }) => Promise<any>
        create: (data: any) => Promise<any>
        update: (id: string, data: any) => Promise<any>
        delete: (id: string) => Promise<any>
        getById: (id: string) => Promise<any>
        recordPayment: (supplierId: string, paymentData: any) => Promise<any>
      }
      customers: {
        getAll: (params?: any) => Promise<any>
        create: (data: any) => Promise<any>
        update: (id: string, data: any) => Promise<any>
        delete: (id: string) => Promise<any>
        getById: (id: string) => Promise<any>
        recordPayment: (customerId: string, paymentData: any) => Promise<any>
      }
      inventory: {
        getHistory: (params: { productId: string; storeId: string; limit?: number }) => Promise<any>
      }
      purchaseOrders: {
        getAll: (params?: any) => Promise<any>
        getById: (id: string) => Promise<any>
        getLastSupply: (params: { storeId: string; productId: string }) => Promise<any>
        create: (data: any) => Promise<any>
        update: (id: string, data: any) => Promise<any>
        delete: (id: string) => Promise<any>
      }
      categories: {
        getAll: (params?: any) => Promise<any>
        create: (data: any) => Promise<any>
        update: (id: string, data: any) => Promise<any>
        delete: (id: string) => Promise<any>
      }
      brands: {
        getAll: (params?: any) => Promise<any>
        create: (data: any) => Promise<any>
        update: (id: string, data: any) => Promise<any>
        delete: (id: string) => Promise<any>
      }
      attributes: {
        getAll: (params?: any) => Promise<any>
        create: (data: any) => Promise<any>
        update: (id: string, data: any) => Promise<any>
        delete: (id: string) => Promise<any>
      }

      accounts: {
        getAll: (params?: any) => Promise<any>
        create: (data: any) => Promise<any>
        update: (id: string, data: any) => Promise<any>
        delete: (id: string) => Promise<any>
      }
      expenses: {
        getAll: (params?: any) => Promise<any>
        create: (data: any) => Promise<any>
      }
      transactions: {
        getAll: (params?: any) => Promise<any>
      }
      stores: {
        getAll: (params?: any) => Promise<any>
        create: (data: StoreFormData) => Promise<any>
        update: (id: string, data: any) => Promise<any>
        toggleStatus: (id: string) => Promise<any>
        getById: (id: string) => Promise<any>
      }
      users: {
        getAll: (params?: any) => Promise<any>
        create: (data: any) => Promise<any>
        update: (id: string, data: any) => Promise<any>
        delete: (id: string) => Promise<any>
        getStores: (userId: string) => Promise<any>
        assignStore: (userId: string, storeId: string, role: string) => Promise<any>
        removeStore: (userId: string, storeId: string) => Promise<any>
        updateStoreRole: (userId: string, storeId: string, role: string) => Promise<any>
      }
      roles: {
        getAll: () => Promise<any>
        getById: (id: string) => Promise<any>
        create: (data: any) => Promise<any>
        update: (id: string, data: any) => Promise<any>
        delete: (id: string) => Promise<any>
      }
      profile: {
        update: (id: string, data: any) => Promise<any>
        changePassword: (id: string, current: string, next: string) => Promise<any>
      }
      app: {
        uploadImage: (data: { base64Data: string; fileName: string }) => Promise<any>
      }
      printer: {
        printReceipt: (html: string) => Promise<any>
      }
      sales: {
        create: (data: any) => Promise<any>
        getAll: (params?: any) => Promise<any>
        getById: (id: string) => Promise<any>
        delete: (id: string) => Promise<any>
        recordPayment: (saleId: string, paymentData: any) => Promise<any>
        getPendingStats: (storeId: string) => Promise<any>
        getReport: (params: {
          storeId: string
          startDate: string
          endDate: string
          groupBy?: 'day' | 'week' | 'month'
        }) => Promise<any>
        refund: (
          saleId: string,
          payload: {
            refundItems: Array<{ product: string; quantity: number }>
            method: string
            reason?: string
            processedBy: string
          }
        ) => Promise<any>
      }
      dashboard: {
        getStats: (storeId: string, period?: string) => Promise<any>
      }
      config: {
        get: () => Promise<{ success: boolean; data?: any; error?: string }>
        save: (data: any) => Promise<{ success: boolean; error?: string }>
        testConnection: (mongoUri: string) => Promise<{ success: boolean; message?: string; error?: string }>
        getConnectionStatus: () => Promise<{ success: boolean; connected?: boolean; state?: number; error?: string }>
      }
    }
  }
}
