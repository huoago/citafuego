# Arquitectura de información y páginas

## Área pública

| Ruta | Página | Objetivo |
|---|---|---|
| `/` | Landing | Propuesta de valor + CTA |
| `/como-funciona` | Cómo funciona | Confianza y educación |
| `/seguridad` | Centro de seguridad | Reglas, reportes y privacidad |
| `/precios` | Planes | Free / Plus / Gold |
| `/terminos` | Términos | Legal |
| `/privacidad` | Privacidad | Legal |
| `/comunidad` | Normas | Community Guidelines |

## Autenticación

| Ruta | Función |
|---|---|
| `/registro` | crear cuenta |
| `/iniciar-sesion` | acceso |
| `/verificar-email` | completar OTP/magic link |
| `/recuperar` | recuperación |

## Onboarding

Flujo recomendado sin menús secundarios:

`/onboarding/edad → /identidad → /busco → /ubicacion → /fotos → /bio → /intereses → /verificacion → /listo`

La persistencia es incremental; abandonar y volver retoma el último paso válido.

## App autenticada

Navegación inferior de 5 tabs:

1. 🔥 Descubrir — `/descubrir`
2. ♡ Matches — `/matches`
3. 💬 Chats — `/chats`
4. ✦ Premium — `/premium`
5. 👤 Perfil — `/perfil`

Rutas adicionales:

- `/perfil/editar`
- `/perfil/verificacion`
- `/preferencias`
- `/seguridad`
- `/configuracion`
- `/cuenta`
- `/bloqueados`
- `/reportes/mis-reportes`
- `/chat/[conversationId]`
- `/usuario/[profileId]`

## Backoffice

- `/admin`
- `/admin/users`
- `/admin/users/[id]`
- `/admin/reports`
- `/admin/moderation`
- `/admin/verifications`
- `/admin/sanctions`
- `/admin/appeals`
- `/admin/billing`
- `/admin/analytics`
- `/admin/settings`
- `/admin/audit`

## Navegación móvil

La interfaz se diseña primero para 375–430 px de ancho. Desktop centra un shell de aplicación de 480–560 px para las pantallas de consumo y usa layout ancho en administración.

## Estado vacío

Cada pantalla debe tener estado vacío accionable:

- sin perfiles: ampliar rango o volver más tarde;
- sin matches: mejorar perfil y volver a descubrir;
- sin chats: abrir Matches;
- sin likes premium: explicar beneficio sin bloquear uso básico.
