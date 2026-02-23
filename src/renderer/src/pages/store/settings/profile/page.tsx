import { useState, useEffect } from 'react'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@renderer/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import { toast } from 'sonner'
import { User, Upload, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
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
import { Separator } from '@renderer/components/ui/separator'

const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  password: z.string().optional().or(z.literal(''))
})

type ProfileFormValues = z.infer<typeof profileSchema>

export default function SettingsProfilePage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  useEffect(() => {
    const loadUserAndRoles = async () => {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        setCurrentUser(user)
        form.reset({
          fullName: user.fullName || user.name || '',
          password: ''
        })
      }
    }

    loadUserAndRoles()
  }, [])

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      password: ''
    }
  })

  const onSubmit: SubmitHandler<ProfileFormValues> = async (values) => {
    if (!currentUser) return
    setIsLoading(true)

    try {
      const updateData: any = {
        fullName: values.fullName
      }

      if (values.password) {
        updateData.password = values.password
      }

      // Handle avatar upload if selected
      const avatarInput = document.getElementById('avatar-upload') as HTMLInputElement
      if (avatarInput?.files?.[0]) {
        const file = avatarInput.files[0]
        const reader = new FileReader()

        const base64Promise = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
        })
        reader.readAsDataURL(file)

        const base64Data = (await base64Promise) as string
        // Strip the prefix (e.g., "data:image/png;base64,")
        const base64Content = base64Data.split(',')[1]

        const uploadResult = await window.api.app.uploadImage({
          base64Data: base64Content,
          fileName: file.name
        })

        if (uploadResult.success) {
          updateData.avatarUrl = uploadResult.url
        } else {
          toast.error('Failed to upload avatar: ' + uploadResult.error)
        }
      }

      // Update user profile
      const result = await window.api.profile.update(currentUser.id || currentUser._id, updateData)

      if (result.success) {
        const isPasswordChanged = !!values.password

        if (isPasswordChanged) {
          toast.success('Profile and password updated. Please log in again.')
          setTimeout(() => {
            localStorage.removeItem('user')
            localStorage.removeItem('token')
            localStorage.removeItem('selectedStore')
            navigate('/login')
          }, 2000)
        } else {
          toast.success('Profile updated successfully')
          // Update local storage
          const updatedUser = { ...currentUser, ...result.data }
          // Ensure name/fullName consistency
          updatedUser.fullName = result.data.fullName
          updatedUser.name = result.data.fullName

          localStorage.setItem('user', JSON.stringify(updatedUser))
          setCurrentUser(updatedUser)
          // Dispatch event to sync other tabs
          window.dispatchEvent(new Event('storage'))
        }
      } else {
        toast.error('Error: ' + result.error)
      }
    } catch (error: any) {
      toast.error('An unexpected error occurred: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

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

  if (!currentUser) {
    return <div className="p-10 flex justify-center">Loading profile...</div>
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="border border-border"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">
              My Profile
            </h2>
            <p className="text-muted-foreground text-xs font-bold uppercase opacity-70">
              Manage your account settings and preferences.
            </p>
          </div>
        </div>
      </div>

      <Card className="border-border shadow-xl shadow-black/5">
        <CardHeader className="bg-muted/30 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-[#E8705A]/10 flex items-center justify-center border border-[#E8705A]/20">
              <User className="h-5 w-5 text-[#E8705A]" />
            </div>
            <div>
              <CardTitle className="text-lg font-black uppercase">Personal Information</CardTitle>
              <CardDescription className="text-xs font-bold uppercase opacity-70">
                Update your photo and personal details here.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8 py-4">
                <Avatar className="h-32 w-32 border-4 border-muted shadow-xl">
                  <AvatarImage src={preview || currentUser?.avatarUrl} className="object-cover" />
                  <AvatarFallback className="bg-muted text-4xl font-black text-muted-foreground uppercase">
                    {currentUser?.name?.charAt(0) || currentUser?.fullName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-4 flex-1 w-full text-center md:text-left">
                  <div className="space-y-1">
                    <Label htmlFor="avatar" className="font-black uppercase text-sm">
                      Profile Photo
                    </Label>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase opacity-70">
                      Recommended: Square JPG, PNG. Max 2MB.
                    </p>
                  </div>
                  <div className="flex justify-center md:justify-start">
                    <Label
                      htmlFor="avatar-upload"
                      className="cursor-pointer inline-flex items-center justify-center rounded-md text-xs font-black uppercase transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-[#E8705A] hover:text-white hover:border-[#E8705A] h-10 px-6 py-2 gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload New Photo
                      <Input
                        id="avatar-upload"
                        name="avatar"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </Label>
                  </div>
                </div>
              </div>

              <Separator className="bg-border" />

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-muted/30 border-border h-11 font-bold focus-visible:ring-[#E8705A]"
                          placeholder="Enter your full name"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold uppercase" />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-[10px] font-black uppercase text-muted-foreground"
                  >
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    defaultValue={currentUser?.email || ''}
                    className="bg-muted/50 border-border text-foreground font-bold h-11 opacity-70"
                    disabled
                  />
                  <p className="text-[10px] text-muted-foreground font-bold uppercase opacity-50">
                    Email cannot be changed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="role"
                    className="text-[10px] font-black uppercase text-muted-foreground"
                  >
                    Role
                  </Label>
                  <Input
                    id="role"
                    defaultValue={
                      typeof currentUser?.role === 'object'
                        ? currentUser.role?.name
                        : currentUser?.role || currentUser?.globalRole || 'USER'
                    }
                    className="bg-muted/50 border-border text-foreground font-bold h-11 opacity-70"
                    disabled
                  />
                  <p className="text-[10px] text-muted-foreground font-bold uppercase opacity-50">
                    Role is managed by admin
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-border">
                <LoadingButton
                  type="submit"
                  isLoading={isLoading}
                  loadingText="SAVING..."
                  className="bg-[#E8705A] hover:bg-[#D4604C] text-black font-black uppercase text-xs tracking-widest h-12 px-8 shadow-lg shadow-[#E8705A]/20"
                >
                  Save Changes
                </LoadingButton>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
