import { ipcMain, BrowserWindow } from 'electron'
import * as models from '../../models'
import * as fs from 'fs'
import * as path from 'path'
import mongoose from 'mongoose'
import { toJSON } from '../helpers'
import { configManager } from '../../lib/config-manager'

export function registerDashboardHandlers() {
    ipcMain.handle('dashboard:getStats', async (_event, storeId, period = 'all') => {
        try {
            const now = new Date()
            let dateFilter: any = {}

            if (period === 'today') {
                const startOfDay = new Date(now)
                startOfDay.setHours(0, 0, 0, 0)
                dateFilter = { createdAt: { $gte: startOfDay } }
            } else if (period === 'week') {
                const startOfWeek = new Date(now)
                startOfWeek.setDate(now.getDate() - now.getDay())
                startOfWeek.setHours(0, 0, 0, 0)
                dateFilter = { createdAt: { $gte: startOfWeek } }
            } else if (period === 'month') {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
                dateFilter = { createdAt: { $gte: startOfMonth } }
            }

            const salesQuery: any = { store: storeId, ...dateFilter }
            const sales = await models.Sale.find(salesQuery).lean()
            const products = await models.Product.find({ store: storeId }).lean()

            const revenue = sales.reduce((acc, sale) => acc + (sale.totalAmount || 0), 0)
            const profit = sales.reduce((acc, sale) => acc + (sale.profitAmount || 0), 0)
            const salesCount = sales.length

            const lowStockCount = products.filter((p) => p.stockLevel <= p.minStockLevel).length

            const pendingSales = sales.filter((s) => s.paymentStatus !== 'PAID')
            const totalPending = pendingSales.reduce(
                (acc, sale) => acc + (sale.totalAmount - sale.paidAmount),
                0
            )

            let chartData: any[] = []
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

            if (period === 'today') {
                const hourMap = new Map<string, number>()
                for (let h = 0; h < 24; h++) {
                    const label = h === 0 ? '12AM' : h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`
                    hourMap.set(label, 0)
                }
                sales.forEach((sale) => {
                    const h = new Date(sale.createdAt).getHours()
                    const label = h === 0 ? '12AM' : h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`
                    hourMap.set(label, (hourMap.get(label) || 0) + (sale.totalAmount || 0))
                })
                chartData = Array.from(hourMap.entries()).map(([name, sales]) => ({ name, sales }))
            } else if (period === 'week') {
                const dayMap = new Map<string, number>()
                for (let i = 0; i < 7; i++) {
                    const d = new Date(now)
                    d.setDate(now.getDate() - now.getDay() + i)
                    dayMap.set(days[d.getDay()], 0)
                }
                sales.forEach((sale) => {
                    const dayName = days[new Date(sale.createdAt).getDay()]
                    if (dayMap.has(dayName)) {
                        dayMap.set(dayName, (dayMap.get(dayName) || 0) + (sale.totalAmount || 0))
                    }
                })
                chartData = Array.from(dayMap.entries()).map(([name, sales]) => ({ name, sales }))
            } else if (period === 'month') {
                const weekMap = new Map<string, number>()
                const weeksInMonth = Math.ceil((now.getDate()) / 7)
                for (let w = 1; w <= Math.max(weeksInMonth, 4); w++) {
                    weekMap.set(`Week ${w}`, 0)
                }
                sales.forEach((sale) => {
                    const saleDate = new Date(sale.createdAt)
                    const weekNum = Math.ceil(saleDate.getDate() / 7)
                    const key = `Week ${weekNum}`
                    if (weekMap.has(key)) {
                        weekMap.set(key, (weekMap.get(key) || 0) + (sale.totalAmount || 0))
                    }
                })
                chartData = Array.from(weekMap.entries()).map(([name, sales]) => ({ name, sales }))
            } else {
                const chartDataMap = new Map<string, number>()
                for (let i = 6; i >= 0; i--) {
                    const date = new Date(now)
                    date.setDate(now.getDate() - i)
                    chartDataMap.set(days[date.getDay()], 0)
                }
                const sevenDaysAgo = new Date(now)
                sevenDaysAgo.setDate(now.getDate() - 6)
                sevenDaysAgo.setHours(0, 0, 0, 0)
                const recentSalesForChart = await models.Sale.find({
                    store: storeId,
                    createdAt: { $gte: sevenDaysAgo }
                }).lean()
                recentSalesForChart.forEach((sale) => {
                    const dayName = days[new Date(sale.createdAt).getDay()]
                    if (chartDataMap.has(dayName)) {
                        chartDataMap.set(dayName, (chartDataMap.get(dayName) || 0) + (sale.totalAmount || 0))
                    }
                })
                chartData = Array.from(chartDataMap.entries()).map(([name, sales]) => ({ name, sales }))
            }

            const recentSales = await models.Sale.find(salesQuery)
                .populate('customer', 'name')
                .sort({ createdAt: -1 })
                .limit(5)
                .lean()
                .then((sales) =>
                    sales.map((s) => ({
                        customer: s.customer ? { name: (s.customer as any).name } : null,
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
}

export function registerMediaHandlers() {
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

            const ext = path.extname(fileName) || '.png'
            const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
            const filePath = path.join(uploadsDir, uniqueFileName)

            const buffer = Buffer.from(base64Data, 'base64')
            fs.writeFileSync(filePath, buffer)

            return { success: true, url: `media://${uniqueFileName}` }
        } catch (error: any) {
            console.error('Image upload error:', error)
            return { success: false, error: error.message }
        }
    })
}

export function registerConfigHandlers() {
    ipcMain.handle('config:get', async () => {
        try {
            const config = configManager.getConfig()
            return { success: true, data: config }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('config:save', async (_event, data) => {
        try {
            configManager.saveConfig(data)
            return { success: true }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('config:testConnection', async (_event, mongoUri: string) => {
        try {
            const testConnection = await mongoose.createConnection(mongoUri).asPromise()
            await testConnection.close()
            return { success: true, message: 'Connection successful!' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('config:getConnectionStatus', async () => {
        try {
            const isConnected = mongoose.connection.readyState === 1
            return {
                success: true,
                connected: isConnected,
                state: mongoose.connection.readyState
            }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })
}
