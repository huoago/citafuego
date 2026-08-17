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
const nextConfig:NextConfig={reactStrictMode:true,poweredByHeader:false,images:{remotePatterns:[{protocol:'https',hostname:'**.supabase.co'}]},async headers(){return[{source:'/:path*',headers:securityHeaders}]}};
export default nextConfig;
