import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { app } from 'electron'

// Check if running in production (packaged app)
const isProduction = app.isPackaged

let MONGODB_URI: string | undefined

if (isProduction) {
  // PRODUCTION: Use hardcoded connection or config file
  console.log('🏭 Running in PRODUCTION mode')

  // Option A: Hardcoded (for single deployment)
  MONGODB_URI = 'mongodb://localhost:27017/lasani-pos-database'

  // Option B: Read from config file in userData directory (uncomment to use)
  // const configPath = path.join(app.getPath('userData'), 'config.json')
  // try {
  //   const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  //   MONGODB_URI = config.MONGODB_URI
  // } catch (error) {
  //   console.error('❌ Failed to load config.json:', error)
  //   MONGODB_URI = 'mongodb://localhost:27017/lasani-pos-database' // fallback
  // }
} else {
  // DEVELOPMENT: Use .env file
  console.log('🔧 Running in DEVELOPMENT mode')
  const envPath = path.resolve(process.cwd(), '.env')
  console.log('🔍 Looking for .env at:', envPath)

  const result = dotenv.config({ path: envPath })
  if (result.error) {
    console.error('❌ Failed to load .env file:', result.error)
  } else {
    console.log('✅ .env file loaded successfully')
  }

  MONGODB_URI = process.env.MONGODB_URI
}

console.log('📍 MONGODB_URI:', MONGODB_URI)
let isConnected = false

export async function connectToDatabase(): Promise<{ success: boolean; error?: string }> {
  if (isConnected) {
    console.log('Already connected to MongoDB')
    return { success: true }
  }

  try {
    if (!MONGODB_URI) {
      const error = 'MONGODB_URI is not set'
      console.error('❌', error)
      return { success: false, error }
    }

    const db = await mongoose.connect(MONGODB_URI)

    isConnected = db.connections[0].readyState === 1
    console.log('✅ Connected to MongoDB')
    return { success: true }
  } catch (error: any) {
    console.error('❌ MongoDB connection error:', error)
    return { success: false, error: error.message || 'Connection failed' }
  }
}

export async function disconnectFromDatabase() {
  if (!isConnected) return

  try {
    await mongoose.disconnect()
    isConnected = false
    console.log('Disconnected from MongoDB')
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error)
  }
}
