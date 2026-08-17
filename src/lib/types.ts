export type RelationshipIntent='serious'|'meet_people'|'casual'|'friendship'|'open_to_see';
export type VerificationStatus='unverified'|'pending'|'verified'|'rejected'|'expired';
export type RandomMode='text'|'voice'|'video';
export interface ProfilePrompt{key:string;answer:string;}
export interface DiscoverProfile{id:string;name:string;age:number;district:string;distanceBucket:string;bio:string;intent:RelationshipIntent;verified:boolean;identityVerified?:boolean;interests:string[];imageUrl:string;imageUrls?:string[];chemistryScore:number;sharedInterestCount:number;isOnline:boolean;isBoosted:boolean;prompts:ProfilePrompt[];learningReason:string;}
export interface Entitlements{dailyLikeLimit:number;canSeeLikers:boolean;rewindLimit:number;advancedFilters:boolean;incognitoMode:boolean;boostsPerPeriod:number;superfuegosPerPeriod:number;}
