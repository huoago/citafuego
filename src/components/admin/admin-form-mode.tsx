'use client';

import {useEffect,useState} from 'react';

type Mode='options'|'manual';
const STORAGE_KEY='citafuego-admin-edit-mode';

export function AdminFormMode(){
  const [mode,setMode]=useState<Mode>('options');
  useEffect(()=>{
    const stored=window.localStorage.getItem(STORAGE_KEY);
    if(stored!=='manual'&&stored!=='options')return;
    const frame=window.requestAnimationFrame(()=>setMode(stored));
    return()=>window.cancelAnimationFrame(frame);
  },[]);
  useEffect(()=>{
    window.localStorage.setItem(STORAGE_KEY,mode);
    const root=document.querySelector<HTMLElement>('[data-admin-i18n-root]');if(!root)return;
    root.dataset.adminEditMode=mode;
    const sync=()=>{
      root.querySelectorAll<HTMLSelectElement>('form select:not([multiple]):not([data-no-manual])').forEach((select)=>{
        const marker=select.dataset.adminManualBound;
        if(mode==='manual'){
          if(select.disabled||marker==='1')return;
          const input=document.createElement('input');input.type='text';input.value=select.value;input.name=select.name;input.className='adminGeneratedManual';input.dataset.generatedFor=select.name;input.setAttribute('aria-label',select.getAttribute('aria-label')||select.name||'Valor manual');
          select.dataset.adminOriginalDisabled=select.disabled?'1':'0';select.dataset.adminManualBound='1';select.disabled=true;select.insertAdjacentElement('afterend',input);
        }else if(marker==='1'){
          const sibling=select.nextElementSibling as HTMLInputElement|null;if(sibling?.classList.contains('adminGeneratedManual'))sibling.remove();select.disabled=select.dataset.adminOriginalDisabled==='1';delete select.dataset.adminManualBound;delete select.dataset.adminOriginalDisabled;
        }
      });
    };
    sync();const observer=new MutationObserver(()=>requestAnimationFrame(sync));observer.observe(root,{childList:true,subtree:true});return()=>observer.disconnect();
  },[mode]);
  return <div className="adminEditMode" data-no-admin-translate><span>Modo / 方式</span><button type="button" className={mode==='options'?'active':''} onClick={()=>setMode('options')}>Opciones / 选项</button><button type="button" className={mode==='manual'?'active':''} onClick={()=>setMode('manual')}>Manual / 手动</button></div>;
}
