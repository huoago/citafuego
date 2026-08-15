import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const id = await getAuthenticatedUserId();
  if (!id) redirect('/login');

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name,district,city,verification_badge,profile_completion,bio,intent')
    .eq('id', id)
    .maybeSingle();

  if (!profile) redirect('/onboarding');

  const { data: photo } = await supabase
    .from('profile_photos')
    .select('storage_path')
    .eq('user_id', id)
    .eq('status', 'approved')
    .order('is_primary', { ascending: false })
    .order('position')
    .limit(1)
    .maybeSingle();

  let imageUrl: string | null = null;
  if (photo?.storage_path) {
    const { data } = await supabase.storage.from('profile-photos').createSignedUrl(photo.storage_path, 600);
    imageUrl = data?.signedUrl ?? null;
  }

  return (
    <section>
      <div className="pageHeader">
        <p className="eyebrow">Tu presencia</p>
        <h1>Perfil</h1>
      </div>
      <div className="profileSummary">
        {imageUrl ? (
          <span className="profileAvatar">
            <Image src={imageUrl} alt={profile.display_name} fill sizes="76px" />
          </span>
        ) : (
          <span className="avatarPlaceholder large">{profile.display_name.slice(0, 1)}</span>
        )}
        <div>
          <h2>
            {profile.display_name}{' '}
            {profile.verification_badge ? <span className="verifiedBadge">✓</span> : null}
          </h2>
          <p>{profile.district ?? profile.city} · Lima</p>
        </div>
        <span className="completionBadge">{profile.profile_completion}%</span>
      </div>
      <div className="softPanel">
        <strong>Tu bio</strong>
        <p>{profile.bio}</p>
      </div>
      <div className="settingsList">
        <Link href="/onboarding?edit=1">Editar perfil y preferencias <span>›</span></Link>
        <Link href="/seguridad">Seguridad y verificación <span>›</span></Link>
        <Link href="/premium">Mi plan <span>›</span></Link>
      </div>
    </section>
  );
}
