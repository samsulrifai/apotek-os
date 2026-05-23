import { useState, useEffect, useCallback } from "react"
import { PackageCheck, Plus, Search, Loader2, Save, AlertCircle, X } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import type { GoodsReceipt, PurchaseOrder } from "@/types"
import { useTablePagination } from "@/hooks/useTablePagination"
import { DataTablePagination } from "@/components/ui/DataTablePagination"
import { DataTableColumnHeader } from "@/components/ui/DataTableColumnHeader"

export default function GoodsReceipts() {
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)

  const [form, setForm] = useState({
    purchase_order_id: '',
    notes: '',
    items: [] as { product_id: string; product_name: string; qty_ordered: number; qty_received: number; unit_price: number; batch_number: string; expiry_date: string }[],
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [receiptsRes, posRes] = await Promise.all([
        api.get<GoodsReceipt[]>('/goods-receipts'),
        api.get<PurchaseOrder[]>('/purchase-orders'),
      ])
      setReceipts(Array.isArray(receiptsRes) ? receiptsRes : (receiptsRes as any).data ?? [])
      setPurchaseOrders(Array.isArray(posRes) ? posRes : (posRes as any).data ?? [])
    } catch { /* silently */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSelectPO = (poId: string) => {
    const po = purchaseOrders.find(p => p.id === poId)
    setSelectedPO(po || null)
    setForm({
      purchase_order_id: poId,
      notes: '',
      items: po?.items?.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name || '',
        qty_ordered: item.qty_ordered,
        qty_received: item.qty_ordered,
        unit_price: item.unit_price,
        batch_number: '',
        expiry_date: '',
      })) ?? [],
    })
  }

  const updateItem = (idx: number, field: string, value: string | number) => {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item)
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post('/goods-receipts', {
        purchase_order_id: form.purchase_order_id,
        notes: form.notes,
        items: form.items.map(item => ({
          product_id: item.product_id,
          qty_received: item.qty_received,
          unit_price: item.unit_price,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
        })),
      })
      setDialogOpen(false)
      loadData()
    } catch { /* handle */ }
    finally { setSaving(false) }
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
  } = useTablePagination(receipts)

  // Only show POs that can receive goods (approved/partial status)
  const receivablePOs = purchaseOrders.filter(po => ['approved', 'partial', 'draft'].includes(po.status))

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Memuat data penerimaan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <PackageCheck className="mr-3 h-8 w-8 text-teal-600" />
            Penerimaan Barang
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Kelola penerimaan barang dari PBF dan verifikasi batch & kedaluwarsa</p>
        </div>
        <Button className="shadow-sm bg-teal-600 hover:bg-teal-700" onClick={() => {
          setSelectedPO(null)
          setForm({ purchase_order_id: '', notes: '', items: [] })
          setDialogOpen(true)
        }}>
          <Plus className="mr-2 h-4 w-4" /> Terima Barang
        </Button>
      </div>

      <Card className="shadow-sm overflow-hidden border-none bg-white">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input type="search" placeholder="Cari No. Penerimaan, No. SP, atau Supplier..." className="pl-9 bg-white border-slate-200 shadow-sm" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <DataTableColumnHeader title="No. Penerimaan" filterValue={getFilter('receipt_number')} onFilterChange={v => setFilter('receipt_number', v)} />
                <DataTableColumnHeader title="No. SP" filterValue={getFilter('po_number')} onFilterChange={v => setFilter('po_number', v)} />
                <DataTableColumnHeader title="Supplier" filterValue={getFilter('supplier_name')} onFilterChange={v => setFilter('supplier_name', v)} />
                <DataTableColumnHeader title="Tanggal" hideFilter />
                <DataTableColumnHeader title="Diterima Oleh" filterValue={getFilter('received_by_name')} onFilterChange={v => setFilter('received_by_name', v)} />
                <DataTableColumnHeader title="Aksi" hideFilter align="right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    {globalSearch || Object.values(columnFilters).some(Boolean) ? 'Tidak ada hasil pencarian' : 'Belum ada penerimaan barang'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((gr) => (
                  <TableRow key={gr.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-bold text-slate-800">{gr.receipt_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-mono">
                        {gr.po_number || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-700 text-sm font-medium">{gr.supplier_name || '-'}</TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {new Date(gr.received_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">{gr.received_by_name || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="h-8 border-slate-200 text-slate-600 hover:text-teal-700 hover:bg-teal-50">
                        Detail
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

      {/* Goods Receipt Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-800 flex items-center">
              <PackageCheck className="mr-2 h-5 w-5 text-teal-600" />
              Form Penerimaan Barang
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 font-medium">
                Pastikan kesesuaian antara fisik barang dengan Surat Pesanan (SP) dan Faktur dari PBF.
                <strong className="block mt-1">Wajib input Nomor Batch dan Tanggal Kedaluwarsa (ED) untuk kepatuhan CDOB.</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 font-semibold text-sm">Pilih Surat Pesanan *</Label>
                <Select value={form.purchase_order_id} onValueChange={handleSelectPO}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih SP" /></SelectTrigger>
                  <SelectContent>
                    {receivablePOs.map(po => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.po_number} — {po.supplier_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-700 font-semibold text-sm">Catatan</Label>
                <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Catatan penerimaan" className="mt-1.5" />
              </div>
            </div>

            {form.items.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Verifikasi Barang (Batch & ED)</h3>
                </div>
                <div className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold text-slate-600">Nama Barang</TableHead>
                        <TableHead className="font-bold text-slate-600 text-center">Qty Pesan</TableHead>
                        <TableHead className="font-bold text-slate-600 text-center">Qty Terima</TableHead>
                        <TableHead className="font-bold text-rose-600 bg-rose-50/50">No. Batch *</TableHead>
                        <TableHead className="font-bold text-rose-600 bg-rose-50/50">Expired Date *</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-semibold text-slate-800 text-sm">{item.product_name}</TableCell>
                          <TableCell className="text-center font-bold text-slate-500">{item.qty_ordered}</TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              value={item.qty_received}
                              onChange={e => updateItem(idx, 'qty_received', parseInt(e.target.value) || 0)}
                              className="w-20 text-center mx-auto h-8 border-slate-300"
                              min={0}
                              max={item.qty_ordered}
                            />
                          </TableCell>
                          <TableCell className="bg-rose-50/30">
                            <Input
                              placeholder="Input Batch..."
                              value={item.batch_number}
                              onChange={e => updateItem(idx, 'batch_number', e.target.value)}
                              className="h-8 border-slate-300 w-full min-w-[120px]"
                            />
                          </TableCell>
                          <TableCell className="bg-rose-50/30">
                            <Input
                              type="month"
                              value={item.expiry_date}
                              onChange={e => updateItem(idx, 'expiry_date', e.target.value)}
                              className="h-8 border-slate-300 w-full min-w-[120px]"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.purchase_order_id || form.items.length === 0 || form.items.some(i => !i.batch_number || !i.expiry_date)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan & Update Stok
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
