'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useMemo,useState} from 'react';

type NavItem={href:string;label:string;roles?:string[]};
type NavGroup={id:string;label:string;icon:string;items:NavItem[]};
const groups:NavGroup[]=[
  {id:'operations',label:'Operación',icon:'◫',items:[
    {href:'/admin',label:'Dashboard'},
    {href:'/admin/users',label:'Usuarios',roles:['super_admin','trust_safety','support','analyst','growth']},
    {href:'/admin/photos',label:'Fotos',roles:['super_admin','trust_safety']},
    {href:'/admin/verifications',label:'Verificaciones',roles:['super_admin','trust_safety']},
    {href:'/admin/reports',label:'Reportes',roles:['super_admin','trust_safety','support']},
    {href:'/admin/moderation',label:'Moderación',roles:['super_admin','trust_safety']},
    {href:'/admin/sanctions',label:'Sanciones',roles:['super_admin','trust_safety']},
    {href:'/admin/appeals',label:'Apelaciones',roles:['super_admin','trust_safety','support']},
  ]},
  {id:'growth',label:'Crecimiento',icon:'↗',items:[
    {href:'/admin/recommendations',label:'Recomendación',roles:['super_admin','analyst']},
    {href:'/admin/boosts',label:'Invitaciones / Boost',roles:['super_admin','growth','analyst']},
    {href:'/admin/locations',label:'Ubicaciones',roles:['super_admin','growth','analyst','seo']},
  ]},
  {id:'commercial',label:'Comercial',icon:'◎',items:[
    {href:'/admin/ads',label:'Publicidad',roles:['super_admin','finance']},
    {href:'/admin/memberships',label:'Membresías',roles:['super_admin','finance','analyst']},
    {href:'/admin/payments',label:'Pagos',roles:['super_admin','finance','analyst']},
    {href:'/admin/commercialization',label:'Comercialización',roles:['super_admin','finance','analyst']},
  ]},
  {id:'content',label:'Contenido',icon:'✦',items:[
    {href:'/admin/content',label:'Contenido',roles:['super_admin','content','seo']},
    {href:'/admin/blog-media',label:'Blog media',roles:['super_admin','trust_safety']},
    {href:'/admin/story-media',label:'Stories media',roles:['super_admin','trust_safety']},
    {href:'/admin/seo',label:'SEO',roles:['super_admin','seo','analyst']},
  ]},
  {id:'system',label:'Sistema',icon:'⚙',items:[
    {href:'/admin/operations',label:'Operaciones',roles:['super_admin']},
    {href:'/admin/health',label:'Salud',roles:['super_admin','trust_safety','support','analyst','seo']},
    {href:'/admin/risk',label:'Riesgo',roles:['super_admin','trust_safety','analyst']},
    {href:'/admin/email',label:'Email',roles:['super_admin','support']},
    {href:'/admin/realtime',label:'Realtime',roles:['super_admin','analyst']},
    {href:'/admin/integrations',label:'Integraciones',roles:['super_admin']},
    {href:'/admin/access',label:'Accesos',roles:['super_admin']},
    {href:'/admin/audit',label:'Auditoría',roles:['super_admin','analyst']},
  ]},
];

export function AdminNav({roles}:{roles:string[]}){
  const pathname=usePathname();
  const visibleGroups=useMemo(()=>groups.map(group=>({...group,items:group.items.filter(item=>!item.roles||item.roles.some(role=>roles.includes(role)))})).filter(group=>group.items.length),[roles]);
  const currentGroup=visibleGroups.find(group=>group.items.some(item=>item.href==='/admin'?pathname==='/admin':pathname.startsWith(item.href)))?.id??visibleGroups[0]?.id??'';
  const [overrides,setOverrides]=useState<Record<string,boolean>>({});
  const expandedFor=(id:string)=>overrides[id]??(id===currentGroup);
  const toggle=(id:string)=>setOverrides(prev=>({...prev,[id]:!(prev[id]??(id===currentGroup))}));
  return <aside className="adminSidebar" aria-label="Navegación del backoffice">
    <Link href="/admin" className="adminSidebarBrand" aria-label="CitaFuego Admin">
      <span className="adminMascotLogo" aria-hidden="true"/><span><b>CitaFuego</b><small>Admin</small></span>
    </Link>
    <nav className="adminNav">
      {visibleGroups.map(group=>{const expanded=expandedFor(group.id);return <section className="adminNavGroup" key={group.id}>
        <button type="button" className={`adminNavGroupButton ${currentGroup===group.id?'current':''}`} onClick={()=>toggle(group.id)} aria-expanded={expanded} aria-controls={`admin-nav-${group.id}`}>
          <span className="adminNavGroupIcon" aria-hidden="true">{group.icon}</span><span>{group.label}</span><span className="adminNavChevron" aria-hidden="true">{expanded?'−':'+'}</span>
        </button>
        {expanded?<div id={`admin-nav-${group.id}`} className="adminNavItems">{group.items.map(item=>{const active=item.href==='/admin'?pathname==='/admin':pathname.startsWith(item.href);return <Link href={item.href} key={item.href} className={active?'active':''}>{item.label}</Link>})}</div>:null}
      </section>})}
    </nav>
  </aside>;
}
