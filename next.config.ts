import type { NextConfig } from 'next';

const csp=["default-src 'self'","base-uri 'self'","object-src 'none'","frame-ancestors 'none'","form-action 'self'","script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com","style-src 'self' 'unsafe-inline'","img-src 'self' data: blob: https:","media-src 'self' blob: https:","font-src 'self' data:","connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com","frame-src https://challenges.cloudflare.com","worker-src 'self' blob:","manifest-src 'self'","upgrade-insecure-requests"].join('; ');

const securityHeaders=[
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'Permissions-Policy',value:'camera=(self), geolocation=(self), microphone=(self)'},
  {key:'Cross-Origin-Opener-Policy',value:'same-origin'},
  {key:'Strict-Transport-Security',value:'max-age=63072000; includeSubDomains; preload'},
  {key:'X-DNS-Prefetch-Control',value:'off'},
  {key:'Content-Security-Policy',value:csp},
];

const privateRouteHeaders=[{key:'X-Robots-Tag',value:'noindex, nofollow, noarchive, nosnippet'}];
const privateRoutePatterns=[
  '/admin/:path*',
  '/api/:path*',
  '/chat/:path*',
  '/chat-privado/:path*',
  '/chats/:path*',
  '/messages/:path*',
  '/account/:path*',
  '/cuenta/:path*',
  '/configuracion/:path*',
  '/settings/:path*',
  '/verification/:path*',
  '/verificacion/:path*',
  '/private-album/:path*',
  '/album-privado/:path*',
  '/perfil/:path*',
  '/matches/:path*',
  '/likes/:path*',
  '/para-ti/:path*',
  '/descubrir/:path*',
  '/guardados/:path*',
  '/albumes/:path*',
  '/premium/:path*',
  '/onboarding/:path*',
  '/registro/:path*',
  '/iniciar-sesion',
  '/recuperar/:path*',
  '/verificar-email/:path*',
  '/bloqueados/:path*',
  '/reportes/:path*',
  '/usuario/:path*',
  '/citas/:path*',
];

const nextConfig:NextConfig={
  reactStrictMode:true,
  poweredByHeader:false,
  images:{
    remotePatterns:[{protocol:'https',hostname:'**.supabase.co'}],
    formats:['image/avif','image/webp'],
  },
  async redirects(){
    return [
      {source:'/login',destination:'/iniciar-sesion',permanent:true},
      {source:'/signup',destination:'/registro',permanent:true},
      {source:'/register',destination:'/registro',permanent:true},
      {source:'/comunidad',destination:'/community-guidelines',permanent:true},
      {source:'/seguridad',destination:'/safety',permanent:true},
    ];
  },
  async headers(){
    return [
      {source:'/:path*',headers:securityHeaders},
      ...privateRoutePatterns.map((source)=>({source,headers:privateRouteHeaders})),
    ];
  },
};

export default nextConfig;
