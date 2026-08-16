export type MediaPolicyTier='remove'|'limited';
export type MediaPolicyRule={key:string;label:string;tier:MediaPolicyTier;summary:string};

// CitaFuego taxonomy adapted from TikTok's publicly documented Community Guidelines
// and recommendation-safety concepts. It does not reproduce proprietary classifiers or thresholds.
export const MEDIA_POLICY_VERSION='cf-media-2026-08-tiktok-public-adapted-v1';

export const MEDIA_POLICY_RULES:MediaPolicyRule[]=[
 {key:'youth_safety',label:'Seguridad de menores',tier:'remove',summary:'Contenido que ponga en riesgo o explote a menores.'},
 {key:'explicit_nudity',label:'Desnudez explícita',tier:'remove',summary:'Desnudez explícita o actividad sexual explícita.'},
 {key:'sexual_services',label:'Servicios sexuales',tier:'remove',summary:'Oferta, solicitud o facilitación de servicios sexuales.'},
 {key:'nonconsensual_intimate',label:'Contenido íntimo no consentido',tier:'remove',summary:'Contenido íntimo compartido sin consentimiento o usado para coaccionar.'},
 {key:'graphic_violence',label:'Violencia gráfica',tier:'remove',summary:'Violencia extrema, gore o amenazas creíbles.'},
 {key:'self_harm',label:'Autolesión',tier:'remove',summary:'Promoción o instrucciones de autolesión.'},
 {key:'hate_extremism',label:'Odio / extremismo',tier:'remove',summary:'Propaganda o símbolos que promuevan odio o extremismo.'},
 {key:'dangerous_acts_weapons',label:'Actos peligrosos / armas',tier:'remove',summary:'Promoción de actos peligrosos o armas para causar daño.'},
 {key:'regulated_goods',label:'Bienes regulados',tier:'remove',summary:'Promoción o comercio de bienes o servicios de alto riesgo.'},
 {key:'scams_deception',label:'Fraude / engaño',tier:'remove',summary:'Estafas, phishing o esquemas engañosos.'},
 {key:'privacy_doxxing',label:'Privacidad / doxxing',tier:'remove',summary:'Datos personales sensibles que puedan facilitar daño.'},
 {key:'impersonation_deceptive_ai',label:'Suplantación / IA engañosa',tier:'remove',summary:'Suplantación o contenido sintético engañoso usado para perjudicar.'},
 {key:'adult_semi_nudity',label:'Semidesnudez adulta',tier:'limited',summary:'Puede ser visible en contexto adulto, pero queda fuera de Para ti.'},
 {key:'sexual_suggestive',label:'Contenido sugerente',tier:'limited',summary:'Contenido sexualmente sugerente sin llegar a una infracción de eliminación.'},
 {key:'graphic_sensitive',label:'Contenido gráfico sensible',tier:'limited',summary:'Contenido visualmente fuerte que no conviene amplificar.'},
 {key:'distressing_theme',label:'Tema sensible',tier:'limited',summary:'Contenido emocionalmente intenso que no conviene recomendar repetidamente.'},
 {key:'extreme_body_content',label:'Cuerpo / fitness extremo',tier:'limited',summary:'Contenido corporal extremo que no conviene recomendar repetidamente.'},
 {key:'spam_fake_engagement',label:'Spam / engagement artificial',tier:'limited',summary:'Contenido orientado a manipular seguidores o interacciones.'},
];

export const HARD_BLOCK_MEDIA_LABELS=new Set(MEDIA_POLICY_RULES.filter(r=>r.tier==='remove').map(r=>r.key));
export const LIMITED_MEDIA_LABELS=new Set(MEDIA_POLICY_RULES.filter(r=>r.tier==='limited').map(r=>r.key));
