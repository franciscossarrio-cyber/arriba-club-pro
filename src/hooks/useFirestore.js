/**
 * useFirestore.js — Hook de acceso a Firestore
 *
 * Expone todas las funciones de firestore.js envueltas con manejo de
 * estado loading/error.
 */

import { useState, useCallback, useMemo } from 'react';
import * as fs from '../firebase/firestore';

export const useFirestore = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const clearError = useCallback(() => setError(null), []);

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

  const fns = useMemo(() => ({
    // ── Alumnos ───────────────────────────────────────────────────────────
    getAlumnos:      wrap(fs.getAlumnos),
    getAlumnoById:   wrap(fs.getAlumnoById),
    addAlumno:       wrap(fs.addAlumno),
    updateAlumno:    wrap(fs.updateAlumno),
    deleteAlumno:          wrap(fs.deleteAlumno),
    limpiarAlumnoDeClases: wrap(fs.limpiarAlumnoDeClases),

    // ── Pagos ─────────────────────────────────────────────────────────────
    getPagos:                  wrap(fs.getPagos),
    getPagoById:               wrap(fs.getPagoById),
    addPago:                   wrap(fs.addPago),
    updatePago:                wrap(fs.updatePago),
    deletePago:                wrap(fs.deletePago),
    getPagosSueltaPendientes:     wrap(fs.getPagosSueltaPendientes),
    getPagosPendientesPorTipo:    wrap(fs.getPagosPendientesPorTipo),

    // ── Asistencias (subcol de clases) ────────────────────────────────────
    /** @param {string|null} mes */
    getAsistencias:     wrap(fs.getAsistencias),
    /**
     * Upsert de asistencia individual.
     * @param {string} canchaId
     * @param {string} fecha     — "dd/mm"
     * @param {string} horario
     * @param {string} alumnoId
     * @param {Object} data      — { estado, mes }
     */
    setAsistencia:      wrap(fs.setAsistencia),
    /**
     * Elimina la asistencia de un alumno en una clase.
     * @param {string} canchaId
     * @param {string} fecha    — "dd/mm"
     * @param {string} horario
     * @param {string} alumnoId
     */
    removeAsistencia:   wrap(fs.removeAsistencia),
    /**
     * Carga masiva — items: [{ canchaId, fecha, horario, alumnoId, estado, mes }]
     * @param {Array<Object>} items
     */
    addAsistenciasLote: wrap(fs.addAsistenciasLote),

    // ── Clases ────────────────────────────────────────────────────────────
    /** @param {string} canchaId @param {string} fecha @param {string} horario */
    getClase:              wrap(fs.getClase),
    /** @param {string} mes */
    getClasesMes:          wrap(fs.getClasesMes),
    /**
     * @param {string} canchaId @param {string} fecha @param {string} horario
     * @param {Object} data — { mes, disciplina, alumnos[], tipo, profesorId? }
     */
    setClase:              wrap(fs.setClase),
    /** @param {string} canchaId @param {string} fecha @param {string} horario @param {string} alumnoId */
    agregarAlumnoAClase:   wrap(fs.agregarAlumnoAClase),
    /** @param {string} canchaId @param {string} fecha @param {string} horario @param {string} alumnoId */
    removerAlumnoDeClase:  wrap(fs.removerAlumnoDeClase),
    /**
     * Asigna o quita un profesor de una clase.
     * @param {string}      canchaId
     * @param {string}      fecha
     * @param {string}      horario
     * @param {string|null} profesorId
     * @param {string}      mes
     */
    setClaseProfesorId:    wrap(fs.setClaseProfesorId),
    /**
     * Repite un turno en los días de la semana indicados, hasta fin de mes
     * o durante N semanas.
     * @param {string}   canchaId
     * @param {string}   horario
     * @param {number[]} diasSemana
     * @param {string}   fechaInicio
     * @param {number}   mesInicio
     * @param {number}   anioInicio
     * @param {{modo: 'mes'|'semanas', semanas?: number}} duracion
     * @param {{disciplina: string, tipo: string, alumnoIds: string[]}} datos
     */
    repetirTurno:  wrap(fs.repetirTurno),
    /**
     * Aplica tipo/disciplina/profesorId a todas las clases de una serie repetida.
     * @param {string} serieId
     * @param {{tipo?: string, disciplina?: string, profesorId?: string|null}} data
     */
    actualizarSerie: wrap(fs.actualizarSerie),

    // ── Cambios de Turno ──────────────────────────────────────────────────
    getCambiosTurno:   wrap(fs.getCambiosTurno),
    addCambioTurno:    wrap(fs.addCambioTurno),
    updateCambioTurno: wrap(fs.updateCambioTurno),
    deleteCambioTurno: wrap(fs.deleteCambioTurno),

    // ── Config ────────────────────────────────────────────────────────────
    getConfig:    wrap(fs.getConfig),
    setConfig:    wrap(fs.setConfig),
    getConfigMes: wrap(fs.getConfigMes),
    setConfigMes: wrap(fs.setConfigMes),

    // ── Profesores ────────────────────────────────────────────────────────
    getProfesores:   wrap(fs.getProfesores),
    getProfesorById: wrap(fs.getProfesorById),
    addProfesor:     wrap(fs.addProfesor),
    updateProfesor:  wrap(fs.updateProfesor),
    deleteProfesor:  wrap(fs.deleteProfesor),
  }), [wrap]);

  return {
    loading,
    error,
    clearError,
    ...fns,
  };
};

export default useFirestore;
