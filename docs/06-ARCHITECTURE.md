# Arquitectura técnica V1.0

## Capas

```text
Browser / PWA
   │
   ├── Next.js Server Components ── lectura segura
   ├── Route Handlers / Server Actions ── mutaciones
   │      │
   │      ├── Auth context (Supabase user client)
   │      ├── Policy / rate limit / entitlement
   │      ├── Moderation adapter
   │      └── Trusted write (RPC o service role server-only)
   │
   └── PostgreSQL / Supabase
          ├── public-safe profile data
          ├── private account/location data
          ├── matching/chat
          ├── trust & safety
          ├── billing
          └── audit/admin
```

## Regla de oro de acceso

El navegador no recibe acceso directo a tablas que permitan scraping o bypass de moderación. Las mutaciones críticas pasan por RPC o Route Handler.

## Flujo Descubrir

1. sesión autenticada;
2. `get_discover_candidates(limit)`;
3. DB aplica 18+/estado/bloqueos/preferencias/radio;
4. DB calcula distancia internamente;
5. responde únicamente bucket de distancia y datos públicos;
6. servidor firma/transforma URL de foto si el bucket no es público;
7. UI muestra deck.

## Flujo Like

1. `POST /api/interactions`;
2. validar UUID/acción;
3. recuperar usuario autenticado;
4. RPC `perform_interaction`;
5. DB comprueba target, bloqueos y cuota diaria;
6. si hay reciprocidad crea match + conversación de forma atómica;
7. devuelve `matched`.

## Flujo Mensaje

1. `POST /api/messages`;
2. validar usuario y membresía;
3. rate limit (pendiente de proveedor en scaffold);
4. deterministic safety prefilter;
5. AI provider adapter;
6. log de moderación;
7. `allow/warn` → insertar `sent`;
8. `hold` → insertar `held`, no entregar hasta revisión;
9. `block` → rechazar;
10. riesgo agregado puede abrir caso.

## Almacenamiento de fotos

Buckets propuestos:

- `profile-originals-private`: originales, acceso restringido;
- `profile-approved`: versiones procesadas publicables/signed;
- `moderation-evidence-private`: evidencias con retención y acceso auditado.

El proceso de imagen elimina EXIF antes de publicar.

## Auth

Supabase Auth es la implementación inicial por velocidad de lanzamiento. La aplicación mantiene IDs propios iguales a `auth.users.id`, evitando acoplar lógica de negocio a email/password.

## Proveedores reemplazables

Interfaces en `src/lib/adapters`:

- moderation;
- verification;
- payments.

El dominio no importa SDKs de proveedores concretos.

## Puntos pendientes antes de producción

- proveedor de captcha/rate limit;
- proveedor de verificación/liveness;
- proveedor AI definitivo;
- proveedor de pagos compatible con Perú;
- storage policies;
- webhooks idempotentes;
- export/delete worker;
- observabilidad y alertas;
- E2E con base temporal.
