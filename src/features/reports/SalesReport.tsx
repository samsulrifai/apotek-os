import { useState, useEffect } from "react"
import { ClipboardList, DollarSign, ShoppingCart, TrendingUp, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"
import { api } from "@/lib/api"
import type { SalesReport as SalesReportType } from "@/types"

export default function SalesReport() {
  const [report, setReport] = useState<SalesReportType | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadReport()
  }, [startDate, endDate])

  const loadReport = async () => {
    setLoading(true)
    try {
      const data = await api.get<SalesReportType>('/reports/sales', { start: startDate, end: endDate })
      setReport(data)
    } catch { /* silently */ }
    finally { setLoading(false) }
  }

  const formatRp = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)

  const chartData = report?.dailyTrend?.map(d => ({
    name: new Date(d.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
    total: d.total,
    count: d.count,
  })) ?? []

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Memuat laporan penjualan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <ClipboardList className="mr-3 h-8 w-8 text-teal-600" />
            Laporan Penjualan
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Analisis performa penjualan apotek</p>
        </div>
        <div className="flex gap-2 items-center">
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40 h-9 text-sm" />
          <span className="text-slate-400 text-sm">s/d</span>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40 h-9 text-sm" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm border-none bg-gradient-to-br from-teal-500 to-teal-600 text-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-sm font-medium">Total Penjualan</p>
              <h3 className="text-2xl font-bold mt-1">{formatRp(report?.totalSales ?? 0)}</h3>
            </div>
            <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium">Jumlah Transaksi</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{report?.totalTransactions ?? 0}</h3>
            </div>
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium">Rata-rata Transaksi</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatRp(report?.averageTransaction ?? 0)}</h3>
            </div>
            <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl text-slate-800">Trend Penjualan Harian</CardTitle>
          <CardDescription className="font-medium">Grafik pendapatan per hari selama periode terpilih.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full mt-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `Rp${v / 1000000}M`} />
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                  <Tooltip
                    formatter={(value: number) => [formatRp(value), 'Penjualan']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" activeDot={{ r: 5, strokeWidth: 0, fill: '#0f766e' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">Belum ada data penjualan</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card className="shadow-sm overflow-hidden border-none bg-white">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg text-slate-800">Produk Terlaris</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-slate-500 font-bold">#</TableHead>
                <TableHead className="text-slate-500 font-bold">Nama Produk</TableHead>
                <TableHead className="text-right text-slate-500 font-bold">Qty Terjual</TableHead>
                <TableHead className="text-right text-slate-500 font-bold">Total Penjualan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(report?.topProducts ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-400">Belum ada data</TableCell>
                </TableRow>
              ) : (
                report!.topProducts.map((prod, i) => (
                  <TableRow key={i} className="hover:bg-slate-50 transition-colors">
                    <TableCell>
                      <Badge variant={i < 3 ? "default" : "secondary"} className={`w-7 h-7 rounded-full p-0 flex items-center justify-center ${i < 3 ? 'bg-teal-600' : 'bg-slate-200 text-slate-600'}`}>
                        {i + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-slate-800">{prod.product_name}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-700">{prod.qty_sold}</TableCell>
                    <TableCell className="text-right font-bold text-teal-700">{formatRp(prod.total)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sales by Category */}
      {report?.byCategory && report.byCategory.length > 0 && (
        <Card className="shadow-sm overflow-hidden border-none bg-white">
          <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-lg text-slate-800">Penjualan per Kategori</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-slate-500 font-bold">Kategori</TableHead>
                  <TableHead className="text-right text-slate-500 font-bold">Jumlah Transaksi</TableHead>
                  <TableHead className="text-right text-slate-500 font-bold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.byCategory.map((cat, i) => (
                  <TableRow key={i} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-bold text-slate-800">{cat.category_name}</TableCell>
                    <TableCell className="text-right text-slate-600">{cat.count}</TableCell>
                    <TableCell className="text-right font-bold text-slate-800">{formatRp(cat.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
