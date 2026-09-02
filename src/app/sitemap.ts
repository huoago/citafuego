import type { MetadataRoute } from 'next';
import { PUBLIC_INDEXABLE_ROUTES, absoluteUrl } from '@/lib/seo';
import { LIMA_DISTRICTS, SEO_GUIDES } from '@/lib/seo-content';

export default function sitemap():MetadataRoute.Sitemap{
  const now=new Date();
  const staticRoutes:MetadataRoute.Sitemap=PUBLIC_INDEXABLE_ROUTES.map((path)=>({
    url:absoluteUrl(path),
    lastModified:now,
    changeFrequency:path==='/'?'daily':'weekly',
    priority:path==='/'?1:0.7,
  }));
  const limaRoutes:MetadataRoute.Sitemap=[
    {url:absoluteUrl('/lima'),lastModified:now,changeFrequency:'weekly',priority:0.9},
    ...LIMA_DISTRICTS.map((district)=>({url:absoluteUrl(`/lima/${district.slug}`),lastModified:now,changeFrequency:'weekly' as const,priority:0.8})),
  ];
  const guideRoutes:MetadataRoute.Sitemap=[
    {url:absoluteUrl('/guias'),lastModified:now,changeFrequency:'weekly',priority:0.8},
    ...SEO_GUIDES.map((guide)=>({url:absoluteUrl(`/guias/${guide.slug}`),lastModified:now,changeFrequency:'monthly' as const,priority:0.7})),
  ];
  return [...staticRoutes,...limaRoutes,...guideRoutes];
}
