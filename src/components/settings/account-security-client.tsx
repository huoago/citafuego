'use client';
import {useState} from 'react';

export function AccountSecurityClient({username,initialRecoveryEmail}:{username:string;initialRecoveryEmail:string}){
  const[passwordMessage,setPasswordMessage]=useState('');
  const[emailMessage,setEmailMessage]=useState('');
  const[busy,setBusy]=useState(false);

  async function changePassword(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setPasswordMessage('');
    const form=new FormData(event.currentTarget);const currentPassword=String(form.get('currentPassword')??'');const newPassword=String(form.get('newPassword')??'');const confirm=String(form.get('confirmPassword')??'');
    if(newPassword!==confirm){setBusy(false);setPasswordMessage('Las contraseñas nuevas no coinciden.');return;}
    const r=await fetch('/api/auth/account/password',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({currentPassword,newPassword})}).catch(()=>null);const data=await r?.json().catch(()=>({}))??{};setBusy(false);
    if(!r?.ok){
      const code=String(data.error??'');
      if(code==='current_password_incorrect')setPasswordMessage('La contraseña actual no es correcta.');
      else if(code==='compromised_password')setPasswordMessage('Esa contraseña apareció en filtraciones conocidas. Elige una contraseña distinta y única.');
      else if(code==='password_security_unavailable')setPasswordMessage('La comprobación de seguridad no está disponible ahora. Inténtalo de nuevo.');
      else setPasswordMessage('No pudimos cambiar la contraseña. Revisa los datos e inténtalo de nuevo.');
      return;
    }
    event.currentTarget.reset();setPasswordMessage('Contraseña actualizada correctamente.');
  }

  async function saveRecoveryEmail(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setEmailMessage('');const form=new FormData(event.currentTarget);const email=String(form.get('email')??'').trim();
    const r=await fetch('/api/auth/account/recovery-email',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email})}).catch(()=>null);setBusy(false);
    if(!r?.ok){setEmailMessage('No pudimos guardar el correo de recuperación.');return;}
    setEmailMessage('Correo de recuperación guardado. Úsalo si alguna vez olvidas tu contraseña.');
  }

  return <div className="settingsHubGrid">
    <section className="settingsSection"><header><div><h2>Acceso</h2><p>Tu nombre de cuenta no cambia. La contraseña sí puede actualizarse cuando quieras.</p></div></header>
      <div className="softPanel"><strong>Nombre de cuenta</strong><p><code>{username}</code></p></div>
      <form className="formStack" onSubmit={changePassword}>
        <label>Contraseña actual<input name="currentPassword" type="password" autoComplete="current-password" maxLength={72} required/></label>
        <label>Nueva contraseña<input name="newPassword" type="password" autoComplete="new-password" minLength={10} maxLength={72} required/><small className="fieldHelp">10–72 caracteres. No se aceptan contraseñas conocidas por filtraciones públicas; para cuentas administrativas recomendamos una contraseña única de 20+ caracteres.</small></label>
        <label>Repite la nueva contraseña<input name="confirmPassword" type="password" autoComplete="new-password" minLength={10} maxLength={72} required/></label>
        <button className="ctaButton" disabled={busy}>Cambiar contraseña</button>{passwordMessage?<p className="muted" role="status">{passwordMessage}</p>:null}
      </form>
    </section>
    <section className="settingsSection"><header><div><h2>Recuperación</h2><p>Vincula un correo real para poder restablecer la contraseña desde la pantalla de inicio de sesión.</p></div></header>
      <form className="formStack" onSubmit={saveRecoveryEmail}>
        <label>Correo de recuperación<input name="email" type="email" autoComplete="email" defaultValue={initialRecoveryEmail} placeholder="tu-correo@ejemplo.com" maxLength={254} required/></label>
        <button className="ctaButton" disabled={busy}>Guardar correo de recuperación</button>{emailMessage?<p className="muted" role="status">{emailMessage}</p>:null}
      </form>
      <p className="muted">CitaFuego nunca muestra este correo en tu perfil público.</p>
    </section>
  </div>;
}
