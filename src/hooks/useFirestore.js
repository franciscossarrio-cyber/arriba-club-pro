/**
 * useFirestore.js — Hook de acceso a Firestore
 *
 * Reemplaza a useApi.js. Expone todas las funciones de firestore.js
 * envueltas con manejo de estado loading/error.
 *
 * Uso:
 *   const { getAlumnos, addPago, loading, error, clearError } = useFirestore();
 */

import { useState, useCallback, useMemo } from 'react';
import * as fs from '../firebase/firestore';

export const useFirestore = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Envuelve una función async de Firestore con manejo de loading/error.
   * Devuelve una nueva función que, al llamarse, gestiona el estado automáticamente.
   */
  const wrap = useCallback(
    (fn) =>
      async (...args) => {
        setLoading(true);
        setError(null);
        try {
          return await fn(...args);
        } catch (err) {
          const mensaje = err?.message || 'Error al procesar la solicitud';
          setError(mensaje);
          throw err;
        } finally {
          setLoading(false);
        }
      },
    [],
  );

  // Funciones estables via useMemo (solo se recrean si `wrap` cambia, que es nunca).
  // Esto evita que useCallback en los consumidores se dispare en cada render.
  const fns = useMemo(() => ({
    // ── Alumnos ───────────────────────────────────────────────────────────
    /** @returns {Promise<Array>} lista de alumnos con campo `id` */
    getAlumnos:      wrap(fs.getAlumnos),
    /** @param {string} id */
    getAlumnoById:   wrap(fs.getAlumnoById),
    /** @param {Object} data — { nombre, telefono, plan, frecuencia, horario, disciplinas[], tipoClase, diasElegidos[], apodos[], estado } */
    addAlumno:       wrap(fs.addAlumno),
    /** @param {string} id @param {Object} data */
    updateAlumno:    wrap(fs.updateAlumno),
    /** @param {string} id */
    deleteAlumno:    wrap(fs.deleteAlumno),

    // ── Pagos ─────────────────────────────────────────────────────────────
    /** @param {string|null} mes — ej: "Marzo 2026" (null = todos) */
    getPagos:        wrap(fs.getPagos),
    /** @param {string} id */
    getPagoById:     wrap(fs.getPagoById),
    /** @param {Object} data — { alumnoId, nombre, mes, monto, estado, metodo, disciplina, tipoClase, fecha, horario } */
    addPago:         wrap(fs.addPago),
    /** @param {string} id @param {Object} data */
    updatePago:      wrap(fs.updatePago),
    /** @param {string} id */
    deletePago:      wrap(fs.deletePago),

    // ── Asistencias ───────────────────────────────────────────────────────
    /** @param {string|null} mes */
    getAsistencias:      wrap(fs.getAsistencias),
    /** @param {Object} data — { alumnoId, fecha, horario, disciplina, estado, mes } */
    addAsistencia:       wrap(fs.addAsistencia),
    /**
     * Batch insert de asistencias (usa writeBatch internamente).
     * @param {Array<Object>} items
     */
    addAsistenciasLote:  wrap(fs.addAsistenciasLote),
    /** @param {string} alumnoId @param {string} fecha — "dd/mm/aaaa" */
    removeAsistencia:    wrap(fs.removeAsistencia),
    /** @param {string} id @param {Object} data */
    updateAsistencia:    wrap(fs.updateAsistencia),

    // ── Ocupación Cancha ──────────────────────────────────────────────────
    /**
     * Devuelve el slot de una cancha.
     * @param {string} canchaId @param {string} fecha @param {string} horario
     */
    getSlot:             wrap(fs.getSlot),
    /** @param {string} mes */
    getOcupacionMes:     wrap(fs.getOcupacionMes),
    /**
     * @param {string} canchaId @param {string} fecha @param {string} horario
     * @param {Object} data — { mes, disciplina, alumnos[], tipo }
     */
    setSlot:             wrap(fs.setSlot),
    /** @param {string} canchaId @param {string} fecha @param {string} horario @param {string} alumnoId */
    agregarAlumnoASlot:  wrap(fs.agregarAlumnoASlot),
    /** @param {string} canchaId @param {string} fecha @param {string} horario @param {string} alumnoId */
    removerAlumnoDeSlot: wrap(fs.removerAlumnoDeSlot),
    /**
     * Llena todos los cupos de membresía del mes para un alumno (writeBatch).
     * @param {string}   alumnoId
     * @param {number[]} diasElegidos — 0=Dom, 1=Lun … 6=Sáb
     * @param {string}   horario
     * @param {number}   mes — 1-12
     * @param {number}   anio
     * @param {string}   [disciplina]
     */
    llenarCuposMembresia: wrap(fs.llenarCuposMembresia),

    // ── Cambios de Turno ──────────────────────────────────────────────────
    /** @param {string|null} mes */
    getCambiosTurno:   wrap(fs.getCambiosTurno),
    /** @param {Object} data — { alumnoId, fechaOriginal, horarioOriginal, fechaNueva, horarioNuevo, disciplina, mes } */
    addCambioTurno:    wrap(fs.addCambioTurno),
    /** @param {string} id @param {Object} data — { estado: 'aprobado'|'rechazado' } */
    updateCambioTurno: wrap(fs.updateCambioTurno),
    /** @param {string} id */
    deleteCambioTurno: wrap(fs.deleteCambioTurno),

    // ── Profesores ────────────────────────────────────────────────────────
    /** @returns {Promise<Array>} lista de profesores */
    getProfesores:   wrap(fs.getProfesores),
    /** @param {string} id */
    getProfesorById: wrap(fs.getProfesorById),
    /** @param {Object} data — { nombre, cbu, estado } */
    addProfesor:     wrap(fs.addProfesor),
    /** @param {string} id @param {Object} data */
    updateProfesor:  wrap(fs.updateProfesor),
    /** @param {string} id */
    deleteProfesor:  wrap(fs.deleteProfesor),

    // ── Clases Profe ──────────────────────────────────────────────────────
    /** @param {string|null} mes */
    getClasesProfe: wrap(fs.getClasesProfe),
    /**
     * @param {string}      disciplina
     * @param {string}      fecha     — "dd/mm"
     * @param {string}      horario   — "18:00"
     * @param {string|null} profesorId — null para eliminar asignación
     * @param {string}      [mes]
     */
    setClaseProfe:  wrap(fs.setClaseProfe),
    /** @param {string} disciplina @param {string} fecha @param {string} horario */
    deleteClaseProfe: wrap(fs.deleteClaseProfe),
  }), [wrap]);

  return {
    // ── Estado ────────────────────────────────────────────────────────────
    loading,
    error,
    clearError,
    ...fns,
  };
};

export default useFirestore;
