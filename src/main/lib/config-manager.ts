import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

interface AppConfig {
    MONGODB_URI: string
    isConfigured: boolean
}

const CONFIG_FILE = 'app-config.json'

export class ConfigManager {
    private configPath: string
    private config: AppConfig | null = null

    constructor() {
        // Store config in userData directory (persists across updates)
        this.configPath = path.join(app.getPath('userData'), CONFIG_FILE)
        this.loadConfig()
    }

    private loadConfig(): void {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf-8')
                this.config = JSON.parse(data)
                console.log('✅ Config loaded from:', this.configPath)
            } else {
                console.log('⚠️ No config file found, using defaults')
                this.config = {
                    MONGODB_URI: 'mongodb://localhost:27017/lasani-pos-database',
                    isConfigured: false
                }
            }
        } catch (error) {
            console.error('❌ Failed to load config:', error)
            this.config = {
                MONGODB_URI: 'mongodb://localhost:27017/lasani-pos-database',
                isConfigured: false
            }
        }
    }

    public saveConfig(config: Partial<AppConfig>): void {
        try {
            this.config = { ...this.config!, ...config }

            // Ensure userData directory exists
            const userDataDir = app.getPath('userData')
            if (!fs.existsSync(userDataDir)) {
                fs.mkdirSync(userDataDir, { recursive: true })
            }

            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8')
            console.log('✅ Config saved to:', this.configPath)
        } catch (error) {
            console.error('❌ Failed to save config:', error)
            throw error
        }
    }

    public getMongoURI(): string {
        return this.config?.MONGODB_URI || 'mongodb://localhost:27017/lasani-pos-database'
    }

    public isConfigured(): boolean {
        return this.config?.isConfigured || false
    }

    public getConfig(): AppConfig {
        return this.config!
    }
}

// Singleton instance
export const configManager = new ConfigManager()
