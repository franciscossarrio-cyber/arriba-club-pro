/**
 * firestore.js — Capa de acceso a datos (Firestore)
 *
 * Colecciones:
 *   alumnos          — estudiantes del club
 *   pagos            — pagos mensuales
 *   clases           — slots de clase por cancha/fecha/horario (ID: "{canchaId}-{fecha_}-{horario}")
 *   clases/{id}/asistencias/{alumnoId} — asistencia de cada alumno a una clase
 *   cambios_turno    — solicitudes de cambio de horario
 *   profesores       — profesores del club
 */

import {
  collection,
  collectionGroup,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocFromServer,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
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


/** ID de clase: "{canchaId}-{fecha_}-{horario}" (ej: "cancha3-15_04-18:00")
 *  La fecha usa _ en vez de / porque Firestore trata / como separador de ruta. */
const claseId = (canchaId, fecha, horario) =>
  `${canchaId}-${fecha.replace('/', '_')}-${horario}`;

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
    horariosPorDia: data.horariosPorDia || {},
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

/**
 * Remueve a un alumno de todos los slots de clases que lo contengan en un mes dado.
 * Se llama después de deleteAlumno para mantener consistencia.
 */
export async function limpiarAlumnoDeClases(alumnoId, mes) {
  const q = query(
    collection(db, 'clases'),
    where('alumnos', 'array-contains', alumnoId),
    where('mes', '==', mes),
  );
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { alumnos: arrayRemove(alumnoId) }));
  await batch.commit();
}

// ─── PAGOS ───────────────────────────────────────────────────────────────────

/** Devuelve pagos, opcionalmente filtrados por mes (ej: "Marzo 2026"). */
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

/**
 * Busca pagos pendientes de un tipo dado para un alumno en una fecha/horario dados.
 */
export async function getPagosPendientesPorTipo(alumnoId, tipo, fecha, horario) {
  const q = query(
    collection(db, 'pagos'),
    where('alumnoId', '==', alumnoId),
    where('tipo', '==', tipo),
    where('estado', '==', 'Pendiente'),
  );
  const snap = await getDocs(q);
  return snapToArray(snap).filter(p => p.fecha === fecha && p.horario === horario);
}

export const getPagosSueltaPendientes = (alumnoId, fecha, horario) =>
  getPagosPendientesPorTipo(alumnoId, 'suelta', fecha, horario);

/** Elimina un pago. */
export async function deletePago(id) {
  await deleteDoc(doc(db, 'pagos', id));
}

// ─── CLASES ──────────────────────────────────────────────────────────────────
//
// Cada documento representa una clase física en una cancha/fecha/horario.
// Los alumnos sin estado (inscriptos) van en el array `alumnos[]`.
// La asistencia de cada alumno vive en la subcol `asistencias/{alumnoId}`.

/**
 * Devuelve la clase de una cancha en una fecha y horario.
 * Retorna null si no existe.
 */
export async function getClase(canchaId, fecha, horario) {
  const snap = await getDoc(
    doc(db, 'clases', claseId(canchaId, fecha, horario)),
  );
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Devuelve todas las clases de un mes dado. */
export async function getClasesMes(mes) {
  const q = query(collection(db, 'clases'), where('mes', '==', mes));
  const snap = await getDocs(q);
  return snapToArray(snap);
}

/**
 * Crea o actualiza una clase (merge).
 * @param {string} canchaId
 * @param {string} fecha     — "dd/mm"
 * @param {string} horario   — "18:00"
 * @param {Object} data      — { mes, disciplina, alumnos[], tipo, profesorId? }
 */
export async function setClase(canchaId, fecha, horario, data) {
  const ref = doc(db, 'clases', claseId(canchaId, fecha, horario));
  await setDoc(
    ref,
    { canchaId, fecha, horario, ...data, creadoEn: serverTimestamp() },
    { merge: true },
  );
}

/**
 * Agrega un alumno al array `alumnos` de una clase (crea el doc si no existe).
 * @param {Object} extra — { mes, disciplina, tipo } para completar el doc si es nuevo.
 */
export async function agregarAlumnoAClase(canchaId, fecha, horario, alumnoId, extra = {}) {
  const ref = doc(db, 'clases', claseId(canchaId, fecha, horario));
  await setDoc(
    ref,
    { canchaId, fecha, horario, ...extra, alumnos: arrayUnion(alumnoId), creadoEn: serverTimestamp() },
    { merge: true },
  );
}

/**
 * Remueve un alumno del array `alumnos` de una clase.
 */
export async function removerAlumnoDeClase(canchaId, fecha, horario, alumnoId, mes, currentAlumnos = []) {
  const ref = doc(db, 'clases', claseId(canchaId, fecha, horario));
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await setDoc(
      ref,
      { canchaId, fecha, horario, mes, alumnos: arrayRemove(alumnoId), removidos: arrayUnion(alumnoId) },
      { merge: true },
    );
  } else {
    // Slot virtual: escribimos la lista real sin el alumno
    const newAlumnos = currentAlumnos.filter(id => id !== alumnoId);
    await setDoc(ref, {
      canchaId, fecha, horario, mes,
      alumnos: newAlumnos,
      removidos: [alumnoId],
    });
  }
}

/**
 * Asigna (o quita) un profesor a una clase.
 * Si la clase no existe aún, la crea con merge.
 *
 * @param {string}      canchaId
 * @param {string}      fecha       — "dd/mm"
 * @param {string}      horario     — "18:00"
 * @param {string|null} profesorId  — null para quitar la asignación
 * @param {string}      mes         — "Marzo 2026"
 */
export async function setClaseProfesorId(canchaId, fecha, horario, profesorId, mes = '') {
  const ref = doc(db, 'clases', claseId(canchaId, fecha, horario));
  await setDoc(
    ref,
    { canchaId, fecha, horario, mes, profesorId: profesorId || null },
    { merge: true },
  );
}

/**
 * Repite un turno (mismo tipo, disciplina, profesor y alumnos si los hay) en
 * los días de la semana indicados, a partir de una fecha de inicio y hasta
 * fin del mes de inicio o durante N semanas. Los alumnos son opcionales
 * (se puede repetir un turno vacío, ej. para reservar un horario con profesor).
 *
 * @param {string}   canchaId
 * @param {string}   horario     — ej: "18:00"
 * @param {number[]} diasSemana  — ej: [1, 3] para Lunes y Miércoles (0=Dom…6=Sáb)
 * @param {string}   fechaInicio — "dd/mm" de la primera fecha a considerar
 * @param {number}   mesInicio   — 1-12
 * @param {number}   anioInicio
 * @param {{modo: 'mes'|'semanas', semanas?: number}} duracion
 * @param {{disciplina: string, tipo: string, alumnoIds?: string[], profesorId?: string}} datos
 * @returns {string[]} fechas generadas en formato "dd/mm"
 */
export async function repetirTurno(
  canchaId,
  horario,
  diasSemana,
  fechaInicio,
  mesInicio,
  anioInicio,
  duracion,
  { disciplina, tipo, alumnoIds, profesorId },
) {
  const [ddIni, mmIni] = fechaInicio.split('/').map(Number);
  const inicio = new Date(anioInicio, mmIni - 1, ddIni);
  const fin = duracion.modo === 'semanas'
    ? new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + duracion.semanas * 7 - 1)
    : new Date(anioInicio, mesInicio, 0);

  const fechas = [];
  const cursor = new Date(inicio);
  while (cursor <= fin) {
    if (diasSemana.includes(cursor.getDay())) {
      const dia = String(cursor.getDate()).padStart(2, '0');
      const mesStr = String(cursor.getMonth() + 1).padStart(2, '0');
      fechas.push({
        fecha: `${dia}/${mesStr}`,
        mes: `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}`,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (fechas.length === 0) return [];

  // Identifica todas las clases generadas por esta repetición, para poder
  // luego preguntar "¿modificar todas o solo esta?" y aplicarlo en bloque.
  const serieId = `serie_${canchaId}_${horario}_${Date.now()}`;

  await Promise.all(
    fechas.map(({ fecha, mes }) => {
      const ref = doc(db, 'clases', claseId(canchaId, fecha, horario));
      return setDoc(
        ref,
        {
          canchaId,
          fecha,
          horario,
          mes,
          disciplina,
          tipo,
          serieId,
          ...(alumnoIds?.length ? { alumnos: arrayUnion(...alumnoIds) } : {}),
          ...(profesorId ? { profesorId } : {}),
          creadoEn: serverTimestamp(),
        },
        { merge: true },
      );
    })
  );

  return fechas.map(f => f.fecha);
}

/**
 * Devuelve todas las clases que pertenecen a una serie repetida (`serieId`).
 */
export async function getClasesPorSerie(serieId) {
  const q = query(collection(db, 'clases'), where('serieId', '==', serieId));
  const snap = await getDocs(q);
  return snapToArray(snap);
}

/**
 * Aplica un cambio (tipo, disciplina y/o profesorId) a todas las clases de
 * una serie repetida. No toca los alumnos de cada clase individual.
 * @param {string} serieId
 * @param {{tipo?: string, disciplina?: string, profesorId?: string|null}} data
 * @returns {number} cantidad de clases actualizadas
 */
export async function actualizarSerie(serieId, data) {
  const clases = await getClasesPorSerie(serieId);
  await Promise.all(
    clases.map(c => setDoc(doc(db, 'clases', c.id), data, { merge: true }))
  );
  return clases.length;
}

/**
 * Elimina una clase completa (todos sus alumnos y su asistencia registrada)
 * de una cancha/fecha/horario, sin necesidad de sacar alumnos uno por uno.
 * También cancela las deudas Pendientes (suelta/privada/day use) de los
 * alumnos que iban a asistir a esa clase — si el turno se borra, no
 * corresponde seguir cobrándoles algo a lo que ya no van a ir.
 * @param {number} [anio] — si no se pasa, se infiere del campo `mes` de la clase.
 */
export async function eliminarClase(canchaId, fecha, horario, anio) {
  const cId = claseId(canchaId, fecha, horario);
  // Lectura forzada al servidor (no caché local) para no perder alumnos
  // agregados justo antes de borrar, que todavía no llegaron a la caché.
  const claseSnap = await getDocFromServer(doc(db, 'clases', cId)).catch(() => getDoc(doc(db, 'clases', cId)));
  const claseData = claseSnap.exists() ? claseSnap.data() : null;
  const alumnoIds = claseData?.alumnos || [];
  const anioReal = anio || (claseData?.mes ? parseInt(claseData.mes.split(' ')[1], 10) : null);

  if (alumnoIds.length > 0 && anioReal) {
    const fechaCompleta = `${fecha}/${anioReal}`;
    const pagosSnap = await getDocs(query(collection(db, 'pagos'), where('horario', '==', horario)));
    await Promise.all(
      pagosSnap.docs
        .filter(d => {
          const p = d.data();
          return p.estado === 'Pendiente' && p.fecha === fechaCompleta && alumnoIds.includes(p.alumnoId);
        })
        .map(d => deleteDoc(d.ref))
    );
  }

  const asistSnap = await getDocs(collection(db, 'clases', cId, 'asistencias'));
  await Promise.all(asistSnap.docs.map(d => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'clases', cId));
}

/**
 * Elimina TODAS las clases de una serie repetida (`serieId`), cancelando
 * también las deudas pendientes de los alumnos en cada una.
 * @returns {number} cantidad de clases eliminadas
 */
export async function eliminarSerie(serieId) {
  const clases = await getClasesPorSerie(serieId);
  await Promise.all(clases.map(c => eliminarClase(c.canchaId, c.fecha, c.horario)));
  return clases.length;
}

// ─── ASISTENCIAS (subcol de clases) ──────────────────────────────────────────
//
// Ruta: clases/{claseId}/asistencias/{alumnoId}
// El alumnoId es el ID del documento para hacer upserts O(1).
// Para leer todo el mes se usa un collection group query.

/**
 * Devuelve todas las asistencias de un mes via collection group.
 * Se filtra en memoria para evitar requerir un índice compuesto en Firestore.
 */
export async function getAsistencias(mes = null) {
  const snap = await getDocs(collectionGroup(db, 'asistencias'));
  const all = snapToArray(snap);
  return mes ? all.filter(a => a.mes === mes) : all;
}

/**
 * Registra o actualiza la asistencia de un alumno en una clase.
 *
 * @param {string} canchaId
 * @param {string} fecha      — "dd/mm"
 * @param {string} horario    — "18:00"
 * @param {string} alumnoId
 * @param {Object} data       — { estado, mes }
 */
export async function setAsistencia(canchaId, fecha, horario, alumnoId, data) {
  const cId = claseId(canchaId, fecha, horario);
  const ref = doc(db, 'clases', cId, 'asistencias', alumnoId);
  await setDoc(
    ref,
    { alumnoId, fecha, horario, ...data, registradoEn: serverTimestamp() },
    { merge: true },
  );
}

/**
 * Elimina la asistencia de un alumno en una clase.
 *
 * @param {string} canchaId
 * @param {string} fecha    — "dd/mm"
 * @param {string} horario  — "18:00"
 * @param {string} alumnoId
 */
export async function removeAsistencia(canchaId, fecha, horario, alumnoId) {
  const cId = claseId(canchaId, fecha, horario);
  await deleteDoc(doc(db, 'clases', cId, 'asistencias', alumnoId));
}

/**
 * Carga masiva de asistencias en batch.
 * @param {Array<Object>} items — [{ canchaId, fecha, horario, alumnoId, estado, mes }]
 */
export async function addAsistenciasLote(items) {
  if (!items || items.length === 0) return;

  const CHUNK = 500;
  for (let i = 0; i < items.length; i += CHUNK) {
    const batch = writeBatch(db);
    items.slice(i, i + CHUNK).forEach((item) => {
      const cId = claseId(item.canchaId || 'cancha3', item.fecha, item.horario);
      const ref = doc(db, 'clases', cId, 'asistencias', item.alumnoId);
      batch.set(ref, {
        alumnoId: item.alumnoId,
        fecha: item.fecha,
        horario: item.horario,
        mes: item.mes,
        estado: item.estado || 'asistio',
        registradoEn: serverTimestamp(),
      }, { merge: true });
    });
    await batch.commit();
  }
}

// ─── CAMBIOS DE TURNO ────────────────────────────────────────────────────────

/** Devuelve cambios de turno, opcionalmente filtrados por mes. */
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

/** Actualiza el estado de un cambio de turno. */
export async function updateCambioTurno(id, data) {
  await updateDoc(doc(db, 'cambios_turno', id), data);
}

/** Elimina un cambio de turno. */
export async function deleteCambioTurno(id) {
  await deleteDoc(doc(db, 'cambios_turno', id));
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────

/**
 * Devuelve el documento de configuración (precios, preciosTipos, etc.).
 * Retorna null si no existe.
 */
export async function getConfig() {
  const snap = await getDoc(doc(db, 'config', 'precios'));
  return snap.exists() ? snap.data() : null;
}

/**
 * Guarda (merge) el documento de configuración.
 * @param {Object} data — puede incluir { precios, preciosTipos }
 */
export async function setConfig(data) {
  await setDoc(doc(db, 'config', 'precios'), data, { merge: true });
}

/** Devuelve la config específica de un mes (ej: "Mayo 2026"). Retorna null si no existe. */
export async function getConfigMes(mes) {
  const key = mes.replace(' ', '-');
  const snap = await getDoc(doc(db, 'config', `precios-${key}`));
  return snap.exists() ? snap.data() : null;
}

/** Guarda (merge) la config específica de un mes. */
export async function setConfigMes(mes, data) {
  const key = mes.replace(' ', '-');
  await setDoc(doc(db, 'config', `precios-${key}`), data, { merge: true });
}

/**
 * Devuelve todas las configs mensuales guardadas (docs "precios-{Mes-Año}"),
 * cada una con su `mes` en formato "Mes Año". Se usa para "heredar" el precio
 * vigente en meses futuros sin tocar los meses anteriores al cambio.
 */
export async function getTodasConfigMes() {
  const snap = await getDocs(collection(db, 'config'));
  return snap.docs
    .filter(d => d.id.startsWith('precios-'))
    .map(d => ({
      mes: d.id.replace('precios-', '').replace('-', ' '),
      ...d.data(),
    }));
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

/** Elimina un profesor. */
export async function deleteProfesor(id) {
  await deleteDoc(doc(db, 'profesores', id));
}

// ─── PRODUCTOS (Shop) ─────────────────────────────────────────────────────────

/** Devuelve todos los productos del shop. */
export async function getProductos() {
  const snap = await getDocs(query(collection(db, 'productos'), where('estado', '!=', 'eliminado')));
  return snapToArray(snap);
}

/** Agrega un producto. */
export async function addProducto(data) {
  const ref = await addDoc(collection(db, 'productos'), {
    ...data,
    estado: 'activo',
    creadoEn: serverTimestamp(),
  });
  return ref.id;
}

/** Actualiza campos de un producto. */
export async function updateProducto(id, data) {
  await updateDoc(doc(db, 'productos', id), data);
}

/** Elimina (soft delete) un producto. */
export async function deleteProducto(id) {
  await updateDoc(doc(db, 'productos', id), { estado: 'eliminado' });
}

// ─── FACTURAS (Shop) ──────────────────────────────────────────────────────────

/** Devuelve todas las facturas, ordenadas por fecha desc. */
export async function getFacturas() {
  const snap = await getDocs(collection(db, 'facturas'));
  return snapToArray(snap).sort((a, b) => (b.creadoEn?.seconds || 0) - (a.creadoEn?.seconds || 0));
}

/** Agrega una factura y devuelve su ID. */
export async function addFactura(data) {
  const ref = await addDoc(collection(db, 'facturas'), {
    ...data,
    estado: data.estado || 'borrador',
    creadoEn: serverTimestamp(),
  });
  return ref.id;
}

/** Actualiza una factura (ej: marcar como enviada o error). */
export async function updateFactura(id, data) {
  await updateDoc(doc(db, 'facturas', id), data);
}

// ─── CONFIG ARCA ──────────────────────────────────────────────────────────────

/** Devuelve la configuración ARCA guardada. */
export async function getConfigArca() {
  const snap = await getDoc(doc(db, 'config', 'arca'));
  return snap.exists() ? snap.data() : null;
}

/** Guarda (merge) la configuración ARCA. */
export async function setConfigArca(data) {
  await setDoc(doc(db, 'config', 'arca'), data, { merge: true });
}
