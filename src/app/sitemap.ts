import type { MetadataRoute } from 'next';
import { limaDistricts } from '@/lib/lima-districts';
const origin='https://citafuego.com';
export default function sitemap():MetadataRoute.Sitemap{return['','/como-funciona','/safety','/privacidad','/terminos','/help','/lima',...limaDistricts.map(([slug])=>`/lima/${slug}`)].map(path=>({url:`${origin}${path}`,changeFrequency:path.startsWith('/lima')?'weekly':'monthly',priority:path===''?1:path==='/lima'?.9:.7}))}
