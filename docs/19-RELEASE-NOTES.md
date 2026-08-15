# CitaFuego V1.0 RC release notes

Release branch: `release/citafuego-v1`
Target branch: `main`

This Release Candidate restores the complete production application, preserves the existing Supabase/RLS security model, adds the pending admin/realtime/SuperFuego database changes as immutable migrations through `023`, and introduces CI/build/security gates plus operating runbooks. Production launch remains gated by SMTP, hosting project visibility/READY state, DNS/HTTPS and controlled production E2E.
