import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import LoginPage from './pages/auth/Login'
import AdminDashboard from './pages/admin/Dashboard'
import AdminLayout from './layouts/AdminLayout'
import RolesPage from './pages/admin/roles/page'
import RoleDetails from './pages/admin/roles/detail'
import UsersPage from './pages/admin/users/page'
import StoresPage from './pages/admin/stores/page'
import StoreDetails from './pages/admin/stores/detail'
import ProfilePage from './pages/admin/profile/page'
import StoreLayout from './layouts/StoreLayout'
import ProductsPage from '@renderer/pages/store/inventory/products/page'
import ProductFormPage from '@renderer/pages/store/inventory/products/create-product'
import ProductDetails from '@renderer/pages/store/inventory/products/detail'
import CategoriesPage from '@renderer/pages/store/inventory/categories/page'
import BrandsPage from '@renderer/pages/store/inventory/brands/page'
import AttributesPage from '@renderer/pages/store/inventory/attributes/page'
import SuppliersPage from '@renderer/pages/store/purchases/suppliers/page'
import SupplierDetails from '@renderer/pages/store/purchases/suppliers/detail'
import PurchaseOrdersPage from '@renderer/pages/store/purchases/orders/page'
import CreatePurchaseOrder from '@renderer/pages/store/purchases/orders/create/page'
import EditPurchaseOrder from '@renderer/pages/store/purchases/orders/edit'
import PurchaseOrderDetails from './pages/store/purchases/orders/detail'
import StoreSettingsPage from '@renderer/pages/store/settings/page'
import SettingsProfilePage from '@renderer/pages/store/settings/profile/page'
import POSPage from '@renderer/pages/store/sales/pos/page'
import StoreDashboard from '@renderer/pages/store/dashboard/page'
import StoreSelectionPage from './pages/auth/StoreSelectionPage'
import ReportsPage from './pages/store/reports/page'
import SalesReportsPage from './pages/store/reports/sales/page'
import AccountingPage from './pages/store/accounting/page'
import AccountsPage from './pages/store/accounting/accounts/page'
import ExpensesPage from './pages/store/accounting/expenses/page'
import EditSimpleProduct from '@renderer/pages/store/inventory/products/EditSimpleProduct'
import EditRawMaterialProduct from '@renderer/pages/store/inventory/products/EditRawMaterialProduct'

interface User {
  id: string
  email: string
  fullName: string
  globalRole: 'ADMIN' | 'USER'
}

function ProtectedRoute({
  children,
  user,
  allowedRoles,
  requireStore = false
}: {
  children: React.ReactNode
  user: User | null
  allowedRoles?: string[]
  requireStore?: boolean
}) {
  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.globalRole)) {
    return <Navigate to="/dashboard" replace />
  }

  if (requireStore && user.globalRole !== 'ADMIN') {
    const selectedStore = localStorage.getItem('selectedStore')
    if (!selectedStore) {
      return <Navigate to="/select-store" replace />
    }
  }

  return <>{children}</>
}

function App(): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const handleLoginSuccess = (userData: User) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('selectedStore')
  }

  return (
    <>
      <HashRouter>
        <Routes>
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to={user.globalRole === 'ADMIN' ? '/admin' : '/dashboard'} replace />
              ) : (
                <LoginPage onLoginSuccess={handleLoginSuccess} />
              )
            }
          />

          <Route
            path="/select-store"
            element={
              <ProtectedRoute user={user}>
                <StoreSelectionPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute user={user} allowedRoles={['ADMIN']}>
                <AdminLayout onLogout={handleLogout} />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="roles/:id" element={<RoleDetails />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="stores" element={<StoresPage />} />
            <Route path="stores/:id" element={<StoreDetails />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user} requireStore={true}>
                <StoreLayout onLogout={handleLogout} />
              </ProtectedRoute>
            }
          >
            <Route index element={<StoreDashboard />} />
            <Route path="pos" element={<POSPage />} />
            <Route path="inventory/products" element={<ProductsPage />} />
            <Route path="/dashboard/inventory/products/:id/edit" element={<EditSimpleProduct />} />
            <Route
              path="/dashboard/inventory/products/:id/edit-raw"
              element={<EditRawMaterialProduct />}
            />
            <Route path="inventory/products/create" element={<ProductFormPage />} />
            <Route path="inventory/products/:id/edit" element={<ProductFormPage />} />
            <Route path="inventory/products/:id" element={<ProductDetails />} />
            <Route path="inventory/categories" element={<CategoriesPage />} />
            <Route path="inventory/brands" element={<BrandsPage />} />
            <Route path="inventory/attributes" element={<AttributesPage />} />
            <Route path="purchases/suppliers" element={<SuppliersPage />} />
            <Route path="purchases/suppliers/:id" element={<SupplierDetails />} />
            <Route path="purchases/orders" element={<PurchaseOrdersPage />} />
            <Route path="purchases/orders/create" element={<CreatePurchaseOrder />} />
            <Route path="purchases/orders/:id/edit" element={<EditPurchaseOrder />} />
            <Route path="purchases/orders/:id" element={<PurchaseOrderDetails />} />
            <Route path="settings" element={<StoreSettingsPage />} />
            <Route path="settings/profile" element={<SettingsProfilePage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reports/sales" element={<SalesReportsPage />} />
            <Route path="accounting" element={<AccountingPage />} />
            <Route path="accounting/accounts" element={<AccountsPage />} />
            <Route path="accounting/expenses" element={<ExpensesPage />} />
          </Route>

          <Route
            path="/"
            element={
              user ? (
                <Navigate to={user.globalRole === 'ADMIN' ? '/admin' : '/dashboard'} replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </HashRouter>
      <Toaster position="top-right" />
    </>
  )
}

export default App
