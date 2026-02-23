import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import { Lock, Shield, Upload, Save, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { Separator } from '@renderer/components/ui/separator'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import {
  ProfileFormData,
  PasswordFormData,
  profileSchema,
  passwordSchema
} from '@renderer/lib/validations/user.validation'
import { useNavigate } from 'react-router-dom'

export default function ProfilePage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || ''
    }
  })

  useEffect(() => {
    if (user) {
      profileForm.reset({ fullName: user.fullName })
    }
  }, [user])

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onProfileSubmit: SubmitHandler<ProfileFormData> = async (values) => {
    setIsUpdatingProfile(true)
    try {
      const updateData: any = {
        fullName: values.fullName
      }

      // If there's a new preview (base64 from FileReader), upload it first
      if (preview && preview.startsWith('data:')) {
        const base64Content = preview.split(',')[1]
        // We'll use a generic filename or try to get it if we stored it
        // For profile, a simple "avatar.png" is fine as the backend makes it unique
        const uploadResult = await window.api.app.uploadImage({
          base64Data: base64Content,
          fileName: 'avatar.png'
        })

        if (uploadResult.success) {
          updateData.avatarUrl = uploadResult.url
        } else {
          toast.error('Failed to upload avatar: ' + uploadResult.error)
          setIsUpdatingProfile(false)
          return
        }
      }

      const result = await window.api.profile.update(user.id || user._id, updateData)
      if (result.success) {
        toast.success('Profile updated successfully')
        const updatedUser = { ...user, ...result.data }
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        // Clear preview since it's now saved and part of the user object
        setPreview(null)
        // Dispatch event to sync other tabs
        window.dispatchEvent(new Event('storage'))
      } else {
        toast.error(result.error || 'Failed to update profile')
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const onPasswordSubmit: SubmitHandler<PasswordFormData> = async (values) => {
    setIsChangingPassword(true)
    try {
      const result = await window.api.profile.changePassword(
        user.id || user._id,
        values.currentPassword,
        values.newPassword
      )
      if (result.success) {
        toast.success('Password changed successfully. Please log in again.')
        setTimeout(() => {
          localStorage.removeItem('user')
          localStorage.removeItem('token')
          localStorage.removeItem('selectedStore')
          navigate('/login')
        }, 2000)
      } else {
        toast.error(result.error || 'Failed to change password')
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile information and security settings.
        </p>
      </div>

      <Separator className="bg-border" />

      <div className="grid gap-6">
        {/* Personal Information Card */}
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-[#E8705A]/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-[#E8705A]" />
              </div>
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your avatar and basic profile details.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8 mt-4">
                <div className="flex flex-col items-center justify-center gap-6 py-4">
                  <div className="relative group">
                    <Avatar className="h-32 w-32 border-4 border-[#E8705A]/20 transition-transform group-hover:scale-105">
                      <AvatarImage src={preview || user?.avatarUrl} className="object-cover" />
                      <AvatarFallback className="bg-muted text-4xl font-bold text-muted-foreground">
                        {user?.fullName?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <Label
                      htmlFor="avatar"
                      className="absolute bottom-0 right-0 p-2 bg-[#E8705A] rounded-full cursor-pointer shadow-lg hover:bg-[#D4604C] transition-colors"
                    >
                      <Upload className="w-5 h-5 text-black" />
                      <Input
                        id="avatar"
                        name="avatar"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </Label>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">{user?.email}</p>
                    <p className="text-xs text-muted-foreground uppercase mt-1 tracking-wider font-bold text-[#E8705A]">
                      {user?.globalRole === 'ADMIN' ? 'Super Admin' : 'Store User'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={profileForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-muted/50 border-border focus:border-[#E8705A]"
                            placeholder="Enter your full name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Email Address</Label>
                    <Input
                      disabled
                      value={user?.email || ''}
                      className="bg-muted/30 border-border text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <LoadingButton
                    type="submit"
                    isLoading={isUpdatingProfile}
                    loadingText="Saving Changes..."
                    className="bg-[#E8705A] hover:bg-[#D4604C] text-black font-semibold min-w-[140px]"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Update Profile
                  </LoadingButton>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Update your password to keep your account secure.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                className="space-y-6 mt-4"
              >
                <div className="grid gap-6 md:grid-cols-3">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            className="bg-muted/50 border-border focus:border-orange-500"
                            placeholder="••••••••"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            className="bg-muted/50 border-border focus:border-orange-500"
                            placeholder="Minimum 8 characters"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            className="bg-muted/50 border-border focus:border-orange-500"
                            placeholder="Re-type new password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <LoadingButton
                    type="submit"
                    isLoading={isChangingPassword}
                    loadingText="Changing Password..."
                    className="bg-orange-500 hover:bg-orange-600 text-white font-semibold min-w-[160px]"
                  >
                    <KeyRound className="w-4 h-4 mr-2" />
                    Change Password
                  </LoadingButton>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
