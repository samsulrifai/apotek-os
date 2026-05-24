import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Pill, DollarSign, Users, AlertTriangle, TrendingUp, Clock, LayoutDashboard, ShoppingCart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"
import { api } from "@/lib/api"
import { useAuth } from "@/app/providers/AuthProvider"
import { PageSkeleton } from "@/components/ui/PageSkeleton"
import type { DashboardSummary } from "@/types"

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<DashboardSummary>('/dashboard/summary')
      .then(setData)
      .catch(() => setError('Gagal memuat data dashboard. Silakan refresh halaman.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <PageSkeleton />
  }

  const salesTrend = data?.salesTrend?.map(s => ({
    name: new Date(s.date).toLocaleDateString('id-ID', { weekday: 'short' }),
    total: s.total,
  })) ?? []

  const recentTransactions = data?.recentTransactions ?? []
  const stockAlerts = data?.stockAlerts ?? []
  const expiryAlerts = data?.expiryAlerts ?? []
  const displayName = user?.full_name || 'Admin Operasional'

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium text-sm">
          {error}
        </div>
      )}
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <LayoutDashboard className="mr-3 h-8 w-8 text-teal-600" />
            Selamat Datang, {displayName}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Ringkasan performa apotek hari ini</p>
        </div>
        <div className="relative z-10 flex gap-3">
          <Button 
            variant="secondary" 
            className="bg-teal-50 text-teal-700 hover:bg-teal-100 shadow-sm border-0 font-semibold h-10 px-5"
            onClick={() => navigate('/sales/pos')}
          >
            <ShoppingCart className="mr-2 h-4 w-4" /> Buka Kasir
          </Button>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-md hover:shadow-lg transition-all bg-white overflow-hidden group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pendapatan Hari Ini</CardTitle>
            <div className="p-2.5 bg-teal-100 rounded-xl text-teal-600 shadow-sm">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-slate-800">
              Rp {(data?.todaySales?.total ?? 0).toLocaleString('id-ID')}
            </div>
            <div className="flex items-center mt-2 text-xs text-teal-600 font-bold bg-teal-50 w-fit px-2 py-1 rounded-md">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>{data?.todaySales?.count ?? 0} transaksi hari ini</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-md hover:shadow-lg transition-all bg-white overflow-hidden group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Produk</CardTitle>
            <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600 shadow-sm">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-slate-800">{data?.totalProducts ?? 0}</div>
            <div className="flex items-center mt-2 text-xs text-blue-600 font-bold bg-blue-50 w-fit px-2 py-1 rounded-md">
              <Users className="h-3 w-3 mr-1" />
              <span>Produk terdaftar</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md hover:shadow-lg transition-all bg-white overflow-hidden group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Stok Kritis</CardTitle>
            <div className={`p-2.5 bg-rose-100 rounded-xl text-rose-600 shadow-sm ${(data?.criticalStock ?? 0) > 0 ? 'animate-pulse' : ''}`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-rose-600">{data?.criticalStock ?? 0} Item</div>
            <div className="flex items-center mt-2 text-xs text-rose-700 font-bold bg-rose-50 w-fit px-2 py-1 rounded-md border border-rose-100">
              <span>Perlu segera restock</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md hover:shadow-lg transition-all bg-white overflow-hidden group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Kedaluwarsa Dekat</CardTitle>
            <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600 shadow-sm">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-amber-600">{data?.expiringBatches ?? 0} Batch</div>
            <div className="flex items-center mt-2 text-xs text-amber-700 font-bold bg-amber-50 w-fit px-2 py-1 rounded-md border border-amber-100">
              <span>Expired dalam &lt; 3 bulan</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Charts Section */}
        <Card className="md:col-span-4 border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-slate-800">Trend Penjualan</CardTitle>
            <CardDescription className="font-medium">Grafik pendapatan per hari selama 7 hari terakhir.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] min-h-[320px] w-full mt-4">
              {salesTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} tickFormatter={(value) => `Rp${value/1000000}M`} />
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                    <Tooltip 
                      formatter={(value: any) => [`Rp ${Number(value).toLocaleString('id-ID')}`, 'Pendapatan']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', fontWeight: 600, color: '#1e293b' }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#0d9488" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" activeDot={{ r: 6, strokeWidth: 0, fill: '#0f766e' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                  Belum ada data penjualan
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action & Alerts Section */}
        <div className="md:col-span-3 space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center justify-between text-slate-800">
                Transaksi Terakhir
                <Button variant="ghost" size="sm" className="text-teal-600 h-8 text-xs font-bold hover:text-teal-700 hover:bg-teal-50" onClick={() => navigate('/reports/sales')}>Lihat Semua</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {recentTransactions.length === 0 && (
                  <div className="p-6 text-center text-sm text-slate-400">Belum ada transaksi hari ini</div>
                )}
                {recentTransactions.slice(0, 4).map((trx, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shadow-sm border border-teal-100">
                        <Pill className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{trx.sale_number}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {new Date(trx.sold_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {trx.items?.length ?? 0} Item
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">Rp {trx.total_amount.toLocaleString("id-ID")}</p>
                      <Badge variant="outline" className="mt-1 text-[10px] px-2 py-0 h-5 bg-teal-50 text-teal-700 border-teal-200 font-semibold shadow-sm">Selesai</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md border-t-4 border-t-rose-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center text-slate-800">
                <AlertTriangle className="h-5 w-5 mr-2 text-rose-500" />
                Peringatan Stok
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stockAlerts.length === 0 && expiryAlerts.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-2">Tidak ada peringatan saat ini</p>
                )}
                {stockAlerts.slice(0, 3).map((alert, i) => (
                  <div key={i} className="flex items-center justify-between pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{alert.product_name}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Min. stok: {alert.min_stock}</p>
                    </div>
                    <Badge variant={alert.total_stock === 0 ? "destructive" : "outline"} className={alert.total_stock !== 0 ? "bg-amber-50 text-amber-700 border-amber-200 shadow-sm" : "shadow-sm"}>
                      Sisa: {alert.total_stock}
                    </Badge>
                  </div>
                ))}
                {expiryAlerts.slice(0, 2).map((alert, i) => (
                  <div key={`exp-${i}`} className="flex items-center justify-between pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{alert.product_name}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Batch: {alert.batch_number}</p>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 shadow-sm">
                      ED: {new Date(alert.expiry_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
