import { useState } from "react"
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!currentPassword) errs.current = "Password saat ini wajib diisi"
    if (!newPassword) errs.new = "Password baru wajib diisi"
    else if (newPassword.length < 6) errs.new = "Password baru minimal 6 karakter"
    if (!confirmPassword) errs.confirm = "Konfirmasi password wajib diisi"
    else if (newPassword !== confirmPassword) errs.confirm = "Password tidak cocok"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await api.put('/users/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      toast({ title: "Password berhasil diubah", description: "Silakan gunakan password baru Anda." })
      resetForm()
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: "Gagal mengubah password",
        description: err?.message || "Terjadi kesalahan. Periksa password saat ini.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setErrors({})
    setShowCurrent(false)
    setShowNew(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetForm()
        onOpenChange(val)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-teal-600" />
            Ubah Password
          </DialogTitle>
          <DialogDescription>
            Masukkan password lama dan password baru Anda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="current-password">Password Saat Ini</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setErrors(prev => ({ ...prev, current: "" })) }}
                placeholder="Masukkan password saat ini"
                className={errors.current ? "border-rose-500" : ""}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.current && <p className="text-xs text-rose-500">{errors.current}</p>}
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-password">Password Baru</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setErrors(prev => ({ ...prev, new: "" })) }}
                placeholder="Masukkan password baru (min. 6 karakter)"
                className={errors.new ? "border-rose-500" : ""}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.new && <p className="text-xs text-rose-500">{errors.new}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Konfirmasi Password Baru</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setErrors(prev => ({ ...prev, confirm: "" })) }}
              placeholder="Ulangi password baru"
              className={errors.confirm ? "border-rose-500" : ""}
            />
            {errors.confirm && <p className="text-xs text-rose-500">{errors.confirm}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
