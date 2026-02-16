import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Database, Settings } from 'lucide-react'
import { DatabaseConfigModal } from '@renderer/components/shared/database-config-modal'

export default function AdminSettingsPage() {
    const [showDbConfig, setShowDbConfig] = useState(false)

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">System Settings</h1>
                <p className="text-muted-foreground">Manage system-wide configuration</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Database Configuration Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            <CardTitle>Database Configuration</CardTitle>
                        </div>
                        <CardDescription>
                            Configure MongoDB connection settings for the application
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => setShowDbConfig(true)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Configure Database
                        </Button>
                    </CardContent>
                </Card>

                {/* Future settings cards can go here */}
            </div>

            {/* Database Config Modal */}
            <DatabaseConfigModal
                open={showDbConfig}
                onClose={() => setShowDbConfig(false)}
                onSuccess={() => setShowDbConfig(false)}
                canClose={true}
            />
        </div>
    )
}
