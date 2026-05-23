import { useState, useEffect, useCallback } from "react"
import { Sliders, Plus, Search, Loader2, Save, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import type { StockAdjustment, Product } from "@/types"
import { useTablePagination } from "@/hooks/useTablePagination"
import { DataTablePagination } from "@/components/ui/DataTablePagination"
import { DataTableColumnHeader } from "@/components/ui/DataTableColumnHeader"

export default function Adjustments() {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    reason: '',
    notes: '',
    items: [{ product_id: '', qty_before: 0, qty_after: 0 }],
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [adjRes, prodRes] = await Promise.all([
        api.get<StockAdjustment[]>('/inventory/adjustments').catch(() => []),
        api.get<Product[]>('/products'),
      ])
      setAdjustments(Array.isArray(adjRes) ? adjRes : (adjRes as any).data ?? [])
      setProducts(Array.isArray(prodRes) ? prodRes : (prodRes as any).data ?? [])
    } catch { /* silently */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const addItem = () => {
    setForm(f => ({ ...f, items: [...f.items, { product_id: '', qty_before: 0, qty_after: 0 }] }))
  }

  const updateItem = (idx: number, field: string, value: string | number) => {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => {
        if (i !== idx) return item
        const updated = { ...item, [field]: value }
        // Auto-fill qty_before when product selected
        if (field === 'product_id') {
          const prod = products.find(p => p.id === value)
          updated.qty_before = prod?.total_stock ?? 0
        }
        return updated
      })
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post('/inventory/adjust', {
        reason: form.reason,
        notes: form.notes,
        items: form.items.map(item => ({
          product_id: item.product_id,
          qty_before: item.qty_before,
          qty_after: item.qty_after,
        })),
      })
      setDialogOpen(false)
      loadData()
    } catch { /* handle */ }
    finally { setSaving(false) }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'approved': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Disetujui</Badge>
      case 'pending': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Menunggu</Badge>
      case 'rejected': return <Badge variant="destructive">Ditolak</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

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
  } = useTablePagination(adjustments)

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Memuat data penyesuaian...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <Sliders className="mr-3 h-8 w-8 text-teal-600" />
            Penyesuaian Stok
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Stok opname, koreksi, dan penyesuaian inventori</p>
        </div>
        <Button className="shadow-sm bg-teal-600 hover:bg-teal-700" onClick={() => {
          setForm({ reason: '', notes: '', items: [{ product_id: '', qty_before: 0, qty_after: 0 }] })
          setDialogOpen(true)
        }}>
          <Plus className="mr-2 h-4 w-4" /> Buat Penyesuaian
        </Button>
      </div>

      <Card className="shadow-sm overflow-hidden border-none bg-white">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input type="search" placeholder="Cari penyesuaian..." className="pl-9 bg-white border-slate-200" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <DataTableColumnHeader title="No. Penyesuaian" filterValue={getFilter('adjustment_number')} onFilterChange={v => setFilter('adjustment_number', v)} />
                <DataTableColumnHeader title="Alasan" filterValue={getFilter('reason')} onFilterChange={v => setFilter('reason', v)} />
                <DataTableColumnHeader title="Dibuat Oleh" filterValue={getFilter('created_by_name')} onFilterChange={v => setFilter('created_by_name', v)} />
                <DataTableColumnHeader title="Tanggal" hideFilter />
                <DataTableColumnHeader title="Status" hideFilter align="center" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    {globalSearch || Object.values(columnFilters).some(Boolean) ? 'Tidak ada hasil pencarian' : 'Belum ada penyesuaian stok'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((adj) => (
                  <TableRow key={adj.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-bold text-slate-800 font-mono">{adj.adjustment_number}</TableCell>
                    <TableCell className="text-slate-700 text-sm">{adj.reason}</TableCell>
                    <TableCell className="text-slate-600 text-sm">{adj.created_by_name || '-'}</TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {new Date(adj.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(adj.status)}</TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-800 flex items-center">
              <Sliders className="mr-2 h-5 w-5 text-teal-600" />
              Buat Penyesuaian Stok
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 font-medium">
                Penyesuaian stok akan mengubah jumlah inventori secara langsung. Pastikan alasan dan catatan sudah benar.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 font-semibold text-sm">Alasan Penyesuaian *</Label>
                <Select value={form.reason || undefined} onValueChange={(val) => updateForm('reason', val)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih alasan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock_opname">Stok Opname</SelectItem>
                    <SelectItem value="damaged">Barang Rusak</SelectItem>
                    <SelectItem value="expired">Kedaluwarsa</SelectItem>
                    <SelectItem value="lost">Hilang / Selisih</SelectItem>
                    <SelectItem value="correction">Koreksi Data</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-700 font-semibold text-sm">Catatan</Label>
                <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Catatan tambahan" className="mt-1.5" />
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Item Penyesuaian</h3>
                <Button size="sm" variant="outline" onClick={addItem} className="h-7 text-xs"><Plus className="h-3 w-3 mr-1" /> Tambah</Button>
              </div>
              <div className="p-4 space-y-3">
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Label className="text-xs text-slate-500">Produk</Label>
                      <Select value={item.product_id} onValueChange={(val) => updateItem(idx, 'product_id', val)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                        <SelectContent>
                          {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (Stok: {p.total_stock ?? 0})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-slate-500">Stok Saat Ini</Label>
                      <Input type="number" value={item.qty_before} disabled className="mt-1 bg-slate-50" />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs text-slate-500">Stok Sebenarnya</Label>
                      <Input type="number" value={item.qty_after} onChange={e => updateItem(idx, 'qty_after', parseInt(e.target.value) || 0)} className="mt-1" min={0} />
                    </div>
                    <div className="col-span-2 text-center">
                      <Label className="text-xs text-slate-500">Selisih</Label>
                      <div className={`mt-1 text-sm font-bold py-2 ${item.qty_after - item.qty_before >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.qty_after - item.qty_before > 0 ? '+' : ''}{item.qty_after - item.qty_before}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.reason || form.items.some(i => !i.product_id)} className="bg-teal-600 hover:bg-teal-700">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan Penyesuaian
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
