import { useState, useEffect } from "react"
import { Clock, AlertTriangle, Search, Loader2, Calendar, Download } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { exportToExcel } from "@/lib/exportUtils"
import { api } from "@/lib/api"
import { useTablePagination } from "@/hooks/useTablePagination"
import { DataTablePagination } from "@/components/ui/DataTablePagination"
import { DataTableColumnHeader } from "@/components/ui/DataTableColumnHeader"

interface ExpiryItem {
  product_id: string
  product_name: string
  sku: string
  batch_number: string
  expiry_date: string
  qty: number
  days_until_expiry: number
  status: 'expired' | 'critical' | 'warning' | 'safe'
}

const DAYS_OPTIONS = [
  { label: "Semua", value: 0 },
  { label: "< 30 Hari", value: 30 },
  { label: "< 60 Hari", value: 60 },
  { label: "< 90 Hari", value: 90 },
  { label: "< 180 Hari", value: 180 },
] as const

export default function ExpiryReport() {
  const [items, setItems] = useState<ExpiryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [daysFilter, setDaysFilter] = useState(0)

  const loadData = async (days: number) => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (days > 0) params.days = String(days)
      const res = await api.get<ExpiryItem[]>('/reports/expiries', params)
      setItems(Array.isArray(res) ? res : (res as any).data ?? [])
    } catch {
      // handle silently
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(daysFilter)
  }, [daysFilter])

  const getStatusBadge = (item: ExpiryItem) => {
    const days = item.days_until_expiry
    if (days <= 0) return <Badge variant="destructive" className="animate-pulse shadow-sm">Sudah ED</Badge>
    if (days <= 30) return <Badge className="bg-rose-50 text-rose-700 border-rose-200 shadow-none hover:bg-rose-100">ED &lt; 1 Bulan</Badge>
    if (days <= 90) return <Badge className="bg-amber-50 text-amber-700 border-amber-200 shadow-none hover:bg-amber-100">ED &lt; 3 Bulan</Badge>
    return <Badge className="bg-blue-50 text-blue-700 border-blue-200 shadow-none hover:bg-blue-100">ED &lt; 6 Bulan</Badge>
  }

  const getRowClassName = (item: ExpiryItem) => {
    const days = item.days_until_expiry
    if (days <= 0) return 'bg-rose-50/60 hover:bg-rose-100/60'
    if (days <= 30) return 'bg-orange-50/50 hover:bg-orange-100/50'
    if (days <= 90) return 'bg-amber-50/40 hover:bg-amber-100/40'
    return 'hover:bg-slate-50'
  }

  const expired = items.filter(i => i.days_until_expiry <= 0)
  const critical = items.filter(i => i.days_until_expiry > 0 && i.days_until_expiry <= 30)
  const warning = items.filter(i => i.days_until_expiry > 30 && i.days_until_expiry <= 90)

  const {
    paginatedData,
    totalPages,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalItems,
    setFilter,
    getFilter,
    globalSearch,
    setGlobalSearch,
    columnFilters
  } = useTablePagination(items)

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Memuat laporan kedaluwarsa...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <Clock className="mr-3 h-8 w-8 text-teal-600" />
            Laporan Kedaluwarsa (ED)
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Monitor dan kelola obat yang mendekati tanggal kedaluwarsa</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {DAYS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                daysFilter === opt.value
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              onClick={() => setDaysFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
          <Button
            variant="outline"
            className="shadow-sm bg-white border-slate-200 text-slate-700"
            onClick={() => {
              if (items.length) {
                exportToExcel(
                  items.map(b => ({ 'Produk': b.product_name, 'SKU': b.sku, 'Batch': b.batch_number, 'Exp. Date': b.expiry_date, 'Qty': b.qty, 'Hari': b.days_until_expiry, 'Status': b.status })),
                  `Laporan-Kedaluwarsa-${daysFilter}hari`,
                  'Kedaluwarsa'
                )
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm border-none bg-white border-l-4 border-l-rose-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-rose-600 uppercase tracking-wider mb-1">Sudah Expired</p>
              <h3 className="text-3xl font-bold text-rose-600">{expired.length} <span className="text-sm font-medium text-rose-400">Batch</span></h3>
            </div>
            <div className="h-10 w-10 bg-rose-50 rounded-full flex items-center justify-center animate-pulse">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-white border-l-4 border-l-amber-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-1">ED &lt; 1 Bulan</p>
              <h3 className="text-3xl font-bold text-amber-600">{critical.length} <span className="text-sm font-medium text-amber-400">Batch</span></h3>
            </div>
            <div className="h-10 w-10 bg-amber-50 rounded-full flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-white border-l-4 border-l-blue-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-1">ED &lt; 3 Bulan</p>
              <h3 className="text-3xl font-bold text-slate-800">{warning.length} <span className="text-sm font-medium text-slate-400">Batch</span></h3>
            </div>
            <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm overflow-hidden border-none bg-white">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input type="search" placeholder="Cari produk, batch, atau SKU..." className="pl-9 bg-white border-slate-200 shadow-sm" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <DataTableColumnHeader title="SKU" filterValue={getFilter('sku')} onFilterChange={v => setFilter('sku', v)} />
                <DataTableColumnHeader title="Produk" filterValue={getFilter('product_name')} onFilterChange={v => setFilter('product_name', v)} />
                <DataTableColumnHeader title="Batch" filterValue={getFilter('batch_number')} onFilterChange={v => setFilter('batch_number', v)} />
                <DataTableColumnHeader title="Tgl. Kedaluwarsa" hideFilter />
                <DataTableColumnHeader title="Sisa Hari" hideFilter align="center" />
                <DataTableColumnHeader title="Qty" hideFilter align="right" />
                <DataTableColumnHeader title="Status" hideFilter align="center" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    {globalSearch || Object.values(columnFilters).some(Boolean) ? 'Tidak ada hasil pencarian' : 'Tidak ada batch mendekati ED'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item, i) => (
                  <TableRow key={i} className={`transition-colors ${getRowClassName(item)}`}>
                    <TableCell className="font-mono text-xs text-slate-400">{item.sku}</TableCell>
                    <TableCell className="font-bold text-slate-800">{item.product_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-mono">{item.batch_number}</Badge>
                    </TableCell>
                    <TableCell className={`font-semibold ${item.days_until_expiry <= 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {new Date(item.expiry_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold ${item.days_until_expiry <= 0 ? 'text-rose-600' : item.days_until_expiry <= 30 ? 'text-amber-600' : 'text-slate-700'}`}>
                        {item.days_until_expiry <= 0 ? `${Math.abs(item.days_until_expiry)} hari lalu` : `${item.days_until_expiry} hari`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-700">{item.qty}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(item)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <DataTablePagination 
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </Card>
    </div>
  )
}
