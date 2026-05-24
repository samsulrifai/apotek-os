import { useState, useEffect } from "react"
import { RotateCcw, Plus, Search, Loader2, Package } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Sale, SaleItem } from "@/types"

interface SalesReturn {
  id: string
  return_number: string
  sale_number: string
  return_date: string
  total_refund: number
  status: string
  created_by_name: string
  reason?: string
}

interface ReturnItemForm {
  sale_item_id: string
  product_name: string
  qty_bought: number
  qty_return: number
  unit_price: number
}

export default function SalesReturn() {
  const { toast } = useToast()
  const [returns, setReturns] = useState<SalesReturn[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Dialog state
  const [salesSearch, setSalesSearch] = useState("")
  const [salesList, setSalesList] = useState<Sale[]>([])
  const [salesLoading, setSalesLoading] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [returnItems, setReturnItems] = useState<ReturnItemForm[]>([])
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadReturns()
  }, [])

  const loadReturns = async () => {
    setLoading(true)
    try {
      const res = await api.get<SalesReturn[] | { data: SalesReturn[] }>('/sales/returns')
      setReturns(Array.isArray(res) ? res : (res as { data: SalesReturn[] }).data ?? [])
    } catch {
      // silently
    } finally {
      setLoading(false)
    }
  }

  const searchSales = async () => {
    if (!salesSearch.trim()) return
    setSalesLoading(true)
    try {
      const res = await api.get<Sale[] | { data: Sale[] }>('/sales', { search: salesSearch })
      const list = Array.isArray(res) ? res : (res as { data: Sale[] }).data ?? []
      setSalesList(list)
    } catch {
      toast({ title: "Gagal mencari penjualan", variant: "destructive" })
    } finally {
      setSalesLoading(false)
    }
  }

  const selectSale = async (sale: Sale) => {
    setSelectedSale(sale)
    // If items not loaded, try to fetch detail
    let items = sale.items
    if (!items || items.length === 0) {
      try {
        const detail = await api.get<Sale>(`/sales/${sale.id}`)
        items = detail.items || []
      } catch {
        items = []
      }
    }
    setReturnItems(
      (items || []).map((item: SaleItem) => ({
        sale_item_id: item.id,
        product_name: item.product_name,
        qty_bought: item.qty,
        qty_return: 0,
        unit_price: item.unit_price,
      }))
    )
  }

  const updateReturnQty = (index: number, qty: number) => {
    setReturnItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, qty_return: Math.min(Math.max(0, qty), item.qty_bought) } : item
      )
    )
  }

  const totalRefund = returnItems.reduce((sum, item) => sum + item.qty_return * item.unit_price, 0)
  const hasReturnItems = returnItems.some(item => item.qty_return > 0)

  const handleSubmit = async () => {
    if (!selectedSale || !hasReturnItems) return
    if (!reason.trim()) {
      toast({ title: "Alasan retur wajib diisi", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      await api.post('/sales/returns', {
        sale_id: selectedSale.id,
        items: returnItems
          .filter(item => item.qty_return > 0)
          .map(item => ({
            sale_item_id: item.sale_item_id,
            qty: item.qty_return,
          })),
        reason,
      })
      toast({ title: "Retur berhasil dibuat" })
      resetDialog()
      setDialogOpen(false)
      loadReturns()
    } catch (err: any) {
      toast({ title: "Gagal membuat retur", description: err?.message || "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const resetDialog = () => {
    setSalesSearch("")
    setSalesList([])
    setSelectedSale(null)
    setReturnItems([])
    setReason("")
  }

  const formatRp = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 shadow-none">Selesai</Badge>
      case 'pending': return <Badge className="bg-amber-50 text-amber-700 border-amber-200 shadow-none">Pending</Badge>
      case 'rejected': return <Badge variant="destructive">Ditolak</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Memuat data retur...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <RotateCcw className="mr-3 h-8 w-8 text-teal-600" />
            Retur Penjualan
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Kelola pengembalian barang dari pelanggan</p>
        </div>
        <Button
          className="bg-teal-600 hover:bg-teal-700 shadow-sm"
          onClick={() => { resetDialog(); setDialogOpen(true) }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Buat Retur
        </Button>
      </div>

      {/* KPI */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Retur</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{returns.length}</h3>
            </div>
            <div className="h-10 w-10 bg-teal-100 rounded-full flex items-center justify-center">
              <RotateCcw className="h-5 w-5 text-teal-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Refund</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">
                {formatRp(returns.reduce((sum, r) => sum + (r.total_refund || 0), 0))}
              </h3>
            </div>
            <div className="h-10 w-10 bg-rose-100 rounded-full flex items-center justify-center">
              <Package className="h-5 w-5 text-rose-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium">Pending</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                {returns.filter(r => r.status === 'pending').length}
              </h3>
            </div>
            <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Loader2 className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="shadow-sm overflow-hidden border-none bg-white">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg text-slate-800">Daftar Retur</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-slate-500 font-bold">No. Retur</TableHead>
                <TableHead className="text-slate-500 font-bold">No. Penjualan</TableHead>
                <TableHead className="text-slate-500 font-bold">Tanggal</TableHead>
                <TableHead className="text-right text-slate-500 font-bold">Total Refund</TableHead>
                <TableHead className="text-center text-slate-500 font-bold">Status</TableHead>
                <TableHead className="text-slate-500 font-bold">Dibuat Oleh</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    Belum ada data retur penjualan
                  </TableCell>
                </TableRow>
              ) : (
                returns.map((ret) => (
                  <TableRow key={ret.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-bold text-teal-700">{ret.return_number}</TableCell>
                    <TableCell className="font-mono text-sm text-slate-600">{ret.sale_number}</TableCell>
                    <TableCell className="text-slate-600">
                      {new Date(ret.return_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right font-bold text-rose-600">{formatRp(ret.total_refund)}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(ret.status)}</TableCell>
                    <TableCell className="text-slate-600">{ret.created_by_name}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Return Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(val) => { if (!val) resetDialog(); setDialogOpen(val) }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-teal-600" />
              Buat Retur Penjualan
            </DialogTitle>
            <DialogDescription>
              Cari transaksi penjualan, pilih item yang akan diretur.
            </DialogDescription>
          </DialogHeader>

          {!selectedSale ? (
            <div className="space-y-4 py-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Cari nomor penjualan..."
                    value={salesSearch}
                    onChange={(e) => setSalesSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchSales()}
                    className="pl-9"
                  />
                </div>
                <Button onClick={searchSales} disabled={salesLoading} className="bg-teal-600 hover:bg-teal-700">
                  {salesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cari"}
                </Button>
              </div>

              {salesList.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-slate-500 font-bold">No. Penjualan</TableHead>
                        <TableHead className="text-slate-500 font-bold">Tanggal</TableHead>
                        <TableHead className="text-right text-slate-500 font-bold">Total</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesList.map((sale) => (
                        <TableRow key={sale.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => selectSale(sale)}>
                          <TableCell className="font-bold text-teal-700">{sale.sale_number}</TableCell>
                          <TableCell className="text-slate-600">
                            {new Date(sale.sold_at || sale.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-800">
                            {formatRp(sale.total_amount)}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="text-teal-600 border-teal-200 hover:bg-teal-50">
                              Pilih
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-teal-800">Penjualan: {selectedSale.sale_number}</p>
                  <p className="text-xs text-teal-600">
                    {new Date(selectedSale.sold_at || selectedSale.created_at).toLocaleDateString('id-ID')} — {formatRp(selectedSale.total_amount)}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setSelectedSale(null); setReturnItems([]) }}>
                  Ganti
                </Button>
              </div>

              {/* Return items */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-slate-500 font-bold">Produk</TableHead>
                      <TableHead className="text-center text-slate-500 font-bold">Qty Beli</TableHead>
                      <TableHead className="text-center text-slate-500 font-bold">Qty Retur</TableHead>
                      <TableHead className="text-right text-slate-500 font-bold">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnItems.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-slate-800">{item.product_name}</TableCell>
                        <TableCell className="text-center text-slate-600">{item.qty_bought}</TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min={0}
                            max={item.qty_bought}
                            value={item.qty_return}
                            onChange={(e) => updateReturnQty(i, parseInt(e.target.value) || 0)}
                            className="w-20 mx-auto text-center h-8"
                          />
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-800">
                          {formatRp(item.qty_return * item.unit_price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <span className="text-sm font-bold text-rose-700">Total Refund</span>
                <span className="text-lg font-black text-rose-700">{formatRp(totalRefund)}</span>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="return-reason">Alasan Retur *</Label>
                <Input
                  id="return-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: Obat rusak, salah item, dll."
                />
              </div>
            </div>
          )}

          {selectedSale && (
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetDialog(); setDialogOpen(false) }} disabled={submitting}>
                Batal
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700"
                onClick={handleSubmit}
                disabled={submitting || !hasReturnItems}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Proses Retur
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
