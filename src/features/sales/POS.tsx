import { useState, useEffect, useCallback } from "react"
import { Search, CreditCard, Banknote, ScanBarcode, Pill, Plus, Minus, X, ShoppingCart, Loader2, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useAuth } from "@/app/providers/AuthProvider"
import type { Product, CartItem, CreateSalePayload, Category } from "@/types"

export default function POS() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [paidAmount, setPaidAmount] = useState("")
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [popularProducts, setPopularProducts] = useState<Product[]>([])

  // Load categories and popular products on mount
  useEffect(() => {
    api.get<Category[]>('/categories').then(setCategories).catch(() => {})
    api.get<Product[]>('/products', { limit: 12 }).then(res => {
      setPopularProducts(Array.isArray(res) ? res : (res as any).data ?? [])
    }).catch(() => {})
  }, [])

  // Search products with debounce
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(() => {
      setSearching(true)
      api.get<Product[]>('/products/search', { q: searchTerm })
        .then(res => setSearchResults(Array.isArray(res) ? res : (res as any).data ?? []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id)
      if (existing) {
        if (existing.qty >= (product.total_stock ?? 0)) return prev
        return prev.map(item =>
          item.product_id === product.id
            ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.selling_price }
            : item
        )
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        qty: 1,
        unit_price: product.selling_price,
        selling_price: product.selling_price,
        discount_amount: 0,
        subtotal: product.selling_price,
        stock_available: product.total_stock ?? 0,
        drug_class: product.drug_class,
      }]
    })
    setSearchTerm("")
    setSearchResults([])
  }, [])

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product_id !== productId) return item
      const newQty = item.qty + delta
      if (newQty <= 0) return item
      if (newQty > item.stock_available) return item
      return { ...item, qty: newQty, subtotal: newQty * item.selling_price - item.discount_amount }
    }))
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product_id !== productId))
  }

  const clearCart = () => setCart([])

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0)
  const totalDiscount = cart.reduce((sum, item) => sum + item.discount_amount, 0)
  const total = subtotal

  const paidNum = parseInt(paidAmount.replace(/\D/g, '')) || 0
  const change = paidNum - total

  const handlePay = async () => {
    if (cart.length === 0) return
    if (paidNum < total) {
      setError("Uang yang diterima kurang dari total pembayaran")
      return
    }

    // Check for prescription drugs
    const hasPrescription = cart.some(item =>
      ['keras', 'narkotika', 'psikotropika', 'prekursor'].includes(item.drug_class)
    )

    setProcessing(true)
    setError(null)
    try {
      const payload: CreateSalePayload = {
        items: cart.map(item => ({
          product_id: item.product_id,
          qty: item.qty,
          unit_price: item.selling_price,
          discount_amount: item.discount_amount,
        })),
        payment_method: paymentMethod,
        paid_amount: paidNum,
        sale_type: hasPrescription ? 'prescription' : 'otc',
      }
      await api.post('/sales', payload)
      setSuccess(true)
      setCart([])
      setPaidAmount("")
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || "Gagal memproses penjualan")
    } finally {
      setProcessing(false)
    }
  }

  const formatPaidInput = (value: string) => {
    const num = value.replace(/\D/g, '')
    setPaidAmount(num ? parseInt(num).toLocaleString('id-ID') : '')
  }

  const setExactAmount = () => setPaidAmount(total.toLocaleString('id-ID'))
  const setQuickAmount = (amount: number) => setPaidAmount(amount.toLocaleString('id-ID'))

  const displayProducts = searchResults.length > 0 ? searchResults : popularProducts

  return (
    <div className="flex-1 flex flex-col h-full min-h-[calc(100vh-8rem)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <ShoppingCart className="mr-3 h-8 w-8 text-teal-600" />
            Kasir (POS)
          </h1>
        </div>
        <Badge variant="outline" className="px-3 py-1 bg-teal-50 text-teal-700 border-teal-200 shadow-sm text-sm">
          Kasir: {user?.full_name || 'Admin'} • Shift Pagi
        </Badge>
      </div>

      {/* Success/Error feedback */}
      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 font-medium text-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-4 w-4" /> Penjualan berhasil! Struk sedang dicetak...
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium text-sm animate-in fade-in slide-in-from-top-2 duration-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* KIRI: Pencarian & Daftar Produk */}
        <div className="lg:col-span-7 flex flex-col gap-4 min-h-0">
          <Card className="shrink-0 border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input 
                    type="search" 
                    placeholder="Ketik nama obat, SKU, atau scan barcode..." 
                    className="pl-10 h-11 bg-slate-50 border-slate-200 text-base rounded-xl" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searching && <Loader2 className="absolute right-3 top-3 h-5 w-5 text-teal-500 animate-spin" />}
                </div>
                <Button className="h-11 px-4 rounded-xl shadow-sm bg-slate-800 hover:bg-slate-700">
                  <ScanBarcode className="mr-2 h-5 w-5" /> Scan
                </Button>
              </div>
              
              <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
                <Badge 
                  className={`px-4 py-1.5 cursor-pointer text-sm rounded-lg shadow-none ${!selectedCategory ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''}`}
                  variant={selectedCategory ? "outline" : "default"}
                  onClick={() => setSelectedCategory("")}
                >
                  Semua
                </Badge>
                {categories.slice(0, 4).map(cat => (
                  <Badge 
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    className={`px-4 py-1.5 cursor-pointer text-sm rounded-lg ${selectedCategory === cat.id ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-none' : 'hover:bg-slate-50 border-slate-200 text-slate-600'}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 border-none shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="py-3 px-4 border-b border-slate-100 shrink-0">
              <CardTitle className="text-base font-semibold text-slate-800">
                {searchTerm ? `Hasil Pencarian "${searchTerm}"` : 'Pilih Produk Cepat'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 overflow-y-auto flex-1 bg-slate-50/50">
              {displayProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                  <Pill className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">{searchTerm ? 'Produk tidak ditemukan' : 'Tidak ada produk'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {displayProducts.map((product) => (
                    <div 
                      key={product.id} 
                      className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-teal-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[110px]"
                      onClick={() => addToCart(product)}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-200 text-slate-500 font-medium">{product.category_name || product.drug_class}</Badge>
                          <span className="text-[10px] text-slate-400 font-medium">Stok: {product.total_stock ?? 0}</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-teal-700 transition-colors">{product.name}</h3>
                      </div>
                      <div className="flex justify-between items-end mt-2">
                        <span className="text-sm font-bold text-teal-600">Rp {product.selling_price.toLocaleString('id-ID')}</span>
                        <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors">
                          <Plus className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* KANAN: Keranjang & Pembayaran */}
        <div className="lg:col-span-5 flex flex-col min-h-0 h-full">
          <Card className="flex-1 border-none shadow-md overflow-hidden flex flex-col bg-white">
            
            {/* Cart Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-slate-800 flex items-center text-lg">
                <ShoppingCart className="mr-2 h-5 w-5 text-teal-600" />
                Pesanan Saat Ini
                {cart.length > 0 && (
                  <Badge className="ml-2 bg-teal-600 text-white text-xs">{cart.length}</Badge>
                )}
              </h2>
              <Button variant="ghost" size="sm" className="text-destructive h-8 text-xs font-semibold hover:bg-red-50" onClick={clearCart} disabled={cart.length === 0}>
                Kosongkan
              </Button>
            </div>

            {/* Cart Items (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-0">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                  <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Keranjang kosong</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cart.map((item) => (
                    <div key={item.product_id} className="p-4 flex gap-3 hover:bg-slate-50/50 transition-colors">
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-teal-50 flex items-center justify-center border border-teal-100 text-teal-600">
                        <Pill className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate">{item.product_name}</h4>
                        <p className="text-xs text-slate-500 font-medium">Rp {item.selling_price.toLocaleString('id-ID')}</p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                            <button 
                              className="h-7 w-7 rounded-md bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-teal-600 transition-colors"
                              onClick={() => updateQty(item.product_id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-slate-800">{item.qty}</span>
                            <button 
                              className="h-7 w-7 rounded-md bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-teal-600 transition-colors"
                              onClick={() => updateQty(item.product_id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-800 text-sm">Rp {item.subtotal.toLocaleString('id-ID')}</span>
                            <button className="text-slate-400 hover:text-destructive transition-colors" onClick={() => removeFromCart(item.product_id)}>
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Summary (Fixed Bottom) */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Subtotal</span>
                  <span className="font-bold text-slate-700">Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Diskon</span>
                  <span className="font-bold text-emerald-600">- Rp {totalDiscount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-200 border-dashed">
                  <span className="text-base font-bold text-slate-800">Total Pembayaran</span>
                  <span className="text-2xl font-black text-teal-700">Rp {total.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metode Pembayaran</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline" 
                    className={`h-10 shadow-sm ${paymentMethod === 'cash' ? 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100 hover:text-teal-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    <Banknote className="mr-2 h-4 w-4" /> Tunai
                  </Button>
                  <Button 
                    variant="outline" 
                    className={`h-10 shadow-sm ${paymentMethod === 'qris' ? 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100 hover:text-teal-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    onClick={() => setPaymentMethod('qris')}
                  >
                    <ScanBarcode className="mr-2 h-4 w-4" /> QRIS
                  </Button>
                  <Button 
                    variant="outline" 
                    className={`h-10 shadow-sm ${paymentMethod === 'debit' ? 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100 hover:text-teal-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    onClick={() => setPaymentMethod('debit')}
                  >
                    <CreditCard className="mr-2 h-4 w-4" /> Debit
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Uang Diterima</p>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="cursor-pointer hover:bg-slate-100" onClick={setExactAmount}>Uang Pas</Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-slate-100" onClick={() => setQuickAmount(50000)}>50K</Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-slate-100" onClick={() => setQuickAmount(100000)}>100K</Badge>
                  </div>
                </div>
                <Input 
                  type="text" 
                  value={paidAmount}
                  onChange={(e) => formatPaidInput(e.target.value)}
                  placeholder="0"
                  className="text-right text-xl font-bold h-12 bg-white border-slate-300 focus-visible:ring-teal-500 shadow-inner" 
                />
              </div>

              <div className="flex justify-between text-sm mt-3 mb-4 p-3 bg-white rounded-lg border border-emerald-100 shadow-sm">
                <span className="text-slate-500 font-bold">Kembalian</span>
                <span className={`font-black text-lg ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  Rp {change >= 0 ? change.toLocaleString('id-ID') : '0'}
                </span>
              </div>

              <Button 
                className="w-full h-12 text-base font-bold bg-teal-600 hover:bg-teal-700 shadow-md"
                onClick={handlePay}
                disabled={cart.length === 0 || processing || paidNum < total}
              >
                {processing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</>
                ) : (
                  'Bayar & Cetak Struk'
                )}
              </Button>
            </div>
            
          </Card>
        </div>
      </div>
    </div>
  )
}
