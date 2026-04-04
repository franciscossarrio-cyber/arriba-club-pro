import { useState, useEffect, useCallback } from 'react';

// Components
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import Alumnos from './components/Alumnos';
import Clases from './components/Clases';
import Pagos from './components/Pagos';
import Profesores from './components/Profesores';
import Configuracion from './components/Configuracion';
import GrillaCancha from './components/GrillaCancha';
import Icon from './components/Icon';
import DisciplinaIcon from './components/DisciplinaIcon';

// Hooks & Utils
import { useFirestore } from './hooks/useFirestore';
import {
  DISCIPLINAS,
  HORARIOS,
  MESES,
  PRECIOS_DEFAULT,
  PRECIOS_TIPOS_DEFAULT,
  getMesActual,
  getFechasClaseMes,
  getFechasMes,
  parseMesActual,
  getClasesDelMes,
  formatMonto,
  buscarAlumno,
  storage
} from './utils/helpers';

function App() {
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
  const [ocupacion, setOcupacion] = useState([]);        // docs de ocupacion_cancha
  const [profesores, setProfesores] = useState(() => storage.get('profesores') || []);
  const [clasesPorProfe, setClasesPorProfe] = useState(() => storage.get('clases_profe') || {});
  const [precios, setPrecios] = useState(() => storage.get('precios') || PRECIOS_DEFAULT);
  const [preciosTipos, setPreciosTipos] = useState(() => storage.get('preciosTipos') || PRECIOS_TIPOS_DEFAULT);

  // UI State
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [horarioFiltro, setHorarioFiltro] = useState('todos');
  const [membresiaFiltro, setMembresiaFiltro] = useState('todos');
  const [planFiltro, setPlanFiltro] = useState('todos');
  const [error, setError] = useState(null);

  // Firestore
  const {
    getAlumnos,
    getPagos,
    getAsistencias,
    getOcupacionMes,
    getProfesores,
    getClasesProfe,
    addAlumno,
    updateAlumno,
    deleteAlumno,
    addPago,
    updatePago,
    deletePago,
    addAsistencia,
    addAsistenciasLote,
    removeAsistencia,
    setClaseProfe,
    addProfesor,
    deleteProfesor,
    llenarCuposMembresia,
    agregarAlumnoASlot,
    removerAlumnoDeSlot,
    setSlot,
  } = useFirestore();

  // Computed
  const { mesNum, anio } = parseMesActual(mesActual);
  const fechasClase = getFechasClaseMes(mesNum, anio);

  // Effects — persistir en localStorage
  useEffect(() => { storage.set('seccion', seccionActiva); }, [seccionActiva]);
  useEffect(() => { storage.set('disciplina', disciplinaActiva); }, [disciplinaActiva]);
  useEffect(() => { storage.set('precios', precios); }, [precios]);
  useEffect(() => { storage.set('preciosTipos', preciosTipos); }, [preciosTipos]);
  useEffect(() => { if (profesores.length > 0) storage.set('profesores', profesores); }, [profesores]);
  useEffect(() => { if (Object.keys(clasesPorProfe).length > 0) storage.set('clases_profe', clasesPorProfe); }, [clasesPorProfe]);

  // Auth
  const handleLogin = () => { setAutenticado(true); storage.set('auth', true); };
  const handleLogout = () => { setAutenticado(false); storage.remove('auth'); };

  // ── Carga de datos ─────────────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const [alumnosData, pagosData, asistData, ocupData, profesData, clasesProfeData] = await Promise.all([
        getAlumnos(),
        getPagos(mesActual),
        getAsistencias(mesActual),
        getOcupacionMes(mesActual).catch(() => []),
        getProfesores().catch(() => []),
        getClasesProfe(mesActual).catch(() => []),
      ]);

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
        const fechaCorta = a.fecha ? a.fecha.substring(0, 5) : '';
        const clave = fechaCorta && a.horario ? `${fechaCorta}|${a.horario}` : fechaCorta;
        if (clave) asistPorAlumno[a.alumnoId][clave] = a.estado || 'asistio';
      });
      setAsistencias(asistPorAlumno);

      setOcupacion(ocupData);

      if (profesData.length > 0) {
        setProfesores(profesData);
        storage.set('profesores', profesData);
      }

      if (clasesProfeData.length > 0) {
        const clasesObj = clasesProfeData.reduce(
          (acc, c) => ({ ...acc, [c.id]: c.profesorId }), {},
        );
        setClasesPorProfe(clasesObj);
        storage.set('clases_profe', clasesObj);
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [getAlumnos, getPagos, getAsistencias, getOcupacionMes, getProfesores, getClasesProfe, mesActual]);

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

  // Detectar alumnos de "Clases sueltas" en slots que aún no tienen pago registrado
  const alumnosSueltasIds = new Set(
    alumnosActivos.filter(a => a.tipoMembresia === 'Clases sueltas').map(a => a.id)
  );
  const sueltasCubiertasSet = new Set(
    pagosDisciplina
      .filter(p => p.tipo === 'suelta' && ['Pagado', 'Pendiente'].includes(p.estado))
      .map(p => `${p.alumnoId}|${p.fecha}|${p.horario}`)
  );
  const sueltasVirtualesMap = new Map(); // key: alumnoId|fecha|horario → dedup por cancha
  ocupacion
    .filter(slot =>
      (slot.disciplina === disciplinaActiva || (!slot.disciplina && disciplinaActiva === 'Futvoley')) &&
      (slot.tipo === 'clasica' || slot.tipo === 'membresia' || slot.tipo === 'suelta' || !slot.tipo)
    )
    .forEach(slot => {
      (slot.alumnos || [])
        .filter(id => alumnosSueltasIds.has(id))
        .forEach(alumnoId => {
          const fechaCompleta = `${slot.fecha}/${anio}`;
          const key = `${alumnoId}|${fechaCompleta}|${slot.horario}`;
          if (!sueltasCubiertasSet.has(key) && !sueltasVirtualesMap.has(key)) {
            const alumno = alumnosActivos.find(a => a.id === alumnoId);
            sueltasVirtualesMap.set(key, {
              id: `virtual_${alumnoId}_${slot.fecha}_${slot.horario}`,
              alumnoId,
              nombre: alumno?.nombre || '',
              tipo: 'suelta',
              estado: 'Pendiente',
              monto: preciosTiposActivos['Clases sueltas'] || 0,
              fecha: fechaCompleta,
              horario: slot.horario,
              disciplina: disciplinaActiva,
              virtual: true,
            });
          }
        });
    });
  const sueltasVirtuales = Array.from(sueltasVirtualesMap.values());

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
      await cargarDatos();
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
      await cargarDatos();
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
      await cargarDatos();
    } catch (err) {
      setError('Error al eliminar alumno');
    } finally {
      setSyncing(false);
    }
  };

  const handleGuardarProfe = async (nuevoProfe) => {
    setSyncing(true);
    try {
      await addProfesor({ nombre: nuevoProfe.nombre, cbu: nuevoProfe.cbu });
      await cargarDatos();
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
        await cargarDatos();
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
      await setClaseProfe(disciplinaActiva, fecha, horario, profeId, mesActual);
    } catch (err) {
      setError('Error al asignar clase');
    }
  };

  /**
   * Registra o cambia el estado de asistencia de un alumno en un slot.
   * Si `nuevoEstado` es null, borra la asistencia (toggle off).
   * estados: 'asistio' | 'falto' | 'cambio_turno'
   */
  const handleRegistrarAsistencia = async (alumnoId, fecha, horario, nuevoEstado) => {
    const fechaCompleta = `${fecha}/${anio}`;
    setSyncing(true);
    try {
      // Borra el registro existente para este slot (si hay)
      await removeAsistencia(alumnoId, fechaCompleta, horario);

      if (nuevoEstado) {
        await addAsistencia({
          alumnoId,
          fecha: fechaCompleta,
          mes: mesActual,
          disciplina: disciplinaActiva,
          horario,
          estado: nuevoEstado,
        });
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
      const fechaCompleta = `${fechaLista}/${anio}`;
      setSyncing(true);
      try {
        await addAsistenciasLote(
          encontrados.map(a => ({
            alumnoId: a.id,
            fecha: fechaCompleta,
            mes: mesActual,
            disciplina: disciplinaActiva,
            horario: horario || a.horario || '',
            estado: 'asistio',
          }))
        );
        setAsistencias(prev => {
          const nuevo = { ...prev };
          encontrados.forEach(a => {
            if (!nuevo[a.id]) nuevo[a.id] = {};
            nuevo[a.id] = { ...nuevo[a.id], [fechaLista]: 'asistio' };
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

    const monto = preciosDisciplina[alumno.plan]?.[alumno.frecuencia] || 95000;
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

      await cargarDatos();
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
      // Agrega al alumno al slot de cancha3 para esa fecha/horario
      await agregarAlumnoASlot('cancha3', fecha, horario, alumno.id);
      await cargarDatos();
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
        estado: 'Pagado',
        metodo,
        disciplina: disciplinaActiva,
        tipo: 'privada',
        fecha: `${fecha}/${anio}`,
        horario,
      });
      await cargarDatos();
      return { success: true, mensaje: `✓ ${alumno.nombre} — Clase privada ${fecha} ${horario}` };
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
      await cargarDatos();
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
      await cargarDatos();
      return { success: true, mensaje: `✓ ${alumno.nombre} — Day Use registrado ${fecha}` };
    } catch (err) {
      return { success: false, mensaje: 'Error de conexión' };
    } finally {
      setSyncing(false);
    }
  };

  const handlePagarMembresia = async (alumno, metodo) => {
    const monto = preciosDisciplina[alumno.plan]?.[alumno.frecuencia] || 0;
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
      await cargarDatos();
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
      await updatePago(pagoId, { estado: 'Pagado', metodo });
      await cargarDatos();
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
        monto: pago.monto,
        estado: 'Pagado',
        metodo,
        disciplina: pago.disciplina || disciplinaActiva,
        tipo: 'suelta',
        fecha: pago.fecha,
        horario: pago.horario,
      });
      await cargarDatos();
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
      await cargarDatos();
    } catch (err) {
      setError('Error al cancelar deuda');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdatePrecioTipo = (disciplina, tipo, valor) => {
    setPreciosTipos(prev => ({
      ...prev,
      [disciplina]: { ...prev[disciplina], [tipo]: parseInt(valor) || 0 }
    }));
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
      await cargarDatos();
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
      await agregarAlumnoASlot(canchaId, fecha, horario, alumnoId);

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
          await cargarDatos();
          return;
        }
      }

      if (normSlotTipo === 'clasica') {
        const alumno = alumnos.find(a => a.id === alumnoId);
        if (alumno && alumno.tipoMembresia && alumno.tipoMembresia !== 'Membresía mensual') {
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
            fecha: `${fecha}/${anio}`,
            horario,
          });
          await cargarDatos();
          return;
        }
      }

      const ocupData = await getOcupacionMes(mesActual).catch(() => []);
      setOcupacion(ocupData);
    } catch (err) {
      setError('Error al agregar alumno al slot');
    } finally {
      setSyncing(false);
    }
  };

  const handleRemoverAlumnoSlot = async (canchaId, fecha, horario, alumnoId) => {
    setSyncing(true);
    try {
      await removerAlumnoDeSlot(canchaId, fecha, horario, alumnoId);
      const ocupData = await getOcupacionMes(mesActual).catch(() => []);
      setOcupacion(ocupData);
    } catch (err) {
      setError('Error al remover alumno del slot');
    } finally {
      setSyncing(false);
    }
  };

  const handleCrearSlot = async (canchaId, fecha, horario, data) => {
    setSyncing(true);
    try {
      await setSlot(canchaId, fecha, horario, { ...data, mes: mesActual });
      const ocupData = await getOcupacionMes(mesActual).catch(() => []);
      setOcupacion(ocupData);
    } catch (err) {
      setError('Error al crear slot');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdatePrecios = (disciplina, plan, frecuencia, valor) => {
    setPrecios(prev => ({
      ...prev,
      [disciplina]: {
        ...prev[disciplina],
        [plan]: { ...prev[disciplina]?.[plan], [frecuencia]: valor }
      }
    }));
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
            const colores = {
              'Futvoley':     { bg: 'bg-slate-800/10',  border: 'border-slate-700/25',  text: 'text-slate-800'  },
              'Beach Tennis': { bg: 'bg-orange-500/10', border: 'border-orange-500/25', text: 'text-orange-600' },
              'Beach Volley': { bg: 'bg-amber-500/10',  border: 'border-amber-500/25',  text: 'text-amber-600'  },
              'Funcional':    { bg: 'bg-violet-600/10', border: 'border-violet-500/25', text: 'text-violet-700'  },
            };
            const c = colores[disciplinaActiva] || colores['Futvoley'];
            return (
              <div className={`relative flex items-center justify-center gap-2 ${c.bg} border-2 ${c.border} rounded-2xl px-4 py-2`}>
                <DisciplinaIcon disciplina={disciplinaActiva} size={22} />
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

          {/* Derecha: sync */}
          <div className="flex items-center justify-end gap-2">
            {syncing && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full spinner"></div>}
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

          {seccionActiva === 'clases' && (
            <Clases
              disciplinaActiva={disciplinaActiva}
              mesActual={mesActual}
              mesNum={mesNum}
              anio={anio}
              ocupacion={ocupacion}
              alumnos={alumnos}
              alumnosDisciplina={alumnosDisciplina}
              asistencias={asistencias}
              profesores={profesores}
              clasesPorProfe={clasesPorProfe}
              onRegistrarAsistencia={handleRegistrarAsistencia}
              onProcesarLista={handleProcesarLista}
              onLlenarMes={handleLlenarMes}
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
              onAgregar={handleAgregarAlumnoSlot}
              onRemover={handleRemoverAlumnoSlot}
              onCrearSlot={handleCrearSlot}
              onRegistrarAsistencia={handleRegistrarAsistencia}
              syncing={syncing}
            />
          )}

          {seccionActiva === 'configuracion' && (
            <Configuracion
              disciplinaActiva={disciplinaActiva}
              precios={precios}
              onUpdatePrecios={handleUpdatePrecios}
              preciosTipos={preciosTipos}
              onUpdatePrecioTipo={handleUpdatePrecioTipo}
            />
          )}
        </div>
      </main>

      <BottomNav seccionActiva={seccionActiva} setSeccionActiva={setSeccionActiva} />
    </div>
  );
}

export default App;
