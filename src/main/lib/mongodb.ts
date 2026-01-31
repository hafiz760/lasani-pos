import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env')
console.log('🔍 Looking for .env at:', envPath)

const result = dotenv.config({ path: envPath })
if (result.error) {
  console.error('❌ Failed to load .env file:', result.error)
} else {
  console.log('✅ .env file loaded successfully')
}

const MONGODB_URI = process.env.MONGODB_URI

console.log('📍 MONGODB_URI:', MONGODB_URI)
let isConnected = false

export async function connectToDatabase() {
  if (isConnected) {
    console.log('Already connected to MongoDB')
    return
  }

  try {
    const db = await mongoose.connect(MONGODB_URI)

    isConnected = db.connections[0].readyState === 1
    console.log('✅ Connected to MongoDB')
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    throw error
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
