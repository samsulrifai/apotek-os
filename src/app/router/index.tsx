import { createBrowserRouter, Navigate, Outlet } from "react-router-dom"
import { lazy, Suspense } from "react"
import DashboardLayout from "../layouts/DashboardLayout"
import Login from "@/features/auth/Login"
import { RoleGuard } from "@/app/guards/RoleGuard"

// Lazy-load all feature pages
const Dashboard = lazy(() => import("@/features/dashboard/Dashboard"))
const POS = lazy(() => import("@/features/sales/POS"))
const SalesReturn = lazy(() => import("@/features/sales/SalesReturn"))
const Stock = lazy(() => import("@/features/inventory/Stock"))
const Adjustments = lazy(() => import("@/features/inventory/Adjustments"))
const Products = lazy(() => import("@/features/master/Products"))
const Categories = lazy(() => import("@/features/master/Categories"))
const Suppliers = lazy(() => import("@/features/master/Suppliers"))
const Units = lazy(() => import("@/features/master/Units"))
const PurchaseOrders = lazy(() => import("@/features/purchasing/PurchaseOrders"))
const GoodsReceipts = lazy(() => import("@/features/purchasing/GoodsReceipts"))
const Invoices = lazy(() => import("@/features/purchasing/Invoices"))
const ProfitLoss = lazy(() => import("@/features/reports/ProfitLoss"))
const SalesReport = lazy(() => import("@/features/reports/SalesReport"))
const ExpiryReport = lazy(() => import("@/features/reports/ExpiryReport"))
const GeneralSettings = lazy(() => import("@/features/settings/GeneralSettings"))
const UserManagement = lazy(() => import("@/features/settings/UserManagement"))

function SuspenseWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
            <p className="text-sm text-muted-foreground">Memuat halaman...</p>
          </div>
        </div>
      }
    >
      <Outlet />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: <DashboardLayout />,
    children: [
      {
        element: <SuspenseWrapper />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: "dashboard",
            element: <Dashboard />,
          },
          // Sales
          {
            path: "sales/pos",
            element: <POS />,
          },
          {
            path: "sales/returns",
            element: <SalesReturn />,
          },
          // Inventory
          {
            path: "inventory/stock",
            element: <Stock />,
          },
          {
            path: "inventory/adjustments",
            element: <Adjustments />,
          },
          // Purchasing
          {
            path: "purchasing/orders",
            element: <PurchaseOrders />,
          },
          {
            path: "purchasing/receipts",
            element: <GoodsReceipts />,
          },
          {
            path: "purchasing/invoices",
            element: <Invoices />,
          },
          // Master Data
          {
            path: "master/products",
            element: <Products />,
          },
          {
            path: "master/categories",
            element: <Categories />,
          },
          {
            path: "master/suppliers",
            element: <Suppliers />,
          },
          {
            path: "master/units",
            element: <Units />,
          },
          // Reports
          {
            path: "reports/profit-loss",
            element: <ProfitLoss />,
          },
          {
            path: "reports/sales",
            element: <SalesReport />,
          },
          {
            path: "reports/expiries",
            element: <ExpiryReport />,
          },
          // Settings (admin only)
          {
            element: <RoleGuard allowedRoles={['admin']} />,
            children: [
              {
                path: "settings/general",
                element: <GeneralSettings />,
              },
              {
                path: "settings/users",
                element: <UserManagement />,
              },
            ],
          },
        ],
      },
    ],
  },
])

