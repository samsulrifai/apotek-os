import { useState, useEffect, useCallback } from "react"
import { Search, Plus, Edit, Trash2, Box, Pill, Activity, ShieldPlus, Loader2, Save, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import type { Product, Category, Unit, ProductFormData, DrugClass } from "@/types"
import { DRUG_CLASS_LABELS, DRUG_CLASS_COLORS } from "@/types"
import { useTablePagination } from "@/hooks/useTablePagination"
import { DataTablePagination } from "@/components/ui/DataTablePagination"
import { DataTableColumnHeader } from "@/components/ui/DataTableColumnHeader"

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<ProductStats>({ total: 0, byDrugClass: {} })
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [form, setForm] = useState<ProductFormData>({
    name: '', generic_name: '', category_id: '', unit_id: '',
    sku: '', barcode: '', form: '', strength: '', manufacturer: '',
    drug_class: 'bebas', min_stock: 10, default_purchase_price: 0, selling_price: 0,
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [productsRes, cats, unitsRes] = await Promise.all([
        api.get<Product[]>('/products'),
        api.get<Category[]>('/categories'),
        api.get<Unit[]>('/units'),
      ])
      setProducts(Array.isArray(productsRes) ? productsRes : (productsRes as any).data ?? [])
      setCategories(Array.isArray(cats) ? cats : [])
      setUnits(Array.isArray(unitsRes) ? unitsRes : [])
      
      const statsRes = await api.get<ProductStats>('/products/stats').catch(() => ({ total: 0, byDrugClass: {} }))
      setStats(statsRes)
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const openAddDialog = () => {
    setEditingProduct(null)
    setForm({
      name: '', generic_name: '', category_id: '', unit_id: '',
      sku: '', barcode: '', form: '', strength: '', manufacturer: '',
      drug_class: 'bebas', min_stock: 10, default_purchase_price: 0, selling_price: 0,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      generic_name: product.generic_name || '',
      category_id: product.category_id,
      unit_id: product.unit_id,
      sku: product.sku,
      barcode: product.barcode || '',
      form: product.form || '',
      strength: product.strength || '',
      manufacturer: product.manufacturer || '',
      drug_class: product.drug_class,
      min_stock: product.min_stock,
      default_purchase_price: product.default_purchase_price,
      selling_price: product.selling_price,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, form)
      } else {
        await api.post('/products', form)
      }
      setDialogOpen(false)
      loadData()
    } catch {
      // handle error
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/${id}`)
      setDeleteConfirm(null)
      loadData()
    } catch {
      // handle error
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
  } = useTablePagination(products)

  const getCategoryColor = (categoryName?: string) => {
    switch(categoryName) {
      case "Obat Keras": return "bg-rose-50 text-rose-700 border-rose-200"
      case "Obat Bebas": return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "Suplemen": return "bg-blue-50 text-blue-700 border-blue-200"
      case "Herbal": return "bg-lime-50 text-lime-700 border-lime-200"
      default: return "bg-slate-50 text-slate-700 border-slate-200"
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Memuat data produk...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <Box className="mr-3 h-8 w-8 text-teal-600" />
            Katalog Master Produk
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Kelola data obat, harga, margin, dan lokasi rak</p>
        </div>
        <div className="flex gap-2">
          <Button className="shadow-sm bg-teal-600 hover:bg-teal-700" onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Produk
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm border-none bg-gradient-to-br from-teal-500 to-teal-600 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-sm font-medium">Total Produk</p>
              <h3 className="text-3xl font-bold mt-1">{stats.total || products.length}</h3>
            </div>
            <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center">
              <Box className="h-6 w-6 text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium">Obat Bebas</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.byDrugClass?.bebas ?? products.filter(p => p.drug_class === 'bebas').length}</h3>
            </div>
            <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <Pill className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium">Obat Keras (Resep)</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.byDrugClass?.keras ?? products.filter(p => p.drug_class === 'keras').length}</h3>
            </div>
            <div className="h-10 w-10 bg-rose-100 rounded-full flex items-center justify-center">
              <Activity className="h-5 w-5 text-rose-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium">Suplemen & Alkes</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{(stats.byDrugClass?.bebas_terbatas ?? 0) + products.filter(p => ['bebas_terbatas'].includes(p.drug_class)).length}</h3>
            </div>
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <ShieldPlus className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm overflow-hidden border-none bg-white">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input type="search" placeholder="Cari SKU atau Nama Produk..." className="pl-9 bg-white border-slate-200 shadow-sm" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <DataTableColumnHeader title="SKU / Barcode" filterValue={getFilter('sku')} onFilterChange={v => setFilter('sku', v)} />
                <DataTableColumnHeader title="Produk" filterValue={getFilter('name')} onFilterChange={v => setFilter('name', v)} />
                <DataTableColumnHeader title="Kategori" filterValue={getFilter('category_name')} onFilterChange={v => setFilter('category_name', v)} />
                <DataTableColumnHeader title="Golongan" hideFilter />
                <DataTableColumnHeader title="Harga Jual" hideFilter align="right" />
                <DataTableColumnHeader title="Stok" hideFilter align="center" />
                <DataTableColumnHeader title="Aksi" hideFilter align="right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    {globalSearch || Object.values(columnFilters).some(Boolean) ? 'Tidak ada hasil pencarian' : 'Belum ada produk'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <TableCell className="font-mono text-xs text-slate-400 font-medium align-top pt-4">{item.sku}</TableCell>
                    <TableCell className="align-top pt-3">
                      <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge variant="outline" className={`font-medium shadow-none px-2 py-0 h-5 flex items-center ${getCategoryColor(item.category_name)}`}>
                          {item.category_name || 'Umum'}
                        </Badge>
                        {item.generic_name && (
                          <span className="text-xs text-slate-500 font-medium">{item.generic_name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top pt-4">
                      <Badge variant="outline" className={`font-medium shadow-none ${DRUG_CLASS_COLORS[item.drug_class] || 'bg-slate-50 text-slate-600'}`}>
                        {DRUG_CLASS_LABELS[item.drug_class] || item.drug_class}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right align-top pt-4">
                      <span className="text-slate-500 font-medium text-sm">Rp {item.default_purchase_price.toLocaleString("id-ID")}</span>
                    </TableCell>
                    <TableCell className="text-right align-top pt-4 bg-teal-50/30">
                      <span className="font-bold text-teal-800 text-base">
                        Rp {item.selling_price.toLocaleString("id-ID")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right align-top pt-4">
                      <span className={`font-bold ${(item.total_stock ?? 0) <= item.min_stock ? 'text-rose-600' : 'text-slate-700'}`}>
                        {item.total_stock ?? 0}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">{item.unit_symbol}</span>
                    </TableCell>
                    <TableCell className="text-right align-top pt-3">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-teal-600 hover:bg-teal-50" title="Edit" onClick={() => openEditDialog(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Hapus" onClick={() => setDeleteConfirm(item.id)}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-800 flex items-center">
              <Box className="mr-2 h-5 w-5 text-teal-600" />
              {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label className="text-slate-700 font-semibold text-sm">Nama Produk *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nama produk" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold text-sm">Nama Generik</Label>
              <Input value={form.generic_name} onChange={e => setForm({...form, generic_name: e.target.value})} placeholder="Nama generik" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold text-sm">SKU</Label>
              <Input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="Auto-generated jika kosong" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold text-sm">Kategori *</Label>
              <Select value={form.category_id} onValueChange={v => setForm({...form, category_id: v})}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-700 font-semibold text-sm">Satuan *</Label>
              <Select value={form.unit_id} onValueChange={v => setForm({...form, unit_id: v})}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih satuan" /></SelectTrigger>
                <SelectContent>
                  {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.symbol})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-700 font-semibold text-sm">Golongan Obat *</Label>
              <Select value={form.drug_class} onValueChange={v => setForm({...form, drug_class: v as DrugClass})}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DRUG_CLASS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-700 font-semibold text-sm">Bentuk Sediaan</Label>
              <Input value={form.form} onChange={e => setForm({...form, form: e.target.value})} placeholder="Tablet, Kapsul, dll" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold text-sm">Kekuatan</Label>
              <Input value={form.strength} onChange={e => setForm({...form, strength: e.target.value})} placeholder="500mg" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold text-sm">Pabrik / Manufaktur</Label>
              <Input value={form.manufacturer} onChange={e => setForm({...form, manufacturer: e.target.value})} placeholder="Nama pabrik" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold text-sm">Minimum Stok</Label>
              <Input type="number" value={form.min_stock} onChange={e => setForm({...form, min_stock: parseInt(e.target.value) || 0})} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold text-sm">Harga Beli (HNA)</Label>
              <Input type="number" value={form.default_purchase_price} onChange={e => setForm({...form, default_purchase_price: parseInt(e.target.value) || 0})} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold text-sm">Harga Jual</Label>
              <Input type="number" value={form.selling_price} onChange={e => setForm({...form, selling_price: parseInt(e.target.value) || 0})} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.category_id || !form.unit_id} className="bg-teal-600 hover:bg-teal-700">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Hapus Produk?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
