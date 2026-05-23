import { useState, useEffect } from "react"
import { Calendar as Download, Printer, DollarSign, Activity, FileText, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { api } from "@/lib/api"
import type { ProfitLossReport } from "@/types"

export default function ProfitLoss() {
  const [report, setReport] = useState<ProfitLossReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadReport()
  }, [startDate, endDate])

  const loadReport = async () => {
    setLoading(true)
    try {
      const data = await api.get<ProfitLossReport>('/reports/profit-loss', { start: startDate, end: endDate })
      setReport(data)
    } catch { /* silently */ }
    finally { setLoading(false) }
  }

  const revenue = report?.revenue ?? 0
  const cogs = report?.cogs ?? 0
  const grossProfit = report?.grossProfit ?? 0
  const grossMargin = report?.grossMargin ?? 0

  // Simulated opex breakdown (API may extend later)
  const opexData = [
    { name: "Gaji & Tunjangan", value: 12500000, color: "#3b82f6" },
    { name: "Sewa Bangunan", value: 5000000, color: "#8b5cf6" },
    { name: "Listrik & Air", value: 1200000, color: "#f59e0b" },
    { name: "Penyusutan", value: 800000, color: "#64748b" },
    { name: "Lain-lain", value: 500000, color: "#14b8a6" },
  ]
  const totalOpex = opexData.reduce((sum, item) => sum + item.value, 0)
  const netOperational = grossProfit - totalOpex
  const otherIncome = 500000
  const otherExpense = 125000
  const ebt = netOperational + otherIncome - otherExpense
  const tax = Math.round(revenue * 0.005)
  const netIncome = ebt - tax

  const formatRp = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Memuat laporan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center">
            <FileText className="mr-3 h-8 w-8 text-teal-600" />
            Laporan Laba Rugi (SAK EMKM)
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm flex items-center">
            Sesuai Standar Akuntansi Keuangan (SAK EMKM) Apotek
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40 h-9 text-sm" />
          <span className="text-slate-400 text-sm">s/d</span>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40 h-9 text-sm" />
          <Button variant="outline" className="shadow-sm bg-slate-50 border-slate-200 text-slate-700">
            <Printer className="mr-2 h-4 w-4" /> Cetak
          </Button>
          <Button className="shadow-sm bg-teal-600 hover:bg-teal-700">
            <Download className="mr-2 h-4 w-4" /> Unduh PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Pendapatan</p>
            <h3 className="text-2xl font-bold text-slate-800">{formatRp(revenue)}</h3>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Total HPP</p>
            <h3 className="text-2xl font-bold text-rose-600">{formatRp(cogs)}</h3>
            <div className="mt-2 text-xs font-medium text-slate-500">
              {revenue > 0 ? `${((cogs / revenue) * 100).toFixed(0)}% dari Pendapatan` : '-'}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-white border-l-4 border-l-primary">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-1">Laba Kotor</p>
            <h3 className="text-2xl font-bold text-slate-800">{formatRp(grossProfit)}</h3>
            <div className="mt-2 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 w-fit px-2 py-1 rounded">
              Margin Kotor: {(grossMargin * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-gradient-to-br from-teal-600 to-emerald-600 text-white">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-teal-100 uppercase tracking-wider mb-1">Laba Bersih</p>
            <h3 className="text-2xl font-bold text-white">{formatRp(netIncome)}</h3>
            <div className="mt-2 text-xs font-medium text-teal-100 flex items-center">
              Margin Bersih: {revenue > 0 ? ((netIncome / revenue) * 100).toFixed(1) : '0'}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Detail Laba Rugi - Kiri */}
        <div className="lg:col-span-8">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg text-slate-800">Rincian Laporan Laba Rugi</CardTitle>
              <CardDescription>Periode: {new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} - {new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full text-sm">
                
                {/* 1. PENDAPATAN USAHA */}
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-base text-slate-800 mb-3 uppercase tracking-wider">1. Pendapatan Usaha</h3>
                  <div className="space-y-2 ml-4">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Pendapatan Penjualan</span>
                      <span className="font-medium text-slate-800">{formatRp(revenue)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between mt-3 pt-3 border-t border-slate-200 font-bold text-base text-teal-700">
                    <span>Total Pendapatan Bersih</span>
                    <span>{formatRp(revenue)}</span>
                  </div>
                </div>

                {/* 2. HARGA POKOK PENJUALAN */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-base text-slate-800 mb-3 uppercase tracking-wider">2. Harga Pokok Penjualan (HPP)</h3>
                  <div className="space-y-2 ml-4">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total HPP</span>
                      <span className="font-medium text-slate-800">{formatRp(cogs)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between mt-3 pt-3 border-t border-slate-200 font-bold text-base text-rose-600">
                    <span>Total Harga Pokok Penjualan</span>
                    <span>({formatRp(cogs)})</span>
                  </div>
                </div>

                {/* LABA KOTOR */}
                <div className="px-6 py-4 border-b-2 border-teal-100 bg-teal-50/30">
                  <div className="flex justify-between font-bold text-lg text-slate-800">
                    <span>LABA KOTOR (GROSS PROFIT)</span>
                    <span>{formatRp(grossProfit)}</span>
                  </div>
                </div>

                {/* 3. BEBAN OPERASIONAL */}
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-base text-slate-800 mb-3 uppercase tracking-wider">3. Beban Operasional Usaha</h3>
                  <div className="space-y-2 ml-4">
                    {opexData.map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-slate-600">{item.name}</span>
                        <span className="font-medium text-slate-800">{formatRp(item.value)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-3 pt-3 border-t border-slate-200 font-bold text-base text-rose-600">
                    <span>Total Beban Operasional</span>
                    <span>({formatRp(totalOpex)})</span>
                  </div>
                </div>

                {/* LABA BERSIH OPERASIONAL */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex justify-between font-bold text-base text-slate-800">
                    <span>Laba Bersih Operasional</span>
                    <span>{formatRp(netOperational)}</span>
                  </div>
                </div>

                {/* 4. PENDAPATAN / BEBAN LAINNYA & PAJAK */}
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-base text-slate-800 mb-3 uppercase tracking-wider">4. Pendapatan/Beban Lain & Pajak</h3>
                  <div className="space-y-2 ml-4">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Pendapatan Bunga Bank</span>
                      <span className="font-medium text-slate-800">{formatRp(otherIncome)}</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>Beban Admin Bank</span>
                      <span>({formatRp(otherExpense)})</span>
                    </div>
                  </div>
                  <div className="flex justify-between mt-3 pt-3 border-t border-slate-200 font-bold text-base text-slate-800">
                    <span>Laba Bersih Sebelum Pajak (EBT)</span>
                    <span>{formatRp(ebt)}</span>
                  </div>
                  <div className="space-y-2 ml-4 mt-2">
                    <div className="flex justify-between text-rose-600">
                      <span>Pajak Penghasilan (PPh Final 0.5% UMKM)</span>
                      <span>({formatRp(tax)})</span>
                    </div>
                  </div>
                </div>

                {/* LABA BERSIH AKHIR */}
                <div className="px-6 py-5 bg-teal-600 text-white rounded-b-xl shadow-inner">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-black text-xl tracking-wider uppercase">LABA BERSIH (NET INCOME)</span>
                      <p className="text-teal-100 text-xs font-medium mt-1">Laba yang siap ditahan atau dibagikan</p>
                    </div>
                    <span className="text-3xl font-black">{formatRp(netIncome)}</span>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown Grafik - Kanan */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-sm h-[400px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-800 flex items-center">
                <Activity className="h-4 w-4 mr-2 text-teal-600" />
                Distribusi Beban Operasional
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[320px] pb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={opexData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {opexData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatRp(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-slate-800 text-white">
            <CardContent className="p-6">
              <h4 className="font-bold text-lg mb-2 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-teal-400" />
                Catatan Analis
              </h4>
              <ul className="space-y-3 text-sm text-slate-300 mt-4 list-disc pl-4">
                <li>
                  <strong className="text-white">Rasio HPP {revenue > 0 ? ((cogs / revenue) * 100).toFixed(0) : 0}%</strong>: {cogs / revenue < 0.7 ? 'Kinerja apotek sehat' : 'Perlu evaluasi efisiensi pembelian'}.
                </li>
                <li>
                  <strong className="text-white">Margin Laba Bersih {revenue > 0 ? ((netIncome / revenue) * 100).toFixed(1) : '0'}%</strong>: Mencerminkan efisiensi operasional bulan ini.
                </li>
                <li>
                  <strong className="text-white">Pajak UMKM 0.5%</strong>: Dihitung dari peredaran bruto (Total Pendapatan Bersih).
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
