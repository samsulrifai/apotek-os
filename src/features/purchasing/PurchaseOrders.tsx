import { useState, useEffect, useCallback } from "react"
import { Search, Plus, FileText, CheckCircle2, Clock, Truck, X, Loader2, Save } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import type { PurchaseOrder, Supplier, Product } from "@/types"
import { useTablePagination } from "@/hooks/useTablePagination"
import { DataTablePagination } from "@/components/ui/DataTablePagination"
import { DataTableColumnHeader } from "@/components/ui/DataTableColumnHeader"

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    supplier_id: '',
    expected_date: '',
    notes: '',
    items: [{ product_id: '', qty_ordered: 1, unit_price: 0 }],
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [ordersRes, supRes, prodRes] = await Promise.all([
        api.get<PurchaseOrder[]>('/purchase-orders'),
        api.get<Supplier[]>('/suppliers'),
        api.get<Product[]>('/products'),
      ])
      setOrders(Array.isArray(ordersRes) ? ordersRes : (ordersRes as any).data ?? [])
      setSuppliers(Array.isArray(supRes) ? supRes : (supRes as any).data ?? [])
      setProducts(Array.isArray(prodRes) ? prodRes : (prodRes as any).data ?? [])
    } catch { /* silently */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = async () => {
    setSaving(true)
    try {
      await api.post('/purchase-orders', form)
      setDialogOpen(false)
      loadData()
    } catch { /* handle */ }
    finally { setSaving(false) }
  }

  const addItem = () => {
    setForm(f => ({ ...f, items: [...f.items, { product_id: '', qty_ordered: 1, unit_price: 0 }] }))
  }

  const removeItem = (idx: number) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  const updateItem = (idx: number, field: string, value: string | number) => {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item)
    }))
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "completed": return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 shadow-none hover:bg-emerald-100"><CheckCircle2 className="mr-1 h-3 w-3" /> Diterima Penuh</Badge>
      case "draft": return <Badge className="bg-amber-50 text-amber-700 border-amber-200 shadow-none hover:bg-amber-100"><Clock className="mr-1 h-3 w-3" /> Draft</Badge>
      case "approved": return <Badge className="bg-blue-50 text-blue-700 border-blue-200 shadow-none hover:bg-blue-100 animate-pulse"><Truck className="mr-1 h-3 w-3" /> Disetujui</Badge>
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
    setFilter,
    getFilter,
    globalSearch,
    setGlobalSearch,
    columnFilters
  } = useTablePagination(orders)

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Memuat data SP...</p>
        </div>
      </div>
    )
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
            Kelola pesanan ke PBF dan proses penerimaan barang (Good Receipt)
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="shadow-sm bg-teal-600 hover:bg-teal-700" onClick={() => {
            setForm({ supplier_id: '', expected_date: '', notes: '', items: [{ product_id: '', qty_ordered: 1, unit_price: 0 }] })
            setDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" /> Buat SP Baru
          </Button>
        </div>
      </div>

      <Card className="shadow-sm overflow-hidden border-none bg-white">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative w-full sm:w-[400px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input type="search" placeholder="Cari No. SP atau Nama PBF..." className="pl-9 bg-white border-slate-200 shadow-sm" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <DataTableColumnHeader title="Nomor SP & Tanggal" filterValue={getFilter('po_number')} onFilterChange={v => setFilter('po_number', v)} />
                <DataTableColumnHeader title="Pemasok (PBF)" filterValue={getFilter('supplier_name')} onFilterChange={v => setFilter('supplier_name', v)} />
                <DataTableColumnHeader title="Total" hideFilter align="right" />
                <DataTableColumnHeader title="Status Pesanan" hideFilter align="center" />
                <DataTableColumnHeader title="Aksi" hideFilter align="right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    {globalSearch || Object.values(columnFilters).some(Boolean) ? 'Tidak ada hasil pencarian' : 'Belum ada Surat Pesanan'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((sp) => (
                  <TableRow key={sp.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="align-top pt-4">
                      <p className="font-bold text-slate-800">{sp.po_number}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Tgl: {new Date(sp.order_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </TableCell>
                    <TableCell className="align-top pt-4">
                      <p className="font-bold text-slate-700 text-sm">{sp.supplier_name}</p>
                    </TableCell>
                    <TableCell className="align-top pt-4 text-right">
                      <span className="font-bold text-slate-800">Rp {sp.total_amount.toLocaleString('id-ID')}</span>
                    </TableCell>
                    <TableCell className="align-top pt-4 text-center">
                      {getStatusBadge(sp.status)}
                    </TableCell>
                    <TableCell className="align-top pt-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="h-8 border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-blue-50" title="Lihat SP">
                          <FileText className="h-4 w-4 mr-1.5" /> Detail
                        </Button>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-800 flex items-center">
              <FileText className="mr-2 h-5 w-5 text-teal-600" />
              Buat Surat Pesanan Baru
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 font-semibold text-sm">Supplier / PBF *</Label>
                <Select value={form.supplier_id} onValueChange={v => setForm({...form, supplier_id: v})}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.filter(s => s.is_active).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-700 font-semibold text-sm">Tanggal Diharapkan</Label>
                <Input type="date" value={form.expected_date} onChange={e => setForm({...form, expected_date: e.target.value})} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label className="text-slate-700 font-semibold text-sm">Catatan</Label>
              <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Catatan tambahan" className="mt-1.5" />
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Item Pesanan</h3>
                <Button size="sm" variant="outline" onClick={addItem} className="h-7 text-xs"><Plus className="h-3 w-3 mr-1" /> Tambah Item</Button>
              </div>
              <div className="p-4 space-y-3">
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Label className="text-xs text-slate-500">Produk</Label>
                      <Select value={item.product_id} onValueChange={v => updateItem(idx, 'product_id', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                        <SelectContent>
                          {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-slate-500">Qty</Label>
                      <Input type="number" value={item.qty_ordered} onChange={e => updateItem(idx, 'qty_ordered', parseInt(e.target.value) || 0)} className="mt-1" min={1} />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs text-slate-500">Harga Satuan</Label>
                      <Input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseInt(e.target.value) || 0)} className="mt-1" />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      {form.items.length > 1 && (
                        <Button size="icon" variant="ghost" onClick={() => removeItem(idx)} className="h-9 w-9 text-slate-400 hover:text-rose-600"><X className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} disabled={saving || !form.supplier_id || form.items.some(i => !i.product_id)} className="bg-teal-600 hover:bg-teal-700">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Buat Surat Pesanan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
