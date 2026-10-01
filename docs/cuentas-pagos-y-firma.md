# Cuentas, créditos, pagos y firma

## Cómo funciona

1. **Cuenta.** El usuario entra con su correo y un código de 6 dígitos (Supabase Auth). La primera vez recibe 5 créditos.
2. **Memoria.** Calcular es libre; generar la memoria gasta 1 crédito. El servidor vuelve a calcular todo con los datos capturados y guarda la memoria con su folio (`SUE-AAAAMMDD-XXXXXX`). Corregirla no gasta otro crédito.
3. **Créditos.** Se compran en paquetes de 10, 50 o 200 desde «Mi cuenta» con Stripe Checkout (tarjeta y, si se activa en Stripe, OXXO).
4. **Firma propia.** El usuario descarga el PDF y lo firma su propio ingeniero.
5. **Firma de la suite.** Paga la revisión y la memoria pasa a «En revisión». El ingeniero la ve en `/firma`:
   - **Pedir cambios:** el cliente recibe las notas, corrige y la reenvía sin pagar otra vez.
   - **Aprobar:** la memoria se congela con nombre, cédula, registro, fecha, su firma y sello (si los subió) y una huella SHA-256. La base de datos no deja cambiar una memoria aprobada.
   - **Mi firma y sello** (`/firma/perfil`): el ingeniero sube una vez su firma y su sello (PNG o JPG, menos de 250 KB). Se copian a cada memoria que aprueba; cambiarlos después no toca las ya aprobadas.
6. **Avisos por WhatsApp** (por el Hub): al ingeniero cuando llega una memoria por revisar (`AVISO_FIRMA_TELEFONO`) y al cliente cuando se aprueba o se le piden cambios (si dejó su número).

Precios en `src/lib/pagos/catalogo.ts`. **Son una propuesta**: los fija el ingeniero.

## Modo demostración

Sin `SUPABASE_*`, todo vive en la memoria del servidor: el código de acceso es `123456`, los pagos se confirman en `/pagos/demo` y `firmante@demo.mx` es el ingeniero. Nada se guarda al reiniciar.

## Variables

| Variable | Para qué |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Cuentas y base de datos. Las tres activan el modo real. |
| `SESION_SECRETO` | Firma la cookie de sesión. 32 caracteres o más (`openssl rand -base64 48`). |
| `FIRMANTES` | Correos que entran al panel de firma, separados por coma. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Cobros. Sin ellas (y con Supabase) no se puede comprar. |
| `APP_URL` | URL pública, para los regresos de Stripe (por ejemplo `https://suite.vercel.app`). |
| `AVISO_FIRMA_TELEFONO` | WhatsApp del ingeniero para avisarle de memorias por revisar. |

## Poner en producción

1. **Supabase:** crear el proyecto y correr en orden los archivos de `supabase/migrations/` en el SQL Editor. En Authentication → Email Templates → Magic Link, poner el código con `{{ .Token }}` para que llegue un código de 6 dígitos.
2. **Stripe:** en Developers → Webhooks, agregar `https://<tu-dominio>/api/pagos/stripe` con los eventos `checkout.session.completed` y `checkout.session.async_payment_succeeded`. Para OXXO, activarlo en Settings → Payment methods.
3. **Vercel:** poner las variables de arriba y volver a desplegar. `GET /api/hub/salud` muestra `cuentas_configuradas` y `pagos_configurados`.
