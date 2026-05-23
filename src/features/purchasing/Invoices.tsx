import { useState, useEffect, useCallback } from "react"
import { Receipt, CheckCircle2, Clock, AlertCircle, Search, Download, Check, Loader2, FileText } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import type { Invoice } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { useTablePagination } from "@/hooks/useTablePagination"
import { DataTablePagination } from "@/components/ui/DataTablePagination"

interface InvoiceStats {
  totalDebt: number
  unpaidCount: number
  overdueCount: number
  paidThisMonth: number
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<InvoiceStats>({ totalDebt: 0, unpaidCount: 0, overdueCount: 0, paidThisMonth: 0 })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [invoicesRes, statsRes] = await Promise.all([
        api.get<Invoice[]>('/invoices'),
        api.get<InvoiceStats>('/invoices/stats').catch(() => ({ totalDebt: 0, unpaidCount: 0, overdueCount: 0, paidThisMonth: 0 })),
      ])
      setInvoices(Array.isArray(invoicesRes) ? invoicesRes : (invoicesRes as any).data ?? [])
      setStats(statsRes)
    } catch { /* silently */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handlePay = async (id: string) => {
    try {
      await api.put(`/invoices/${id}/pay`)
      toast({ title: "Berhasil", description: "Faktur berhasil ditandai lunas." })
      loadData()
    } catch {
      toast({ title: "Gagal", description: "Gagal memproses pembayaran.", variant: "destructive" })
    }
  }

  const formatRp = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "paid":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-none"><CheckCircle2 className="mr-1 h-3 w-3" /> Lunas</Badge>
      case "unpaid":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 shadow-none"><Clock className="mr-1 h-3 w-3" /> Belum Lunas</Badge>
      case "overdue":
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 animate-pulse shadow-none"><AlertCircle className="mr-1 h-3 w-3" /> Jatuh Tempo</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
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
  } = useTablePagination(invoices)

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Memuat data faktur...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <Receipt className="mr-3 h-8 w-8 text-teal-600" />
            Faktur Pembelian (PBF)
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Kelola tagihan hutang dagang dari Pedagang Besar Farmasi (PBF)
          </p>
        </div>
        <Button variant="outline" className="shadow-sm bg-white hover:bg-slate-50 text-slate-700" onClick={() => toast({ title: "Segera Hadir", description: "Fitur ekspor rekap faktur masih dalam tahap pengembangan." })}>
          <Download className="mr-2 h-4 w-4" /> Ekspor Rekap
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Hutang</p>
              <h3 className="text-2xl font-bold text-slate-800">{formatRp(stats.totalDebt)}</h3>
            </div>
            <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center">
              <FileText className="h-5 w-5 text-slate-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-1">Belum Lunas</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.unpaidCount} <span className="text-sm text-slate-500 font-medium">Faktur</span></h3>
            </div>
            <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-rose-600 uppercase tracking-wider mb-1">Jatuh Tempo</p>
              <h3 className="text-2xl font-bold text-rose-600">{stats.overdueCount} <span className="text-sm text-rose-400 font-medium">Faktur</span></h3>
            </div>
            <div className="h-10 w-10 bg-rose-50 rounded-full flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-rose-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-1">Lunas (Bulan Ini)</p>
              <h3 className="text-2xl font-bold text-slate-800">{formatRp(stats.paidThisMonth)}</h3>
            </div>
            <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="shadow-sm overflow-hidden border-none bg-white">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input type="search" placeholder="Cari No. Faktur, PBF, atau No. SP..." className="pl-9 bg-white border-slate-200 shadow-sm" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <TableHead><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Informasi Faktur</span></TableHead>
                <TableHead><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Pemasok (PBF)</span></TableHead>
                <TableHead className="text-center"><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Jatuh Tempo</span></TableHead>
                <TableHead className="text-right"><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Total Nilai</span></TableHead>
                <TableHead className="text-center"><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Status</span></TableHead>
                <TableHead className="text-right"><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                    {globalSearch ? 'Tidak ada hasil pencarian' : 'Belum ada faktur pembelian'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((inv) => (
                  <TableRow key={inv.id} className={`hover:bg-slate-50 transition-colors ${inv.payment_status === 'overdue' ? 'bg-rose-50/30' : ''}`}>
                    <TableCell className="py-3">
                      <p className="font-bold text-slate-800 font-mono">{inv.po_number}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Tgl: {inv.received_date ? new Date(inv.received_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </p>
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="font-medium text-slate-700 text-sm">{inv.supplier_name}</p>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <span className={`text-sm font-semibold ${inv.payment_status === 'overdue' ? 'text-rose-600' : 'text-slate-700'}`}>
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <span className="font-bold text-slate-800">{formatRp(inv.total_amount)}</span>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      {getStatusBadge(inv.payment_status)}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      {inv.payment_status !== 'paid' ? (
                        <Button size="sm" className="h-7 text-xs bg-slate-800 hover:bg-slate-700 text-white" onClick={() => handlePay(inv.id)}>
                          <Check className="h-3.5 w-3.5 mr-1" /> Bayar
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Lunas
                        </Badge>
                      )}
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
