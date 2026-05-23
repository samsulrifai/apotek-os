import { useState, useEffect } from "react"
import { Settings, Save, Receipt, AlertCircle, Info, Calculator, CheckCircle2, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import type { AppSettings } from "@/types"
import { useToast } from "@/hooks/use-toast"

export default function GeneralSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    ppn_rate: '11', default_margin: '15',
    pharmacy_name: '', pharmacy_address: '', pharmacy_phone: '', pharmacy_email: '',
    pharmacy_license: '', pharmacist_name: '', pharmacist_license: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    api.get<AppSettings>('/settings')
      .then(data => setSettings(prev => ({ ...prev, ...data })))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/settings', settings)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
    } catch {
      toast({ title: "Gagal Menyimpan", description: "Terjadi kesalahan saat menyimpan pengaturan. Silakan coba lagi.", variant: "destructive" })
    }
    finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Memuat pengaturan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
          <Settings className="mr-3 h-8 w-8 text-teal-600" />
          Pengaturan Apotek
        </h1>
        <p className="text-muted-foreground mt-1 text-sm font-medium">
          Konfigurasi margin profit global, pengaturan pajak (PPN), dan profil apotek.
        </p>
      </div>

      <div className="grid gap-6">
        {/* PROFIL APOTEK */}
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center mr-3">
                <Settings className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-800">Profil Apotek</CardTitle>
                <CardDescription>Informasi dasar apotek untuk struk dan dokumen.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 font-semibold text-sm">Nama Apotek</Label>
                <Input value={settings.pharmacy_name} onChange={e => setSettings({...settings, pharmacy_name: e.target.value})} placeholder="Nama apotek" className="mt-1.5" />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold text-sm">Telepon</Label>
                <Input value={settings.pharmacy_phone} onChange={e => setSettings({...settings, pharmacy_phone: e.target.value})} placeholder="021-xxx" className="mt-1.5" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-slate-700 font-semibold text-sm">Alamat</Label>
                <Input value={settings.pharmacy_address} onChange={e => setSettings({...settings, pharmacy_address: e.target.value})} placeholder="Alamat lengkap" className="mt-1.5" />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold text-sm">Email</Label>
                <Input value={settings.pharmacy_email || ''} onChange={e => setSettings({...settings, pharmacy_email: e.target.value})} placeholder="email@apotek.com" className="mt-1.5" />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold text-sm">No. Izin Apotek (SIA)</Label>
                <Input value={settings.pharmacy_license || ''} onChange={e => setSettings({...settings, pharmacy_license: e.target.value})} placeholder="No. SIA" className="mt-1.5" />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold text-sm">Nama Apoteker</Label>
                <Input value={settings.pharmacist_name || ''} onChange={e => setSettings({...settings, pharmacist_name: e.target.value})} placeholder="Nama apoteker penanggung jawab" className="mt-1.5" />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold text-sm">No. SIPA</Label>
                <Input value={settings.pharmacist_license || ''} onChange={e => setSettings({...settings, pharmacist_license: e.target.value})} placeholder="No. SIPA" className="mt-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PENGATURAN MARGIN GLOBAL */}
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                <Calculator className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-800">Margin Keuntungan Global</CardTitle>
                <CardDescription>Pilih standar persentase keuntungan (margin) default untuk penetapan harga jual obat.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                Pengaturan ini akan menjadi <strong>Nilai Default</strong> saat Anda menambahkan Master Produk baru. Anda tetap dapat mengatur margin "Custom" secara individual untuk obat-obat tertentu (seperti obat resep khusus).
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["10", "15", "20"].map(val => (
                <div 
                  key={val}
                  onClick={() => setSettings({...settings, default_margin: val})}
                  className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${settings.default_margin === val ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={`font-bold ${settings.default_margin === val ? 'text-teal-700' : 'text-slate-600'}`}>Margin {val}%</span>
                    {settings.default_margin === val && <CheckCircle2 className="h-5 w-5 text-teal-600" />}
                  </div>
                  <p className="text-xs text-slate-500">
                    {val === "10" && "Harga Jual = HPP + 10%. Cocok untuk apotek yang mengejar volume penjualan cepat."}
                    {val === "15" && "Standar rata-rata apotek umum di Indonesia. (Rekomendasi)"}
                    {val === "20" && "Harga Jual = HPP + 20%. Cocok untuk klinik atau obat dengan tingkat retur tinggi."}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* PENGATURAN PAJAK PPN */}
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center mr-3">
                <Receipt className="h-4 w-4 text-rose-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-800">Pengaturan Pajak (PPN)</CardTitle>
                <CardDescription>Pilih tarif Pajak Pertambahan Nilai (PPN) sesuai aturan pemerintah terbaru.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                Pemerintah Indonesia merencanakan kenaikan tarif PPN menjadi <strong>12% pada 1 Januari 2025</strong> sesuai UU HPP. Pastikan Anda memperbarui tarif ini ketika aturan tersebut sudah resmi efektif.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[{ val: "11", label: "PPN 11% (Tarif Saat Ini)", desc: "Sesuai aturan UU HPP yang berlaku efektif sejak 1 April 2022." }, { val: "12", label: "PPN 12% (Tarif 2025)", desc: "Disiapkan untuk aturan baru yang berlaku pada 1 Januari 2025." }].map(({ val, label, desc }) => (
                <div 
                  key={val}
                  onClick={() => setSettings({...settings, ppn_rate: val})}
                  className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${settings.ppn_rate === val ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${settings.ppn_rate === val ? 'border-teal-600' : 'border-slate-300'}`}>
                      {settings.ppn_rate === val && <div className="h-2.5 w-2.5 rounded-full bg-teal-600" />}
                    </div>
                    <div>
                      <h4 className={`font-bold ${settings.ppn_rate === val ? 'text-teal-800' : 'text-slate-700'}`}>{label}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className={`shadow-sm transition-all ${isSaved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-teal-600 hover:bg-teal-700'}`}
            >
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
              ) : isSaved ? (
                <><CheckCircle2 className="mr-2 h-4 w-4" /> Tersimpan</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Simpan Pengaturan</>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
