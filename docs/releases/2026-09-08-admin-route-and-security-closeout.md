# Admin route and security closeout — 2026-09-08

This release restores stable compatibility entry points for `/admin/billing`, `/admin/analytics`, and `/admin/settings`, routing them to the production payments, dashboard, and operations modules behind the existing admin authorization boundary.

It also records the production migration that removes signed-in-user execution from obsolete legacy admin RPCs. Active user and administrator RPCs retain their existing authorization contracts so discovery, matching, messaging, moderation, and operational workflows continue to function.

The legacy Sites hostname now redirects to `https://citafuego.com`, making the canonical Vercel deployment the single public application release line.
