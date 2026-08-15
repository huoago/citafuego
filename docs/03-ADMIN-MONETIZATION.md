# Administración y monetización

## 1. Backoffice

### Dashboard

KPIs diarios y 7/30 días:

- nuevos registros;
- perfiles activos;
- verificados;
- DAU/WAU/MAU;
- likes;
- matches;
- conversaciones calificadas;
- reportes abiertos;
- tiempo de resolución;
- MRR;
- compras one-off;
- chargebacks.

### Usuarios

Búsqueda por UUID, email hash/identificador permitido, nombre visible y estado. Ficha:

- datos públicos;
- estado de cuenta;
- verificación;
- riesgo;
- sanciones;
- reportes recibidos/emitidos;
- pagos;
- dispositivos/risk signals resumidos;
- historial administrativo.

**No mostrar chats completos por defecto.** Un moderador accede solo al material asociado a un reporte/caso o mediante elevación auditada.

### Moderación

Cola por prioridad:

- P0: posible menor/explotación/amenaza creíble;
- P1: servicio sexual pagado, estafa de alto riesgo, reincidencia;
- P2: acoso, desnudez no solicitada, spam persistente;
- P3: calidad de perfil y casos ambiguos.

Acciones:

- aprobar;
- retirar contenido;
- advertir;
- restringir;
- suspender;
- ban;
- escalar;
- solicitar nueva verificación.

### Apelaciones

Toda sanción de suspensión larga o ban genera derecho a apelación según política. La revisión idealmente la realiza una persona distinta del moderador original.

### Billing

- productos;
- precios por país/moneda;
- suscripciones;
- estado de webhooks;
- reembolsos;
- chargebacks;
- compras de Boost/SuperFuego;
- conciliación.

### RBAC

| Rol | Permisos clave |
|---|---|
| Super Admin | todo, incluido roles/configuración |
| Trust & Safety | moderación, reportes, sanciones, apelaciones |
| Support | datos mínimos, soporte y estados no críticos |
| Finance | billing y conciliación, sin chats |
| Analyst | métricas agregadas, read-only |

Toda acción sensible registra actor, objeto, before/after resumido, motivo y timestamp.

## 2. Monetización

### Principio

El producto gratuito debe producir matches reales. Premium compra eficiencia y control, no acceso a una conversación ficticia.

### Entitlements modelados

- `daily_like_limit`;
- `can_see_likers`;
- `rewind_limit`;
- `advanced_filters`;
- `incognito_mode`;
- `read_receipts`;
- `boosts_per_period`;
- `superfuegos_per_period`;
- `ranking_weight_cap`.

Los precios viven en base de datos/configuración del proveedor, no en componentes UI.

### Plan FREE

- likes diarios configurables;
- matches ilimitados;
- chats con matches;
- report/block;
- verificación;
- filtros básicos.

### FUEGO PLUS

- likes ampliados;
- rewind;
- filtros avanzados;
- incógnito;
- preferencias extendidas.

### FUEGO GOLD

- todo Plus;
- ver quién te dio like;
- prioridad moderada;
- Boost incluido;
- SuperFuego incluido.

### One-off

- Boost 30 min;
- paquetes SuperFuego.

## 3. Experimentos de precio

Nunca fijar el precio como constante de frontend. Tabla `catalog_prices` permite:

- moneda;
- país;
- cohort;
- periodo;
- precio;
- vigencia.

La asignación de experimento debe guardarse para evitar cambios inconsistentes en checkout.
