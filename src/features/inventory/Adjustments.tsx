import { useState, useEffect, useCallback } from "react"
import { Sliders, Plus, Search, Loader2, Save, AlertCircle, X, Package, Eye, ArrowUp, ArrowDown, Minus } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { api } from "@/lib/api"
import type { StockAdjustment, Product } from "@/types"
import { useTablePagination } from "@/hooks/useTablePagination"
import { DataTablePagination } from "@/components/ui/DataTablePagination"
import { useToast } from "@/hooks/use-toast"

interface AdjustmentDetail extends Omit<StockAdjustment, 'items'> {
  items: {
    id: string
    product_id: string
    product_name: string
    sku: string
    batch_number: string | null
    qty_before: number
    qty_after: number
    qty_difference: number
  }[]
}

export default function Adjustments() {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailData, setDetailData] = useState<AdjustmentDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const [form, setForm] = useState({
    reason: '',
    notes: '',
    items: [{ product_id: '', qty_before: 0, qty_after: 0 }],
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const adjRes = await api.get<any>('/inventory/adjustments')
      setAdjustments(Array.isArray(adjRes) ? adjRes : (adjRes as any)?.data ?? [])
    } catch (e) { console.error('Failed to load adjustments:', e) }
    try {
      const prodRes = await api.get<any>('/products', { limit: 500 })
      setProducts(Array.isArray(prodRes) ? prodRes : (prodRes as any)?.data ?? [])
    } catch (e) { console.error('Failed to load products:', e) }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const addItem = () => {
    setForm(f => ({ ...f, items: [...f.items, { product_id: '', qty_before: 0, qty_after: 0 }] }))
  }

  const removeItem = (idx: number) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  const updateItem = (idx: number, field: string, value: string | number) => {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => {
        if (i !== idx) return item
        const updated = { ...item, [field]: value }
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
      toast({ title: "Berhasil", description: "Penyesuaian stok berhasil disimpan." })
      loadData()
    } catch {
      toast({ title: "Gagal", description: "Gagal menyimpan penyesuaian stok.", variant: "destructive" })
    }
    finally { setSaving(false) }
  }

  const handleViewDetail = async (id: string) => {
    setDetailLoading(true)
    setDetailOpen(true)
    setDetailData(null)
    try {
      const data = await api.get<AdjustmentDetail>(`/inventory/adjustments/${id}`)
      setDetailData(data)
    } catch {
      toast({ title: "Gagal", description: "Gagal memuat detail penyesuaian.", variant: "destructive" })
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const getReasonLabel = (reason: string) => {
    const map: Record<string, string> = {
      stock_opname: 'Stok Opname',
      damaged: 'Barang Rusak',
      expired: 'Kedaluwarsa',
      lost: 'Hilang / Selisih',
      correction: 'Koreksi Data',
      other: 'Lainnya',
    }
    return map[reason] || reason
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Selesai</Badge>
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
    globalSearch,
    setGlobalSearch,
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
                <TableHead><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">No. Penyesuaian</span></TableHead>
                <TableHead><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Alasan</span></TableHead>
                <TableHead><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Dibuat Oleh</span></TableHead>
                <TableHead><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Tanggal</span></TableHead>
                <TableHead className="text-center"><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Status</span></TableHead>
                <TableHead className="text-center"><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                    {globalSearch ? 'Tidak ada hasil pencarian' : 'Belum ada penyesuaian stok'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((adj) => (
                  <TableRow key={adj.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-bold text-slate-800 font-mono">{adj.adjustment_number}</TableCell>
                    <TableCell className="text-slate-700 text-sm">{getReasonLabel(adj.reason)}</TableCell>
                    <TableCell className="text-slate-600 text-sm">{adj.created_by_name || '-'}</TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {new Date(adj.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(adj.status)}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50 font-semibold"
                        onClick={() => handleViewDetail(adj.id)}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Detail
                      </Button>
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

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="text-xl text-slate-800 flex items-center">
                <div className="h-9 w-9 rounded-lg bg-teal-100 flex items-center justify-center mr-3">
                  <Eye className="h-5 w-5 text-teal-600" />
                </div>
                Detail Penyesuaian
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
              </div>
            ) : detailData ? (
              <>
                {/* Info Header */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">No. Penyesuaian</p>
                    <p className="text-sm font-bold text-slate-800 font-mono mt-1">{detailData.adjustment_number}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Tanggal</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      {new Date(detailData.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Alasan</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{getReasonLabel(detailData.reason)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Dibuat Oleh</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{detailData.created_by_name || '-'}</p>
                  </div>
                </div>

                {detailData.notes && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Catatan</p>
                    <p className="text-sm text-slate-700 mt-1">{detailData.notes}</p>
                  </div>
                )}

                {/* Items Table */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-teal-600" />
                    <h3 className="font-bold text-slate-700 text-sm">Item yang Disesuaikan</h3>
                    <Badge variant="outline" className="ml-1 text-xs bg-slate-50 text-slate-500 border-slate-200">{detailData.items?.length || 0} item</Badge>
                  </div>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50/80">
                        <TableRow className="hover:bg-transparent">
                          <TableHead><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Produk</span></TableHead>
                          <TableHead className="text-center"><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Batch</span></TableHead>
                          <TableHead className="text-center"><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Stok Awal</span></TableHead>
                          <TableHead className="text-center"><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Stok Akhir</span></TableHead>
                          <TableHead className="text-center"><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Selisih</span></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(detailData.items || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-slate-400 text-sm">
                              Tidak ada item
                            </TableCell>
                          </TableRow>
                        ) : (
                          detailData.items.map((item) => {
                            const diff = item.qty_difference ?? (item.qty_after - item.qty_before)
                            return (
                              <TableRow key={item.id} className="hover:bg-slate-50/50">
                                <TableCell>
                                  <p className="font-semibold text-slate-800 text-sm">{item.product_name || '-'}</p>
                                  <p className="text-xs text-slate-400 font-mono">{item.sku || ''}</p>
                                </TableCell>
                                <TableCell className="text-center text-sm text-slate-600 font-mono">
                                  {item.batch_number || '-'}
                                </TableCell>
                                <TableCell className="text-center text-sm font-medium text-slate-600">
                                  {item.qty_before}
                                </TableCell>
                                <TableCell className="text-center text-sm font-medium text-slate-800">
                                  {item.qty_after}
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                    diff > 0 ? 'bg-emerald-50 text-emerald-700' : diff < 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {diff > 0 ? <ArrowUp className="h-3 w-3" /> : diff < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                    {diff > 0 ? '+' : ''}{diff}
                                  </span>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Adjustment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="text-xl text-slate-800 flex items-center">
                <div className="h-9 w-9 rounded-lg bg-teal-100 flex items-center justify-center mr-3">
                  <Sliders className="h-5 w-5 text-teal-600" />
                </div>
                Buat Penyesuaian Stok
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Warning */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Penyesuaian stok akan mengubah jumlah inventori secara langsung. Pastikan alasan dan catatan sudah benar.
              </p>
            </div>

            {/* Reason & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 font-semibold text-sm">Alasan Penyesuaian <span className="text-rose-500">*</span></Label>
                <Select value={form.reason || ''} onValueChange={(val) => setForm({...form, reason: val || ''})}>
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

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-teal-600" />
                  <h3 className="font-bold text-slate-700 text-sm">Item Penyesuaian</h3>
                  <Badge variant="outline" className="ml-1 text-xs bg-slate-50 text-slate-500 border-slate-200">{form.items.length} item</Badge>
                </div>
                <Button size="sm" variant="outline" onClick={addItem} className="h-8 text-xs border-teal-200 text-teal-700 hover:bg-teal-50">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Tambah
                </Button>
              </div>

              <div className="space-y-3">
                {form.items.map((item, idx) => {
                  const selectedProduct = products.find(p => p.id === item.product_id)
                  const diff = item.qty_after - item.qty_before
                  return (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                      {/* Item Header */}
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-50/80 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-teal-100 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-teal-700">{idx + 1}</span>
                          </div>
                          <span className="text-xs font-semibold text-slate-500">
                            {selectedProduct ? selectedProduct.name : 'Produk belum dipilih'}
                          </span>
                        </div>
                        {form.items.length > 1 && (
                          <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(idx)} className="h-6 w-6 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Item Body */}
                      <div className="p-4 space-y-3">
                        <div>
                          <Label className="text-xs text-slate-500 font-medium">Pilih Produk <span className="text-rose-500">*</span></Label>
                          <SearchableSelect
                            options={products.map(p => ({ value: p.id, label: p.name, sublabel: `Stok saat ini: ${p.total_stock ?? 0}` }))}
                            value={item.product_id}
                            onValueChange={v => updateItem(idx, 'product_id', v)}
                            placeholder="Ketik untuk cari produk..."
                            searchPlaceholder="Cari nama produk..."
                            emptyMessage="Produk tidak ditemukan"
                            className="mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs text-slate-500 font-medium">Stok Saat Ini</Label>
                            <Input type="number" value={item.qty_before} disabled className="mt-1 bg-slate-50 text-slate-500" />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500 font-medium">Stok Sebenarnya</Label>
                            <Input type="number" value={item.qty_after} onChange={e => updateItem(idx, 'qty_after', parseInt(e.target.value) || 0)} className="mt-1" min={0} />
                          </div>
                          <div className="flex flex-col items-center">
                            <Label className="text-xs text-slate-500 font-medium">Selisih</Label>
                            <div className={`mt-1 h-9 flex items-center justify-center rounded-lg px-3 text-sm font-bold ${
                              diff > 0 ? 'bg-emerald-50 text-emerald-700' : diff < 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500'
                            }`}>
                              {diff > 0 ? '+' : ''}{diff}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
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
