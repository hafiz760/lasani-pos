import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Database, Settings, Shield, Store, Users } from 'lucide-react'
import { DatabaseConfigModal } from '@renderer/components/shared/database-config-modal'

export default function AdminSettingsPage() {
  const navigate = useNavigate()
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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Roles</CardTitle>
            </div>
            <CardDescription>Create and manage system roles.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate('/admin/roles')}>
              <Shield className="mr-2 h-4 w-4" />
              Manage Roles
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Users</CardTitle>
            </div>
            <CardDescription>Create users and assign them to stores.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate('/admin/users')}>
              <Users className="mr-2 h-4 w-4" />
              Manage Users
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              <CardTitle>Stores</CardTitle>
            </div>
            <CardDescription>Manage stores and their clothing catalog data.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate('/admin/stores')}>
              <Store className="mr-2 h-4 w-4" />
              Manage Stores
            </Button>
          </CardContent>
        </Card>
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
