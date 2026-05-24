import { useState, useEffect, useCallback } from "react"
import { Ruler, Plus, Search, Edit, Trash2, Loader2, Save } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { api } from "@/lib/api"
import type { Unit } from "@/types"

import { useTablePagination } from "@/hooks/useTablePagination"
import { DataTablePagination } from "@/components/ui/DataTablePagination"
import { DataTableColumnHeader } from "@/components/ui/DataTableColumnHeader"

export default function Units() {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Unit | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', symbol: '' })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<Unit[]>('/units')
      setUnits(Array.isArray(res) ? res : (res as any).data ?? [])
    } catch { /* silently */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const openAdd = () => {
    setEditingItem(null)
    setForm({ name: '', symbol: '' })
    setDialogOpen(true)
  }

  const openEdit = (item: Unit) => {
    setEditingItem(item)
    setForm({ name: item.name, symbol: item.symbol })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingItem) {
        await api.put(`/units/${editingItem.id}`, form)
      } else {
        await api.post('/units', form)
      }
      setDialogOpen(false)
      loadData()
    } catch { /* handle */ }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/units/${id}`)
      setDeleteConfirm(null)
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
    setGlobalSearch
  } = useTablePagination(units)

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Memuat data satuan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <Ruler className="mr-3 h-8 w-8 text-teal-600" />
            Satuan Produk
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Kelola satuan pengukuran (Strip, Box, Botol, dll)</p>
        </div>
        <Button className="shadow-sm bg-teal-600 hover:bg-teal-700" onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Satuan
        </Button>
      </div>

      <Card className="shadow-sm overflow-hidden border-none bg-white">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input type="search" placeholder="Cari satuan..." className="pl-9 bg-white border-slate-200" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <DataTableColumnHeader title="Nama" filterValue={getFilter('name')} onFilterChange={v => setFilter('name', v)} />
                <DataTableColumnHeader title="Simbol" filterValue={getFilter('symbol')} onFilterChange={v => setFilter('symbol', v)} />
                <DataTableColumnHeader title="Jumlah Produk" hideFilter align="center" />
                <DataTableColumnHeader title="Aksi" hideFilter align="right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                    {globalSearch ? 'Tidak ada hasil pencarian' : 'Belum ada satuan'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((unit) => (
                  <TableRow key={unit.id} className="hover:bg-slate-50 transition-colors group">
                    <TableCell className="font-bold text-slate-800">{unit.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 font-mono font-bold">
                        {unit.symbol}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 shadow-none font-semibold">
                        {unit.product_count ?? 0} Produk
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-teal-600 hover:bg-teal-50" onClick={() => openEdit(unit)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => setDeleteConfirm(unit.id)}>
                          <Trash2 className="h-4 w-4" />
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
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-800 flex items-center">
              <Ruler className="mr-2 h-5 w-5 text-teal-600" />
              {editingItem ? 'Edit Satuan' : 'Tambah Satuan Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-slate-700 font-semibold text-sm">Nama Satuan *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Contoh: Strip, Box, Botol" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold text-sm">Simbol *</Label>
              <Input value={form.symbol} onChange={e => setForm({...form, symbol: e.target.value})} placeholder="Contoh: Str, Box, Btl" className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.symbol} className="bg-teal-600 hover:bg-teal-700">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {editingItem ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Hapus Satuan?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Satuan yang sudah digunakan oleh produk tidak dapat dihapus.</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
