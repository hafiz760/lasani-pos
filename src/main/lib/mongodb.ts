import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { app } from 'electron'
import { configManager } from './config-manager'

export type DatabaseConnectionSource = 'development-environment' | 'saved-configuration' | 'none'

interface ConnectionResult {
  success: boolean
  error?: string
  source: DatabaseConnectionSource
}

function loadDevelopmentEnvironment(): void {
  if (!app.isPackaged) {
    console.log('Loading development environment configuration')
    const envPath = path.resolve(process.cwd(), '.env')
    dotenv.config({ path: envPath })
  }
}

function getConnectionConfiguration(): {
  uri?: string
  source: DatabaseConnectionSource
} {
  const developmentUri = !app.isPackaged ? process.env.MONGODB_URI?.trim() : undefined

  if (developmentUri) {
    return { uri: developmentUri, source: 'development-environment' }
  }

  const savedUri = configManager.getMongoURI()
  if (savedUri) {
    return { uri: savedUri, source: 'saved-configuration' }
  }

  return { source: 'none' }
}

loadDevelopmentEnvironment()

export async function connectToDatabase(): Promise<ConnectionResult> {
  const { uri, source } = getConnectionConfiguration()

  if (mongoose.connection.readyState === 1) {
    return { success: true, source }
  }

  try {
    if (!uri) {
      return {
        success: false,
        source,
        error: 'Database connection has not been configured.'
      }
    }

    await mongoose.connect(uri)

    console.log(`Connected to MongoDB using ${source}`)
    return { success: true, source }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Connection failed'
    console.error('MongoDB connection error:', message)
    return { success: false, source, error: message }
  }
}

export async function reconnectToDatabase(): Promise<ConnectionResult> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }

  return connectToDatabase()
}

export async function disconnectFromDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) return

  try {
    await mongoose.disconnect()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown disconnect error'
    console.error('MongoDB disconnect error:', message)
  }
}
