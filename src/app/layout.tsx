import type { Metadata, Viewport } from 'next';
import './globals.css';
import './redesign.css';
import './interaction.css';
import './growth.css';
import './blog.css';
import './recommendations.css';
import './monetization.css';
import './top-tier.css';
import './ios-social.css';
import './ios-v2.css';
import './auth-safety-v3.css';
import './chat-read-v7.css';
import './registration-v9.css';
import './whatsapp-contact.css';
import './v14-onboarding-fixes.css';
import './v15-public-polish.css';
import './v16-dark-theme-readability.css';
import './v17-photo-review.css';
import './v18-activation-ux.css';
import './v19-trust-theme.css';
import './v20-settings-personalization.css';
import './site-shell.css';
import './v21-contrast-brand.css';
import { GlobalSiteNav } from '@/components/global-site-nav';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_NAME, SITE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase:new URL(SITE_URL),
  title:{default:DEFAULT_TITLE,template:'%s · CitaFuego'},
  description:DEFAULT_DESCRIPTION,
  applicationName:SITE_NAME,
  alternates:{canonical:'/'},
  openGraph:{
    type:'website',
    url:SITE_URL,
    siteName:SITE_NAME,
    locale:'es_PE',
    title:DEFAULT_TITLE,
    description:DEFAULT_DESCRIPTION,
    images:[{url:'/opengraph-image',width:1200,height:630,alt:'CitaFuego — personas reales y citas reales en Lima'}],
  },
  twitter:{
    card:'summary_large_image',
    title:DEFAULT_TITLE,
    description:DEFAULT_DESCRIPTION,
    images:['/twitter-image'],
  },
  verification:{
    google:process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other:{
      'msvalidate.01':process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || '',
    },
  },
  manifest:'/manifest.webmanifest',
  icons:{icon:'/mascot-logo.svg',shortcut:'/mascot-logo.svg',apple:'/mascot-logo.svg'},
  appleWebApp:{capable:true,title:'CitaFuego',statusBarStyle:'black-translucent'},
};

export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#08080b'};

const websiteJsonLd={
  '@context':'https://schema.org',
  '@type':'WebSite',
  '@id':`${SITE_URL}/#website`,
  url:SITE_URL,
  name:SITE_NAME,
  inLanguage:'es-PE',
  description:DEFAULT_DESCRIPTION,
};
const organizationJsonLd={
  '@context':'https://schema.org',
  '@type':'Organization',
  '@id':`${SITE_URL}/#organization`,
  name:SITE_NAME,
  url:SITE_URL,
  logo:`${SITE_URL}/mascot-logo.svg`,
};
const serviceWorkerRegistration=`(()=>{if(!('serviceWorker'in navigator))return;const register=()=>navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(registration=>registration.update()).catch(()=>undefined);if(document.readyState==='complete')void register();else window.addEventListener('load',()=>void register(),{once:true});})();`;

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  return <html lang="es-PE"><body>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(websiteJsonLd)}} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(organizationJsonLd)}} />
    <script dangerouslySetInnerHTML={{__html:serviceWorkerRegistration}} />
    <GlobalSiteNav/>
    {children}
  </body></html>;
}
