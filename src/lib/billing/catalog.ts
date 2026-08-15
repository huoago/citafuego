import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface CatalogOffer {
  id:string; kind:string; name:string; tier:string|null; entitlements:Record<string,unknown>;
  price:{currency:string;amountMinor:number;billingPeriod:string|null}|null;
}
export async function loadPeruCatalog():Promise<CatalogOffer[]>{
  const s=await createClient();
  const{data:products}=await s.from('catalog_products').select('id,kind,name,tier,entitlements').eq('active',true).order('kind').order('id');
  const ids=(products??[]).map(p=>p.id);if(!ids.length)return[];
  const{data:prices}=await s.from('catalog_prices').select('product_id,currency,amount_minor,billing_period,valid_from').in('product_id',ids).eq('country_code','PE').eq('active',true).or(`valid_to.is.null,valid_to.gt.${new Date().toISOString()}`).order('valid_from',{ascending:false});
  const map=new Map<string,any>();for(const p of prices??[]){if(!map.has(p.product_id))map.set(p.product_id,p)}
  return (products??[]).map(p=>{const x=map.get(p.id);return{id:p.id,kind:p.kind,name:p.name,tier:p.tier,entitlements:(p.entitlements??{}) as Record<string,unknown>,price:x?{currency:x.currency,amountMinor:Number(x.amount_minor),billingPeriod:x.billing_period}:null}});
}
export function formatPrice(price:CatalogOffer['price']){if(!price)return'Precio próximamente';return new Intl.NumberFormat('es-PE',{style:'currency',currency:price.currency}).format(price.amountMinor/100)+(price.billingPeriod==='month'?' / mes':'')}
