import { useState, useEffect, useCallback, useRef } from 'react';

// Components
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import Alumnos from './components/Alumnos';
import Pagos from './components/Pagos';
import Profesores from './components/Profesores';
import Configuracion from './components/Configuracion';
import GrillaCancha from './components/GrillaCancha';
import Shop from './components/Shop';
import Icon from './components/Icon';

// Hooks & Utils
import { useFirestore } from './hooks/useFirestore';
import {
  DISCIPLINAS,
  DISC_COLORS,
  HORARIOS,
  MESES,
  PRECIOS_DEFAULT,
  PRECIOS_TIPOS_DEFAULT,
  PRECIOS_PRIVADAS_DEFAULT,
  PRECIOS_QR_DEFAULT,
  getMesActual,
  getFechasClaseMes,
  getFechasMes,
  parseMesActual,
  getClasesDelMes,
  formatMonto,
  buscarAlumno,
  downloadCSV,
  storage
} from './utils/helpers';

function App() {
  // Guard para evitar deudas duplicadas en clicks rápidos concurrentes
  const deudaEnVuelo = useRef(new Set());

  // Auth
  const [autenticado, setAutenticado] = useState(() => storage.get('auth') === true);

  // Navigation
  const [seccionActiva, setSeccionActiva] = useState(() => storage.get('seccion') || 'canchas');
  const [disciplinaActiva, setDisciplinaActiva] = useState(() => storage.get('disciplina') || 'Futvoley');
  const [mesActual, setMesActual] = useState(getMesActual());

  // Data
  const [alumnos, setAlumnos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [asistencias, setAsistencias] = useState({});   // { alumnoId: { 'dd/mm|HH:mm': estado } }
  const [ocupacion, setOcupacion] = useState([]);        // docs de la colección 'clases'
  const [profesores, setProfesores] = useState(() => storage.get('profesores') || []);
  const [clasesPorProfe, setClasesPorProfe] = useState(() => storage.get('clases_profe') || {});
  const [precios, setPrecios] = useState(() => storage.get('precios') || PRECIOS_DEFAULT);
  const [preciosTipos, setPreciosTipos] = useState(() => storage.get('preciosTipos') || PRECIOS_TIPOS_DEFAULT);
  const [preciosPrivadas, setPreciosPrivadas] = useState(() => storage.get('preciosPrivadas') || PRECIOS_PRIVADAS_DEFAULT);
  const [preciosQR, setPreciosQR] = useState(() => storage.get('preciosQR') || PRECIOS_QR_DEFAULT);

  // UI State
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [vistaGrilla, setVistaGrilla] = useState('dia'); // 'dia' | 'semana'
  const [busqueda, setBusqueda] = useState('');
  const [horarioFiltro, setHorarioFiltro] = useState('todos');
  const [membresiaFiltro, setMembresiaFiltro] = useState('todos');
  const [planFiltro, setPlanFiltro] = useState('todos');
  const [error, setError] = useState(null);
  const [exportModal, setExportModal] = useState(false);

  // Firestore
  const {
    getAlumnos,
    getPagos,
    getAsistencias,
    getClasesMes,
    getProfesores,
    addAlumno,
    updateAlumno,
    deleteAlumno,
    limpiarAlumnoDeClases,
    addPago,
    updatePago,
    deletePago,
    getPagosSueltaPendientes,
    getPagosPendientesPorTipo,
    setAsistencia,
    addAsistenciasLote,
    removeAsistencia,
    setClaseProfesorId,
    addProfesor,
    deleteProfesor,
    llenarCuposMembresia,
    agregarAlumnoAClase,
    removerAlumnoDeClase,
    setClase,
    getConfig,
    setConfig,
    getConfigMes,
    setConfigMes,
  } = useFirestore();

  // Computed
  const { mesNum, anio } = parseMesActual(mesActual);
  const fechasClase = getFechasClaseMes(mesNum, anio);

  // Effects — persistir en localStorage
  useEffect(() => { storage.set('seccion', seccionActiva); }, [seccionActiva]);
  useEffect(() => { storage.set('disciplina', disciplinaActiva); }, [disciplinaActiva]);
  // precios y preciosTipos se persisten en Firestore (sync entre dispositivos)
  useEffect(() => { if (profesores.length > 0) storage.set('profesores', profesores); }, [profesores]);
  useEffect(() => { if (Object.keys(clasesPorProfe).length > 0) storage.set('clases_profe', clasesPorProfe); }, [clasesPorProfe]);

  // Auth
  const handleLogin = () => { setAutenticado(true); storage.set('auth', true); };
  const handleLogout = () => { setAutenticado(false); storage.remove('auth'); };

  // ── Carga de datos ─────────────────────────────────────────────────────────
  const cargarDatos = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [alumnosData, pagosData, asistData, clasesData, profesData, cfgGlobal, cfgMes] = await Promise.all([
        getAlumnos(),
        getPagos(mesActual),
        getAsistencias(mesActual).catch(() => []),
        getClasesMes(mesActual).catch(() => []),
        getProfesores().catch(() => []),
        getConfig().catch(() => null),
        getConfigMes(mesActual).catch(() => null),
      ]);
      // El config del mes tiene prioridad; el global es fallback para campos no definidos aún
      const configData = { ...(cfgGlobal || {}), ...(cfgMes || {}) };

      setAlumnos(alumnosData.map(a => ({
        ...a,
        disciplinas: a.disciplinas || ['Futvoley'],
        horario: a.horario || '18:00',
        diasElegidos: a.diasElegidos || [],
      })));

      setPagos(pagosData);

      // Asistencias → { alumnoId: { 'dd/mm|HH:mm': estado } }
      const asistPorAlumno = {};
      asistData.forEach(a => {
        if (!asistPorAlumno[a.alumnoId]) asistPorAlumno[a.alumnoId] = {};
        const clave = a.fecha && a.horario ? `${a.fecha}|${a.horario}` : a.fecha;
        if (clave) asistPorAlumno[a.alumnoId][clave] = a.estado || 'asistio';
      });
      setAsistencias(asistPorAlumno);

      // Los slots de Firestore se cargan tal cual.
      // Los suelta agregados manualmente sí aparecen en la grilla para marcar asistencia.
      // Lo que se filtra (en GrillaCancha y Clases) son los slots VIRTUALES derivados de diasElegidos.
      setOcupacion(clasesData);

      if (Object.keys(configData).length > 0) {
        if (configData.precios) setPrecios(configData.precios);
        if (configData.preciosTipos) setPreciosTipos(configData.preciosTipos);
        if (configData.preciosQR) setPreciosQR(configData.preciosQR);
        if (configData.preciosPrivadas) {
          const pp = configData.preciosPrivadas;
          // Migrar estructura vieja (global) a la nueva (por disciplina)
          if (pp.privada_1p) {
            const migrated = {};
            DISCIPLINAS.forEach(d => { migrated[d] = { ...pp }; });
            setPreciosPrivadas(migrated);
            setConfigMes(mesActual, { preciosPrivadas: migrated }).catch(() => {});
          } else {
            setPreciosPrivadas(pp);
          }
        }
      }

      if (profesData.length > 0) {
        setProfesores(profesData);
        storage.set('profesores', profesData);
      }

      // Construir clasesPorProfe desde los documentos de clases (campo profesorId)
      const clasesObj = clasesData.reduce((acc, c) => {
        if (c.profesorId && c.disciplina && c.fecha && c.horario) {
          return { ...acc, [`${c.disciplina}-${c.fecha}-${c.horario}`]: c.profesorId };
        }
        return acc;
      }, {});
      if (Object.keys(clasesObj).length > 0) {
        setClasesPorProfe(clasesObj);
        storage.set('clases_profe', clasesObj);
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [getAlumnos, getPagos, getAsistencias, getClasesMes, getProfesores, getConfig, getConfigMes, mesActual]);

  useEffect(() => {
    if (autenticado) cargarDatos();
  }, [autenticado, mesActual, cargarDatos]);

  // ── Filtros y cálculos ─────────────────────────────────────────────────────
  const alumnosDisciplina = alumnos.filter(a =>
    a.disciplinas?.includes(disciplinaActiva) || (!a.disciplinas && disciplinaActiva === 'Futvoley')
  );
  const pagosDisciplina = pagos.filter(p =>
    p.disciplina === disciplinaActiva || (!p.disciplina && disciplinaActiva === 'Futvoley')
  );

  const alumnosActivos = alumnosDisciplina.filter(a => a.estado === 'Activo');
  const alumnosConPago = new Set(pagosDisciplina.filter(p => p.estado === 'Pagado').map(p => p.alumnoId));
  // Solo alumnos con membresía mensual (o sin tipoMembresia definido, para compatibilidad)
  const pagosPendientes = alumnosActivos.filter(a =>
    (!a.tipoMembresia || a.tipoMembresia === 'Membresía mensual') && !alumnosConPago.has(a.id)
  );
  const preciosDisciplina = precios[disciplinaActiva] || PRECIOS_DEFAULT['Futvoley'];
  const preciosTiposActivos = preciosTipos[disciplinaActiva] || PRECIOS_TIPOS_DEFAULT['Futvoley'];

  // Pagos suelta/dayuse/privada/prueba con estado Pendiente en Firestore
  const pagosPendientesFirestore = pagosDisciplina.filter(p => p.estado === 'Pendiente');

  // Las deudas de suelta se generan desde handleRegistrarAsistencia (no desde slots de cancha)
  const sueltasVirtuales = [];

  // Créditos de clases clásicas por alumno (solo aplica a alumnos con diasElegidos)
  const clasesDisponiblesMap = {};
  alumnosDisciplina.forEach(alumno => {
    // Solo alumnos con membresía mensual tienen cupo fijo de clases
    if (alumno.tipoMembresia && alumno.tipoMembresia !== 'Membresía mensual') return;
    if (!alumno.diasElegidos?.length) return;
    const total = getClasesDelMes(alumno.diasElegidos, mesNum, anio);
    const asistenciasAlumno = asistencias[alumno.id] || {};
    // cambio_turno = canceló con aviso → NO descuenta
    const consumidas = Object.values(asistenciasAlumno).filter(
      e => ['asistio', 'falto', 'vino_no_pago'].includes(e)
    ).length;
    const extras = Math.max(0, consumidas - total);
    clasesDisponiblesMap[alumno.id] = { total, consumidas, restantes: Math.max(0, total - consumidas), extras };
  });

  // Deudas por clases extra (membresía mensual que superó el cupo del plan)
  const extrasVirtuales = [];
  Object.entries(clasesDisponiblesMap).forEach(([alumnoId, { extras }]) => {
    if (extras <= 0) return;
    const alumno = alumnosActivos.find(a => a.id === alumnoId);
    if (!alumno) return;
    const extrasCubiertas = pagosDisciplina.filter(p =>
      p.alumnoId === alumnoId &&
      p.tipo === 'suelta' &&
      ['Pagado', 'Pendiente'].includes(p.estado)
    ).length;
    const faltanRegistrar = extras - extrasCubiertas;
    for (let i = 0; i < faltanRegistrar; i++) {
      extrasVirtuales.push({
        id: `extra_${alumnoId}_${i}`,
        alumnoId,
        nombre: alumno.nombre,
        tipo: 'suelta',
        estado: 'Pendiente',
        monto: preciosTiposActivos['Clases sueltas'] || 0,
        fecha: mesActual,
        horario: '',
        disciplina: disciplinaActiva,
        virtual: true,
        esExtra: true,
      });
    }
  });

  const pagosSueltasPendientes = [...pagosPendientesFirestore, ...sueltasVirtuales, ...extrasVirtuales];

  const montoPendiente =
    pagosPendientes.reduce((sum, a) => sum + (preciosDisciplina[a.plan]?.[a.frecuencia] || 0), 0) +
    pagosSueltasPendientes.reduce((sum, p) => sum + (parseInt(p.monto) || 0), 0);
  const montoCobrado = pagosDisciplina
    .filter(p => p.estado === 'Pagado')
    .reduce((sum, p) => sum + (parseInt(p.monto) || 0), 0);

  const alumnosFiltrados = alumnosDisciplina.filter(a => {
    const matchBusqueda = a.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.telefono?.includes(busqueda);
    const matchHorario = horarioFiltro === 'todos' || a.horario === horarioFiltro;
    const matchMembresia = membresiaFiltro === 'todos' || a.tipoMembresia === membresiaFiltro;
    const matchPlan = planFiltro === 'todos' || a.plan === planFiltro;
    return matchBusqueda && matchHorario && matchMembresia && matchPlan;
  });

  const calcularPagoProfesores = () => {
    const totalCobrado = montoCobrado;
    const totalParaProfes = totalCobrado * 0.5;
    const clasesContadas = {};
    let totalClases = 0;

    fechasClase.forEach(fecha => {
      HORARIOS.forEach(horario => {
        const key = `${disciplinaActiva}-${fecha}-${horario}`;
        const profeId = clasesPorProfe[key];
        if (profeId) {
          clasesContadas[profeId] = (clasesContadas[profeId] || 0) + 1;
          totalClases++;
        }
      });
    });

    const pagosProfes = profesores.filter(p => p.estado === 'Activo').map(profe => {
      const clasesDadas = clasesContadas[profe.id] || 0;
      const porcentaje = totalClases > 0 ? clasesDadas / totalClases : 0;
      return {
        ...profe,
        clasesDadas,
        porcentaje: Math.round(porcentaje * 100),
        pago: Math.round(totalParaProfes * porcentaje)
      };
    });

    return { totalCobrado, totalParaProfes, totalClases, pagosProfes };
  };

  const datosProfes = calcularPagoProfesores();

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleGuardarAlumno = async (nuevoAlumno) => {
    setSyncing(true);
    try {
      await addAlumno({ ...nuevoAlumno, disciplinas: nuevoAlumno.disciplinas || [disciplinaActiva] });
      await cargarDatos(true);
    } catch (err) {
      setError('Error al guardar');
    } finally {
      setSyncing(false);
    }
  };

  const handleEditarAlumno = async (alumno) => {
    setSyncing(true);
    try {
      const { id, creadoEn, ...data } = alumno;
      await updateAlumno(id, data);
      await cargarDatos(true);
    } catch (err) {
      setError('Error al editar alumno');
    } finally {
      setSyncing(false);
    }
  };

  const handleEliminarAlumno = async (id) => {
    setSyncing(true);
    try {
      await deleteAlumno(id);
      await limpiarAlumnoDeClases(id, mesActual).catch(() => {});
      await cargarDatos(true);
    } catch (err) {
      setError('Error al eliminar alumno');
    } finally {
      setSyncing(false);
    }
  };

  const handleGuardarProfe = async (nuevoProfe) => {
    setSyncing(true);
    try {
      await addProfesor({ nombre: nuevoProfe.nombre, cbu: nuevoProfe.cbu, disciplina: nuevoProfe.disciplina || '' });
      await cargarDatos(true);
    } catch (err) {
      setError('Error al guardar profesor');
    } finally {
      setSyncing(false);
    }
  };

  const handleEliminarProfe = async (profeId) => {
    if (confirm('¿Eliminar profesor?')) {
      setSyncing(true);
      try {
        await deleteProfesor(profeId);
        await cargarDatos(true);
      } catch (err) {
        setError('Error al eliminar profesor');
      } finally {
        setSyncing(false);
      }
    }
  };

  const handleAsignarClase = async (fecha, horario, profeId) => {
    const key = `${disciplinaActiva}-${fecha}-${horario}`;
    setClasesPorProfe(prev => ({ ...prev, [key]: profeId }));
    try {
      const clase = ocupacion.find(
        c => c.disciplina === disciplinaActiva && c.fecha === fecha && c.horario === horario
      );
      const canchaId = clase?.canchaId || 'cancha3';
      await setClaseProfesorId(canchaId, fecha, horario, profeId || null, mesActual);
    } catch (err) {
      setError('Error al asignar clase');
    }
  };

  // Asignar profesor desde la grilla de canchas (conoce canchaId y disciplina exactos)
  const handleAsignarProfeSlot = async (canchaId, fecha, horario, disciplina, profeId) => {
    const key = `${disciplina}-${fecha}-${horario}`;
    setClasesPorProfe(prev => ({ ...prev, [key]: profeId || undefined }));
    try {
      await setClaseProfesorId(canchaId, fecha, horario, profeId || null, mesActual);
    } catch (err) {
      setError('Error al asignar profesor');
    }
  };

  /**
   * Registra o cambia el estado de asistencia de un alumno en una clase.
   * Si `nuevoEstado` es null, borra la asistencia (toggle off).
   * estados: 'asistio' | 'falto' | 'vino_no_pago' | 'cambio_turno'
   *
   * @param {string}      alumnoId
   * @param {string}      fecha      — "dd/mm"
   * @param {string}      horario    — "18:00"
   * @param {string|null} nuevoEstado
   * @param {string}      canchaId   — por defecto 'cancha3'
   */
  const handleRegistrarAsistencia = async (alumnoId, fecha, horario, nuevoEstado, canchaId = 'cancha3') => {
    setSyncing(true);
    try {
      if (nuevoEstado) {
        await setAsistencia(canchaId, fecha, horario, alumnoId, {
          estado: nuevoEstado,
          mes: mesActual,
        });
      } else {
        await removeAsistencia(canchaId, fecha, horario, alumnoId);
      }

      const clave = `${fecha}|${horario}`;
      setAsistencias(prev => {
        const nuevo = { ...prev };
        if (!nuevo[alumnoId]) nuevo[alumnoId] = {};
        if (nuevoEstado) {
          nuevo[alumnoId] = { ...nuevo[alumnoId], [clave]: nuevoEstado };
        } else {
          const { [clave]: _, ...rest } = nuevo[alumnoId];
          nuevo[alumnoId] = rest;
        }
        return nuevo;
      });

      // Lógica de deudas para slots privados
      const slotPrivada = ocupacion.find(s => s.canchaId === canchaId && s.fecha === fecha && s.horario === horario && s.tipo === 'privada');
      if (slotPrivada) {
        const fechaCompleta = `${fecha}/${anio}`;
        const alumno = alumnos.find(a => a.id === alumnoId);
        const fechaKey = `${fecha}|${horario}`;
        const slotAlumnos = slotPrivada.alumnos || [];
        const disciplinaSlot = slotPrivada.disciplina || disciplinaActiva;

        if (nuevoEstado === 'cambio_turno') {
          // Canceló con aviso → borrar su deuda y recalcular los restantes
          const pendientes = await getPagosPendientesPorTipo(alumnoId, 'privada', fechaCompleta, horario);
          await Promise.all(pendientes.map(p => deletePago(p.id)));
          const efectivos = slotAlumnos.filter(id => {
            if (id === alumnoId) return false;
            return asistencias[id]?.[fechaKey] !== 'cambio_turno';
          });
          if (efectivos.length > 0) {
            const n = Math.min(efectivos.length, 4);
            await Promise.all(efectivos.map(async (id) => {
              const pends = await getPagosPendientesPorTipo(id, 'privada', fechaCompleta, horario);
              if (pends.length > 0) {
                const monto = getMontoPrivada(n, pends[0].metodo || 'Efectivo', disciplinaSlot);
                await Promise.all(pends.map(p => updatePago(p.id, { monto })));
              }
            }));
          }
          await cargarDatos(true);
        } else if (nuevoEstado === null) {
          // Toggle off → recrear deuda si no existe (venía de cambio_turno) y recalcular todos
          const pendientes = await getPagosPendientesPorTipo(alumnoId, 'privada', fechaCompleta, horario);
          if (pendientes.length === 0 && alumno) {
            const efectivos = slotAlumnos.filter(id => {
              if (id === alumnoId) return true;
              return asistencias[id]?.[fechaKey] !== 'cambio_turno';
            });
            const n = Math.min(Math.max(efectivos.length, 1), 4);
            await addPago({
              alumnoId,
              nombre: alumno.nombre,
              mes: mesActual,
              monto: getMontoPrivada(n, 'Efectivo', disciplinaSlot),
              estado: 'Pendiente',
              metodo: 'Efectivo',
              disciplina: disciplinaSlot,
              tipo: 'privada',
              fecha: fechaCompleta,
              horario,
            });
            await Promise.all(efectivos.filter(id => id !== alumnoId).map(async (id) => {
              const pends = await getPagosPendientesPorTipo(id, 'privada', fechaCompleta, horario);
              if (pends.length > 0) {
                const monto = getMontoPrivada(n, pends[0].metodo || 'Efectivo', disciplinaSlot);
                await Promise.all(pends.map(p => updatePago(p.id, { monto })));
              }
            }));
            await cargarDatos(true);
          }
        }
      }

      // Si se quita la asistencia (toggle off), eliminar la deuda Pendiente de suelta si existe
      if (nuevoEstado === null) {
        const alumno = alumnos.find(a => a.id === alumnoId);
        if (alumno?.tipoMembresia === 'Clases sueltas') {
          const fechaCompleta = `${fecha}/${anio}`;
          const pendientes = await getPagosSueltaPendientes(alumnoId, fechaCompleta, horario);
          if (pendientes.length > 0) {
            await Promise.all(pendientes.map(p => deletePago(p.id)));
            await cargarDatos(true);
          }
        }
      }

      // Generar deuda automática para alumnos de clase suelta al marcar asistio o falto
      if (nuevoEstado === 'asistio' || nuevoEstado === 'falto') {
        const alumno = alumnos.find(a => a.id === alumnoId);
        if (alumno?.tipoMembresia === 'Clases sueltas') {
          const fechaCompleta = `${fecha}/${anio}`;
          const deudaKey = `${alumnoId}|${fechaCompleta}|${horario}`;
          // Evitar duplicados por clicks concurrentes rápidos
          if (!deudaEnVuelo.current.has(deudaKey)) {
            const pagoExistente = pagos.find(p =>
              p.alumnoId === alumnoId &&
              p.tipo === 'suelta' &&
              p.fecha === fechaCompleta &&
              p.horario === horario &&
              ['Pendiente', 'Pagado'].includes(p.estado)
            );
            if (!pagoExistente) {
              deudaEnVuelo.current.add(deudaKey);
              try {
                const monto = preciosTiposActivos['Clases sueltas'] || 0;
                await addPago({
                  alumnoId: alumno.id,
                  nombre: alumno.nombre,
                  mes: mesActual,
                  monto,
                  estado: 'Pendiente',
                  metodo: 'Efectivo',
                  disciplina: disciplinaActiva,
                  tipo: 'suelta',
                  fecha: fechaCompleta,
                  horario,
                });
                await cargarDatos(true);
              } finally {
                deudaEnVuelo.current.delete(deudaKey);
              }
            }
          }
        }
      }
    } catch (err) {
      setError('Error al guardar');
    } finally {
      setSyncing(false);
    }
  };

  const handleProcesarLista = async (inputLista, fechaLista, horario) => {
    if (!inputLista.trim() || !fechaLista) {
      return { success: false, mensaje: 'Seleccioná fecha y pegá la lista' };
    }

    const lineas = inputLista.split('\n');
    const encontrados = [];
    const noEncontrados = [];

    for (const linea of lineas) {
      const limpia = linea
        .replace(/^\d+[-.\s]*/g, '')
        .replace(/[✅✓☑️🏐⚽@🙃😛🥲🎾]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/hasta.*/gi, '')
        .trim();
      if (limpia.length < 2) continue;
      const alumno = buscarAlumno(limpia, alumnosDisciplina);
      if (alumno) encontrados.push(alumno);
      else noEncontrados.push(limpia);
    }

    if (encontrados.length > 0) {
      setSyncing(true);
      try {
        const horarioEfectivo = horario || '';
        await addAsistenciasLote(
          encontrados.map(a => ({
            canchaId: 'cancha3',
            alumnoId: a.id,
            fecha: fechaLista,         // "dd/mm"
            mes: mesActual,
            horario: horarioEfectivo,
            estado: 'asistio',
          }))
        );
        setAsistencias(prev => {
          const nuevo = { ...prev };
          encontrados.forEach(a => {
            if (!nuevo[a.id]) nuevo[a.id] = {};
            nuevo[a.id] = { ...nuevo[a.id], [`${fechaLista}|${horarioEfectivo}`]: 'asistio' };
          });
          return nuevo;
        });
        return {
          success: true,
          mensaje: `✓ ${encontrados.length} alumnos registrados`,
          encontrados: encontrados.map(a => a.nombre),
          noEncontrados
        };
      } catch (err) {
        return { success: false, mensaje: 'Error de conexión' };
      } finally {
        setSyncing(false);
      }
    } else {
      return { success: false, mensaje: 'No encontré alumnos en la lista', noEncontrados };
    }
  };

  const handleProcesarPago = async (inputComando, metodo = 'Efectivo') => {
    if (!inputComando.trim()) return { success: false, mensaje: 'Escribí un nombre' };

    const palabras = inputComando.toLowerCase().split(/\s+/);
    let alumno = null;
    for (const p of palabras) {
      alumno = buscarAlumno(p, alumnosDisciplina);
      if (alumno) break;
    }

    if (!alumno) return { success: false, mensaje: `No encontré "${inputComando}"` };

    const mesEncontrado = MESES.find(m => inputComando.toLowerCase().includes(m.toLowerCase()));
    const mes = mesEncontrado ? `${mesEncontrado} ${anio}` : mesActual;

    const existe = pagosDisciplina.find(p =>
      p.alumnoId === alumno.id && p.mes === mes && p.estado === 'Pagado'
    );
    if (existe) return { success: false, mensaje: `${alumno.nombre} ya pagó ${mes}` };

    const montoBase = preciosDisciplina[alumno.plan]?.[alumno.frecuencia] || 95000;
    const montoQR = preciosQR[disciplinaActiva]?.[alumno.plan]?.[alumno.frecuencia] || Math.round(montoBase * 1.25);
    const monto = metodo === 'Transferencia' ? montoQR : montoBase;
    setSyncing(true);
    try {
      await addPago({
        alumnoId: alumno.id,
        nombre: alumno.nombre,
        mes,
        monto,
        estado: 'Pagado',
        metodo,
        disciplina: disciplinaActiva,
      });

      // Auto-llenar cupos en cancha3 si el alumno tiene días elegidos
      if (alumno.diasElegidos?.length > 0 && alumno.horario) {
        const { mesNum: mNum, anio: mAnio } = parseMesActual(mes);
        await llenarCuposMembresia(
          alumno.id,
          alumno.diasElegidos,
          alumno.horario,
          mNum,
          mAnio,
          disciplinaActiva,
        ).catch(() => {}); // no bloquear el pago si falla
      }

      await cargarDatos(true);
      return { success: true, mensaje: `✓ ${alumno.nombre} - ${formatMonto(monto)}` };
    } catch (err) {
      return { success: false, mensaje: 'Error de conexión' };
    } finally {
      setSyncing(false);
    }
  };

  const handleProcesarClaseSuelta = async (alumnoNombre, fecha, horario, monto, metodo = 'Efectivo') => {
    const alumno = buscarAlumno(alumnoNombre, alumnos);
    if (!alumno) return { success: false, mensaje: `No encontré "${alumnoNombre}"` };

    setSyncing(true);
    try {
      const fechaCompleta = `${fecha}/${anio}`;
      await addPago({
        alumnoId: alumno.id,
        nombre: alumno.nombre,
        mes: mesActual,
        monto,
        estado: 'Pendiente',
        metodo,
        disciplina: disciplinaActiva,
        tipo: 'suelta',
        fecha: fechaCompleta,
        horario,
      });
      // NO se agrega al slot de cancha automáticamente.
      // La deuda queda registrada en Pagos para cobrar cuando el alumno asista.
      await cargarDatos(true);
      return { success: true, mensaje: `✓ ${alumno.nombre} — Deuda registrada ${fecha} ${horario}` };
    } catch (err) {
      return { success: false, mensaje: 'Error de conexión' };
    } finally {
      setSyncing(false);
    }
  };

  const handleProcesarPrivada = async (alumnoNombre, fecha, horario, monto, metodo = 'Efectivo') => {
    const alumno = buscarAlumno(alumnoNombre, alumnos);
    if (!alumno) return { success: false, mensaje: `No encontré "${alumnoNombre}"` };
    setSyncing(true);
    try {
      await addPago({
        alumnoId: alumno.id,
        nombre: alumno.nombre,
        mes: mesActual,
        monto,
        estado: 'Pendiente',
        metodo,
        disciplina: disciplinaActiva,
        tipo: 'privada',
        fecha: `${fecha}/${anio}`,
        horario,
      });
      await cargarDatos(true);
      return { success: true, mensaje: `✓ ${alumno.nombre} — Deuda registrada ${fecha} ${horario}` };
    } catch (err) {
      return { success: false, mensaje: 'Error de conexión' };
    } finally {
      setSyncing(false);
    }
  };

  const handleProcesarPrueba = async (alumnoNombre, fecha, horario, monto, metodo = 'Efectivo') => {
    const alumno = buscarAlumno(alumnoNombre, alumnos);
    if (!alumno) return { success: false, mensaje: `No encontré "${alumnoNombre}"` };
    setSyncing(true);
    try {
      await addPago({
        alumnoId: alumno.id,
        nombre: alumno.nombre,
        mes: mesActual,
        monto,
        estado: 'Pagado',
        metodo,
        disciplina: disciplinaActiva,
        tipo: 'prueba',
        fecha: `${fecha}/${anio}`,
        horario,
      });
      await cargarDatos(true);
      return { success: true, mensaje: `✓ ${alumno.nombre} — Clase de prueba ${fecha} ${horario}` };
    } catch (err) {
      return { success: false, mensaje: 'Error de conexión' };
    } finally {
      setSyncing(false);
    }
  };

  const handleProcesarDayUse = async (alumnoNombre, fecha, horario, monto, metodo = 'Efectivo') => {
    const alumno = buscarAlumno(alumnoNombre, alumnos);
    if (!alumno) return { success: false, mensaje: `No encontré "${alumnoNombre}"` };
    setSyncing(true);
    try {
      await addPago({
        alumnoId: alumno.id,
        nombre: alumno.nombre,
        mes: mesActual,
        monto,
        estado: 'Pendiente',
        metodo,
        disciplina: disciplinaActiva,
        tipo: 'dayuse',
        fecha: `${fecha}/${anio}`,
        horario,
      });
      await cargarDatos(true);
      return { success: true, mensaje: `✓ ${alumno.nombre} — Day Use registrado ${fecha}` };
    } catch (err) {
      return { success: false, mensaje: 'Error de conexión' };
    } finally {
      setSyncing(false);
    }
  };

  const handlePagarMembresia = async (alumno, metodo) => {
    const montoBase = preciosDisciplina[alumno.plan]?.[alumno.frecuencia] || 0;
    const montoQR = preciosQR[disciplinaActiva]?.[alumno.plan]?.[alumno.frecuencia] || Math.round(montoBase * 1.25);
    const monto = metodo === 'Transferencia' ? montoQR : montoBase;
    setSyncing(true);
    try {
      await addPago({
        alumnoId: alumno.id,
        nombre: alumno.nombre,
        mes: mesActual,
        monto,
        estado: 'Pagado',
        metodo,
        disciplina: disciplinaActiva,
      });
      if (alumno.diasElegidos?.length > 0 && alumno.horario) {
        await llenarCuposMembresia(alumno.id, alumno.diasElegidos, alumno.horario, mesNum, anio, disciplinaActiva).catch(() => {});
      }
      await cargarDatos(true);
      return { success: true };
    } catch (err) {
      return { success: false };
    } finally {
      setSyncing(false);
    }
  };

  const handleMarcarPagado = async (pagoId, metodo) => {
    setSyncing(true);
    try {
      const pagoActual = pagos.find(p => p.id === pagoId);
      const montoFinal = pagoActual && metodo === 'Transferencia'
        ? Math.round(pagoActual.monto * 1.25)
        : pagoActual?.monto;
      const update = { estado: 'Pagado', metodo };
      if (montoFinal !== undefined) update.monto = montoFinal;
      await updatePago(pagoId, update);
      await cargarDatos(true);
      return { success: true };
    } catch (err) {
      return { success: false };
    } finally {
      setSyncing(false);
    }
  };

  // Paga una suelta virtual (no existe aún en Firestore): crea el registro directamente como Pagado
  const handlePagarSueltaVirtual = async (pago, metodo) => {
    setSyncing(true);
    try {
      await addPago({
        alumnoId: pago.alumnoId,
        nombre: pago.nombre,
        mes: mesActual,
        monto: metodo === 'Transferencia' ? Math.round(pago.monto * 1.25) : pago.monto,
        estado: 'Pagado',
        metodo,
        disciplina: pago.disciplina || disciplinaActiva,
        tipo: 'suelta',
        fecha: pago.fecha,
        horario: pago.horario,
      });
      await cargarDatos(true);
    } catch (err) {
      setError('Error al registrar pago');
    } finally {
      setSyncing(false);
    }
  };

  const handleCancelarSuelta = async (pagoId) => {
    setSyncing(true);
    try {
      await deletePago(pagoId);
      await cargarDatos(true);
    } catch (err) {
      setError('Error al cancelar deuda');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdatePrecioTipo = (disciplina, tipo, valor) => {
    setPreciosTipos(prev => {
      const next = {
        ...prev,
        [disciplina]: { ...prev[disciplina], [tipo]: parseInt(valor) || 0 }
      };
      setConfigMes(mesActual, { preciosTipos: next }).catch(() => {});
      return next;
    });
  };

  const handleUpdatePreciosPrivadas = (disciplina, numPersonas, metodo, valor) => {
    setPreciosPrivadas(prev => {
      const key = `privada_${numPersonas}p`;
      const next = {
        ...prev,
        [disciplina]: {
          ...(prev[disciplina] || {}),
          [key]: { ...(prev[disciplina]?.[key] || {}), [metodo]: parseInt(valor) || 0 },
        },
      };
      setConfigMes(mesActual, { preciosPrivadas: next }).catch(() => {});
      return next;
    });
  };

  const handleUpdatePreciosQR = (disciplina, plan, frecuencia, valor) => {
    setPreciosQR(prev => {
      const next = {
        ...prev,
        [disciplina]: {
          ...prev[disciplina],
          [plan]: { ...prev[disciplina]?.[plan], [frecuencia]: parseInt(valor) || 0 },
        },
      };
      setConfigMes(mesActual, { preciosQR: next }).catch(() => {});
      return next;
    });
  };

  const getMontoPrivada = (n, metodo = 'Efectivo', disciplina = disciplinaActiva) => {
    const key = `privada_${Math.min(Math.max(n, 1), 4)}p`;
    return preciosPrivadas[disciplina]?.[key]?.[metodo]
      ?? preciosPrivadas['Futvoley']?.[key]?.[metodo]
      ?? 0;
  };

  // Llena los cupos del mes para TODOS los alumnos activos con diasElegidos
  const handleLlenarMes = async () => {
    const activos = alumnosDisciplina.filter(
      a => a.estado === 'Activo' && a.diasElegidos?.length > 0 && a.horario
    );
    if (activos.length === 0) {
      setError('Ningún alumno tiene días asignados aún');
      return;
    }
    setSyncing(true);
    try {
      await Promise.all(
        activos.map(a =>
          llenarCuposMembresia(a.id, a.diasElegidos, a.horario, mesNum, anio, disciplinaActiva)
        )
      );
      await cargarDatos(true);
    } catch (err) {
      console.error('Error llenarMes:', err);
      setError(err?.message || 'Error al llenar mes');
    } finally {
      setSyncing(false);
    }
  };

  const handleAgregarAlumnoSlot = async (canchaId, fecha, horario, alumnoId, slotTipo) => {
    setSyncing(true);
    try {
      await agregarAlumnoAClase(canchaId, fecha, horario, alumnoId);

      // Auto-create pending suelta debt for non-membresía students in Clásica slots
      const normSlotTipo = (slotTipo === 'membresia' || slotTipo === 'suelta' || !slotTipo) ? 'clasica' : slotTipo;

      if (normSlotTipo === 'dayuse') {
        const alumno = alumnos.find(a => a.id === alumnoId);
        if (alumno) {
          const slot = ocupacion.find(s => s.canchaId === canchaId && s.fecha === fecha && s.horario === horario);
          const disciplina = slot?.disciplina || disciplinaActiva;
          const monto = (preciosTipos[disciplina] || preciosTipos['Futvoley'] || {})['Day Use'] || 15000;
          await addPago({
            alumnoId: alumno.id,
            nombre: alumno.nombre,
            mes: mesActual,
            monto,
            estado: 'Pendiente',
            metodo: 'Efectivo',
            disciplina,
            tipo: 'dayuse',
            fecha: `${fecha}/${anio}`,
            horario,
          });
          await cargarDatos(true);
          return;
        }
      }

      if (normSlotTipo === 'privada') {
        const alumno = alumnos.find(a => a.id === alumnoId);
        if (alumno) {
          const slot = ocupacion.find(s => s.canchaId === canchaId && s.fecha === fecha && s.horario === horario);
          const disciplina = slot?.disciplina || disciplinaActiva;
          const fechaCompleta = `${fecha}/${anio}`;
          // slot.alumnos es la lista ANTES de agregar (ocupacion state aún no refrescado)
          const prevAlumnos = slot?.alumnos || [];
          const nuevosAlumnos = prevAlumnos.includes(alumnoId) ? prevAlumnos : [...prevAlumnos, alumnoId];
          const n = Math.min(nuevosAlumnos.length, 4);
          // Consultar Firestore directamente para evitar duplicados por estado local desactualizado
          const existentes = await getPagosPendientesPorTipo(alumnoId, 'privada', fechaCompleta, horario);
          if (existentes.length === 0) {
            await addPago({
              alumnoId: alumno.id,
              nombre: alumno.nombre,
              mes: mesActual,
              monto: getMontoPrivada(n, 'Efectivo', disciplina),
              estado: 'Pendiente',
              metodo: 'Efectivo',
              disciplina,
              tipo: 'privada',
              fecha: fechaCompleta,
              horario,
            });
          }
          // Recalcular deudas de los alumnos que ya estaban en el slot
          await Promise.all(prevAlumnos.map(async (id) => {
            const pends = await getPagosPendientesPorTipo(id, 'privada', fechaCompleta, horario);
            if (pends.length > 0) {
              const monto = getMontoPrivada(n, pends[0].metodo || 'Efectivo', disciplina);
              await Promise.all(pends.map(p => updatePago(p.id, { monto })));
            }
          }));
          await cargarDatos(true);
          return;
        }
      }

      // Suelta: la deuda normalmente se crea en handleRegistrarAsistencia al marcar asistio/falto.
      // Excepción: si al re-agregar ya existe asistencia marcada (y el pago fue eliminado), crear la deuda ahora.
      const alumno = alumnos.find(a => a.id === alumnoId);
      if (alumno?.tipoMembresia === 'Clases sueltas') {
        const clave = `${fecha}|${horario}`;
        const estadoAsist = asistencias[alumnoId]?.[clave];
        if (estadoAsist === 'asistio' || estadoAsist === 'falto') {
          const fechaCompleta = `${fecha}/${anio}`;
          const deudaKey = `${alumnoId}|${fechaCompleta}|${horario}`;
          const pagoExistente = pagos.find(p =>
            p.alumnoId === alumnoId &&
            p.tipo === 'suelta' &&
            p.fecha === fechaCompleta &&
            p.horario === horario &&
            ['Pendiente', 'Pagado'].includes(p.estado)
          );
          if (!pagoExistente && !deudaEnVuelo.current.has(deudaKey)) {
            deudaEnVuelo.current.add(deudaKey);
            try {
              const slot = ocupacion.find(s => s.canchaId === canchaId && s.fecha === fecha && s.horario === horario);
              const disciplina = slot?.disciplina || disciplinaActiva;
              const monto = (preciosTipos[disciplina] || preciosTipos['Futvoley'] || {})['Clases sueltas'] || 0;
              await addPago({
                alumnoId: alumno.id,
                nombre: alumno.nombre,
                mes: mesActual,
                monto,
                estado: 'Pendiente',
                metodo: 'Efectivo',
                disciplina,
                tipo: 'suelta',
                fecha: fechaCompleta,
                horario,
              });
            } finally {
              deudaEnVuelo.current.delete(deudaKey);
            }
          }
        }
      }

      await cargarDatos(true);
    } catch (err) {
      setError('Error al agregar alumno al slot');
    } finally {
      setSyncing(false);
    }
  };

  const handleRemoverAlumnoSlot = async (canchaId, fecha, horario, alumnoId, currentAlumnos = []) => {
    setSyncing(true);
    try {
      await removerAlumnoDeClase(canchaId, fecha, horario, alumnoId, mesActual, currentAlumnos);

      // Borrar la asistencia para que no descuente clases del cupo de membresía
      await removeAsistencia(canchaId, fecha, horario, alumnoId).catch(() => {});

      const alumno = alumnos.find(a => a.id === alumnoId);
      const fechaCompleta = `${fecha}/${anio}`;

      if (alumno?.tipoMembresia === 'Clases sueltas') {
        const pendientes = await getPagosSueltaPendientes(alumnoId, fechaCompleta, horario);
        await Promise.all(pendientes.map(p => deletePago(p.id)));
      }

      const slotRemovido = ocupacion.find(s => s.canchaId === canchaId && s.fecha === fecha && s.horario === horario);
      if (slotRemovido?.tipo === 'privada') {
        const disciplinaSlot = slotRemovido.disciplina || disciplinaActiva;
        const pendientes = await getPagosPendientesPorTipo(alumnoId, 'privada', fechaCompleta, horario);
        await Promise.all(pendientes.map(p => deletePago(p.id)));
        // Recalcular deudas de los restantes
        const remaining = (slotRemovido.alumnos || []).filter(id => id !== alumnoId);
        if (remaining.length > 0) {
          const n = Math.min(remaining.length, 4);
          await Promise.all(remaining.map(async (id) => {
            const pends = await getPagosPendientesPorTipo(id, 'privada', fechaCompleta, horario);
            if (pends.length > 0) {
              const monto = getMontoPrivada(n, pends[0].metodo || 'Efectivo', disciplinaSlot);
              await Promise.all(pends.map(p => updatePago(p.id, { monto })));
            }
          }));
        }
      }

      await cargarDatos(true);
    } catch (err) {
      setError('Error al remover alumno del slot');
    } finally {
      setSyncing(false);
    }
  };

  const handleCrearSlot = async (canchaId, fecha, horario, data) => {
    setSyncing(true);
    try {
      await setClase(canchaId, fecha, horario, { ...data, mes: mesActual });
      const clasesData = await getClasesMes(mesActual).catch(() => []);
      setOcupacion(clasesData);
    } catch (err) {
      setError('Error al crear slot');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdatePrecios = (disciplina, plan, frecuencia, valor) => {
    setPrecios(prev => {
      const next = {
        ...prev,
        [disciplina]: {
          ...prev[disciplina],
          [plan]: { ...prev[disciplina]?.[plan], [frecuencia]: valor }
        }
      };
      setConfigMes(mesActual, { precios: next }).catch(() => {});
      return next;
    });
  };

  // ── Exportar ───────────────────────────────────────────────────────────────

  const handleExportarPagos = () => {
    const headers = ['Nombre', 'Disciplina', 'Mes', 'Tipo', 'Plan', 'Frecuencia', 'Monto', 'Estado', 'Método', 'Fecha', 'Horario'];
    const rows = pagos.map(p => {
      const al = alumnos.find(a => a.id === p.alumnoId);
      return [
        p.nombre || al?.nombre || '',
        p.disciplina || '',
        p.mes || '',
        p.tipo || 'membresia',
        al?.plan || '',
        al?.frecuencia || '',
        p.monto || 0,
        p.estado || '',
        p.metodo || '',
        p.fecha || '',
        p.horario || '',
      ];
    });
    // Membresías pendientes: alumnos activos sin registro de pago en Firestore
    pagosPendientes.forEach(a => {
      const monto = preciosDisciplina[a.plan]?.[a.frecuencia] || 0;
      rows.push([a.nombre, disciplinaActiva, mesActual, 'membresia', a.plan, a.frecuencia, monto, 'Pendiente', '', '', '']);
    });
    downloadCSV(headers, rows, `pagos-${mesActual}.csv`);
    setExportModal(false);
  };

  const handleExportarClases = () => {
    const headers = ['Cancha', 'Fecha', 'Horario', 'Disciplina', 'Tipo', 'Alumno', 'Asistencia'];
    const rows = [];
    const incluidos = new Set(); // evitar duplicados entre slots reales y virtuales

    // 1. Slots reales de Firestore
    ocupacion.forEach(slot => {
      (slot.alumnos || []).forEach(alumnoId => {
        const al = alumnos.find(a => a.id === alumnoId);
        const asist = asistencias[alumnoId]?.[`${slot.fecha}|${slot.horario}`] || '';
        const key = `${slot.canchaId}|${slot.fecha}|${slot.horario}|${alumnoId}`;
        incluidos.add(key);
        rows.push([slot.canchaId || '', slot.fecha || '', slot.horario || '', slot.disciplina || '', slot.tipo || 'clasica', al?.nombre || alumnoId, asist]);
      });
    });

    // 2. Slots virtuales: alumnos con membresía mensual y diasElegidos
    const todasLasFechas = getFechasMes(mesNum, anio);
    alumnos
      .filter(a => a.estado === 'Activo' && a.diasElegidos?.length > 0 && a.horario && (!a.tipoMembresia || a.tipoMembresia === 'Membresía mensual'))
      .forEach(alumno => {
        todasLasFechas.forEach(fecha => {
          const [d, m] = fecha.split('/').map(Number);
          const diaSemana = new Date(anio, m - 1, d).getDay();
          if (!alumno.diasElegidos.includes(diaSemana)) return;
          (alumno.disciplinas || ['Futvoley']).forEach(disc => {
            const key = `cancha3|${fecha}|${alumno.horario}|${alumno.id}`;
            if (incluidos.has(key)) return;
            incluidos.add(key);
            const asist = asistencias[alumno.id]?.[`${fecha}|${alumno.horario}`] || '';
            rows.push(['cancha3', fecha, alumno.horario, disc, 'clasica', alumno.nombre, asist]);
          });
        });
      });

    // 3. Asistencias huérfanas: marcadas en un día fuera del horario regular del alumno
    Object.entries(asistencias).forEach(([alumnoId, claves]) => {
      Object.entries(claves).forEach(([clave, estado]) => {
        const [fecha, horario] = clave.split('|');
        const key = `cancha3|${fecha}|${horario}|${alumnoId}`;
        if (incluidos.has(key)) return;
        incluidos.add(key);
        const al = alumnos.find(a => a.id === alumnoId);
        rows.push(['cancha3', fecha || '', horario || '', '', 'clasica', al?.nombre || alumnoId, estado]);
      });
    });

    rows.sort((a, b) => {
      const [da, ma] = (a[1] || '').split('/').map(Number);
      const [db, mb] = (b[1] || '').split('/').map(Number);
      return ma !== mb ? ma - mb : da !== db ? da - db : (a[2] || '').localeCompare(b[2] || '');
    });
    downloadCSV(headers, rows, `clases-${mesActual}.csv`);
    setExportModal(false);
  };

  const handleExportarAsistencias = () => {
    const rows = [];
    Object.entries(asistencias).forEach(([alumnoId, claves]) => {
      const al = alumnos.find(a => a.id === alumnoId);
      Object.entries(claves).forEach(([clave, estado]) => {
        const [fecha, horario] = clave.split('|');
        rows.push([al?.nombre || alumnoId, fecha || '', horario || '', estado || '']);
      });
    });
    rows.sort((a, b) => {
      const [da, ma] = (a[1] || '').split('/').map(Number);
      const [db, mb] = (b[1] || '').split('/').map(Number);
      return ma !== mb ? ma - mb : da - db;
    });
    downloadCSV(['Alumno', 'Fecha', 'Horario', 'Estado'], rows, `asistencias-${mesActual}.csv`);
    setExportModal(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!autenticado) return <Login onLogin={handleLogin} />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center fade-in">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full spinner mx-auto mb-4"></div>
          <p className="text-on-surface-variant font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {error && (
        <div className="fixed top-4 right-4 bg-error text-white px-4 py-3 rounded-2xl shadow-lg fade-in flex items-center gap-3 z-[100]">
          <span>{error}</span>
          <button onClick={() => setError(null)}><Icon name="close" size={18} /></button>
        </div>
      )}

      <Sidebar
        seccionActiva={seccionActiva}
        setSeccionActiva={setSeccionActiva}
        disciplinaActiva={disciplinaActiva}
        setDisciplinaActiva={setDisciplinaActiva}
        onSync={cargarDatos}
        onLogout={handleLogout}
        syncing={syncing}
      />

      <main className="lg:pl-72 min-h-screen pb-24 lg:pb-8">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center w-full px-4 py-3 lg:py-4 sticky top-0 z-40 bg-surface/80 backdrop-blur-md gap-3">
          {/* Izquierda: mes */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-surface-container-low px-3 py-1.5 rounded-full gap-1.5">
              <Icon name="calendar_month" className="text-outline" size={16} />
              <select
                value={mesActual}
                onChange={(e) => setMesActual(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-xs font-semibold text-on-surface-variant cursor-pointer"
              >
                {MESES.map(m => <option key={m} value={`${m} ${anio}`}>{m} {anio}</option>)}
              </select>
            </div>
          </div>

          {/* Centro: disciplina activa — siempre visible, coloreada, clickeable */}
          {(() => {
            const c = DISC_COLORS[disciplinaActiva] || DISC_COLORS['Futvoley'];
            return (
              <div className={`relative flex items-center justify-center gap-2 ${c.bg} border-2 ${c.border} rounded-2xl px-4 py-2`}>
                <span className={`text-sm font-black ${c.text} whitespace-nowrap`}>{disciplinaActiva}</span>
                <select
                  value={disciplinaActiva}
                  onChange={(e) => setDisciplinaActiva(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                >
                  {DISCIPLINAS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            );
          })()}

          {/* Derecha: sync + export */}
          <div className="flex items-center justify-end gap-2">
            {syncing && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full spinner"></div>}
            <div className="relative">
              <button
                onClick={() => setExportModal(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low hover:bg-surface-container rounded-full text-on-surface-variant text-xs font-semibold transition-colors"
              >
                <Icon name="download" size={15} />
                <span className="hidden sm:inline">Exportar</span>
              </button>
              {exportModal && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setExportModal(false)} />
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-surface-container p-2 z-50 w-52">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-outline px-3 py-1.5">Exportar CSV</p>
                    <button
                      onClick={handleExportarPagos}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container-low text-left transition-colors"
                    >
                      <Icon name="payments" size={18} className="text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-on-surface">Pagos</p>
                        <p className="text-[10px] text-outline">Todos los registros del mes</p>
                      </div>
                    </button>
                    <button
                      onClick={handleExportarClases}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container-low text-left transition-colors"
                    >
                      <Icon name="calendar_month" size={18} className="text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-on-surface">Clases</p>
                        <p className="text-[10px] text-outline">Slots con alumnos y asistencia</p>
                      </div>
                    </button>
                    <button
                      onClick={handleExportarAsistencias}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container-low text-left transition-colors"
                    >
                      <Icon name="fact_check" size={18} className="text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-on-surface">Asistencias</p>
                        <p className="text-[10px] text-outline">Registro de estados del mes</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="px-6 fade-in">
          {seccionActiva === 'dashboard' && (
            <Dashboard
              disciplinaActiva={disciplinaActiva}
              setDisciplinaActiva={setDisciplinaActiva}
              mesActual={mesActual}
              alumnosActivos={alumnosActivos}
              montoCobrado={montoCobrado}
              pagosPendientes={pagosPendientes}
              fechasClase={fechasClase}
              preciosDisciplina={preciosDisciplina}
              alumnos={alumnos}
            />
          )}

          {seccionActiva === 'alumnos' && (
            <Alumnos
              disciplinaActiva={disciplinaActiva}
              alumnosFiltrados={alumnosFiltrados}
              todosLosAlumnos={alumnos}
              clasesDisponiblesMap={clasesDisponiblesMap}
              busqueda={busqueda}
              setBusqueda={setBusqueda}
              horarioFiltro={horarioFiltro}
              setHorarioFiltro={setHorarioFiltro}
              membresiaFiltro={membresiaFiltro}
              setMembresiaFiltro={setMembresiaFiltro}
              planFiltro={planFiltro}
              setPlanFiltro={setPlanFiltro}
              onGuardarAlumno={handleGuardarAlumno}
              onEditarAlumno={handleEditarAlumno}
              onEliminarAlumno={handleEliminarAlumno}
              syncing={syncing}
            />
          )}


          {seccionActiva === 'pagos' && (
            <Pagos
              disciplinaActiva={disciplinaActiva}
              mesActual={mesActual}
              montoCobrado={montoCobrado}
              montoPendiente={montoPendiente}
              pagosPendientes={pagosPendientes}
              pagosSueltasPendientes={pagosSueltasPendientes}
              pagosDisciplina={pagosDisciplina}
              alumnos={alumnos}
              preciosDisciplina={preciosDisciplina}
              fechasMes={getFechasMes(mesNum, anio)}
              preciosTiposActivos={preciosTiposActivos}
              onProcesarPago={handleProcesarPago}
              onProcesarSuelta={handleProcesarClaseSuelta}
              onProcesarPrivada={handleProcesarPrivada}
              onProcesarPrueba={handleProcesarPrueba}
              onProcesarDayUse={handleProcesarDayUse}
              onPagarMembresia={handlePagarMembresia}
              onMarcarPagado={handleMarcarPagado}
              onPagarSueltaVirtual={handlePagarSueltaVirtual}
              onCancelarSuelta={handleCancelarSuelta}
              syncing={syncing}
            />
          )}

          {seccionActiva === 'profesores' && (
            <Profesores
              disciplinaActiva={disciplinaActiva}
              mesActual={mesActual}
              fechasClase={fechasClase}
              profesores={profesores}
              clasesPorProfe={clasesPorProfe}
              datosProfes={datosProfes}
              onGuardarProfe={handleGuardarProfe}
              onEliminarProfe={handleEliminarProfe}
              onAsignarClase={handleAsignarClase}
              syncing={syncing}
            />
          )}

          {seccionActiva === 'canchas' && (
            <GrillaCancha
              mesActual={mesActual}
              mesNum={mesNum}
              anio={anio}
              ocupacion={ocupacion}
              alumnos={alumnos}
              asistencias={asistencias}
              profesores={profesores}
              clasesPorProfe={clasesPorProfe}
              onAgregar={handleAgregarAlumnoSlot}
              onRemover={handleRemoverAlumnoSlot}
              onCrearSlot={handleCrearSlot}
              onRegistrarAsistencia={handleRegistrarAsistencia}
              onAsignarProfe={handleAsignarProfeSlot}
              syncing={syncing}
              vistaMode={vistaGrilla}
              setVistaMode={setVistaGrilla}
            />
          )}

          {seccionActiva === 'configuracion' && (
            <Configuracion
              disciplinaActiva={disciplinaActiva}
              mesActual={mesActual}
              precios={precios}
              onUpdatePrecios={handleUpdatePrecios}
              preciosQR={preciosQR}
              onUpdatePreciosQR={handleUpdatePreciosQR}
              preciosTipos={preciosTipos}
              onUpdatePrecioTipo={handleUpdatePrecioTipo}
              preciosPrivadas={preciosPrivadas}
              onUpdatePreciosPrivadas={handleUpdatePreciosPrivadas}
            />
          )}

          {seccionActiva === 'shop' && <Shop />}
        </div>
      </main>

      {!(seccionActiva === 'canchas' && vistaGrilla === 'semana') && (
        <BottomNav seccionActiva={seccionActiva} setSeccionActiva={setSeccionActiva} />
      )}
    </div>
  );
}

export default App;
