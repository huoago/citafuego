import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { LikesGrid } from '@/components/likes-grid';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_who_likes_me', { p_offset: 0, p_limit: 24 });

  if (error?.message.includes('gold_required')) {
    return (
      <section>
        <div className="pageHeader"><p className="eyebrow">Fuego Gold</p><h1>Quién te dio Like</h1></div>
        <div className="softPanel">
          <h2>Ve quién ya está interesado en ti</h2>
          <p>Esta vista está incluida en Fuego Gold y utiliza permisos reales del servidor.</p>
          <Link className="ctaButton" href="/premium">Comparar planes</Link>
        </div>
      </section>
    );
  }

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
        <h1>Te dieron Like</h1>
        <p className="muted">Decide desde aquí. Si el interés es mutuo, abrimos el chat inmediatamente.</p>
      </div>
      <LikesGrid initialRows={likers} />
    </section>
  );
}
