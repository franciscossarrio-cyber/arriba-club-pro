/**
 * firestore.js — Capa de acceso a datos (Firestore)
 *
 * Colecciones:
 *   alumnos          — estudiantes del club
 *   pagos            — pagos mensuales
 *   asistencias      — registros de asistencia
 *   ocupacion_cancha — slots de cancha por fecha/horario (ID: "{canchaId}-{fecha}-{horario}")
 *   cambios_turno    — solicitudes de cambio de horario
 *   profesores       — profesores del club
 *   clases_profe     — asignación profe↔clase (ID: "{disciplina}-{fecha}-{horario}")
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';

import { db } from './config';

// ─── Helpers ────────────────────────────────────────────────────────────────

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

/** Convierte un snapshot de colección a un array con el campo `id` incluido. */
const snapToArray = (snapshot) =>
  snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

/**
 * Genera todas las fechas "dd/mm" del mes que caen en los días de la semana
 * indicados en `diasElegidos` (array de números: 0=Dom … 6=Sáb).
 */
function getFechasDelMes(diasElegidos, mes, anio) {
  const fechas = [];
  const ultimo = new Date(anio, mes, 0).getDate(); // último día del mes
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

// ─── ALUMNOS ─────────────────────────────────────────────────────────────────

/** Devuelve todos los alumnos. */
export async function getAlumnos() {
  const snap = await getDocs(collection(db, 'alumnos'));
  return snapToArray(snap);
}

/** Devuelve un alumno por ID. */
export async function getAlumnoById(id) {
  const snap = await getDoc(doc(db, 'alumnos', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Agrega un alumno nuevo.
 * @param {Object} data — { nombre, telefono, plan, frecuencia, horario, disciplinas[],
 *                          tipoClase, diasElegidos[], apodos[], estado }
 */
export async function addAlumno(data) {
  const ref = await addDoc(collection(db, 'alumnos'), {
    ...data,
    disciplinas: data.disciplinas || [],
    diasElegidos: data.diasElegidos || [],
    apodos: data.apodos || [],
    estado: data.estado || 'Activo',
    creadoEn: serverTimestamp(),
  });
  return ref.id;
}

/** Actualiza campos de un alumno. */
export async function updateAlumno(id, data) {
  await updateDoc(doc(db, 'alumnos', id), data);
}

/** Elimina un alumno. */
export async function deleteAlumno(id) {
  await deleteDoc(doc(db, 'alumnos', id));
}

// ─── PAGOS ───────────────────────────────────────────────────────────────────

/**
 * Devuelve pagos, opcionalmente filtrados por mes (ej: "Marzo 2026").
 */
export async function getPagos(mes = null) {
  let q = collection(db, 'pagos');
  if (mes) {
    q = query(q, where('mes', '==', mes));
  }
  const snap = await getDocs(q);
  return snapToArray(snap);
}

/** Devuelve un pago por ID. */
export async function getPagoById(id) {
  const snap = await getDoc(doc(db, 'pagos', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Registra un pago.
 * @param {Object} data — { alumnoId, nombre, mes, monto, estado, metodo,
 *                          disciplina, tipoClase, fecha, horario }
 */
export async function addPago(data) {
  const ref = await addDoc(collection(db, 'pagos'), {
    ...data,
    estado: data.estado || 'Pagado',
    creadoEn: serverTimestamp(),
  });
  return ref.id;
}

/** Actualiza campos de un pago. */
export async function updatePago(id, data) {
  await updateDoc(doc(db, 'pagos', id), data);
}

/** Elimina un pago. */
export async function deletePago(id) {
  await deleteDoc(doc(db, 'pagos', id));
}

// ─── ASISTENCIAS ─────────────────────────────────────────────────────────────

/**
 * Devuelve asistencias, opcionalmente filtradas por mes.
 */
export async function getAsistencias(mes = null) {
  let q = collection(db, 'asistencias');
  if (mes) {
    q = query(q, where('mes', '==', mes));
  }
  const snap = await getDocs(q);
  return snapToArray(snap);
}

/**
 * Agrega una asistencia individual.
 * @param {Object} data — { alumnoId, fecha, horario, disciplina, estado, mes }
 */
export async function addAsistencia(data) {
  const ref = await addDoc(collection(db, 'asistencias'), {
    ...data,
    estado: data.estado || 'asistio',
    creadoEn: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Agrega múltiples asistencias en un solo batch (límite Firestore: 500 ops).
 * @param {Array<Object>} items — array de { alumnoId, fecha, horario, disciplina, estado, mes }
 */
export async function addAsistenciasLote(items) {
  if (!items || items.length === 0) return;

  // Firestore permite máximo 500 operaciones por batch
  const CHUNK = 500;
  for (let i = 0; i < items.length; i += CHUNK) {
    const batch = writeBatch(db);
    items.slice(i, i + CHUNK).forEach((item) => {
      const ref = doc(collection(db, 'asistencias'));
      batch.set(ref, {
        ...item,
        estado: item.estado || 'asistio',
        creadoEn: serverTimestamp(),
      });
    });
    await batch.commit();
  }
}

/**
 * Elimina una asistencia por alumnoId + fecha (+ horario opcional).
 * Borra todos los docs que coincidan.
 */
export async function removeAsistencia(alumnoId, fecha, horario = null) {
  let q = query(
    collection(db, 'asistencias'),
    where('alumnoId', '==', alumnoId),
    where('fecha', '==', fecha),
  );
  if (horario) {
    q = query(q, where('horario', '==', horario));
  }
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

/** Actualiza campos de una asistencia. */
export async function updateAsistencia(id, data) {
  await updateDoc(doc(db, 'asistencias', id), data);
}

// ─── OCUPACION CANCHA ────────────────────────────────────────────────────────

/** ID de slot: "{canchaId}-{fecha}-{horario}" (ej: "cancha3-15/03-18:00") */
const slotId = (canchaId, fecha, horario) =>
  `${canchaId}-${fecha}-${horario}`;

/**
 * Devuelve el slot de una cancha en una fecha y horario.
 * Retorna null si no existe.
 */
export async function getSlot(canchaId, fecha, horario) {
  const snap = await getDoc(
    doc(db, 'ocupacion_cancha', slotId(canchaId, fecha, horario)),
  );
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Devuelve todos los slots de un mes dado.
 */
export async function getOcupacionMes(mes) {
  const q = query(collection(db, 'ocupacion_cancha'), where('mes', '==', mes));
  const snap = await getDocs(q);
  return snapToArray(snap);
}

/**
 * Crea o actualiza un slot (merge).
 * @param {string} canchaId
 * @param {string} fecha — "dd/mm"
 * @param {string} horario — "18:00"
 * @param {Object} data — { mes, disciplina, alumnos[], tipo }
 */
export async function setSlot(canchaId, fecha, horario, data) {
  const ref = doc(db, 'ocupacion_cancha', slotId(canchaId, fecha, horario));
  await setDoc(
    ref,
    { canchaId, fecha, horario, ...data, creadoEn: serverTimestamp() },
    { merge: true },
  );
}

/**
 * Agrega un alumno al array `alumnos` de un slot (crea el slot si no existe).
 */
export async function agregarAlumnoASlot(canchaId, fecha, horario, alumnoId) {
  const ref = doc(db, 'ocupacion_cancha', slotId(canchaId, fecha, horario));
  await setDoc(
    ref,
    { canchaId, fecha, horario, alumnos: arrayUnion(alumnoId), creadoEn: serverTimestamp() },
    { merge: true },
  );
}

/**
 * Remueve un alumno del array `alumnos` de un slot.
 */
export async function removerAlumnoDeSlot(canchaId, fecha, horario, alumnoId) {
  const ref = doc(db, 'ocupacion_cancha', slotId(canchaId, fecha, horario));
  await updateDoc(ref, { alumnos: arrayRemove(alumnoId) });
}

/**
 * Llena los cupos de membresía para un alumno en un mes completo.
 *
 * Para cada fecha del mes que coincida con `diasElegidos` (números de día de la
 * semana: 0=Dom, 1=Lun … 6=Sáb), crea/actualiza el slot en `cancha3` agregando
 * al alumno. Usa writeBatch para minimizar round-trips.
 *
 * @param {string}   alumnoId
 * @param {number[]} diasElegidos — ej: [1, 3] para Lunes y Miércoles
 * @param {string}   horario      — ej: "18:00"
 * @param {number}   mes          — 1-12
 * @param {number}   anio
 * @param {string}   [disciplina]
 * @returns {string[]} fechas generadas en formato "dd/mm"
 */
export async function llenarCuposMembresia(
  alumnoId,
  diasElegidos,
  horario,
  mes,
  anio,
  disciplina = '',
) {
  const fechas = getFechasDelMes(diasElegidos, mes, anio);
  if (fechas.length === 0) return [];

  const mesLabel = `${MESES[mes - 1]} ${anio}`; // ej: "Marzo 2026"
  const canchaId = 'cancha3';
  const batch = writeBatch(db);

  fechas.forEach((fecha) => {
    const ref = doc(db, 'ocupacion_cancha', slotId(canchaId, fecha, horario));
    batch.set(
      ref,
      {
        canchaId,
        fecha,
        horario,
        mes: mesLabel,
        disciplina,
        alumnos: arrayUnion(alumnoId),
        tipo: 'membresia',
        creadoEn: serverTimestamp(),
      },
      { merge: true },
    );
  });

  await batch.commit();
  return fechas;
}

// ─── CAMBIOS DE TURNO ────────────────────────────────────────────────────────

/**
 * Devuelve cambios de turno, opcionalmente filtrados por mes.
 */
export async function getCambiosTurno(mes = null) {
  let q = collection(db, 'cambios_turno');
  if (mes) {
    q = query(q, where('mes', '==', mes));
  }
  const snap = await getDocs(q);
  return snapToArray(snap);
}

/**
 * Registra un pedido de cambio de turno.
 * @param {Object} data — { alumnoId, fechaOriginal, horarioOriginal,
 *                          fechaNueva, horarioNuevo, disciplina, mes }
 */
export async function addCambioTurno(data) {
  const ref = await addDoc(collection(db, 'cambios_turno'), {
    ...data,
    estado: 'pendiente',
    creadoEn: serverTimestamp(),
  });
  return ref.id;
}

/** Actualiza el estado de un cambio de turno (pendiente | aprobado | rechazado). */
export async function updateCambioTurno(id, data) {
  await updateDoc(doc(db, 'cambios_turno', id), data);
}

/** Elimina un cambio de turno. */
export async function deleteCambioTurno(id) {
  await deleteDoc(doc(db, 'cambios_turno', id));
}

// ─── PROFESORES ──────────────────────────────────────────────────────────────

/** Devuelve todos los profesores. */
export async function getProfesores() {
  const snap = await getDocs(collection(db, 'profesores'));
  return snapToArray(snap);
}

/** Devuelve un profesor por ID. */
export async function getProfesorById(id) {
  const snap = await getDoc(doc(db, 'profesores', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Agrega un profesor.
 * @param {Object} data — { nombre, cbu, estado }
 */
export async function addProfesor(data) {
  const ref = await addDoc(collection(db, 'profesores'), {
    ...data,
    estado: data.estado || 'Activo',
    creadoEn: serverTimestamp(),
  });
  return ref.id;
}

/** Actualiza campos de un profesor. */
export async function updateProfesor(id, data) {
  await updateDoc(doc(db, 'profesores', id), data);
}

/** Elimina un profesor (soft delete recomendado: estado = 'Inactivo'). */
export async function deleteProfesor(id) {
  await deleteDoc(doc(db, 'profesores', id));
}

// ─── CLASES PROFE ─────────────────────────────────────────────────────────────

/** ID de clase: "{disciplina}-{fecha}-{horario}" */
const claseId = (disciplina, fecha, horario) =>
  `${disciplina}-${fecha}-${horario}`;

/**
 * Devuelve todas las clases asignadas a profes, opcionalmente por mes.
 */
export async function getClasesProfe(mes = null) {
  let q = collection(db, 'clases_profe');
  if (mes) {
    q = query(q, where('mes', '==', mes));
  }
  const snap = await getDocs(q);
  return snapToArray(snap);
}

/**
 * Asigna (o reasigna) un profesor a una clase.
 * Si `profesorId` es null elimina la asignación.
 *
 * @param {string} disciplina
 * @param {string} fecha     — "dd/mm"
 * @param {string} horario   — "18:00"
 * @param {string|null} profesorId
 * @param {string} mes       — "Marzo 2026"
 */
export async function setClaseProfe(disciplina, fecha, horario, profesorId, mes = '') {
  const ref = doc(db, 'clases_profe', claseId(disciplina, fecha, horario));
  if (profesorId === null) {
    await deleteDoc(ref);
  } else {
    await setDoc(ref, { disciplina, fecha, horario, profesorId, mes }, { merge: true });
  }
}

/** Elimina la asignación de un profesor a una clase. */
export async function deleteClaseProfe(disciplina, fecha, horario) {
  await deleteDoc(doc(db, 'clases_profe', claseId(disciplina, fecha, horario)));
}
