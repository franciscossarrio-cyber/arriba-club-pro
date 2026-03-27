# Arriba Club Pro — Contexto para Claude

## Qué es
App de gestión para un club de deportes de playa (Futvoley, Beach Tennis, Beach Volley, Funcional).
Reemplaza planillas Excel y un backend de Google Apps Script.

**Live:** https://arriba-club-pro.web.app
**Repo:** https://github.com/franciscossarrio-cyber/arriba-club-pro

## Stack
- React 18 + Vite + Tailwind CSS
- Firebase Firestore (modular SDK v12) + Firebase Hosting
- Sin backend propio — todo directo a Firestore desde el cliente

## Estructura de archivos clave
```
src/
  App.jsx                    # Estado global, todos los handlers
  firebase/
    config.js                # Init Firebase (VITE_FIREBASE_* env vars)
    firestore.js             # CRUD completo — leer antes de tocar
  hooks/
    useFirestore.js          # Wrappea firestore.js con loading/error (useMemo para estabilidad)
  components/
    GrillaCancha.jsx         # Grilla semanal de 3 canchas con colores de asistencia
    Clases.jsx               # Asistencia por disciplina/fecha/horario
    Pagos.jsx                # Tabs: Membresía / Clase Suelta
    Alumnos.jsx              # ABM alumnos con selector de días de la semana
    DisciplinaIcon.jsx       # SVG logos por disciplina
    Sidebar.jsx              # Nav desktop con grilla 2×2 de disciplinas
  utils/
    helpers.js               # HORARIOS, DISCIPLINAS, getFechasMes, etc.
```

## Colecciones Firestore
| Colección | ID doc | Campos clave |
|---|---|---|
| `alumnos` | auto | nombre, telefono, plan, frecuencia, horario, diasElegidos[], disciplinas[], apodos[], estado |
| `pagos` | auto | alumnoId, nombre, mes, monto, estado, metodo, disciplina, tipo, fecha, horario |
| `asistencias` | auto | alumnoId, fecha "dd/mm/yyyy", horario, disciplina, estado, mes |
| `ocupacion_cancha` | `{canchaId}-{fecha_}_-{horario}` | canchaId, fecha "dd/mm", horario, mes, disciplina, alumnos[], tipo |
| `profesores` | auto | nombre, cbu, estado |
| `clases_profe` | `{disciplina}-{fecha_}_-{horario}` | disciplina, fecha, horario, profesorId, mes |

**Importante:** las `/` en fechas se reemplazan con `_` en los IDs de Firestore (ej: `cancha3-15_03-18:00`).

## Decisiones técnicas importantes
- `llenarCuposMembresia` usa `Promise.all(setDoc merge)` — NO writeBatch (incompatibilidad Firebase v12)
- `useFirestore.js` usa `useMemo` para funciones estables y evitar bucles infinitos de render
- Asistencias en estado de App: `{ alumnoId: { 'dd/mm': estado } }`
- Cupo máximo por slot: 8 alumnos
- Membresías de Futvoley → siempre Cancha 3

## 4 estados de asistencia (igual que el Excel)
| Estado | Color | Significado |
|---|---|---|
| `asistio` | 🟢 Verde | Vino y pagó |
| `falto` | 🔴 Rojo | No vino |
| `vino_no_pago` | 🔵 Azul | Vino sin pagar |
| `cambio_turno` | 🟡 Ámbar | Canceló |

## Tipos de pago
- **Membresía**: mensual, auto-llena slots en cancha3 según `diasElegidos` del alumno
- **Clase Suelta**: clase individual, agrega al alumno a un slot específico via `agregarAlumnoASlot`

## Planes y precios (referencia)
- Arena Basic 1x/sem: $50.000 | 2x/sem: $95.000
- Arena Plus 1x/sem: $70.000 | 2x/sem: $140.000
- Arena Premium 1x/sem: $85.000 | 2x/sem: $175.000
- Clase Suelta: $15.000 (Futvoley/BV/FNL) | $20.000 (Beach Tennis)
- QR/MP tiene ~25% de markup sobre EFT

## Variables de entorno necesarias (.env)
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
firebase deploy --only hosting
```

## Pendiente / Ideas futuras
- Firebase Auth (reemplazar VITE_ACCESS_KEY)
- GitHub Actions para auto-deploy
- Registro de clases de prueba (Clases de Prueba del Excel)
- Lista de espera / "gente afuera"
- Resumen de canchas libres por horario
- Precios diferenciados EFT vs QR por disciplina en la UI
