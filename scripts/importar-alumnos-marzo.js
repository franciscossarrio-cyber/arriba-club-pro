/**
 * importar-alumnos-marzo.js
 *
 * Script de importación única para cargar los alumnos de marzo 2026.
 * Crea: alumno en `alumnos` + pago en `pagos` + slots en `ocupacion_cancha`.
 *
 * Uso (desde la raíz del proyecto):
 *   node scripts/importar-alumnos-marzo.js
 *
 * Requiere el archivo .env en la raíz del proyecto con las variables VITE_FIREBASE_*.
 */

import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';

// ── Cargar .env ───────────────────────────────────────────────────────────────
function loadEnv(path = '.env') {
  const raw = readFileSync(path, 'utf-8');
  return Object.fromEntries(
    raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => {
        const idx = l.indexOf('=');
        const key = l.substring(0, idx).trim();
        const val = l.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
        return [key, val];
      })
  );
}

const env = loadEnv();

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

const db = getFirestore(app);

// ── Helpers (replicados de firestore.js) ──────────────────────────────────────
const slotId = (canchaId, fecha, horario) =>
  `${canchaId}-${fecha.replace('/', '_')}-${horario}`;

function getFechasDelMes(diasElegidos, mes, anio) {
  const fechas = [];
  const ultimo = new Date(anio, mes, 0).getDate();
  for (let d = 1; d <= ultimo; d++) {
    const fecha = new Date(anio, mes - 1, d);
    if (diasElegidos.includes(fecha.getDay())) {
      const dia = String(d).padStart(2, '0');
      const mesStr = String(mes).padStart(2, '0');
      fechas.push(`${dia}/${mesStr}`);
    }
  }
  return fechas;
}

async function llenarCuposMembresia(alumnoId, diasElegidos, horario, mes, anio, disciplina) {
  if (!diasElegidos.length || !horario) return [];
  const fechas = getFechasDelMes(diasElegidos, mes, anio);
  if (!fechas.length) return [];
  await Promise.all(
    fechas.map((fecha) => {
      const ref = doc(db, 'ocupacion_cancha', slotId('cancha3', fecha, horario));
      return setDoc(
        ref,
        {
          canchaId: 'cancha3',
          fecha,
          horario,
          mes: 'Marzo 2026',
          disciplina,
          alumnos: arrayUnion(alumnoId),
          tipo: 'membresia',
          creadoEn: serverTimestamp(),
        },
        { merge: true }
      );
    })
  );
  return fechas;
}

// ── Datos ─────────────────────────────────────────────────────────────────────
// Días JS: Lunes=1, Martes=2, Miércoles=3, Jueves=4, Viernes=5, Sábado=6
// Plan: BASICO X1 → Arena Basic 1x sem ($50.000) | BASICO X2 → Arena Basic 2x sem ($95.000)

const ALUMNOS_MARZO = [
  // ── Semana del 02/03 ──────────────────────────────────────────────────────
  { nombre: 'Juliana Brito',           frecuencia: '1x sem', diasElegidos: [3],    horario: '17:00', fechaPago: '02/03/2026' },
  { nombre: 'Giu',                      frecuencia: '1x sem', diasElegidos: [1],    horario: '17:00', fechaPago: '02/03/2026' },
  { nombre: 'Tomas Sanmartin',          frecuencia: '1x sem', diasElegidos: [1],    horario: '18:00', fechaPago: '03/03/2026' },
  { nombre: 'Lucas Teti',               frecuencia: '1x sem', diasElegidos: [3],    horario: '19:00', fechaPago: '04/03/2026' },

  // ── Semana del 05/03 ──────────────────────────────────────────────────────
  { nombre: 'Damian Cvita',             frecuencia: '2x sem', diasElegidos: [2, 4], horario: '19:00', fechaPago: '05/03/2026' },
  { nombre: 'Tomas Ricciardi',          frecuencia: '2x sem', diasElegidos: [2, 4], horario: '19:00', fechaPago: '05/03/2026' },
  { nombre: 'Santi Matus',              frecuencia: '2x sem', diasElegidos: [2, 4], horario: '19:00', fechaPago: '05/03/2026' },
  { nombre: 'Cristobal Serrat',         frecuencia: '2x sem', diasElegidos: [2, 4], horario: '20:00', fechaPago: '05/03/2026' },
  { nombre: 'Beto Laplazzete',          frecuencia: '2x sem', diasElegidos: [2, 4], horario: '20:00', fechaPago: '05/03/2026' },
  { nombre: 'Pepe',                      frecuencia: '2x sem', diasElegidos: [2, 4], horario: '20:00', fechaPago: '05/03/2026', apodos: ['amigo de Beto'] },
  { nombre: 'Kelly',                     frecuencia: '2x sem', diasElegidos: [2, 4], horario: '18:00', fechaPago: '05/03/2026' },
  { nombre: 'Ivana Eliges',             frecuencia: '2x sem', diasElegidos: [2, 4], horario: '20:00', fechaPago: '06/03/2026' },
  { nombre: 'Pablito R',                frecuencia: '2x sem', diasElegidos: [1, 3], horario: '19:00', fechaPago: '06/03/2026' },

  // ── Semana del 09/03 ──────────────────────────────────────────────────────
  { nombre: 'Juan Capizano',            frecuencia: '2x sem', diasElegidos: [1, 3], horario: '20:00', fechaPago: '09/03/2026' },
  { nombre: 'Pitu',                      frecuencia: '2x sem', diasElegidos: [1, 3], horario: '20:00', fechaPago: '09/03/2026' },

  // ── Semana del 10/03 ──────────────────────────────────────────────────────
  { nombre: 'Geninho Rocha',            frecuencia: '2x sem', diasElegidos: [2, 4], horario: '20:00', fechaPago: '10/03/2026' },
  { nombre: 'Fran Harvey',              frecuencia: '2x sem', diasElegidos: [1, 3], horario: '18:00', fechaPago: '10/03/2026' },
  { nombre: 'Tomi Vallejo',             frecuencia: '2x sem', diasElegidos: [],     horario: '',      fechaPago: '10/03/2026' }, // Sin días fijos (franco rotativo)
  { nombre: 'Leonam Rodriguez Caetano', frecuencia: '2x sem', diasElegidos: [1, 4], horario: '18:00', fechaPago: '10/03/2026' },
  { nombre: 'Nacho Zambrano',           frecuencia: '2x sem', diasElegidos: [2, 4], horario: '20:00', fechaPago: '10/03/2026' },
  { nombre: 'Santi Truso',              frecuencia: '1x sem', diasElegidos: [2],    horario: '19:00', fechaPago: '10/03/2026' },

  // ── Semana del 11/03 ──────────────────────────────────────────────────────
  { nombre: 'Maria Gabriela',           frecuencia: '1x sem', diasElegidos: [3],    horario: '17:00', fechaPago: '11/03/2026' },
  { nombre: 'Ramon DLC',                frecuencia: '2x sem', diasElegidos: [1, 3], horario: '18:00', fechaPago: '11/03/2026' },

  // ── Semana del 12/03 ──────────────────────────────────────────────────────
  { nombre: 'Sofia',                     frecuencia: '1x sem', diasElegidos: [3],    horario: '17:00', fechaPago: '12/03/2026' },
  { nombre: 'Isabella',                  frecuencia: '1x sem', diasElegidos: [3],    horario: '17:00', fechaPago: '12/03/2026' },
  { nombre: 'Rodrigo Piki',             frecuencia: '2x sem', diasElegidos: [4],    horario: '19:00', fechaPago: '12/03/2026' }, // Segundo día pendiente (¿?)
  { nombre: 'Joao Abreu',               frecuencia: '1x sem', diasElegidos: [4],    horario: '18:00', fechaPago: '12/03/2026' },
  { nombre: 'Thiago',                    frecuencia: '1x sem', diasElegidos: [4],    horario: '18:00', fechaPago: '12/03/2026' },
  { nombre: 'Martin Dalton',            frecuencia: '1x sem', diasElegidos: [4],    horario: '18:00', fechaPago: '12/03/2026' },

  // ── Semana del 17/03 ──────────────────────────────────────────────────────
  { nombre: 'Carlos F Berisso',         frecuencia: '1x sem', diasElegidos: [2],    horario: '19:00', fechaPago: '17/03/2026', apodos: ['Charlie'] },
  { nombre: 'Julia Amaral',             frecuencia: '1x sem', diasElegidos: [2],    horario: '18:00', fechaPago: '17/03/2026' },
  { nombre: 'Sol Laplazette',           frecuencia: '1x sem', diasElegidos: [2],    horario: '18:00', fechaPago: '17/03/2026' },
  { nombre: 'Tamara',                    frecuencia: '1x sem', diasElegidos: [2],    horario: '18:00', fechaPago: '17/03/2026', apodos: ['amiga de Sol'] },

  // ── Semana del 18/03 ──────────────────────────────────────────────────────
  { nombre: 'Cecilia',                   frecuencia: '2x sem', diasElegidos: [],     horario: '',      fechaPago: '18/03/2026' }, // Días/horario no confirmados
  { nombre: 'Martin Iaradola',          frecuencia: '1x sem', diasElegidos: [],     horario: '',      fechaPago: '18/03/2026' }, // Días/horario no confirmados

  // ── Semana del 20/03 ──────────────────────────────────────────────────────
  { nombre: 'Fran Ssarrio',             frecuencia: '2x sem', diasElegidos: [],     horario: '',      fechaPago: '20/03/2026' }, // Días/horario no confirmados
  { nombre: 'Ornella',                   frecuencia: '1x sem', diasElegidos: [],     horario: '',      fechaPago: '20/03/2026', apodos: ['amiga de Cuky'] },

  // ── Semana del 25/03 ──────────────────────────────────────────────────────
  { nombre: 'Abel',                       frecuencia: '1x sem', diasElegidos: [],     horario: '',      fechaPago: '25/03/2026' }, // Días/horario no confirmados
  { nombre: 'Santi Amezqueta',          frecuencia: '2x sem', diasElegidos: [],     horario: '',      fechaPago: '25/03/2026' }, // Días/horario no confirmados
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nImportando ${ALUMNOS_MARZO.length} alumnos de Marzo 2026...\n`);

  let ok = 0;
  let errores = [];

  for (const a of ALUMNOS_MARZO) {
    try {
      const monto = a.frecuencia === '1x sem' ? 50000 : 95000;

      // 1. Crear alumno
      const alumnoRef = await addDoc(collection(db, 'alumnos'), {
        nombre: a.nombre,
        telefono: '',
        plan: 'Arena Basic',
        frecuencia: a.frecuencia,
        horario: a.horario,
        diasElegidos: a.diasElegidos,
        disciplinas: ['Futvoley'],
        apodos: a.apodos || [],
        tipoMembresia: 'Membresía mensual',
        estado: 'Activo',
        creadoEn: serverTimestamp(),
      });

      // 2. Registrar pago de Marzo 2026
      await addDoc(collection(db, 'pagos'), {
        alumnoId: alumnoRef.id,
        nombre: a.nombre,
        mes: 'Marzo 2026',
        monto,
        estado: 'Pagado',
        metodo: 'EFT',
        disciplina: 'Futvoley',
        tipo: 'membresia',
        fecha: a.fechaPago,
        horario: a.horario,
        creadoEn: serverTimestamp(),
      });

      // 3. Llenar slots en cancha3 para todo Marzo
      let slotsMsg = '(sin días fijos)';
      if (a.diasElegidos.length > 0 && a.horario) {
        const fechas = await llenarCuposMembresia(
          alumnoRef.id,
          a.diasElegidos,
          a.horario,
          3,
          2026,
          'Futvoley'
        );
        slotsMsg = `${fechas.length} slots → ${fechas.join(', ')}`;
      }

      console.log(`✓ ${a.nombre.padEnd(30)} | $${String(monto).padStart(6)} | pago: ${a.fechaPago} | ${slotsMsg}`);
      ok++;
    } catch (err) {
      console.error(`✗ ${a.nombre}: ${err.message}`);
      errores.push(a.nombre);
    }
  }

  console.log(`\n────────────────────────────────────────`);
  console.log(`✅ Importados: ${ok}/${ALUMNOS_MARZO.length}`);
  if (errores.length) {
    console.log(`❌ Errores:    ${errores.join(', ')}`);
  }

  process.exit(errores.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
