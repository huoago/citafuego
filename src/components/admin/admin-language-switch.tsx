'use client';

import {useEffect,useRef,useState} from 'react';

type Locale='es'|'zh';
const STORAGE_KEY='citafuego-admin-locale';

const exact:Record<string,string>={
  'Administración':'管理后台','CitaFuego · Backoffice de producción':'CitaFuego · 生产后台','Roles activos:':'当前角色：','Producción':'生产','Super Admin':'超级管理员',
  'Operación':'运营','Dashboard':'仪表板','Usuarios':'用户','Fotos':'照片','Verificaciones':'验证','Reportes':'报告','Moderación':'审核','Sanciones':'制裁','Apelaciones':'申诉',
  'Crecimiento':'增长','Recomendación':'推荐','Invitaciones / Boost':'邀请/推广','Ubicaciones':'地点','Comercial':'商业','Publicidad':'广告','Membresías':'会员资格','Pagos':'付款','Comercialización':'商业化',
  'Contenido':'内容','Blog media':'博客媒体','Stories media':'故事媒体','Sistema':'系统','Operaciones':'运营','Salud':'健康','Riesgo':'风险','Email':'电子邮件','Realtime':'实时','Integraciones':'集成','Accesos':'权限','Auditoría':'审计',
  'Opciones':'选项','Manual':'手动编辑','Idioma del backoffice':'后台语言','Modo de edición':'编辑方式','Español':'西班牙语','中文':'中文',
  'Guardar':'保存','Guardar plan':'保存方案','Configurar':'配置','Filtrar':'筛选','Limpiar':'清除','Aplicar':'应用','Cancelar':'取消','Finalizar':'完成','Activo':'激活','Inactivo':'未激活','Bloqueado':'已锁定',
  'Solicitar eliminación':'请求删除','Crear solicitud':'创建删除请求','Eliminar y anonimizar':'删除并匿名化','Confirmo esta acción destructiva':'我确认执行此破坏性操作',
  'Motivo obligatorio':'必填理由','Motivo final':'最终理由','Estado':'状态','Acciones':'操作','Cuenta':'账号','Actividad':'活动','Verificación':'验证','Riesgo operativo':'运营风险','Usuario':'用户','Motivo':'理由','Solicitud':'申请','Programado':'计划时间',
  'No hay solicitudes de eliminación.':'没有删除申请。','No hay usuarios con estos filtros.':'当前筛选条件下没有用户。','Nunca':'从未','Sin nombre':'无姓名','Sin email':'无邮箱','Sin teléfono':'无电话号码','Sin distrito':'无区','Todos los estados':'全部状态','Toda actividad':'全部活动',
  'Configuración operativa':'运营配置','Operaciones y ciclo de vida':'运营与生命周期','Zona de eliminación de cuentas':'账户删除区域','Plan pagado':'付费方案','Plan base gratuito':'免费基础方案','Duración (días)':'时长（天）','Región':'区域','Beneficios (uno por línea)':'权益（每行一项）','Precio PEN':'价格（PEN）',
  'Membresía manual':'手动会员资格','Asignar membresía':'授予会员资格','Buscar usuario':'搜索用户','Duración':'时长','Extender':'顺延','Reemplazar':'替换','Historial de asignaciones':'授予历史','Fecha de inicio':'开始时间','Fecha de fin':'结束时间',
  'SEO':'SEO','Mapa del sitio':'网站地图','Sitio público':'公共网址','Origen canónico':'规范起源','URLs privadas filtradas':'已过滤的私有URL','Clave IndexNow':'IndexNow 密钥','Token de Google':'Google 验证令牌','Token de Bing':'必应验证令牌','Endpoints':'终点',
};

const tokens:Array<[RegExp,string]>=[
  [/No se pudo cargar/gi,'无法加载'],[/Configuración/gi,'配置'],[/configuración/gi,'配置'],[/usuarios/gi,'用户'],[/usuario/gi,'用户'],[/membresía/gi,'会员资格'],[/membresías/gi,'会员资格'],[/eliminación/gi,'删除'],[/cuenta/gi,'账号'],[/cuentas/gi,'账号'],[/seguridad/gi,'安全'],[/producción/gi,'生产'],[/estado/gi,'状态'],[/motivo/gi,'理由'],[/días/gi,'天'],[/día/gi,'天'],[/meses/gi,'个月'],[/mes/gi,'月'],[/año/gi,'年'],[/activo/gi,'激活'],[/inactivo/gi,'未激活'],[/pendiente/gi,'待处理'],[/aprobado/gi,'已批准'],[/rechazado/gi,'已拒绝'],[/guardar/gi,'保存'],[/editar/gi,'编辑'],[/buscar/gi,'搜索'],[/filtro/gi,'筛选'],[/filtros/gi,'筛选'],[/correo/gi,'邮箱'],[/teléfono/gi,'电话'],[/nombre/gi,'姓名'],[/perfil/gi,'资料'],[/reporte/gi,'报告'],[/reportes/gi,'报告'],[/sanciones/gi,'制裁'],[/sanción/gi,'制裁'],[/contenido/gi,'内容'],[/publicidad/gi,'广告'],[/pago/gi,'付款'],[/pagos/gi,'付款'],[/beneficios/gi,'权益'],[/precio/gi,'价格'],[/duración/gi,'时长'],[/región/gi,'区域'],[/ubicación/gi,'地点'],[/riesgo/gi,'风险'],[/salud/gi,'健康'],[/auditoría/gi,'审计'],[/accesos/gi,'权限'],[/operaciones/gi,'运营'],[/crecimiento/gi,'增长'],[/comercialización/gi,'商业化'],[/recomendación/gi,'推荐'],[/integraciones/gi,'集成'],[/apelar/gi,'申诉'],[/apelación/gi,'申诉'],[/verificación/gi,'验证'],[/moderación/gi,'审核'],[/foto/gi,'照片'],[/fotos/gi,'照片'],[/historial/gi,'历史'],[/manual/gi,'手动编辑'],[/opciones/gi,'选项'],[/seleccionar/gi,'选择'],[/seleccione/gi,'请选择'],[/inicio/gi,'开始'],[/fin/gi,'结束'],[/fecha/gi,'日期']
];

function translate(value:string){
  const lead=value.match(/^\s*/)?.[0]??'';const tail=value.match(/\s*$/)?.[0]??'';const core=value.trim();if(!core)return value;
  if(exact[core])return `${lead}${exact[core]}${tail}`;
  let out=core;for(const [pattern,replacement] of tokens)out=out.replace(pattern,replacement);return `${lead}${out}${tail}`;
}

export function AdminLanguageSwitch(){
  const [locale,setLocale]=useState<Locale>('es');
  const originalText=useRef(new WeakMap<Node,string>());
  const originalAttr=useRef(new WeakMap<Element,Map<string,string>>());
  useEffect(()=>{
    const stored=window.localStorage.getItem(STORAGE_KEY);
    if(stored!=='zh'&&stored!=='es')return;
    const frame=window.requestAnimationFrame(()=>setLocale(stored));
    return()=>window.cancelAnimationFrame(frame);
  },[]);
  useEffect(()=>{
    window.localStorage.setItem(STORAGE_KEY,locale);
    const root=document.querySelector<HTMLElement>('[data-admin-i18n-root]');if(!root)return;
    root.dataset.adminLocale=locale;
    let frame=0;
    const observer=new MutationObserver(()=>{if(frame)window.cancelAnimationFrame(frame);frame=window.requestAnimationFrame(()=>{frame=0;apply();});});
    function observe(){observer.observe(root,{childList:true,subtree:true,characterData:true});}
    function apply(){
      observer.disconnect();
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node:Node|null=walker.nextNode();
      while(node){const parent=node.parentElement;if(parent&&!parent.closest('[data-no-admin-translate]')&&!['SCRIPT','STYLE','CODE','PRE'].includes(parent.tagName)){
        if(!originalText.current.has(node))originalText.current.set(node,node.nodeValue??'');const source=originalText.current.get(node)??'';const next=locale==='zh'?translate(source):source;if(node.nodeValue!==next)node.nodeValue=next;
      }node=walker.nextNode();}
      root.querySelectorAll<HTMLElement>('[placeholder],[title],[aria-label]').forEach((el)=>{if(el.closest('[data-no-admin-translate]'))return;let map=originalAttr.current.get(el);if(!map){map=new Map();originalAttr.current.set(el,map);}for(const name of ['placeholder','title','aria-label']){const current=el.getAttribute(name);if(current!==null&&!map.has(name))map.set(name,current);const source=map.get(name);if(source!==undefined){const next=locale==='zh'?translate(source):source;if(el.getAttribute(name)!==next)el.setAttribute(name,next);}}});
      observe();
    }
    apply();
    return()=>{if(frame)window.cancelAnimationFrame(frame);observer.disconnect();};
  },[locale]);
  return <div className="adminLocaleSwitch" data-no-admin-translate><span>Idioma / 语言</span><button type="button" className={locale==='es'?'active':''} onClick={()=>setLocale('es')}>Español</button><button type="button" className={locale==='zh'?'active':''} onClick={()=>setLocale('zh')}>中文</button></div>;
}
