import { useState, useEffect, useCallback } from "react"
import { Search, Plus, Edit, Trash2, Box, Pill, Activity, ShieldPlus, Loader2, Save, TrendingUp, Calculator } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { api } from "@/lib/api"
import type { Product, Category, Unit, ProductFormData, DrugClass, AppSettings } from "@/types"
import { DRUG_CLASS_LABELS, DRUG_CLASS_COLORS } from "@/types"
import { useTablePagination } from "@/hooks/useTablePagination"
import { DataTablePagination } from "@/components/ui/DataTablePagination"
import { useToast } from "@/hooks/use-toast"
import { PageSkeleton } from "@/components/ui/PageSkeleton"

interface ProductStats { total: number; byDrugClass: Record<string, number> }

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<ProductStats>({ total: 0, byDrugClass: {} })
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [ppnRate, setPpnRate] = useState(11)
  const [defaultMargin, setDefaultMargin] = useState(15)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const { toast } = useToast()

  const [form, setForm] = useState<ProductFormData>({
    name: '', generic_name: '', category_id: '', unit_id: '',
    sku: '', barcode: '', form: '', strength: '', manufacturer: '',
    drug_class: 'bebas', min_stock: 10, default_purchase_price: 0, selling_price: 0, custom_margin: null,
  })
  // 'default' = use settings margin, 'custom' = use custom_margin field
  const [marginType, setMarginType] = useState<'default' | 'custom'>('default')
  const [customMarginInput, setCustomMarginInput] = useState(15)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [productsRes, cats, unitsRes, settingsRes] = await Promise.all([
        api.get<Product[]>('/products'),
        api.get<Category[]>('/categories'),
        api.get<Unit[]>('/units'),
        api.get<AppSettings>('/settings').catch(() => ({} as AppSettings)),
      ])
      setProducts(Array.isArray(productsRes) ? productsRes : (productsRes as any).data ?? [])
      setCategories(Array.isArray(cats) ? cats : [])
      setUnits(Array.isArray(unitsRes) ? unitsRes : [])
      if (settingsRes?.ppn_rate) setPpnRate(parseFloat(settingsRes.ppn_rate))
      if (settingsRes?.default_margin) setDefaultMargin(parseFloat(settingsRes.default_margin))
      
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
    setMarginType('default')
    setCustomMarginInput(defaultMargin)
    setForm({
      name: '', generic_name: '', category_id: '', unit_id: '',
      sku: '', barcode: '', form: '', strength: '', manufacturer: '',
      drug_class: 'bebas', min_stock: 10, default_purchase_price: 0, selling_price: 0, custom_margin: null,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    const hasCustomMargin = product.custom_margin !== null && product.custom_margin !== undefined
    setMarginType(hasCustomMargin ? 'custom' : 'default')
    setCustomMarginInput(hasCustomMargin ? product.custom_margin! : defaultMargin)
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
      custom_margin: product.custom_margin,
    })
    setDialogOpen(true)
  }

  // Calculate selling price based on HNA + PPN + Margin
  const calcSellingPrice = (hna: number, margin: number) => {
    const ppnAmt = Math.round(hna * ppnRate / 100)
    const hnaPpn = hna + ppnAmt
    return Math.round(hnaPpn * (1 + margin / 100))
  }

  const activeMargin = marginType === 'default' ? defaultMargin : customMarginInput
  const calculatedPrice = calcSellingPrice(form.default_purchase_price, activeMargin)

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        custom_margin: marginType === 'custom' ? customMarginInput : null,
        selling_price: form.selling_price || calculatedPrice,
      }
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload)
        toast({ title: "Berhasil", description: "Produk berhasil diperbarui." })
      } else {
        await api.post('/products', payload)
        toast({ title: "Berhasil", description: "Produk baru berhasil ditambahkan." })
      }
      setDialogOpen(false)
      loadData()
    } catch {
      toast({ title: "Gagal", description: "Terjadi kesalahan saat menyimpan produk.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/${id}`)
      setDeleteConfirm(null)
      toast({ title: "Berhasil", description: "Produk berhasil dihapus." })
      loadData()
    } catch {
      toast({ title: "Gagal", description: "Gagal menghapus produk.", variant: "destructive" })
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
    return <PageSkeleton />
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
                <TableHead><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Produk</span></TableHead>
                <TableHead><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Pabrik</span></TableHead>
                <TableHead><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Golongan</span></TableHead>
                <TableHead className="text-right"><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">HNA</span></TableHead>
                <TableHead className="text-right"><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">HNA+PPN</span></TableHead>
                <TableHead className="text-center"><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Margin</span></TableHead>
                <TableHead className="text-right"><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Harga Jual</span></TableHead>
                <TableHead className="text-center"><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Stok</span></TableHead>
                <TableHead className="text-right"><span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                    {globalSearch ? 'Tidak ada hasil pencarian' : 'Belum ada produk'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <TableCell className="py-3">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Pill className="h-4 w-4 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-slate-400 font-mono">{item.sku}</span>
                            <Badge variant="outline" className={`font-medium shadow-none px-1.5 py-0 h-5 text-[11px] ${getCategoryColor(item.category_name)}`}>
                              {item.category_name || 'Umum'}
                            </Badge>
                          </div>
                          {item.generic_name && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{item.generic_name}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm text-slate-600">{item.manufacturer || '-'}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline" className={`font-medium shadow-none text-xs ${DRUG_CLASS_COLORS[item.drug_class] || 'bg-slate-50 text-slate-600'}`}>
                        {DRUG_CLASS_LABELS[item.drug_class] || item.drug_class}
                      </Badge>
                    </TableCell>
                    {(() => {
                      const hna = item.default_purchase_price || 0
                      const ppnAmt = Math.round(hna * ppnRate / 100)
                      const hnaPpn = hna + ppnAmt
                      const itemMargin = (item.custom_margin !== null && item.custom_margin !== undefined) ? item.custom_margin : defaultMargin
                      const isCustomMargin = item.custom_margin !== null && item.custom_margin !== undefined
                      const hargaJual = item.selling_price || Math.round(hnaPpn * (1 + itemMargin / 100))
                      const actualMarginPct = hnaPpn > 0 ? ((hargaJual - hnaPpn) / hnaPpn * 100) : 0
                      return (
                        <>
                          {/* HNA */}
                          <TableCell className="text-right py-3">
                            <span className="text-slate-600 text-sm">Rp {hna.toLocaleString("id-ID")}</span>
                          </TableCell>
                          {/* HNA + PPN */}
                          <TableCell className="text-right py-3">
                            <div className="flex flex-col items-end">
                              <span className="text-slate-700 text-sm font-medium">Rp {hnaPpn.toLocaleString("id-ID")}</span>
                              <span className="text-[10px] text-blue-500 font-medium">+PPN {ppnRate}%</span>
                            </div>
                          </TableCell>
                          {/* Margin */}
                          <TableCell className="text-center py-3">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                                actualMarginPct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                <TrendingUp className="h-3 w-3" />
                                {actualMarginPct.toFixed(1)}%
                              </span>
                              <span className={`text-[9px] font-medium ${isCustomMargin ? 'text-amber-500' : 'text-slate-400'}`}>
                                {isCustomMargin ? 'Custom' : 'Default'}
                              </span>
                            </div>
                          </TableCell>
                          {/* Harga Jual */}
                          <TableCell className="text-right py-3">
                            <span className="font-bold text-teal-700 text-sm">Rp {hargaJual.toLocaleString("id-ID")}</span>
                          </TableCell>
                        </>
                      )
                    })()}
                    <TableCell className="text-center py-3">
                      <span className={`font-bold text-sm ${(item.total_stock ?? 0) <= item.min_stock ? 'text-rose-600' : 'text-slate-700'}`}>
                        {item.total_stock ?? 0}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">{item.unit_name || ''}</span>
                    </TableCell>
                    <TableCell className="text-right py-3">
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="text-xl text-slate-800 flex items-center">
                <Box className="mr-2 h-5 w-5 text-teal-600" />
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-slate-700 font-semibold text-sm">Nama Produk <span className="text-rose-500">*</span></Label>
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
                <Label className="text-slate-700 font-semibold text-sm">Kategori <span className="text-rose-500">*</span></Label>
                <SearchableSelect
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  value={form.category_id}
                  onValueChange={v => setForm({...form, category_id: v})}
                  placeholder="Pilih kategori..."
                  searchPlaceholder="Cari kategori..."
                  emptyMessage="Kategori tidak ditemukan"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold text-sm">Satuan <span className="text-rose-500">*</span></Label>
                <SearchableSelect
                  options={units.map(u => ({ value: u.id, label: `${u.name} (${u.symbol})` }))}
                  value={form.unit_id}
                  onValueChange={v => setForm({...form, unit_id: v})}
                  placeholder="Pilih satuan..."
                  searchPlaceholder="Cari satuan..."
                  emptyMessage="Satuan tidak ditemukan"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold text-sm">Golongan Obat <span className="text-rose-500">*</span></Label>
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

              {/* Pricing Section */}
              <div className="sm:col-span-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calculator className="h-4 w-4 text-teal-600" />
                  <h4 className="font-bold text-slate-700 text-sm">Perhitungan Harga</h4>
                </div>

                {/* HNA Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-600 font-medium text-xs">Harga Netto Apotek (HNA)</Label>
                    <Input
                      type="number"
                      value={form.default_purchase_price}
                      onChange={e => {
                        const hna = parseInt(e.target.value) || 0
                        setForm({...form, default_purchase_price: hna, selling_price: calcSellingPrice(hna, activeMargin)})
                      }}
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-600 font-medium text-xs">PPN ({ppnRate}%)</Label>
                    <div className="mt-1 h-9 flex items-center px-3 rounded-lg border border-slate-200 bg-white text-sm text-blue-600 font-medium">
                      + Rp {Math.round(form.default_purchase_price * ppnRate / 100).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                {/* Margin Selector */}
                <div>
                  <Label className="text-slate-600 font-medium text-xs mb-2 block">Margin Keuntungan</Label>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMarginType('default')
                        setForm({...form, selling_price: calcSellingPrice(form.default_purchase_price, defaultMargin)})
                      }}
                      className={`rounded-lg border-2 p-2 text-center transition-all text-xs ${
                        marginType === 'default'
                          ? 'border-teal-500 bg-teal-50 text-teal-700 font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div className="font-bold">Default</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{defaultMargin}%</div>
                    </button>
                    {[10, 15, 20].filter(v => v !== defaultMargin).concat(defaultMargin === 10 || defaultMargin === 15 || defaultMargin === 20 ? [] : []).map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setMarginType('custom')
                          setCustomMarginInput(val)
                          setForm({...form, selling_price: calcSellingPrice(form.default_purchase_price, val)})
                        }}
                        className={`rounded-lg border-2 p-2 text-center transition-all text-xs ${
                          marginType === 'custom' && customMarginInput === val
                            ? 'border-teal-500 bg-teal-50 text-teal-700 font-bold'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <div className="font-bold">{val}%</div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setMarginType('custom')
                        setCustomMarginInput(customMarginInput)
                      }}
                      className={`rounded-lg border-2 p-2 text-center transition-all text-xs ${
                        marginType === 'custom' && ![10, 15, 20].includes(customMarginInput)
                          ? 'border-teal-500 bg-teal-50 text-teal-700 font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div className="font-bold">Custom</div>
                    </button>
                  </div>

                  {/* Custom margin input */}
                  {marginType === 'custom' && ![10, 15, 20].includes(customMarginInput) && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={customMarginInput}
                          onChange={e => {
                            const v = parseFloat(e.target.value) || 0
                            setCustomMarginInput(v)
                            setForm({...form, selling_price: calcSellingPrice(form.default_purchase_price, v)})
                          }}
                          className="w-24"
                          min={0}
                          step={0.5}
                        />
                        <span className="text-sm text-slate-500 font-medium">%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Price Breakdown */}
                {form.default_purchase_price > 0 && (
                  <div className="bg-white rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>HNA</span>
                      <span>Rp {form.default_purchase_price.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-blue-600 mb-1">
                      <span>+ PPN {ppnRate}%</span>
                      <span>Rp {Math.round(form.default_purchase_price * ppnRate / 100).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-emerald-600 mb-1">
                      <span>+ Margin {activeMargin}%</span>
                      <span>Rp {Math.round((form.default_purchase_price + Math.round(form.default_purchase_price * ppnRate / 100)) * activeMargin / 100).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="border-t border-slate-100 mt-2 pt-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">Harga Jual</span>
                      <span className="text-sm font-bold text-teal-700">Rp {calculatedPrice.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                )}

                {/* Override selling price */}
                <div>
                  <Label className="text-slate-600 font-medium text-xs">Harga Jual Final (override manual)</Label>
                  <Input
                    type="number"
                    value={form.selling_price}
                    onChange={e => setForm({...form, selling_price: parseInt(e.target.value) || 0})}
                    className="mt-1"
                    placeholder={calculatedPrice.toString()}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Kosongkan atau biarkan sesuai kalkulasi otomatis. Ubah manual jika ingin override.</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
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
            <Button type="button" variant="outline" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
