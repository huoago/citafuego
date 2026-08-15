# Roadmap de implementación

## Sprint 0 — Base (incluido en este scaffold)

- PRD y alcance fijados;
- rutas;
- esquema PostgreSQL;
- RLS inicial;
- RPC de interacción;
- discovery sin coordenadas públicas;
- adapters para AI/verificación/pagos;
- shell UI mobile-first;
- landing, auth visual, discover demo, matches, chats, perfil, seguridad, premium y admin base;
- tests de dominio.

## Sprint 1 — Auth + onboarding real

- conectar Supabase;
- email OTP/magic link;
- validación 18+ en servidor;
- consentimiento legal;
- onboarding persistente;
- upload de fotos a bucket privado;
- procesamiento y moderación de foto;
- activación de perfil.

**Salida:** un usuario adulto puede crear un perfil activo aprobado.

## Sprint 2 — Discovery + match

- endpoint/RPC discovery paginado;
- firmado de fotos;
- filtros;
- interaction endpoint conectado;
- match modal;
- límites Free/Plus/Gold;
- analytics.

**Salida:** dos usuarios pueden darse Like y crear match real.

## Sprint 3 — Chat + Trust & Safety

- chat 1:1;
- realtime/polling;
- text moderation provider;
- image moderation;
- rate limiting;
- block/report;
- moderation cases;
- admin queue;
- sanction/appeal.

**Salida:** conversación segura y operable por Trust & Safety.

## Sprint 4 — Billing

- catálogo dinámico;
- checkout;
- webhook idempotente;
- subscriptions;
- entitlements;
- Boost/SuperFuego;
- finance dashboard.

**Salida:** monetización sin bloquear match/chat básico.

## Sprint 5 — Hardening + launch Lima

- E2E completos;
- OWASP review;
- RLS tests;
- load test;
- accessibility audit;
- privacy/export/delete;
- legal copy final;
- production monitoring;
- feature flags;
- seed controlado de lanzamiento.

## Criterio Go/No-Go

No publicar tráfico pagado si cualquiera de estos falla:

- bypass de 18+;
- ubicación exacta visible;
- self-verification;
- envío de mensajes saltando moderación;
- bloqueo/report no funcional;
- admin sin audit log;
- webhook no idempotente;
- eliminación de cuenta inexistente.
