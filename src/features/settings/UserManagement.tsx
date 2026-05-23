import { useState, useEffect, useCallback } from "react"
import { Users, Plus, Search, Edit, Shield, ShieldCheck, ShieldAlert, Loader2, Save, ToggleLeft, ToggleRight } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import type { User } from "@/types"
import { useTablePagination } from "@/hooks/useTablePagination"
import { DataTablePagination } from "@/components/ui/DataTablePagination"
import { DataTableColumnHeader } from "@/components/ui/DataTableColumnHeader"

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    username: '', full_name: '', role: 'cashier' as string,
    password: '', is_active: true,
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<User[]>('/users')
      setUsers(Array.isArray(res) ? res : (res as any).data ?? [])
    } catch { /* silently */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const openAdd = () => {
    setEditingItem(null)
    setForm({ username: '', full_name: '', role: 'cashier', password: '', is_active: true })
    setDialogOpen(true)
  }

  const openEdit = (user: User) => {
    setEditingItem(user)
    setForm({
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      password: '',
      is_active: user.is_active,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingItem) {
        const payload: any = { full_name: form.full_name, role: form.role, is_active: form.is_active }
        if (form.password) payload.password = form.password
        await api.put(`/users/${editingItem.id}`, payload)
      } else {
        await api.post('/users', form)
      }
      setDialogOpen(false)
      loadData()
    } catch { /* handle */ }
    finally { setSaving(false) }
  }

  const getRoleBadge = (role: string) => {
    switch(role) {
      case "admin": return <Badge className="bg-purple-50 text-purple-700 border-purple-200 shadow-none hover:bg-purple-100"><ShieldCheck className="mr-1 h-3 w-3" /> Admin</Badge>
      case "pharmacist": return <Badge className="bg-teal-50 text-teal-700 border-teal-200 shadow-none hover:bg-teal-100"><Shield className="mr-1 h-3 w-3" /> Apoteker</Badge>
      case "cashier": return <Badge className="bg-blue-50 text-blue-700 border-blue-200 shadow-none hover:bg-blue-100"><Users className="mr-1 h-3 w-3" /> Kasir</Badge>
      case "owner": return <Badge className="bg-amber-50 text-amber-700 border-amber-200 shadow-none hover:bg-amber-100"><ShieldAlert className="mr-1 h-3 w-3" /> Pemilik</Badge>
      default: return <Badge variant="outline">{role}</Badge>
    }
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = { admin: 'Admin', pharmacist: 'Apoteker', cashier: 'Kasir', owner: 'Pemilik' }
    return labels[role] || role
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
  } = useTablePagination(users)

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Memuat data pengguna...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <Users className="mr-3 h-8 w-8 text-teal-600" />
            Manajemen Pengguna
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Kelola akses pengguna sistem apotek</p>
        </div>
        <Button className="shadow-sm bg-teal-600 hover:bg-teal-700" onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Pengguna
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {['admin', 'pharmacist', 'cashier', 'owner'].map(role => (
          <Card key={role} className="shadow-sm border-none bg-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">{getRoleLabel(role)}</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{users.filter(u => u.role === role).length}</h3>
              </div>
              {getRoleBadge(role)}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm overflow-hidden border-none bg-white">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input type="search" placeholder="Cari pengguna..." className="pl-9 bg-white border-slate-200" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <DataTableColumnHeader title="Pengguna" filterValue={getFilter('full_name')} onFilterChange={v => setFilter('full_name', v)} />
                <DataTableColumnHeader title="Username" filterValue={getFilter('username')} onFilterChange={v => setFilter('username', v)} />
                <DataTableColumnHeader title="Role" hideFilter align="center" />
                <DataTableColumnHeader title="Status" hideFilter align="center" />
                <DataTableColumnHeader title="Login Terakhir" hideFilter />
                <DataTableColumnHeader title="Aksi" hideFilter align="right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    {globalSearch || Object.values(columnFilters).some(Boolean) ? 'Tidak ada hasil pencarian' : 'Belum ada pengguna'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50 transition-colors group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-800">{user.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 font-mono text-sm">{user.username}</TableCell>
                    <TableCell className="text-center">{getRoleBadge(user.role)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={user.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}>
                        {user.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Belum pernah'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-teal-600 hover:bg-teal-50" onClick={() => openEdit(user)}>
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-800 flex items-center">
              <Users className="mr-2 h-5 w-5 text-teal-600" />
              {editingItem ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-slate-700 font-semibold text-sm">Nama Lengkap *</Label>
              <Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="Nama lengkap" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold text-sm">Username *</Label>
              <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="Username" className="mt-1.5" disabled={!!editingItem} />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold text-sm">{editingItem ? 'Password Baru (opsional)' : 'Password *'}</Label>
              <Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder={editingItem ? 'Kosongkan jika tidak ganti' : 'Minimal 6 karakter'} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold text-sm">Role *</Label>
              <Select value={form.role} onValueChange={v => setForm({...form, role: v})}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="pharmacist">Apoteker</SelectItem>
                  <SelectItem value="cashier">Kasir</SelectItem>
                  <SelectItem value="owner">Pemilik</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingItem && (
              <div>
                <Button 
                  type="button" variant="outline" 
                  className={`w-full ${form.is_active ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50'}`}
                  onClick={() => setForm({...form, is_active: !form.is_active})}
                >
                  {form.is_active ? <ToggleRight className="mr-2 h-4 w-4" /> : <ToggleLeft className="mr-2 h-4 w-4" />}
                  {form.is_active ? 'Aktif' : 'Nonaktif'}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.full_name || !form.username || (!editingItem && !form.password)} className="bg-teal-600 hover:bg-teal-700">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {editingItem ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
