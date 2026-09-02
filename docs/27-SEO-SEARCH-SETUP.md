# CitaFuego — configuración final de SEO y buscadores

## Objetivo

Este documento cubre únicamente la configuración externa que no puede quedar codificada en el repositorio: verificación de propiedad en Google/Bing y credenciales para el envío automático del sitemap.

## Google Search Console

1. Crear o usar la propiedad `https://citafuego.com/` en Google Search Console.
2. Obtener un token de verificación HTML/meta y guardarlo como variable de entorno de producción `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` en Vercel.
3. Crear una cuenta de servicio de Google con acceso a la Search Console API.
4. Añadir el correo de la cuenta de servicio como usuario con permisos suficientes en la propiedad de Search Console.
5. Guardar el JSON completo de la cuenta de servicio como GitHub Actions secret `GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON`.
6. Después del despliegue, verificar que la meta `google-site-verification` exista y que `https://citafuego.com/sitemap.xml` esté aceptado.

## Bing Webmaster Tools

1. Añadir `https://citafuego.com/` a Bing Webmaster Tools.
2. Obtener el valor de verificación meta y guardarlo en Vercel como `NEXT_PUBLIC_BING_SITE_VERIFICATION`.
3. Crear una clave API de Bing Webmaster y guardarla en GitHub Actions como `BING_WEBMASTER_API_KEY`.
4. Confirmar que Bing acepta `https://citafuego.com/sitemap.xml`.

## IndexNow

1. Generar un token aleatorio apto para IndexNow.
2. Guardarlo en Vercel y GitHub Actions como `INDEXNOW_KEY`.
3. La aplicación publica el token en `https://citafuego.com/indexnow-key.txt` solo cuando la variable está configurada.
4. El workflow de envío rechaza explícitamente URLs privadas y solo toma URLs del sitemap público validado.

## Secrets/variables que deben existir

### Vercel production

- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
- `NEXT_PUBLIC_BING_SITE_VERIFICATION`
- `INDEXNOW_KEY`

### GitHub Actions

- `GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON`
- `BING_WEBMASTER_API_KEY`
- `INDEXNOW_KEY`

## Criterio de aceptación

- `/robots.txt` = 200 y declara el sitemap.
- `/sitemap.xml` = 200, contiene al menos 50 páginas públicas y ninguna URL privada.
- Search Console y Bing muestran propiedad verificada.
- El sitemap aparece enviado sin error.
- `Search engine submission` termina en verde tras un `Production deploy` exitoso.
- Nunca se envían a motores de búsqueda rutas `/admin`, `/api`, chat, perfil privado, cuenta, configuración, verificación, álbum privado, matches, premium u onboarding.
