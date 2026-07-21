# Arriba Club Pro — Handoff técnico

Documento para quien vaya a hacerse cargo del mantenimiento de la app.

## Qué es

App de gestión para un club de deportes de playa (Futvoley, Beach Tennis, Beach Volley,
Funcional). Reemplaza planillas de Excel y un backend viejo en Google Apps Script.
Además de la gestión de alumnos/clases/pagos, incluye un módulo de POS (Shop) con
**facturación electrónica AFIP/ARCA**.

- **Live:** https://arriba-club-pro.web.app
- **Repo:** https://github.com/franciscossarrio-cyber/arriba-club-pro
- **Firebase project:** `arriba-club-pro`

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Datos | Firebase Firestore (SDK modular v12), leído/escrito **directo desde el cliente** |
| Backend | Cloud Functions (Node 20) — solo para lo que no puede vivir en el cliente: firmar y enviar comprobantes a ARCA |
| Hosting | Firebase Hosting (carpeta `dist`, SPA rewrite a `index.html`) |
| PDF / tickets | `jspdf` + `qrcode` (facturas y tickets térmicos 80mm) |
| Auth | **No hay Firebase Auth.** Es un passcode único (`VITE_ACCESS_KEY`) validado en el cliente — ver "Deuda técnica" |

No hay servidor propio ni API REST intermedia: todo el CRUD de la UI pega directo a
Firestore vía `src/firebase/firestore.js`. Las únicas funciones server-side son las de
`functions/` (firma de comprobantes ARCA), porque requieren una clave privada que no
puede estar en el navegador.

## Estructura de archivos clave

```
src/
  App.jsx                    # Estado global de toda la app y handlers (~1500 líneas)
  firebase/
    config.js                # Init de Firebase (variables VITE_FIREBASE_*)
    firestore.js              # Toda la capa de acceso a datos — leer antes de tocar nada
  hooks/
    useFirestore.js           # Wrappea firestore.js con loading/error (useMemo para estabilidad)
  components/
    GrillaCancha.jsx          # Grilla semanal de 3 canchas con colores de asistencia
    Clases.jsx                # Asistencia por disciplina/fecha/horario
    Pagos.jsx                 # Tabs: Membresía / Clase Suelta / Day Use / Privada / Prueba
    Alumnos.jsx                # ABM de alumnos
    Profesores.jsx             # ABM de profesores + liquidación
    Shop.jsx                   # POS: carrito, cobro, facturación ARCA, notas de crédito
    Configuracion.jsx          # Precios por disciplina/tipo/QR, config ARCA
    Login.jsx                  # Pantalla de passcode (VITE_ACCESS_KEY)
    Dashboard.jsx
    Sidebar.jsx / BottomNav.jsx # Navegación desktop / mobile
  utils/
    helpers.js                 # Constantes (HORARIOS, DISCIPLINAS), formatMonto, getFechasMes...
    facturasPDF.js              # Genera PDF/ticket de factura y nota de crédito
functions/
  index.js                    # generarCSR, emitirFactura, emitirNotaCredito (ARCA/AFIP)
```

## Colecciones Firestore (estado real del código, `src/firebase/firestore.js`)

> ⚠️ El `CLAUDE.md` del repo describe un esquema viejo (`asistencias`, `ocupacion_cancha`,
> `clases_profe` como colecciones separadas). Eso ya no es así: se unificó todo en la
> colección `clases`. Si algo de este handoff difiere del `CLAUDE.md`, **confiar en este
> documento y en el código**, no en el `CLAUDE.md` (está pendiente de actualizar).

| Colección | ID de doc | Contenido |
|---|---|---|
| `alumnos` | auto | nombre, teléfono, plan, frecuencia, horario, diasElegidos[], disciplinas[], apodos[], estado |
| `pagos` | auto | alumnoId, nombre, mes, monto, estado, metodo, disciplina, tipo, fecha, horario |
| `clases` | `{canchaId}-{fecha_}_-{horario}` | canchaId, fecha "dd/mm", horario, mes, disciplina, alumnos[], removidos[], profesorId, tipo |
| `clases/{id}/asistencias` | `{alumnoId}` | estado de asistencia del alumno en esa clase |
| `cambios_turno` | auto | solicitudes de cambio de horario |
| `profesores` | auto | nombre, cbu, estado |
| `productos` | auto | nombre, precio, iva, categoría, estado (soft delete) |
| `facturas` | auto | cliente, items[], neto, ivaTotal, total, arcaPayload, estado (borrador/enviada/error), cae, nroComprobante, notaCreditoId |
| `config/precios`, `config/precios-{key}` | doc fijo | precios por disciplina/tipo/QR/privadas |
| `config/arca` | doc fijo | CUIT, cert (.crt), key (.key, guardada por `generarCSR`), production (bool) |

**Importante:** las `/` en fechas se reemplazan con `_` en los IDs de Firestore
(ej: `cancha3-15_03-18:00`), porque Firestore trata `/` como separador de path.

## Decisiones técnicas importantes

- `llenarCuposMembresia` usa `Promise.all(setDoc merge)` — **no** `writeBatch`
  (había una incompatibilidad con Firebase v12).
- `useFirestore.js` usa `useMemo` para exponer funciones estables y evitar bucles
  infinitos de render.
- Estado de asistencias en `App.jsx`: `{ alumnoId: { 'dd/mm': estado } }`.
- Cupo máximo por slot de clase: 8 alumnos.
- Membresías de Futvoley → siempre van a Cancha 3.
- 4 estados de asistencia (heredados del Excel viejo): `asistio` (verde, vino y pagó),
  `falto` (rojo), `vino_no_pago` (azul), `cambio_turno` (ámbar, canceló).

## Facturación electrónica (ARCA/AFIP)

Es la parte más delicada del sistema porque toca un servicio externo (AFIP) y maneja
una clave privada.

- **Flujo:** `generarCSR` (Cloud Function) genera un par de claves RSA + un CSR. El
  `.csr` se sube manualmente a ARCA para obtener el certificado `.crt`, que junto con
  la clave privada se guarda en `config/arca`.
- `emitirFactura` lee una factura en estado `borrador` desde `facturas/{id}`, arma el
  payload y llama al SDK `@arcasdk/core` para pedir el CAE. Si falla, la factura queda
  en estado `error` con el mensaje guardado para diagnóstico.
- `emitirNotaCredito` anula una factura ya enviada, mapeando el tipo de comprobante
  original al tipo de NC correspondiente (`NC_TIPO_MAP`).
- Todo esto corre en Cloud Functions (`invoker: 'public'`, o sea sin autenticación de
  Firebase — se apoya en que solo la propia app la llama). **Punto a revisar**: al no
  haber Firebase Auth, cualquiera con la URL de la función podría invocarla.
- `Shop.jsx` es el módulo de POS que arma el carrito, calcula totales (neto/IVA/total),
  llama a `emitirFactura`/`emitirNotaCredito`, e imprime el ticket térmico (80mm) vía
  `facturasPDF.js`.

## Tipos de pago (módulo Pagos, no confundir con el Shop/POS)

- **Membresía**: pago mensual, auto-llena slots en cancha3 según `diasElegidos` del alumno.
- **Clase Suelta / Day Use / Privada / Prueba**: pago puntual que agrega al alumno a un
  slot específico de `clases`.

## Planes y precios (referencia, configurables en `Configuracion.jsx`)

- Arena Basic 1x/sem: $50.000 | 2x/sem: $95.000
- Arena Plus 1x/sem: $70.000 | 2x/sem: $140.000
- Arena Premium 1x/sem: $85.000 | 2x/sem: $175.000
- Clase Suelta: $15.000 (Futvoley/BV/FNL) | $20.000 (Beach Tennis)
- QR/MP tiene ~25% de markup sobre EFT

## Variables de entorno (`.env`, no versionado)

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=arriba-club-pro
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_ACCESS_KEY=arriba2026
```

## Deploy

```bash
npm run build
firebase deploy --only hosting        # solo frontend
firebase deploy --only functions      # solo Cloud Functions (ARCA)
```

No hay CI/CD: el deploy es manual desde la máquina de quien lo corre.

## Deuda técnica / cosas a tener en cuenta al heredar esto

- **No hay Firebase Auth real.** El acceso es un passcode compartido
  (`VITE_ACCESS_KEY`) comparado en el cliente — no es seguridad real, cualquiera que
  lea el bundle JS puede verlo. Las reglas de Firestore (`firestore.rules`) son la
  única barrera real de datos.
- Las Cloud Functions de ARCA son `invoker: 'public'` — cualquiera con la URL podría
  llamarlas (mitigado porque hace falta conocer IDs de factura válidos, pero no es
  ideal).
- `CLAUDE.md` describe un esquema de datos viejo (colecciones separadas para
  asistencias/ocupación de cancha/clases de profesor) que ya no coincide con el código
  actual — está unificado en `clases` + subcolección `asistencias`. Conviene
  actualizarlo o borrarlo si genera confusión.
- No hay tests automatizados ni linting obligatorio en CI (`npm run lint` existe pero
  no corre solo).
- `App.jsx` concentra casi todo el estado y los handlers de la app (~1500 líneas) —
  es el primer lugar para mirar al debuggear cualquier flujo de datos, pero también el
  principal candidato a refactor si el proyecto crece.

## Pendientes / ideas futuras (heredadas de antes)

- Reemplazar `VITE_ACCESS_KEY` por Firebase Auth real.
- GitHub Actions para auto-deploy.
- Registro de clases de prueba.
- Lista de espera / "gente afuera" de un slot lleno.
- Resumen de canchas libres por horario.
- Precios diferenciados EFT vs QR visibles directamente en la UI (hoy están en config
  pero no siempre se muestran donde se cobra).
