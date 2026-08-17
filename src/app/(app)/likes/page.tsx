import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { LikesGrid } from '@/components/likes-grid';

export const dynamic = 'force-dynamic';

function MatchTabs(){return <div className="iosSegmented" aria-label="Matches y Likes"><Link href="/matches">Matches</Link><Link className="active" href="/likes">Likes</Link></div>}

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_who_likes_me', { p_offset: 0, p_limit: 24 });

  const rows = (data ?? []) as Array<{
    profile_id: string;
    primary_photo_path: string | null;
    display_name: string;
    age: number;
    district: string | null;
    verified: boolean;
  }>;

  const paths = rows.map((row) => row.primary_photo_path).filter((path): path is string => Boolean(path));
  const urls = new Map<string, string>();

  if (paths.length) {
    const { data: signed } = await supabase.storage.from('profile-photos').createSignedUrls(paths, 600);
    signed?.forEach((item) => {
      if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
    });
  }

  const likers = rows.map((row) => ({
    profileId: row.profile_id,
    displayName: row.display_name,
    age: row.age,
    district: row.district ?? 'Lima',
    verified: row.verified,
    imageUrl: row.primary_photo_path ? urls.get(row.primary_photo_path) ?? null : null,
  }));

  return (
    <section>
      <div className="pageHeader">
        <p className="eyebrow">Interés real</p>
        <h1>Likes</h1>
        <p className="muted">Ve quién ya mostró interés y decide desde aquí. Si el Like es mutuo, abrimos el chat inmediatamente.</p>
      </div>
      <MatchTabs/><div style={{height:14}} aria-hidden="true"/>
      <LikesGrid initialRows={likers} />
    </section>
  );
}
