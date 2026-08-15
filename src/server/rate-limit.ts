export interface RateLimitResult{allowed:boolean;retryAfterSeconds?:number;reason?:string}
export interface RateLimitProvider{consume(input:{scope:string;actorId:string;limit:number;windowSeconds:number}):Promise<RateLimitResult>}
export class DatabaseEnforcedRateLimit implements RateLimitProvider{async consume(){return{allowed:true,reason:'enforced_inside_postgres_rpc'}}}
export const rateLimitProvider:RateLimitProvider=new DatabaseEnforcedRateLimit();
