'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Lock, Save, Loader2, User } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [isSaving, setIsSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      setCurrentUser(JSON.parse(userStr))
    }
  }, [])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (formData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setIsSaving(true)
    try {
      const result = await window.api.profile.changePassword(
        currentUser.id || currentUser._id,
        formData.currentPassword,
        formData.newPassword
      )

      if (result.success) {
        toast.success('Password changed successfully')
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        toast.error(result.error || 'Failed to change password')
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">Settings</h2>
        <p className="text-muted-foreground text-xs font-bold uppercase opacity-70">
          Manage your account preferences and security.
        </p>
      </div>

      <div className="grid gap-6">
        <Card
          className="bg-card border-border text-foreground hover:border-[#E8705A] transition-colors cursor-pointer group shadow-xl shadow-black/5"
          onClick={() => navigate('/dashboard/settings/profile')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-black uppercase text-lg group-hover:text-[#E8705A] transition-colors">
              <User className="w-5 h-5" />
              My Profile
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs font-bold uppercase opacity-70">
              Update your name, profile picture and other personal details.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="bg-card border-border text-foreground shadow-xl shadow-black/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-black uppercase text-lg">
              <Lock className="w-5 h-5 text-[#E8705A]" />
              Security / Change Password
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs font-bold uppercase opacity-70">
              Update your password to keep your account secure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label
                  htmlFor="current"
                  className="text-[10px] font-black uppercase text-muted-foreground"
                >
                  Current Password
                </Label>
                <Input
                  id="current"
                  type="password"
                  required
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  className="bg-muted/30 border-border focus-visible:ring-[#E8705A] font-bold h-11"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="new"
                  className="text-[10px] font-black uppercase text-muted-foreground"
                >
                  New Password
                </Label>
                <Input
                  id="new"
                  type="password"
                  required
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="bg-muted/30 border-border focus-visible:ring-[#E8705A] font-bold h-11"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="confirm"
                  className="text-[10px] font-black uppercase text-muted-foreground"
                >
                  Confirm New Password
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="bg-muted/30 border-border focus-visible:ring-[#E8705A] font-bold h-11"
                />
              </div>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#E8705A] hover:bg-[#D4604C] text-black font-black uppercase text-xs tracking-widest mt-4 h-11 px-6 shadow-lg shadow-[#E8705A]/20"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
