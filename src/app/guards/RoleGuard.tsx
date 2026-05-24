import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider'

interface RoleGuardProps {
  allowedRoles: string[]
  children?: React.ReactNode
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  
  const userRoles = user.roles?.map(r => typeof r === 'string' ? r : r.name) || []
  const hasAccess = userRoles.some(r => allowedRoles.includes(r)) || userRoles.includes('admin')
  
  if (!hasAccess) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto">
            <svg className="h-8 w-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Akses Ditolak</h2>
          <p className="text-sm text-slate-500">Anda tidak memiliki akses untuk halaman ini.</p>
        </div>
      </div>
    )
  }
  
  return children ? <>{children}</> : <Outlet />
}
