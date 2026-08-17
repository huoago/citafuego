import type { ReactNode, SVGProps } from 'react';

export type AppIconName='sparkles'|'heart'|'chat'|'person'|'bolt'|'bell'|'plus'|'stories'|'blog'|'album'|'shield'|'bookmark'|'bag'|'crown'|'calendar'|'search'|'home';

const paths:Record<AppIconName,ReactNode>={
 sparkles:<><path d="M12 2l1.2 4.1L17 8l-3.8 1.9L12 14l-1.2-4.1L7 8l3.8-1.9L12 2Z"/><path d="M5 13l.8 2.7L8.5 17l-2.7 1.3L5 21l-.8-2.7L1.5 17l2.7-1.3L5 13Z"/><path d="M19 13l.7 2.3L22 16.5l-2.3 1.2L19 20l-.7-2.3L16 16.5l2.3-1.2L19 13Z"/></>,
 heart:<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>,
 chat:<><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-4A7.5 7.5 0 0 1 3 13V8a5 5 0 0 1 5-5h9a4 4 0 0 1 4 4v8Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></>,
 person:<><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></>,
 bolt:<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>,
 bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
 plus:<path d="M12 5v14M5 12h14"/>,
 stories:<><circle cx="12" cy="12" r="8"/><path d="M10 9l6 3-6 3V9Z"/></>,
 blog:<><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
 album:<><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m5 17 4-4 3 3 2-2 5 3"/></>,
 shield:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
 bookmark:<path d="M6 3h12v18l-6-4-6 4V3Z"/>,
 bag:<><path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/></>,
 crown:<><path d="m3 7 4 4 5-7 5 7 4-4-2 11H5L3 7Z"/><path d="M5 21h14"/></>,
 calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
 search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
 home:<><path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-7h6v7"/></>,
};

export function AppIcon({name,size=22,...props}:{name:AppIconName;size?:number}&SVGProps<SVGSVGElement>){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>}
