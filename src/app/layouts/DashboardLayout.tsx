import { useState } from "react"
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard, ShoppingCart, Package, Pill, Settings, LogOut,
  Receipt, FileText, Box, FolderTree, Truck, Ruler, Users,
  ClipboardList, PackageCheck, BarChart3, AlertTriangle, Sliders,
  RotateCcw, Lock, ChevronDown, Sun, Moon, Monitor
} from "lucide-react"
import { useAuth } from "@/app/providers/AuthProvider"
import { useTheme } from "@/app/providers/ThemeProvider"
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const data = {
  navMain: [
    {
      title: "Main",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
        { title: "POS Kasir", url: "/sales/pos", icon: ShoppingCart },
      ],
    },
    {
      title: "Penjualan",
      items: [
        { title: "Retur Penjualan", url: "/sales/returns", icon: RotateCcw },
      ],
    },
    {
      title: "Inventori",
      items: [
        { title: "Stok Obat", url: "/inventory/stock", icon: Package },
        { title: "Penyesuaian Stok", url: "/inventory/adjustments", icon: Sliders },
      ],
    },
    {
      title: "Pembelian",
      items: [
        { title: "Surat Pesanan (SP)", url: "/purchasing/orders", icon: FileText },
        { title: "Penerimaan Barang", url: "/purchasing/receipts", icon: PackageCheck },
        { title: "Faktur Pembelian", url: "/purchasing/invoices", icon: Receipt },
      ],
    },
    {
      title: "Master Data",
      items: [
        { title: "Produk Obat", url: "/master/products", icon: Box },
        { title: "Kategori", url: "/master/categories", icon: FolderTree },
        { title: "Supplier / PBF", url: "/master/suppliers", icon: Truck },
        { title: "Satuan", url: "/master/units", icon: Ruler },
      ],
    },
    {
      title: "Laporan",
      items: [
        { title: "Laba Rugi", url: "/reports/profit-loss", icon: BarChart3 },
        { title: "Laporan Penjualan", url: "/reports/sales", icon: ClipboardList },
        { title: "Obat Kedaluwarsa", url: "/reports/expiries", icon: AlertTriangle },
      ],
    },
    {
      title: "Pengaturan",
      items: [
        { title: "Pengaturan Apotek", url: "/settings/general", icon: Settings },
        { title: "Manajemen Pengguna", url: "/settings/users", icon: Users },
      ],
    },
  ],
}

export default function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)

  const nextTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const displayName = user?.full_name || 'Pengguna'
  const displayRole = user?.roles?.[0]?.name || ''

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <div className="flex h-12 items-center px-4 font-bold text-primary text-xl">
            <Pill className="mr-2 h-6 w-6" />
            Apotek Web
          </div>
        </SidebarHeader>
        <SidebarContent>
          {data.navMain.map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        isActive={location.pathname === item.url}
                        render={<Link to={item.url} />}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} className="text-destructive">
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-between">
            <div className="font-medium text-sm text-muted-foreground">
              Halo, {displayName}
              {displayRole && <span className="ml-1 text-xs opacity-60">({displayRole})</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={nextTheme}
                className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title={`Theme: ${theme}`}
              >
                {theme === 'light' && <Sun className="h-4 w-4 text-amber-500" />}
                {theme === 'dark' && <Moon className="h-4 w-4 text-blue-400" />}
                {theme === 'system' && <Monitor className="h-4 w-4 text-slate-500 dark:text-slate-400" />}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-800 outline-none cursor-pointer">
                  <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setChangePasswordOpen(true)} className="cursor-pointer">
                    <Lock className="mr-2 h-4 w-4" />
                    Ubah Password
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 flex flex-col">
          <Outlet />
        </main>
      </SidebarInset>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </SidebarProvider>
  )
}
