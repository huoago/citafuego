import Link from 'next/link';
import { PublicFeatureNav } from '@/components/public/PublicFeatureNav';

const steps=[
  {number:'01',title:'Crea tu perfil',text:'Añade lo que quieras compartir. La información complementaria puede completarse más adelante y tú decides cuánto contexto mostrar.'},
  {number:'02',title:'Descubre con contexto',text:'Revisa intención, intereses, distancia aproximada y señales de confianza antes de decidir Like o Pass.'},
  {number:'03',title:'Haz Match',text:'La conversación se abre cuando existe interés mutuo. Tus Matches quedan organizados en una pantalla propia.'},
  {number:'04',title:'Conversa con control',text:'Chat, bloqueo, reporte, privacidad y verificación permanecen accesibles durante toda la experiencia.'},
] as const;

export default function ComoFuncionaPage() {
  return (
    <div className="v15InfoShell v15HowShell">
      <PublicFeatureNav />
      <main className="v15InfoMain">
        <section className="v15InfoHero">
          <Link href="/" className="v15BackHome">← Volver al inicio</Link>
          <p className="v15Eyebrow">Cómo funciona</p>
          <h1>Descubrir, conectar y conversar sin complicarlo.</h1>
          <p className="v15InfoLead">CitaFuego organiza cada decisión en una etapa clara. Menos ruido visual, más contexto y controles de privacidad visibles cuando los necesitas.</p>
          <div className="v15InfoActions">
            <Link className="v15PrimaryAction" href="/registro">🔥 Crear mi perfil</Link>
            <Link className="v15SecondaryAction" href="/iniciar-sesion">Ya tengo cuenta</Link>
          </div>
        </section>

        <section className="v15StepGrid" aria-label="Pasos principales de CitaFuego">
          {steps.map(step=><article className="v15StepCard" key={step.number}>
            <span>{step.number}</span>
            <h2>{step.title}</h2>
            <p>{step.text}</p>
          </article>)}
        </section>

        <section className="v15InfoNote">
          <div><b>Privacidad desde el principio</b><p>La ubicación exacta no se publica. Los controles de seguridad, reporte y bloqueo forman parte del flujo, no de una pantalla escondida.</p></div>
          <Link href="/safety">Ver Seguridad →</Link>
        </section>
      </main>
    </div>
  );
}
