import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Search, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, PackageSearch, Box, Activity, Package, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import type { StockItem } from "@/types"

interface StockStats {
  totalItems: number
  inventoryValue: number
  criticalStock: number
  expiringBatches: number
}

import { useTablePagination } from "@/hooks/useTablePagination"
import { DataTablePagination } from "@/components/ui/DataTablePagination"
import { DataTableColumnHeader } from "@/components/ui/DataTableColumnHeader"

export default function Stock() {
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [stats, setStats] = useState<StockStats>({ totalItems: 0, inventoryValue: 0, criticalStock: 0, expiringBatches: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const items = await api.get<any>('/inventory/stock')
      setStockItems(Array.isArray(items) ? items : items?.data ?? [])
    } finally {
      setLoading(false)
    }
    // Fetch stats separately
    try {
      const statsData = await api.get<StockStats>('/inventory/stats')
      setStats(statsData)
    } catch { /* stats optional */ }
  }

  const getStatusLabel = (item: StockItem) => {
    if (item.status === 'empty' || item.total_stock === 0) return 'Habis'
    if (item.status === 'critical' || item.total_stock <= item.min_stock) return 'Kritis'
    if (item.status === 'low') return 'Rendah'
    return 'Aman'
  }

  const getStatusBadge = (item: StockItem) => {
    const status = getStatusLabel(item)
    switch(status) {
      case "Aman": return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Aman</Badge>
      case "Kritis": case "Habis": return <Badge variant="destructive" className="animate-pulse shadow-sm">{status}</Badge>
      case "Rendah": return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 shadow-sm">Rendah</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  const computeStatus = (item: StockItem) => {
    if (item.status === 'empty' || item.total_stock === 0) return 'Habis'
    if (item.status === 'critical' || item.total_stock <= item.min_stock) return 'Kritis'
    if (item.status === 'low') return 'Rendah'
    return 'Aman'
  }

  const enrichedItems = stockItems.map(item => ({ ...item, computed_status: computeStatus(item) }))

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
  } = useTablePagination(enrichedItems)

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Memuat data stok...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <Package className="mr-3 h-8 w-8 text-teal-600" />
            Manajemen Inventori
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Pantau stok obat, peringatan kedaluwarsa, dan pergerakan barang</p>
        </div>
        <div className="flex gap-2">
          <Link to="/inventory/adjustments">
            <Button variant="outline" className="shadow-sm bg-card text-teal-700 border-teal-200 hover:bg-teal-50">
              <ArrowUpFromLine className="mr-2 h-4 w-4" /> Stok Keluar
            </Button>
          </Link>
          <Link to="/purchasing/receipts">
            <Button className="shadow-sm bg-teal-600 hover:bg-teal-700">
              <ArrowDownToLine className="mr-2 h-4 w-4" /> Terima Barang
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-t-4 border-t-teal-500 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              Total Item Aktif
              <Box className="h-4 w-4 text-teal-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800 tracking-tight">{stats.totalItems.toLocaleString('id-ID')}</div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Produk terdaftar di sistem
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-t-4 border-t-blue-500 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              Nilai Inventori
              <Activity className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800 tracking-tight">
              Rp {(stats.inventoryValue / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Estimasi total aset obat
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-t-4 border-t-rose-500 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              Stok Kritis
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600 tracking-tight">{stats.criticalStock}</div>
            <p className="text-xs text-rose-600 font-medium mt-1 bg-rose-50 w-fit px-2 py-0.5 rounded-md">
              Butuh *restock* segera
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-t-4 border-t-amber-500 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              Kedaluwarsa Dekat
              <PackageSearch className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 tracking-tight">{stats.expiringBatches}</div>
            <p className="text-xs text-amber-700 font-medium mt-1 bg-amber-50 w-fit px-2 py-0.5 rounded-md">
              Expired dalam &lt; 3 Bulan
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm overflow-hidden bg-white border-none">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex gap-3">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input type="search" placeholder="Cari nama obat atau SKU..." className="pl-9 bg-white border-slate-200" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} />
              </div>
              <select className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-md outline-none text-slate-600 font-medium cursor-pointer" value={getFilter('computed_status')} onChange={e => setFilter('computed_status', e.target.value)}>
                <option value="">Semua Status</option>
                <option value="Aman">Aman</option>
                <option value="Rendah">Stok Rendah</option>
                <option value="Kritis">Kritis</option>
                <option value="Habis">Habis</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <DataTableColumnHeader title="SKU" filterValue={getFilter('sku')} onFilterChange={v => setFilter('sku', v)} />
                <DataTableColumnHeader title="Produk" filterValue={getFilter('product_name')} onFilterChange={v => setFilter('product_name', v)} />
                <DataTableColumnHeader title="Pabrik" filterValue={getFilter('manufacturer')} onFilterChange={v => setFilter('manufacturer', v)} />
                <DataTableColumnHeader title="Kategori" filterValue={getFilter('category_name')} onFilterChange={v => setFilter('category_name', v)} />
                <DataTableColumnHeader title="Stok Tersedia" hideFilter align="center" />
                <DataTableColumnHeader title="Satuan" hideFilter align="center" />
                <DataTableColumnHeader title="Status" hideFilter align="center" />
                <DataTableColumnHeader title="Aksi" hideFilter align="right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                    {globalSearch || Object.values(columnFilters).some(Boolean) ? 'Tidak ada hasil pencarian' : 'Belum ada data stok'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => (
                  <TableRow key={item.product_id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-mono text-xs text-slate-400">{item.sku}</TableCell>
                    <TableCell>
                      <p className="font-bold text-slate-800">{item.product_name}</p>
                      {item.batches?.[0] && (
                        <p className="text-xs font-mono text-slate-500 mt-0.5">Batch: {item.batches[0].batch_number}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">{(item as any).manufacturer || '-'}</TableCell>
                    <TableCell className="text-slate-600">{item.category_name || '-'}</TableCell>
                    <TableCell className="text-center font-bold">{item.total_stock}</TableCell>
                    <TableCell className="text-center text-slate-500">{item.unit_symbol || '-'}</TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(item)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to="/inventory/adjustments">
                        <Button variant="ghost" size="sm" className="text-teal-600 font-semibold hover:bg-teal-50 hover:text-teal-700">Sesuaikan</Button>
                      </Link>
                    </TableCell>
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
