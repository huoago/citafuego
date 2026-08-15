# Seguridad, privacidad y operación

## 1. Separación de datos

### Públicos

Nombre visible, edad calculada, fotos aprobadas, bio, intereses, intención, distrito/zona aproximada y verificación.

### Privados

Fecha de nacimiento exacta, email/teléfono, coordenadas, IP/device signals, consentimiento, risk score y evidencia de moderación.

Las tablas privadas no se consultan directamente desde el cliente.

## 2. Ubicación

- almacenar coordenadas solo en tabla privada;
- cifrado/controles del proveedor;
- no devolver lat/lng a otros usuarios;
- exponer distancia como bucket (`<1 km`, `1–3 km`, `3–10 km`, etc.);
- refresco controlado, no tracking continuo por defecto;
- permitir usar distrito sin GPS.

## 3. RLS

Reglas base:

- usuario puede editar su perfil;
- usuario solo lee su propia tabla privada;
- otros usuarios acceden únicamente a campos públicos aprobados a través de consultas/RPC seguras;
- mensajes solo para miembros de la conversación;
- admin utiliza backend con autorización RBAC, no bypass desde navegador.

## 4. Retención

Definir antes de producción:

- mensajes eliminados;
- cuentas cerradas;
- reportes;
- evidencia de fraude;
- billing;
- audit logs;
- verificación.

Borrado de cuenta inicia estado `deletion_requested`, revoca visibilidad y programa anonimización/borrado según obligaciones aplicables.

## 5. Incidentes

Runbook mínimo:

1. detectar;
2. clasificar severidad;
3. contener;
4. preservar evidencia con acceso restringido;
5. corregir;
6. determinar notificaciones regulatorias/usuarios;
7. postmortem;
8. controles preventivos.

## 6. Secretos

Nunca en frontend ni repositorio:

- service role key;
- webhooks secret;
- claves AI;
- claves de verificación;
- claves de pagos.

## 7. Controles de abuso

- rate limit por IP/usuario/dispositivo;
- límite de creación de cuentas;
- captcha/Turnstile adaptable;
- cooldown de mensajes;
- detección de velocity;
- webhook idempotency;
- protección contra replay.
