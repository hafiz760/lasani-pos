import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import { Input } from '@renderer/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card'
import { toast } from 'sonner'
import { Smartphone, Eye, EyeOff } from 'lucide-react'
import { ModeToggle } from '@renderer/components/shared/mode-toggle'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { LoginFormData, loginSchema } from '@renderer/lib/validations/user.validation'

interface LoginPageProps {
  onLoginSuccess: (user: any) => void
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true)
    try {
      console.log('Attempting login with:', values.email)
      const result = await window.api.auth.login(values)

      if (!result.success) {
        toast.error(result.error || 'Invalid credentials. Please try again.')
      } else {
        toast.success('Login successful!')
        localStorage.removeItem('selectedStore')
        localStorage.removeItem('token')
        onLoginSuccess(result.data)
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background relative">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <div className="w-full max-w-md p-4">
        <div className="flex flex-col items-center mb-8 gap-2">
          <div className="p-3 bg-card rounded-xl border border-border">
            <Smartphone className="w-8 h-8 text-[#4ade80]" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight text-center">
            Rex<span className="text-[#4ade80]">POS</span>
          </h1>
          <p className="text-muted-foreground text-sm">Inventory & Sales Management</p>
        </div>

        <Card className="bg-card border-border text-foreground shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-semibold">Sign In</CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground font-medium">
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="admin@example.com"
                          {...field}
                          className="bg-muted border-border text-foreground focus:border-[#4ade80] focus:ring-[#4ade80]/20 transition-all h-11"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground font-medium">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            {...field}
                            className="bg-muted border-border text-foreground focus:border-[#4ade80] focus:ring-[#4ade80]/20 transition-all h-11 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />
                <LoadingButton
                  type="submit"
                  isLoading={isLoading}
                  loadingText="Signing in..."
                  className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold h-11 transition-all mt-2"
                >
                  Sign In
                </LoadingButton>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col items-center">
            <p className="text-muted-foreground text-xs text-center border-t border-border pt-6 w-full mt-2">
              &copy; 2026 RexPOS. All rights reserved.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
