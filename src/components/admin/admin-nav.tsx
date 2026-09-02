import Link from 'next/link';

type NavItem={href:string;label:string;roles?:string[]};
type NavGroup={label:string;items:NavItem[]};
const groups:NavGroup[]=[
  {label:'Operación',items:[
    {href:'/admin',label:'Dashboard'},
    {href:'/admin/users',label:'Usuarios',roles:['super_admin','trust_safety','support','analyst','growth']},
    {href:'/admin/photos',label:'Fotos',roles:['super_admin','trust_safety']},
    {href:'/admin/verifications',label:'Verificaciones',roles:['super_admin','trust_safety']},
    {href:'/admin/reports',label:'Reportes',roles:['super_admin','trust_safety','support']},
    {href:'/admin/moderation',label:'Moderación',roles:['super_admin','trust_safety']},
    {href:'/admin/sanctions',label:'Sanciones',roles:['super_admin','trust_safety']},
    {href:'/admin/appeals',label:'Apelaciones',roles:['super_admin','trust_safety','support']},
  ]},
  {label:'Crecimiento',items:[
    {href:'/admin/recommendations',label:'Recomendación',roles:['super_admin','analyst']},
    {href:'/admin/boosts',label:'Invitaciones / Boost',roles:['super_admin','growth','analyst']},
    {href:'/admin/locations',label:'Ubicaciones',roles:['super_admin','growth','analyst','seo']},
  ]},
  {label:'Comercial',items:[
    {href:'/admin/ads',label:'Publicidad',roles:['super_admin','finance']},
    {href:'/admin/memberships',label:'Membresías',roles:['super_admin','finance','analyst']},
    {href:'/admin/payments',label:'Pagos',roles:['super_admin','finance','analyst']},
    {href:'/admin/commercialization',label:'Comercialización',roles:['super_admin','finance','analyst']},
  ]},
  {label:'Contenido',items:[
    {href:'/admin/content',label:'Contenido',roles:['super_admin','content','seo']},
    {href:'/admin/blog-media',label:'Blog media',roles:['super_admin','trust_safety']},
    {href:'/admin/story-media',label:'Stories media',roles:['super_admin','trust_safety']},
    {href:'/admin/seo',label:'SEO',roles:['super_admin','seo','analyst']},
  ]},
  {label:'Sistema',items:[
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
  return <nav className="adminNav" aria-label="Navegación del backoffice">
    {groups.map((group)=>{
      const visible=group.items.filter((item)=>!item.roles||item.roles.some((role)=>roles.includes(role)));
      if(!visible.length)return null;
      return <div className="adminNavGroup" key={group.label}>
        <span className="adminNavLabel">{group.label}</span>
        {visible.map((item)=><Link href={item.href} key={item.href}>{item.label}</Link>)}
      </div>;
    })}
  </nav>;
}
