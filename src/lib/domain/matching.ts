import type { DiscoverProfile } from '../types';
export function scoreCandidate(profile:DiscoverProfile){return{total:Math.max(0,Math.min(100,Number(profile.chemistryScore)||0)),sharedInterests:Math.max(0,profile.sharedInterestCount)}}
export function rankCandidates(profiles:DiscoverProfile[]){return profiles.toSorted((a,b)=>scoreCandidate(b).total-scoreCandidate(a).total)}
