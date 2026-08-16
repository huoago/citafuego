import type { NextConfig } from 'next';
const securityHeaders=[
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'Permissions-Policy',value:'camera=(self), geolocation=(self), microphone=(self)'},
  {key:'Cross-Origin-Opener-Policy',value:'same-origin'}
];
const nextConfig:NextConfig={reactStrictMode:true,poweredByHeader:false,images:{remotePatterns:[{protocol:'https',hostname:'**.supabase.co'}]},async headers(){return[{source:'/:path*',headers:securityHeaders}]}};
export default nextConfig;
