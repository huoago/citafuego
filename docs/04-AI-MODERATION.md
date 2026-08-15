# AI Moderation & Trust Architecture

## 1. Objetivo

Reducir perfiles falsos, abuso, contenido sexual no solicitado, riesgo de menores, estafas y solicitación de servicios sexuales, sin convertir el sistema en vigilancia humana indiscriminada.

## 2. Arquitectura por capas

### Capa A — reglas deterministas

Antes de llamar a un modelo:

- rate limit;
- duplicación de mensajes;
- exceso de URLs;
- teléfonos/handles repetidos;
- hashes de imágenes previamente bloqueadas;
- cuentas/dispositivos sancionados;
- velocity anómala.

### Capa B — clasificación AI

Contrato normalizado independiente del proveedor:

```ts
{
  labels: Record<string, number>,
  action: 'allow' | 'warn' | 'hold' | 'block',
  reasons: string[],
  humanReview: boolean,
  modelVersion: string,
  policyVersion: string
}
```

Labels iniciales:

- `sexual_content`;
- `sexual_solicitation`;
- `paid_sex`;
- `minor_risk`;
- `harassment`;
- `threat`;
- `hate`;
- `scam`;
- `off_platform_spam`;
- `impersonation`;
- `nudity_image`;
- `violence_image`.

### Capa C — policy engine

El score AI no equivale a sanción. El motor combina:

- severidad;
- confianza;
- reincidencia;
- tipo de superficie;
- historial de reportes confirmados;
- estado de verificación.

### Capa D — revisión humana

Obligatoria/recomendada para:

- señales ambiguas de menor;
- bans permanentes sin evidencia determinista;
- apelaciones;
- amenazas creíbles;
- casos legales.

## 3. Matriz inicial de acción

| Riesgo | Acción |
|---|---|
| bajo | allow + log mínimo |
| medio | allow/warn + señal de riesgo |
| alto | hold temporal + revisión |
| crítico | block preventivo + P0/P1 |

Los umbrales son configuración versionada, no valores hardcodeados.

## 4. Fotos

Pipeline:

1. validar MIME/tamaño;
2. eliminar EXIF antes de publicación;
3. antivirus/scan de archivo;
4. perceptual hash;
5. clasificador de desnudez/violencia;
6. detección de texto/QR si se habilita;
7. revisión cuando corresponde;
8. almacenar versión aprobada.

Las coordenadas GPS EXIF deben eliminarse siempre.

## 5. Chat

El análisis automático prioriza señales de seguridad y spam. El acceso humano no se habilita para “curiosidad” administrativa. Un reporte crea un caso con ventana contextual mínima suficiente.

## 6. Anti-scam

Señales combinables:

- muchos matches + mismo texto;
- envío rápido de enlaces externos;
- solicitud de dinero;
- menciones repetidas de inversiones/cripto;
- cambio de dispositivo/país atípico;
- múltiples reportes independientes;
- foto duplicada entre cuentas.

Ninguna señal única debe asumir culpabilidad salvo contenido inequívoco prohibido.

## 7. Protección de menores

- 18+ obligatorio;
- fecha de nacimiento privada;
- verificación escalable cuando el riesgo lo requiera;
- señal `minor_risk` con máxima prioridad;
- suspensión preventiva cuando la política lo determine;
- revisión humana prioritaria;
- procedimientos legales/denuncia definidos por jurisdicción antes de producción.

## 8. Observabilidad del modelo

Registrar:

- proveedor;
- versión del modelo;
- versión de política;
- scores;
- decisión;
- decisión humana posterior;
- falso positivo/negativo confirmado.

Esto permite medir precisión y cambiar proveedor sin perder historial.
