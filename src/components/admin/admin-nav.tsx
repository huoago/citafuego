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

function activePath(pathname:string,href:string){return href==='/admin'?pathname==='/admin':pathname.startsWith(href)}

export function AdminNav({roles}:{roles:string[]}){
  const pathname=usePathname();
  const visibleGroups=useMemo(()=>groups.map(group=>({...group,items:group.items.filter(item=>!item.roles||item.roles.some(role=>roles.includes(role)))})).filter(group=>group.items.length),[roles]);
  const currentGroup=visibleGroups.find(group=>group.items.some(item=>activePath(pathname,item.href)))?.id??visibleGroups[0]?.id??'';
  const currentItem=visibleGroups.flatMap(group=>group.items).find(item=>activePath(pathname,item.href));
  const itemCount=visibleGroups.reduce((sum,group)=>sum+group.items.length,0);
  const [overrides,setOverrides]=useState<Record<string,boolean>>({});
  const expandedFor=(id:string)=>overrides[id]??(id===currentGroup);
  const toggle=(id:string)=>setOverrides(prev=>({...prev,[id]:!(prev[id]??(id===currentGroup))}));

  return <>
    <details className="adminMobileNav" data-admin-mobile-nav>
      <summary><span className="adminMobileNavIcon" aria-hidden="true">☰</span><span><b>Menú administrativo</b><small>{currentItem?.label??'Dashboard'} · {itemCount} funciones</small></span><span className="adminMobileNavChevron" aria-hidden="true">⌄</span></summary>
      <div className="adminMobileNavPanel">
        {visibleGroups.map(group=><section key={group.id} className="adminMobileNavGroup"><h2><span aria-hidden="true">{group.icon}</span>{group.label}</h2><div>{group.items.map(item=><Link href={item.href} key={item.href} className={activePath(pathname,item.href)?'active':''}>{item.label}</Link>)}</div></section>)}
      </div>
    </details>
    <aside className="adminSidebar adminSidebarDesktop" aria-label="Navegación del backoffice">
      <Link href="/admin" className="adminSidebarBrand" aria-label="CitaFuego Admin">
        <span className="adminMascotLogo" aria-hidden="true"/><span><b>CitaFuego</b><small>Admin</small></span>
      </Link>
      <nav className="adminNav">
        {visibleGroups.map(group=>{const expanded=expandedFor(group.id);return <section className="adminNavGroup" key={group.id}>
          <button type="button" className={`adminNavGroupButton ${currentGroup===group.id?'current':''}`} onClick={()=>toggle(group.id)} aria-expanded={expanded} aria-controls={`admin-nav-${group.id}`}>
            <span className="adminNavGroupIcon" aria-hidden="true">{group.icon}</span><span>{group.label}</span><span className="adminNavChevron" aria-hidden="true">{expanded?'−':'+'}</span>
          </button>
          {expanded?<div id={`admin-nav-${group.id}`} className="adminNavItems">{group.items.map(item=><Link href={item.href} key={item.href} className={activePath(pathname,item.href)?'active':''}>{item.label}</Link>)}</div>:null}
        </section>})}
      </nav>
    </aside>
  </>;
}
