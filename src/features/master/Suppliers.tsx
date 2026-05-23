import { useState, useEffect, useCallback } from "react"
import { Truck, Plus, Search, Edit, Loader2, Save, Phone, Mail, ToggleLeft, ToggleRight } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { api } from "@/lib/api"
import type { Supplier } from "@/types"
import { useTablePagination } from "@/hooks/useTablePagination"
import { DataTablePagination } from "@/components/ui/DataTablePagination"
import { DataTableColumnHeader } from "@/components/ui/DataTableColumnHeader"

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Supplier | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', contact_person: '', is_active: true,
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<Supplier[]>('/suppliers')
      setSuppliers(Array.isArray(res) ? res : (res as any).data ?? [])
    } catch { /* silently */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const openAdd = () => {
    setEditingItem(null)
    setForm({ name: '', phone: '', email: '', address: '', contact_person: '', is_active: true })
    setDialogOpen(true)
  }

  const openEdit = (item: Supplier) => {
    setEditingItem(item)
    setForm({
      name: item.name, phone: item.phone || '', email: item.email || '',
      address: item.address || '', contact_person: item.contact_person || '', is_active: item.is_active,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingItem) {
        await api.put(`/suppliers/${editingItem.id}`, form)
      } else {
        await api.post('/suppliers', form)
      }
      setDialogOpen(false)
      loadData()
    } catch { /* handle */ }
    finally { setSaving(false) }
  }

  const toggleActive = async (supplier: Supplier) => {
    try {
      await api.put(`/suppliers/${supplier.id}`, { ...supplier, is_active: !supplier.is_active })
      loadData()
    } catch { /* handle */ }
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
  } = useTablePagination(suppliers)

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Memuat data supplier...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <Truck className="mr-3 h-8 w-8 text-teal-600" />
            Supplier / PBF
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Kelola data Pedagang Besar Farmasi (PBF) dan distributor</p>
        </div>
        <Button className="shadow-sm bg-teal-600 hover:bg-teal-700" onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Supplier
        </Button>
      </div>

      <Card className="shadow-sm overflow-hidden border-none bg-white">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input type="search" placeholder="Cari supplier..." className="pl-9 bg-white border-slate-200" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <DataTableColumnHeader title="Nama PBF" filterValue={getFilter('name')} onFilterChange={v => setFilter('name', v)} />
                <DataTableColumnHeader title="Telepon" filterValue={getFilter('phone')} onFilterChange={v => setFilter('phone', v)} />
                <DataTableColumnHeader title="Email" filterValue={getFilter('email')} onFilterChange={v => setFilter('email', v)} />
                <DataTableColumnHeader title="Alamat" filterValue={getFilter('address')} onFilterChange={v => setFilter('address', v)} />
                <DataTableColumnHeader title="Status" hideFilter align="center" />
                <DataTableColumnHeader title="Aksi" hideFilter align="right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    {globalSearch || Object.values(columnFilters).some(Boolean) ? 'Tidak ada hasil pencarian' : 'Belum ada supplier'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((sup) => (
                  <TableRow key={sup.id} className="hover:bg-slate-50 transition-colors group">
                    <TableCell>
                      <p className="font-bold text-slate-800">{sup.name}</p>
                      {sup.contact_person && <p className="text-xs text-slate-500 mt-0.5">CP: {sup.contact_person}</p>}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {sup.phone ? <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-slate-400" />{sup.phone}</span> : '-'}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {sup.email ? <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-slate-400" />{sup.email}</span> : '-'}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm max-w-[200px] truncate">{sup.address || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="outline"
                        className={`cursor-pointer ${sup.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                        onClick={() => toggleActive(sup)}
                      >
                        {sup.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-teal-600 hover:bg-teal-50" onClick={() => openEdit(sup)}>
                          <Edit className="h-4 w-4" />
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-800 flex items-center">
              <Truck className="mr-2 h-5 w-5 text-teal-600" />
              {editingItem ? 'Edit Supplier' : 'Tambah Supplier Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label className="text-slate-700 font-semibold text-sm">Nama PBF *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="PT ..." className="mt-1.5" />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold text-sm">Telepon</Label>
              <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="021-xxx" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold text-sm">Email</Label>
              <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@pbf.com" className="mt-1.5" />
            </div>
            <div className="col-span-2">
              <Label className="text-slate-700 font-semibold text-sm">Alamat</Label>
              <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Alamat lengkap" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold text-sm">Contact Person</Label>
              <Input value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} placeholder="Nama kontak" className="mt-1.5" />
            </div>
            <div className="flex items-end">
              <Button 
                type="button" variant="outline" 
                className={`w-full ${form.is_active ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50'}`}
                onClick={() => setForm({...form, is_active: !form.is_active})}
              >
                {form.is_active ? <ToggleRight className="mr-2 h-4 w-4" /> : <ToggleLeft className="mr-2 h-4 w-4" />}
                {form.is_active ? 'Aktif' : 'Nonaktif'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.name} className="bg-teal-600 hover:bg-teal-700">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {editingItem ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
