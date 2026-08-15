# CitaFuego V1.0 — Product Requirements Document

## 1. Resumen ejecutivo

CitaFuego es una plataforma de citas para adultos orientada a convertir una conexión digital en una cita real. El lanzamiento inicial se concentra en Lima para maximizar densidad, liquidez del marketplace y seguridad operativa antes de expandirse a otras ciudades de Perú y Latinoamérica.

**Tagline:** `Conoce. Conecta. Enciende la chispa.`

**Propuesta de valor:** personas reales + cerca de ti + intención clara + herramientas para pasar del match a una cita real.

### 1.1 Problema

Las aplicaciones de citas generalistas sufren cuatro fricciones recurrentes:

- perfiles falsos, bots y estafas;
- sobrecarga de swipes sin intención clara;
- conversaciones que nunca llegan a una cita;
- abuso, spam y migración forzada a canales externos.

CitaFuego no busca inventar otro mecanismo de swipe. Busca construir una capa de confianza y convertir intención en encuentro.

### 1.2 Objetivo V1.0

Validar en Lima que una base inicial de usuarios adultos puede completar de forma segura el embudo:

`registro → perfil → descubrimiento → like → match → chat → propuesta de cita`

### 1.3 Mercado inicial

- País: Perú.
- Ciudad: Lima Metropolitana.
- Idioma principal: español.
- Edad legal: 18+.
- Segmento inicial de marketing recomendado: 21–38 años, sin excluir legalmente a otros adultos.
- Plataformas: web mobile-first y desktop responsive.

## 2. Posicionamiento

### 2.1 Qué es

Una plataforma de citas y descubrimiento social local para adultos que prioriza perfiles auténticos, intención explícita y seguridad.

### 2.2 Qué no es

- pornografía;
- escort o prostitución;
- sugar dating con contraprestación económica;
- marketplace de servicios sexuales;
- chat de pago con perfiles sintéticos;
- red social anónima para menores;
- plataforma de venta de contenido sexual.

### 2.3 Personalidad de marca

- cálida;
- directa;
- urbana;
- latina;
- segura;
- ligera, sin vulgaridad.

## 3. Métricas de éxito

### 3.1 North Star Metric

**Citas propuestas aceptadas por 1.000 usuarios activos semanales.**

Esta métrica obliga a optimizar más allá del swipe.

### 3.2 Métricas de adquisición

- visitor → registro: ≥ 12% en tráfico de intención alta;
- registro → perfil completo: ≥ 65%;
- perfil → primera acción: ≥ 80%.

### 3.3 Métricas de activación

- usuarios con ≥1 like enviado en D0;
- usuarios con ≥1 match en 7 días;
- match → primer mensaje;
- match → conversación con ≥6 mensajes recíprocos;
- conversación → propuesta de cita.

### 3.4 Retención

- D1, D7, D30;
- WAU/MAU;
- porcentaje de perfiles completos;
- porcentaje de perfiles verificados.

### 3.5 Seguridad

- reportes por 1.000 conversaciones;
- tiempo medio de resolución de casos P0/P1;
- tasa de reincidencia;
- falsos positivos de moderación;
- ratio de apelaciones aceptadas;
- incidentes de exposición de ubicación precisa: objetivo 0.

### 3.6 Monetización

- conversión Free → Plus;
- conversión Free → Gold;
- ARPPU;
- ingresos por Boost;
- ingresos por SuperFuego;
- refund/chargeback rate.

## 4. Personas

### Persona A — Lucía, 27

Quiere conocer personas reales cerca de Miraflores/Barranco. Valora poder filtrar intenciones y bloquear mensajes no deseados. El badge de verificación aumenta su confianza.

### Persona B — Diego, 31

Tiene poco tiempo. Quiere saber quién está disponible para salir esta semana y está dispuesto a pagar por mejores filtros y Boost, no por mensajes ficticios.

### Persona C — Valeria, 35

Busca una relación seria. Prefiere perfiles completos, intereses y señales de compatibilidad antes de iniciar una conversación.

## 5. Alcance V1.0

### P0 — obligatorio para lanzamiento

1. registro/login;
2. control 18+;
3. consentimiento legal versionado;
4. onboarding de perfil;
5. carga y moderación de fotos;
6. preferencias de citas;
7. ubicación aproximada;
8. descubrir perfiles;
9. pass / like;
10. match mutuo;
11. chat 1:1;
12. bloqueo y reporte;
13. verificación selfie mediante adaptador externo;
14. estado de perfil y riesgo;
15. moderación AI de texto e imagen;
16. panel de administración;
17. suscripciones y compras one-off mediante adaptador de pagos;
18. borrado de cuenta;
19. auditoría administrativa;
20. analítica mínima de embudo.

### P1 — V1.1/V1.5

- `Hoy` / disponibilidad para cita;
- propuesta estructurada de cita;
- mensajes de voz;
- PWA instalable;
- filtros avanzados;
- Boost;
- SuperFuego;
- modo incógnito;
- ver quién te dio like.

### Fuera de V1.0

- videollamada;
- livestream;
- stories;
- feed público;
- grupos;
- pagos entre usuarios;
- marketplace de locales;
- generación de perfiles con IA;
- chatbots románticos;
- criptomonedas/tokens;
- menores de edad.

## 6. Registro y onboarding

### 6.1 Registro

Métodos previstos:

- email + OTP/magic link;
- teléfono OTP en una iteración posterior si el proveedor elegido lo justifica;
- Apple/Google opcional posteriormente.

### 6.2 Edad

Se solicita fecha de nacimiento y se rechaza el registro si el usuario no tiene 18 años cumplidos. La fecha exacta es dato privado y no aparece en perfiles públicos.

### 6.3 Consentimientos

El sistema registra:

- versión de Términos;
- versión de Política de Privacidad;
- consentimiento para tratamiento de datos sensibles cuando corresponda;
- timestamp;
- IP hash/metadata mínima permitida;
- fuente/dispositivo.

### 6.4 Onboarding mínimo

- nombre visible;
- fecha de nacimiento privada;
- identidad de género;
- a quién desea conocer;
- ciudad/distrito;
- ubicación opcional con explicación;
- intención: relación seria / conocer / casual / amistad / ver qué pasa;
- mínimo 2 fotos, recomendado 4;
- bio;
- 3–8 intereses.

### Criterio de perfil activo

No se muestra en Descubrir hasta cumplir:

- 18+ confirmado;
- mínimo 2 fotos aprobadas;
- nombre y bio válidos;
- preferencias completas;
- no estar suspendido;
- consentimiento vigente.

## 7. Perfil

### Campos visibles

- nombre;
- edad calculada;
- distrito o zona aproximada;
- fotos aprobadas;
- badge de verificación;
- bio;
- intereses;
- intención;
- idiomas;
- prompts opcionales.

### Campos nunca visibles directamente

- email;
- teléfono;
- fecha de nacimiento exacta;
- coordenadas;
- dispositivo/IP;
- risk score;
- estado interno de moderación;
- historial de reportes.

## 8. Descubrimiento y matching

### 8.1 Filtros duros

- rango de edad recíproco;
- preferencias de género recíprocas;
- radio máximo;
- no bloqueado;
- no sancionado;
- perfil activo;
- no haber visto/descartado recientemente según política;
- disponibilidad geográfica.

### 8.2 Ranking blando

La puntuación de recomendación puede ponderar:

- compatibilidad de intención: 25%;
- proximidad por bucket: 20%;
- intereses compartidos: 15%;
- actividad reciente: 10%;
- completitud del perfil: 10%;
- calidad de interacción histórica: 10%;
- confianza/seguridad: 10%.

No se recomienda usar raza, origen étnico, religión o inferencias sensibles como ranking oculto.

### 8.3 Acciones

- Pass;
- Like;
- SuperFuego (P1);
- Reportar;
- Bloquear.

### 8.4 Match

Se crea cuando existe Like mutuo y ninguno está bloqueado/suspendido. El match crea una conversación 1:1.

## 9. Chat

### V1.0

- texto;
- emoji;
- imagen moderada;
- indicadores de envío;
- bloquear/reportar desde chat;
- detección de spam y enlaces;
- límites de velocidad.

### Reglas

- solo usuarios con match activo pueden chatear;
- un bloqueo cierra la conversación para ambos;
- mensajes eliminados por el usuario mantienen solo el mínimo registro requerido para seguridad/obligación legal según política;
- contenido flaggeado se conserva de forma restringida para revisión y apelación.

## 10. Seguridad y confianza

### 10.1 Badge de verificación

Estados:

- `unverified`;
- `pending`;
- `verified`;
- `rejected`;
- `expired`.

La verificación selfie se integra mediante interfaz de proveedor; CitaFuego conserva únicamente IDs, resultado, score mínimo necesario y evidencia permitida por política, no biometría cruda salvo necesidad jurídica explícita.

### 10.2 Bloqueo

Bloqueo inmediato y silencioso. El bloqueado no debe recibir señal de quién lo bloqueó.

### 10.3 Reporte

Categorías:

- perfil falso;
- spam;
- acoso;
- contenido sexual no solicitado;
- posible menor;
- estafa;
- solicitud de pago/servicio sexual;
- suplantación;
- violencia/amenaza;
- otro.

### 10.4 Sanciones

Escalera:

- advertencia;
- restricción temporal;
- limitación de mensajes;
- ocultamiento del descubrimiento;
- suspensión;
- ban permanente;
- bloqueo de dispositivo sujeto a política.

## 11. Moderación AI

Se implementa como un pipeline por capas y proveedor intercambiable.

### Inputs

- bio;
- prompts;
- nombres visibles;
- imágenes;
- mensajes;
- reportes;
- patrones de comportamiento.

### Outputs normalizados

- labels;
- score por label;
- acción recomendada;
- explicación breve;
- necesidad de revisión humana;
- versionado de modelo/política.

### Principio

La IA recomienda/ejecuta medidas reversibles. Acciones severas por señales ambiguas deben permitir revisión humana y apelación.

## 12. Monetización

### Free

- crear perfil;
- descubrir con límite diario razonable;
- likes limitados;
- match;
- chat sin pago;
- reportar/bloquear;
- verificación.

### Fuego Plus

Precio de lanzamiento a validar por experimento, no hardcodear en lógica de negocio.

Beneficios:

- likes ampliados/ilimitados según política;
- rewind;
- filtros extra;
- modo incógnito;
- recibos de lectura opcionales;
- más radio/ciudades cuando se habilite.

### Fuego Gold

Incluye Plus +:

- ver quién dio Like;
- prioridad moderada en ranking;
- Boost periódico;
- SuperFuego periódico;
- filtros premium.

### Compras one-off

- Boost;
- paquetes de SuperFuego.

### Prohibido monetizar

- cobrar por reportar/bloquear;
- vender acceso a menores;
- cobrar para responder a un match básico;
- perfiles falsos para inducir gasto;
- pagos por servicios sexuales.

## 13. Administración

Roles:

- Super Admin;
- Trust & Safety;
- Support;
- Finance;
- Analyst (read-only).

Módulos:

- dashboard;
- usuarios;
- verificaciones;
- reportes;
- cola de moderación;
- sanciones y apelaciones;
- suscripciones/transacciones;
- configuración y feature flags;
- métricas;
- audit log.

## 14. Requisitos no funcionales

### Seguridad

- TLS;
- cookies HttpOnly/Secure cuando aplique;
- RLS en Supabase;
- secretos solo en servidor;
- cifrado en reposo del proveedor;
- rate limiting;
- CSRF según flujo;
- protección contra enumeración;
- audit log de acciones críticas.

### Privacidad

- minimización de datos;
- coordenadas privadas;
- derecho a borrado/exportación;
- consentimiento versionado;
- retención documentada;
- separación entre perfil público y datos privados.

### Rendimiento

- LCP objetivo <2,5 s en móvil razonable;
- páginas públicas estáticas cuando sea posible;
- imágenes optimizadas;
- carga progresiva del deck de perfiles;
- paginación cursor-based.

### Accesibilidad

- contraste AA;
- navegación por teclado en web;
- labels accesibles;
- targets táctiles ≥44 px.

## 15. Eventos analíticos mínimos

- `landing_view`;
- `signup_started`;
- `signup_completed`;
- `onboarding_completed`;
- `profile_activated`;
- `discover_viewed`;
- `like_sent`;
- `match_created`;
- `first_message_sent`;
- `conversation_qualified`;
- `date_proposed`;
- `subscription_started`;
- `boost_purchased`;
- `report_created`;
- `verification_completed`;
- `account_deleted`.

No incluir texto de chats o coordenadas exactas en analítica general.

## 16. Definition of Done V1.0

V1.0 se considera técnicamente listo cuando:

1. el usuario adulto puede completar el embudo P0;
2. RLS impide lectura cruzada de datos privados;
3. una ubicación exacta no aparece en payloads públicos;
4. fotos y mensajes pueden pasar por moderación;
5. bloqueo y reporte son inmediatos;
6. admin puede revisar casos y sancionar con audit log;
7. pagos se modelan con webhook idempotente;
8. eliminación de cuenta funciona;
9. pruebas E2E cubren registro, match, chat, report y compra;
10. no hay errores críticos de accesibilidad o build.
