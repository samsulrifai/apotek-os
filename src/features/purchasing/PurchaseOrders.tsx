import { useState, useEffect, useCallback } from "react"
import { Search, Plus, FileText, CheckCircle2, Clock, Truck, X, Loader2, Save, Package, Building2, CalendarDays, StickyNote, Ban, Eye } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { api } from "@/lib/api"
import type { PurchaseOrder, Supplier, Product } from "@/types"
import { useTablePagination } from "@/hooks/useTablePagination"
import { DataTablePagination } from "@/components/ui/DataTablePagination"
import { useToast } from "@/hooks/use-toast"
import { PageSkeleton } from "@/components/ui/PageSkeleton"

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [detailPO, setDetailPO] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const { toast } = useToast()

  const [form, setForm] = useState({
    supplier_id: '',
    expected_date: '',
    notes: '',
    items: [{ product_id: '', qty_ordered: 1, unit_price: 0 }],
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const ordersRes = await api.get<any>('/purchase-orders', { limit: 500 })
      setOrders(Array.isArray(ordersRes) ? ordersRes : ordersRes?.data ?? [])
    } catch (e) { console.error('Failed to load POs:', e) }
    try {
      const supRes = await api.get<any>('/suppliers')
      setSuppliers(Array.isArray(supRes) ? supRes : (supRes as any)?.data ?? [])
    } catch (e) { console.error('Failed to load suppliers:', e) }
    try {
      const prodRes = await api.get<any>('/products', { limit: 500 })
      setProducts(Array.isArray(prodRes) ? prodRes : (prodRes as any)?.data ?? [])
    } catch (e) { console.error('Failed to load products:', e) }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = async () => {
    if (!form.supplier_id) {
      toast({ title: "Validasi Gagal", description: "Supplier harus dipilih.", variant: "destructive" })
      return
    }
    if (form.items.some(i => !i.product_id)) {
      toast({ title: "Validasi Gagal", description: "Semua item harus memiliki produk.", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      await api.post('/purchase-orders', form)
      setDialogOpen(false)
      toast({ title: "Berhasil", description: "Surat Pesanan berhasil dibuat." })
      loadData()
    } catch {
      toast({ title: "Gagal", description: "Gagal membuat Surat Pesanan.", variant: "destructive" })
    }
    finally { setSaving(false) }
  }

  const handleStatusUpdate = async (id: string, status: string, label: string) => {
    try {
      await api.put(`/purchase-orders/${id}/status`, { status })
      toast({ title: "Berhasil", description: `SP berhasil ${label}.` })
      loadData()
    } catch {
      toast({ title: "Gagal", description: `Gagal ${label} SP.`, variant: "destructive" })
    }
  }

  const handleViewDetail = async (id: string) => {
    setLoadingDetail(true)
    setDetailOpen(true)
    try {
      const detail = await api.get<any>(`/purchase-orders/${id}`)
      setDetailPO(detail)
    } catch {
      toast({ title: "Gagal", description: "Gagal memuat detail SP.", variant: "destructive" })
      setDetailOpen(false)
    } finally {
      setLoadingDetail(false)
    }
  }

  const addItem = () => {
    setForm(f => ({ ...f, items: [...f.items, { product_id: '', qty_ordered: 1, unit_price: 0 }] }))
  }

  const removeItem = (idx: number) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  const updateItem = (idx: number, updates: Record<string, string | number>) => {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === idx ? { ...item, ...updates } : item)
    }))
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "completed": return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 shadow-none hover:bg-emerald-100"><CheckCircle2 className="mr-1 h-3 w-3" /> Diterima Penuh</Badge>
      case "draft": return <Badge className="bg-amber-50 text-amber-700 border-amber-200 shadow-none hover:bg-amber-100"><Clock className="mr-1 h-3 w-3" /> Draft</Badge>
      case "approved": return <Badge className="bg-blue-50 text-blue-700 border-blue-200 shadow-none hover:bg-blue-100"><Truck className="mr-1 h-3 w-3" /> Disetujui</Badge>
      case "partial": return <Badge className="bg-orange-50 text-orange-700 border-orange-200 shadow-none"><Clock className="mr-1 h-3 w-3" /> Sebagian</Badge>
      case "cancelled": return <Badge variant="destructive" className="shadow-none">Dibatalkan</Badge>
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
  } = useTablePagination(orders)

  if (loading) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <FileText className="mr-3 h-8 w-8 text-teal-600" />
            Surat Pesanan (SP)
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Kelola pesanan ke PBF dan proses penerimaan barang
          </p>
        </div>
        <Button className="shadow-sm bg-teal-600 hover:bg-teal-700" onClick={() => {
          setForm({ supplier_id: '', expected_date: '', notes: '', items: [{ product_id: '', qty_ordered: 1, unit_price: 0 }] })
          setDialogOpen(true)
        }}>
          <Plus className="mr-2 h-4 w-4" /> Buat SP Baru
        </Button>
      </div>

      <Card className="shadow-sm overflow-hidden border-none bg-white">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input type="search" placeholder="Cari No. SP atau Nama PBF..." className="pl-9 bg-white border-slate-200 shadow-sm" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <TableHead><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Nomor SP & Tanggal</span></TableHead>
                <TableHead><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Pemasok (PBF)</span></TableHead>
                <TableHead className="text-right"><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Total</span></TableHead>
                <TableHead className="text-center"><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Status</span></TableHead>
                <TableHead className="text-right"><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                    {globalSearch ? 'Tidak ada hasil pencarian' : 'Belum ada Surat Pesanan'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((sp) => (
                  <TableRow key={sp.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="py-3">
                      <p className="font-bold text-slate-800 font-mono">{sp.po_number}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(sp.order_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="font-medium text-slate-700 text-sm">{sp.supplier_name}</p>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <span className="font-bold text-slate-800">Rp {sp.total_amount.toLocaleString('id-ID')}</span>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      {getStatusBadge(sp.status)}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs border-slate-200 text-slate-600 hover:text-teal-700 hover:bg-teal-50" onClick={() => handleViewDetail(sp.id)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Detail
                        </Button>
                        {sp.status === 'draft' && (
                          <>
                            <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => handleStatusUpdate(sp.id, 'approved', 'disetujui')}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Setujui
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleStatusUpdate(sp.id, 'cancelled', 'dibatalkan')}>
                              <Ban className="h-3.5 w-3.5 mr-1" /> Batal
                            </Button>
                          </>
                        )}
                        {sp.status === 'approved' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleStatusUpdate(sp.id, 'cancelled', 'dibatalkan')}>
                            <Ban className="h-3.5 w-3.5 mr-1" /> Batal
                          </Button>
                        )}
                      </div>
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

      {/* Create PO Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="text-xl text-slate-800 flex items-center">
                <div className="h-9 w-9 rounded-lg bg-teal-100 flex items-center justify-center mr-3">
                  <FileText className="h-5 w-5 text-teal-600" />
                </div>
                Buat Surat Pesanan Baru
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-500 mt-1 ml-12">Isi detail pesanan barang ke PBF / Supplier</p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Supplier Section */}
            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-teal-600" />
                <h3 className="font-bold text-slate-700 text-sm">Informasi Supplier</h3>
              </div>
              <div>
                <Label className="text-slate-600 font-medium text-sm">Supplier / PBF <span className="text-rose-500">*</span></Label>
                <SearchableSelect
                  options={suppliers.filter(s => s.is_active).map(s => ({ value: s.id, label: s.name, sublabel: s.phone || s.email || undefined }))}
                  value={form.supplier_id}
                  onValueChange={v => setForm({...form, supplier_id: v})}
                  placeholder="Ketik untuk cari supplier..."
                  searchPlaceholder="Cari nama supplier / PBF..."
                  emptyMessage="Supplier tidak ditemukan"
                  className="mt-1.5"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600 font-medium text-sm flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                    Tanggal Diharapkan Tiba
                  </Label>
                  <Input type="date" value={form.expected_date} onChange={e => setForm({...form, expected_date: e.target.value})} className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-slate-600 font-medium text-sm flex items-center gap-1.5">
                    <StickyNote className="h-3.5 w-3.5 text-slate-400" />
                    Catatan
                  </Label>
                  <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Opsional" className="mt-1.5" />
                </div>
              </div>
            </div>

            {/* Item List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-teal-600" />
                  <h3 className="font-bold text-slate-700 text-sm">Daftar Item Pesanan</h3>
                  <Badge variant="outline" className="ml-1 text-xs bg-slate-50 text-slate-500 border-slate-200">{form.items.length} item</Badge>
                </div>
                <Button size="sm" variant="outline" onClick={addItem} className="h-8 text-xs border-teal-200 text-teal-700 hover:bg-teal-50">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Tambah
                </Button>
              </div>

              <div className="space-y-3">
                {form.items.map((item, idx) => {
                  const selectedProduct = products.find(p => p.id === item.product_id)
                  return (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
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
                      <div className="p-4 space-y-3">
                        <div>
                          <Label className="text-xs text-slate-500 font-medium">Pilih Produk <span className="text-rose-500">*</span></Label>
                          <SearchableSelect
                            options={products.map(p => ({ value: p.id, label: p.name, sublabel: `SKU: ${p.sku || '-'} • HNA: Rp ${(p.default_purchase_price || 0).toLocaleString('id-ID')}` }))}
                            value={item.product_id}
                            onValueChange={v => {
                              const prod = products.find(p => p.id === v)
                              updateItem(idx, {
                                product_id: v,
                                unit_price: prod?.default_purchase_price || item.unit_price,
                              })
                            }}
                            placeholder="Ketik untuk cari produk..."
                            searchPlaceholder="Cari nama produk atau SKU..."
                            emptyMessage="Produk tidak ditemukan"
                            className="mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-slate-500 font-medium">Jumlah (Qty)</Label>
                            <Input type="number" value={item.qty_ordered} onChange={e => updateItem(idx, { qty_ordered: parseInt(e.target.value) || 0 })} className="mt-1" min={1} />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500 font-medium">Harga Satuan (Rp)</Label>
                            <Input type="number" value={item.unit_price} onChange={e => updateItem(idx, { unit_price: parseInt(e.target.value) || 0 })} className="mt-1" min={0} />
                          </div>
                        </div>
                        {item.qty_ordered > 0 && item.unit_price > 0 && (
                          <div className="flex justify-end items-center gap-2 pt-1">
                            <span className="text-xs text-slate-400">Subtotal</span>
                            <span className="text-sm font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-md">
                              Rp {(item.qty_ordered * item.unit_price).toLocaleString('id-ID')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer with Total */}
          <div className="border-t border-slate-100">
            <div className="px-6 py-3 bg-gradient-to-r from-teal-50 to-emerald-50 flex justify-between items-center">
              <span className="text-sm font-bold text-teal-800">Total Pesanan ({form.items.length} item)</span>
              <span className="text-xl font-bold text-teal-700">
                Rp {form.items.reduce((sum, item) => sum + (item.qty_ordered * item.unit_price), 0).toLocaleString('id-ID')}
              </span>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button onClick={handleCreate} disabled={saving || !form.supplier_id || form.items.some(i => !i.product_id)} className="bg-teal-600 hover:bg-teal-700 shadow-sm">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Buat Surat Pesanan
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail PO Dialog */}
      <Dialog open={detailOpen} onOpenChange={(open) => { if (!open) { setDetailOpen(false); setDetailPO(null) } }}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col p-0 gap-0">
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="text-xl text-slate-800 flex items-center">
                <div className="h-9 w-9 rounded-lg bg-teal-100 flex items-center justify-center mr-3">
                  <FileText className="h-5 w-5 text-teal-600" />
                </div>
                Detail Surat Pesanan
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              </div>
            ) : detailPO ? (
              <div className="space-y-5">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Nomor SP</p>
                    <p className="font-bold text-slate-800 font-mono">{detailPO.po_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Status</p>
                    <div className="mt-0.5">{getStatusBadge(detailPO.status)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Supplier</p>
                    <p className="font-medium text-slate-700 text-sm">{detailPO.supplier_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Tanggal Pesanan</p>
                    <p className="text-sm text-slate-700">{new Date(detailPO.order_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  {detailPO.expected_date && (
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Diharapkan Tiba</p>
                      <p className="text-sm text-slate-700">{new Date(detailPO.expected_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  )}
                  {detailPO.notes && (
                    <div className="col-span-2">
                      <p className="text-xs text-slate-400 font-medium">Catatan</p>
                      <p className="text-sm text-slate-600">{detailPO.notes}</p>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div>
                  <h3 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4 text-teal-600" />
                    Daftar Item ({detailPO.items?.length || 0})
                  </h3>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-xs">Produk</TableHead>
                          <TableHead className="text-xs text-center">Qty</TableHead>
                          <TableHead className="text-xs text-center">Diterima</TableHead>
                          <TableHead className="text-xs text-right">Harga</TableHead>
                          <TableHead className="text-xs text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(detailPO.items || []).map((item: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="py-2">
                              <p className="font-medium text-sm text-slate-800">{item.product_name || item.sku || '-'}</p>
                              {item.sku && <p className="text-xs text-slate-400">SKU: {item.sku}</p>}
                            </TableCell>
                            <TableCell className="text-center py-2">{item.qty_ordered}</TableCell>
                            <TableCell className="text-center py-2">
                              <Badge variant={item.qty_received >= item.qty_ordered ? 'default' : 'outline'} className={item.qty_received >= item.qty_ordered ? 'bg-emerald-100 text-emerald-700 shadow-none' : 'text-slate-500'}>
                                {item.qty_received || 0}/{item.qty_ordered}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right py-2 text-sm">Rp {(item.unit_price || 0).toLocaleString('id-ID')}</TableCell>
                            <TableCell className="text-right py-2 font-bold text-sm">Rp {((item.qty_ordered || 0) * (item.unit_price || 0)).toLocaleString('id-ID')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl p-4 border border-teal-100">
                  <span className="font-bold text-teal-800">Total Pesanan</span>
                  <span className="text-xl font-black text-teal-700">Rp {(detailPO.total_amount || 0).toLocaleString('id-ID')}</span>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
