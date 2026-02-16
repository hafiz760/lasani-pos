import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Alert, AlertDescription } from '@renderer/components/ui/alert'
import { Loader2, Database, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface DatabaseConfigModalProps {
    open: boolean
    onClose: () => void
    onSuccess?: () => void
    canClose?: boolean // If false, user must configure (connection failed)
}

export function DatabaseConfigModal({
    open,
    onClose,
    onSuccess,
    canClose = true
}: DatabaseConfigModalProps) {
    const [mongoUri, setMongoUri] = useState('mongodb://localhost:27017/lasani-pos-database')
    const [testing, setTesting] = useState(false)
    const [saving, setSaving] = useState(false)
    const [testResult, setTestResult] = useState<{
        success: boolean
        message: string
    } | null>(null)

    // Load current config on mount
    useEffect(() => {
        if (open) {
            loadCurrentConfig()
        }
    }, [open])

    const loadCurrentConfig = async () => {
        try {
            const result = await window.api.config.get()
            if (result.success && result.data?.MONGODB_URI) {
                setMongoUri(result.data.MONGODB_URI)
            }
        } catch (error) {
            console.error('Failed to load config:', error)
        }
    }

    const handleTestConnection = async () => {
        if (!mongoUri.trim()) {
            toast.error('Please enter a MongoDB connection string')
            return
        }

        setTesting(true)
        setTestResult(null)

        try {
            const result = await window.api.config.testConnection(mongoUri)

            if (result.success) {
                setTestResult({
                    success: true,
                    message: result.message || 'Connection successful!'
                })
                toast.success('Database connection successful!')
            } else {
                setTestResult({
                    success: false,
                    message: result.error || 'Connection failed'
                })
                toast.error('Connection failed: ' + result.error)
            }
        } catch (error: any) {
            setTestResult({
                success: false,
                message: error.message || 'Connection test failed'
            })
            toast.error('Connection test failed')
        } finally {
            setTesting(false)
        }
    }

    const handleSave = async () => {
        if (!mongoUri.trim()) {
            toast.error('Please enter a MongoDB connection string')
            return
        }

        // Must test connection first
        if (!testResult?.success) {
            toast.error('Please test the connection first')
            return
        }

        setSaving(true)

        try {
            const result = await window.api.config.save({
                MONGODB_URI: mongoUri,
                isConfigured: true
            })

            if (result.success) {
                toast.success('Configuration saved! Please restart the application.')
                onSuccess?.()

                // Show restart prompt
                setTimeout(() => {
                    if (confirm('Configuration saved successfully!\n\nThe application needs to restart to apply changes.\n\nRestart now?')) {
                        window.location.reload()
                    } else {
                        onClose()
                    }
                }, 500)
            } else {
                toast.error('Failed to save configuration: ' + result.error)
            }
        } catch (error: any) {
            toast.error('Failed to save configuration')
            console.error('Save error:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleClose = () => {
        if (!canClose) {
            toast.error('You must configure the database connection to continue')
            return
        }
        onClose()
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px]" onPointerDownOutside={(e) => !canClose && e.preventDefault()}>
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        <DialogTitle>Database Configuration</DialogTitle>
                    </div>
                    <DialogDescription>
                        {!canClose ? (
                            <span className="text-destructive font-medium">
                                ⚠️ Database connection failed. Please configure the connection to continue.
                            </span>
                        ) : (
                            'Configure your MongoDB database connection'
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Connection String Input */}
                    <div className="space-y-2">
                        <Label htmlFor="mongoUri">MongoDB Connection String</Label>
                        <Input
                            id="mongoUri"
                            placeholder="mongodb://localhost:27017/lasani-pos-database"
                            value={mongoUri}
                            onChange={(e) => {
                                setMongoUri(e.target.value)
                                setTestResult(null) // Reset test result when URI changes
                            }}
                            className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Enter your MongoDB connection URI. For local database, use: mongodb://localhost:27017/your-database-name
                        </p>
                    </div>

                    {/* Test Result */}
                    {testResult && (
                        <Alert variant={testResult.success ? 'default' : 'destructive'}>
                            <div className="flex items-center gap-2">
                                {testResult.success ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                    <XCircle className="h-4 w-4" />
                                )}
                                <AlertDescription>{testResult.message}</AlertDescription>
                            </div>
                        </Alert>
                    )}

                    {/* Help Section */}
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            <div className="space-y-2 text-sm">
                                <p className="font-medium">Connection Examples:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                    <li>Local: <code className="bg-muted px-1 rounded">mongodb://localhost:27017/lasani-pos</code></li>
                                    <li>Network: <code className="bg-muted px-1 rounded">mongodb://192.168.1.100:27017/lasani-pos</code></li>
                                    <li>With Auth: <code className="bg-muted px-1 rounded">mongodb://user:pass@localhost:27017/lasani-pos</code></li>
                                </ul>
                            </div>
                        </AlertDescription>
                    </Alert>
                </div>

                {/* Actions */}
                <div className="flex justify-between gap-2">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={!canClose || saving}
                    >
                        {canClose ? 'Cancel' : 'Cannot Close'}
                    </Button>

                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            onClick={handleTestConnection}
                            disabled={testing || saving || !mongoUri.trim()}
                        >
                            {testing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                <>
                                    <Database className="mr-2 h-4 w-4" />
                                    Test Connection
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={handleSave}
                            disabled={!testResult?.success || saving}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save & Restart'
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
