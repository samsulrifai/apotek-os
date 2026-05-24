import { useState, useEffect, useCallback } from "react"
import { PackageCheck, Plus, Search, Loader2, Save, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { api } from "@/lib/api"
import type { GoodsReceipt, PurchaseOrder } from "@/types"
import { useTablePagination } from "@/hooks/useTablePagination"
import { DataTablePagination } from "@/components/ui/DataTablePagination"
import { useToast } from "@/hooks/use-toast"

interface POItem {
  product_id: string
  product_name?: string
  sku?: string
  qty_ordered: number
  qty_received: number
  unit_price: number
}

export default function GoodsReceipts() {
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingPO, setLoadingPO] = useState(false)
  const { toast } = useToast()

  const [form, setForm] = useState({
    purchase_order_id: '',
    notes: '',
    items: [] as { product_id: string; product_name: string; qty_ordered: number; qty_received: number; unit_price: number; batch_number: string; expiry_date: string }[],
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [receiptsRes, ...posResults] = await Promise.all([
        api.get<GoodsReceipt[]>('/goods-receipts'),
        // Fetch POs for each receivable status separately to ensure we get all
        api.get<any>('/purchase-orders', { status: 'approved', limit: 100 }),
        api.get<any>('/purchase-orders', { status: 'partial', limit: 100 }),
        api.get<any>('/purchase-orders', { status: 'ordered', limit: 100 }),
      ])
      setReceipts(Array.isArray(receiptsRes) ? receiptsRes : (receiptsRes as any).data ?? [])
      // Merge all receivable POs
      const allPOs: PurchaseOrder[] = []
      const seenIds = new Set<string>()
      for (const posRes of posResults) {
        const poList = Array.isArray(posRes) ? posRes : posRes.data ?? []
        for (const po of poList) {
          if (!seenIds.has(po.id)) {
            seenIds.add(po.id)
            allPOs.push(po)
          }
        }
      }
      setPurchaseOrders(allPOs)
    } catch { /* silently */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Fetch PO detail with items when user selects a PO
  const handleSelectPO = async (poId: string) => {
    if (!poId) {
      setForm({ purchase_order_id: '', notes: '', items: [] })
      return
    }

    setLoadingPO(true)
    try {
      const poDetail = await api.get<PurchaseOrder & { items: POItem[] }>(`/purchase-orders/${poId}`)
      const items = (poDetail.items || []).map(item => ({
        product_id: item.product_id,
        product_name: item.product_name || '',
        qty_ordered: item.qty_ordered,
        qty_received: Math.max(0, item.qty_ordered - (item.qty_received || 0)), // remaining qty
        unit_price: item.unit_price,
        batch_number: '',
        expiry_date: '',
      })).filter(item => item.qty_received > 0) // only show items with remaining qty

      setForm({
        purchase_order_id: poId,
        notes: '',
        items,
      })
    } catch {
      toast({ title: "Gagal", description: "Gagal memuat detail Surat Pesanan.", variant: "destructive" })
    }
    finally { setLoadingPO(false) }
  }

  const updateItem = (idx: number, field: string, value: string | number) => {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item)
    }))
  }

  const handleSave = async () => {
    // Validate
    const invalidItems = form.items.filter(i => !i.batch_number || !i.expiry_date)
    if (invalidItems.length > 0) {
      toast({ title: "Validasi Gagal", description: "Semua item harus memiliki No. Batch dan Tanggal Kedaluwarsa.", variant: "destructive" })
      return
    }

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
          expiry_date: item.expiry_date.length === 7 ? `${item.expiry_date}-28` : item.expiry_date, // month → date
        })),
      })
      setDialogOpen(false)
      toast({ title: "Berhasil", description: "Penerimaan barang berhasil disimpan dan stok telah diperbarui." })
      loadData()
    } catch {
      toast({ title: "Gagal", description: "Gagal menyimpan penerimaan barang.", variant: "destructive" })
    }
    finally { setSaving(false) }
  }

  // Only show POs that can receive goods
  // All POs fetched are already filtered to receivable statuses, but filter again just in case
  const receivablePOs = purchaseOrders.filter(po => ['approved', 'partial', 'ordered'].includes(po.status))

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
  } = useTablePagination(receipts)

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
                <TableHead><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">No. Penerimaan</span></TableHead>
                <TableHead><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">No. SP</span></TableHead>
                <TableHead><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Supplier</span></TableHead>
                <TableHead><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Tanggal</span></TableHead>
                <TableHead><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Diterima Oleh</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                    {globalSearch ? 'Tidak ada hasil pencarian' : 'Belum ada penerimaan barang'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((gr) => (
                  <TableRow key={gr.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-bold text-slate-800 font-mono">{gr.receipt_number}</TableCell>
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
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="text-xl text-slate-800 flex items-center">
                <div className="h-9 w-9 rounded-lg bg-teal-100 flex items-center justify-center mr-3">
                  <PackageCheck className="h-5 w-5 text-teal-600" />
                </div>
                Form Penerimaan Barang
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Pastikan kesesuaian antara fisik barang dengan Surat Pesanan (SP) dan Faktur dari PBF.
                <strong className="block mt-0.5">Wajib input Nomor Batch dan Tanggal Kedaluwarsa (ED) untuk kepatuhan CDOB.</strong>
              </p>
            </div>

            {/* PO Selection & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 font-semibold text-sm">Pilih Surat Pesanan <span className="text-rose-500">*</span></Label>
                <SearchableSelect
                  options={receivablePOs.map(po => ({
                    value: po.id,
                    label: po.po_number,
                    sublabel: `${po.supplier_name || 'Tanpa supplier'} • ${po.status === 'draft' ? 'Draft' : po.status === 'approved' ? 'Disetujui' : 'Parsial'}`
                  }))}
                  value={form.purchase_order_id}
                  onValueChange={handleSelectPO}
                  placeholder="Pilih Surat Pesanan..."
                  searchPlaceholder="Cari nomor SP atau supplier..."
                  emptyMessage="Tidak ada SP yang bisa diterima"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold text-sm">Catatan</Label>
                <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Catatan penerimaan" className="mt-1.5" />
              </div>
            </div>

            {/* Loading PO items */}
            {loadingPO && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-teal-600 mr-2" />
                <span className="text-sm text-slate-500">Memuat item Surat Pesanan...</span>
              </div>
            )}

            {/* Items table */}
            {!loadingPO && form.items.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-slate-700 text-sm">Verifikasi Barang (Batch & ED)</h3>
                  <Badge variant="outline" className="bg-white text-slate-500 border-slate-200 text-xs">
                    {form.items.length} item
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/60">
                      <TableRow className="hover:bg-transparent">
                        <TableHead><span className="font-bold text-slate-500 text-xs">Nama Barang</span></TableHead>
                        <TableHead className="text-center"><span className="font-bold text-slate-500 text-xs">Qty Pesan</span></TableHead>
                        <TableHead className="text-center"><span className="font-bold text-slate-500 text-xs">Qty Terima</span></TableHead>
                        <TableHead className="bg-amber-50/50"><span className="font-bold text-amber-700 text-xs">No. Batch *</span></TableHead>
                        <TableHead className="bg-amber-50/50"><span className="font-bold text-amber-700 text-xs">Expired Date *</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.items.map((item, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50/50">
                          <TableCell>
                            <p className="font-semibold text-slate-800 text-sm">{item.product_name}</p>
                            <p className="text-[11px] text-slate-400">Rp {item.unit_price.toLocaleString('id-ID')}/unit</p>
                          </TableCell>
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
                          <TableCell className="bg-amber-50/20">
                            <Input
                              placeholder="Contoh: B20240101"
                              value={item.batch_number}
                              onChange={e => updateItem(idx, 'batch_number', e.target.value)}
                              className="h-8 border-slate-300 w-full min-w-[130px]"
                            />
                          </TableCell>
                          <TableCell className="bg-amber-50/20">
                            <Input
                              type="month"
                              value={item.expiry_date}
                              onChange={e => updateItem(idx, 'expiry_date', e.target.value)}
                              className="h-8 border-slate-300 w-full min-w-[130px]"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Empty state when PO selected but no remaining items */}
            {!loadingPO && form.purchase_order_id && form.items.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                Semua item pada SP ini sudah diterima lengkap.
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
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
