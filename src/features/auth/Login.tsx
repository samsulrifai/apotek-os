import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/app/providers/AuthProvider"
import { Pill, Eye, EyeOff, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export default function Login() {
  const navigate = useNavigate()
  const { login, error, clearError, isLoading } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      await login({ username, password })
      navigate("/dashboard", { replace: true })
    } catch {
      // error is set in AuthProvider
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 p-6 md:p-10 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-400/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-xl border border-white/30">
            <Pill className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Apotek Web</h1>
          <p className="text-teal-100 text-sm font-medium mt-1">Sistem Manajemen Apotek</p>
        </div>

        {/* Login Card */}
        <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-slate-800 text-center">Masuk ke Akun Anda</CardTitle>
            <CardDescription className="text-center">Masukkan username dan password untuk melanjutkan</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-rose-50 text-rose-700 text-sm font-medium px-4 py-3 rounded-xl border border-rose-200 animate-in fade-in slide-in-from-top-2 duration-200">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-700 font-semibold text-sm">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-teal-500"
                  required
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-semibold text-sm">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-slate-50 border-slate-200 rounded-xl pr-11 focus-visible:ring-teal-500"
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-teal-600 hover:bg-teal-700 font-bold text-base rounded-xl shadow-md transition-all"
                disabled={isLoading || !username || !password}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Masuk"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-teal-200 text-xs mt-6 font-medium">
          &copy; 2026 Apotek Web. Semua hak dilindungi.
        </p>
      </div>
    </div>
  )
}
