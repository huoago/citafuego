import type { ReactNode } from 'react';
import { AdminNav } from '@/components/admin/admin-nav';
import { requireAdmin } from '@/lib/admin/auth';
export default async function AdminLayout({children}:{children:ReactNode}){const auth=await requireAdmin(['super_admin','trust_safety','support','finance','analyst']);if(!auth)return null;return <main className="adminLayout"><header><p className="eyebrow">CitaFuego · Backoffice</p><h1>Administración</h1><small>Roles activos: {auth.roles.join(', ')}</small></header><AdminNav/>{children}</main>}
