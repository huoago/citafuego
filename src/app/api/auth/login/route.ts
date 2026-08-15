import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({ email: z.string().email().max(254) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: 'invalid_payload' }, { status: 400 });
  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  await supabase.auth.signInWithOtp({
    email: parsed.data.email.toLowerCase(),
    options: { shouldCreateUser: false, emailRedirectTo: `${appUrl}/auth/confirm` },
  });
  // Same response whether an account exists or not.
  return Response.json({ ok: true, message: 'Si existe una cuenta, recibirás un enlace de acceso.' });
}
