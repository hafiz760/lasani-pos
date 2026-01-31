import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { LoadingButton } from '@renderer/components/ui/loading-button'
import { Button } from '@renderer/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import { UserCog, Building2, Plus, Trash2, Lock, Mail, Search, Edit } from 'lucide-react'
import { Input } from '@renderer/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@renderer/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { Separator } from '@renderer/components/ui/separator'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Pagination } from '@renderer/components/ui/pagination'
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
import { UserFormData, userSchema } from '@renderer/lib/validations/user.validation'
import { Label } from '@radix-ui/react-label'

export default function UsersPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [userStores, setUserStores] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [isManageOpen, setIsManageOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [assignStoreId, setAssignStoreId] = useState('')
  const [assignRole, setAssignRole] = useState('CASHIER')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const loadInitialData = async () => {
    try {
      const [rolesRes, storesRes] = await Promise.all([
        window.api.roles.getAll(),
        window.api.stores.getAll({ pageSize: 100 })
      ])
      if (rolesRes.success) setRoles(rolesRes.data)
      if (storesRes.success) setStores(storesRes.data)
    } catch (error) {
      console.error('Failed to load initial data:', error)
    }
  }

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const result = await window.api.users.getAll({ page, pageSize, search: searchTerm })
      if (result.success) {
        setUsers(result.data)
        setTotal(result.total)
        setTotalPages(result.totalPages)
      }
    } catch (error) {
      toast.error('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    loadUsers()
  }, [page, pageSize, searchTerm])

  const loadUserStores = async (userId: string) => {
    try {
      const result = await window.api.users.getStores(userId)
      if (result.success) {
        setUserStores(result.data)
      }
    } catch (error) {
      console.error('Failed to load user stores:', error)
    }
  }

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      role: '',
      globalRole: 'USER'
    }
  })

  const selectedUser = users.find((u: any) => u._id === selectedUserId)

  const openManageAccess = (user: any) => {
    setSelectedUserId(user._id)
    setIsManageOpen(true)
    loadUserStores(user._id)
  }

  const handleAssign = async () => {
    if (!selectedUserId || !assignStoreId) {
      toast.error('Please select a store')
      return
    }
    setIsAssigning(true)
    try {
      const result = await window.api.users.assignStore(selectedUserId, assignStoreId, assignRole)
      if (result.success) {
        toast.success('Access granted successfully')
        setAssignStoreId('')
        setAssignRole('CASHIER')
        loadUserStores(selectedUserId)
      } else {
        toast.error('Error: ' + result.error)
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setIsAssigning(false)
    }
  }

  const handleRemoveAccess = async (storeId: string) => {
    if (!selectedUserId) return
    if (!confirm("Remove this user's access to this store?")) return
    try {
      const result = await window.api.users.removeStore(selectedUserId, storeId)
      if (result.success) {
        toast.success('Access removed')
        loadUserStores(selectedUserId)
      } else {
        toast.error('Error: ' + result.error)
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    }
  }

  const handleUpdateRole = async (storeId: string, newRole: string) => {
    if (!selectedUserId) return
    try {
      const result = await window.api.users.updateStoreRole(selectedUserId, storeId, newRole)
      if (result.success) {
        toast.success('Role updated')
        loadUserStores(selectedUserId)
      } else {
        toast.error('Error: ' + result.error)
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    }
  }

  const onEditClick = (user: any) => {
    setEditingUserId(user._id)
    form.reset({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role?._id || user.role,
      globalRole: user.globalRole || 'USER',
      avatarUrl: user.avatarUrl || ''
    })
    setAvatarPreview(user.avatarUrl || null)
    setIsAddOpen(true)
  }

  const onSubmit: SubmitHandler<UserFormData> = async (values) => {
    setIsSubmitting(true)
    try {
      const data = { ...values }

      // Handle avatar upload if new image selected
      if (avatarPreview && avatarPreview.startsWith('data:')) {
        const base64Content = avatarPreview.split(',')[1]
        const uploadRes = await window.api.app.uploadImage({
          base64Data: base64Content,
          fileName: 'avatar.png'
        })
        if (uploadRes.success) {
          data.avatarUrl = uploadRes.url
        } else {
          toast.error('Avatar upload failed: ' + uploadRes.error)
          setIsSubmitting(false)
          return
        }
      }

      if (editingUserId) {
        const result = await window.api.users.update(editingUserId, data)
        if (result.success) {
          toast.success('User updated successfully')
          setIsAddOpen(false)
          setEditingUserId(null)
          setAvatarPreview(null)
          form.reset()
          loadUsers()
        } else {
          toast.error('Error: ' + result.error)
        }
      } else {
        const result = await window.api.users.create(data)
        if (result.success) {
          toast.success('User created successfully')
          setIsAddOpen(false)
          setAvatarPreview(null)
          form.reset()
          loadUsers()
        } else {
          toast.error('Error: ' + result.error)
        }
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? Action cannot be undone.')) return
    try {
      const result = await window.api.users.delete(id)
      if (result.success) {
        toast.success('User deleted successfully')
        loadUsers()
      } else {
        toast.error('Error: ' + result.error)
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    }
  }

  // No global loading return here anymore

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">User Management</h2>
          <p className="text-muted-foreground">
            Create users, assign roles, and manage store access.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-9 bg-card border-border h-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold h-10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <div className="relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px] rounded-xl">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4ade80]"></div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.length > 0
            ? users.map((user: any) => (
                <Card
                  key={user._id}
                  className="bg-card border-border hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                    <Avatar className="h-12 w-12 border border-border">
                      <AvatarImage src={user.avatarUrl} className="object-cover" />
                      <AvatarFallback className="bg-[#4ade80]/10 text-[#4ade80] font-bold">
                        {user.fullName?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <CardTitle className="text-base truncate">{user.fullName}</CardTitle>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <UserCog className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-popover border-border text-popover-foreground"
                      >
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => onEditClick(user)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-500 focus:bg-red-500 focus:text-white cursor-pointer"
                          onClick={() => handleDeleteUser(user._id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent>
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Global Role</span>
                        <Badge
                          variant="outline"
                          className={
                            user.globalRole === 'ADMIN'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }
                        >
                          {user.globalRole || 'USER'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">System Role</span>
                        <span className="font-medium">{user.role?.name || '-'}</span>
                      </div>
                      <Button
                        onClick={() => openManageAccess(user)}
                        variant="outline"
                        size="sm"
                        className="w-full border-border hover:bg-accent mt-2"
                      >
                        <Building2 className="w-4 h-4 mr-2" />
                        Manage Store Access
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            : !isLoading && (
                <div className="col-span-full flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-xl">
                  <Search className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
                  <p className="text-muted-foreground">No users found.</p>
                </div>
              )}
        </div>
      </div>

      <div className="mt-6">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalRecords={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize)
            setPage(1)
          }}
        />
      </div>

      {/* Manage Access Dialog */}
      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="bg-background border-border text-foreground sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Store Access</DialogTitle>
            <DialogDescription>
              Configure which stores {selectedUser?.fullName} can access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Assign New Store Section */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-4">
              <h4 className="font-semibold text-sm flex items-center">
                <Plus className="w-4 h-4 mr-2 text-[#4ade80]" />
                Grant New Access
              </h4>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Select value={assignStoreId} onValueChange={setAssignStoreId}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select Store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores
                        .filter((s: any) => !userStores.find((us: any) => us.store?._id === s._id))
                        .map((store: any) => (
                          <SelectItem key={store._id} value={store._id}>
                            {store.name} ({store.code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40">
                  <Select value={assignRole} onValueChange={setAssignRole}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWNER">Owner</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="CASHIER">Cashier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <LoadingButton
                  onClick={handleAssign}
                  isLoading={isAssigning}
                  loadingText="Assigning..."
                  className="bg-[#4ade80] text-black hover:bg-[#22c55e]"
                >
                  Assign
                </LoadingButton>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Current Access List */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Current Access & Roles</h4>
              <ScrollArea className="h-[200px] pr-4">
                {userStores.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
                    No active store assignments.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userStores.map((item: any) => (
                      <div
                        key={item._id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {item.store?.name || (
                              <span className="text-red-400">Deleted Store</span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.store?.code || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            defaultValue={item.role}
                            onValueChange={(val) =>
                              item.store?._id && handleUpdateRole(item.store._id, val)
                            }
                            disabled={!item.store}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs bg-muted border-border disabled:opacity-50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OWNER">Owner</SelectItem>
                              <SelectItem value="MANAGER">Manager</SelectItem>
                              <SelectItem value="CASHIER">Cashier</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                            onClick={() => handleRemoveAccess(item.store?._id || item._id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open)
          if (!open) {
            form.reset()
            setEditingUserId(null)
          }
        }}
      >
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>{editingUserId ? 'Edit User' : 'Create New User'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-muted border-border"
                          placeholder="John Doe"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            {...field}
                            className="bg-muted border-border pl-10"
                            placeholder="email@example.com"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="password"
                          className="bg-muted border-border pl-10"
                          placeholder={
                            editingUserId ? '•••••••• (Leave blank to keep current)' : '••••••••'
                          }
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>System Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-muted border-border">
                            <SelectValue placeholder="Select Role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-border text-popover-foreground">
                          {roles.map((role: any) => (
                            <SelectItem key={role._id} value={role._id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="globalRole"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Global Access</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-muted border-border">
                            <SelectValue placeholder="Access Level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-border text-popover-foreground">
                          <SelectItem value="USER">Store User</SelectItem>
                          <SelectItem value="ADMIN">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Avatar Upload in Dialog */}
              <div className="flex items-center gap-4 py-2">
                <Avatar className="h-16 w-16 border border-border">
                  <AvatarImage src={avatarPreview || ''} className="object-cover" />
                  <AvatarFallback className="bg-muted text-xl font-bold">
                    {form.getValues('fullName')?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="user-avatar" className="text-sm font-medium">
                    User Avatar
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="user-avatar"
                      type="file"
                      accept="image/*"
                      className="bg-muted border-border h-9"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onloadend = () => setAvatarPreview(reader.result as string)
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                    {avatarPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAvatarPreview(null)
                          form.setValue('avatarUrl', '')
                        }}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                  className="border-border"
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isLoading={isSubmitting}
                  loadingText={editingUserId ? 'Updating...' : 'Creating...'}
                  className="bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold"
                >
                  {editingUserId ? 'Update User' : 'Create User'}
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
