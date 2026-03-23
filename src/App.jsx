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
import Icon from './components/Icon';

// Hooks & Utils
import { useApi } from './hooks/useApi';
import {
  DISCIPLINAS,
  HORARIOS,
  MESES,
  PRECIOS_DEFAULT,
  getMesActual,
  getFechasClaseMes,
  parseMesActual,
  formatMonto,
  buscarAlumno,
  storage
} from './utils/helpers';

function App() {
  // Auth
  const [autenticado, setAutenticado] = useState(() => storage.get('auth') === true);
  
  // Navigation
  const [seccionActiva, setSeccionActiva] = useState('dashboard');
  const [disciplinaActiva, setDisciplinaActiva] = useState(() => storage.get('disciplina') || 'Futvoley');
  const [mesActual, setMesActual] = useState(getMesActual());
  
  // Data
  const [alumnos, setAlumnos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [asistencias, setAsistencias] = useState({});
  const [profesores, setProfesores] = useState(() => storage.get('profesores') || []);
  const [clasesPorProfe, setClasesPorProfe] = useState(() => storage.get('clases_profe') || {});
  const [precios, setPrecios] = useState(() => storage.get('precios') || PRECIOS_DEFAULT);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [horarioFiltro, setHorarioFiltro] = useState('todos');
  const [error, setError] = useState(null);

  // API
  const { apiGet, apiPost } = useApi();

  // Computed
  const { mesNum, anio } = parseMesActual(mesActual);
  const fechasClase = getFechasClaseMes(mesNum, anio);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechasClase[0] || '');

  // Effects - Persist to localStorage
  useEffect(() => { storage.set('disciplina', disciplinaActiva); }, [disciplinaActiva]);
  useEffect(() => { storage.set('precios', precios); }, [precios]);
  useEffect(() => { if (profesores.length > 0) storage.set('profesores', profesores); }, [profesores]);
  useEffect(() => { if (Object.keys(clasesPorProfe).length > 0) storage.set('clases_profe', clasesPorProfe); }, [clasesPorProfe]);

  // Auth handlers
  const handleLogin = () => {
    setAutenticado(true);
    storage.set('auth', true);
  };

  const handleLogout = () => {
    setAutenticado(false);
    storage.remove('auth');
  };

  // Load data
  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const [alumnosRes, pagosRes, asistRes] = await Promise.all([
        apiGet('getAlumnos'),
        apiGet('getPagos', { mes: mesActual }),
        apiGet('getAsistencias', { mes: mesActual })
      ]);

      if (alumnosRes.success) {
        setAlumnos(alumnosRes.alumnos.map(a => ({
          ...a,
          disciplinas: a.disciplinas || ['Futvoley'],
          horario: a.horario || '18:00'
        })));
      }
      if (pagosRes.success) setPagos(pagosRes.pagos);
      if (asistRes.success) {
        const asistPorAlumno = {};
        asistRes.asistencias.forEach(a => {
          if (!asistPorAlumno[a.alumnoid]) asistPorAlumno[a.alumnoid] = [];
          const fechaCorta = a.fecha ? a.fecha.substring(0, 5) : '';
          if (fechaCorta && !asistPorAlumno[a.alumnoid].includes(fechaCorta)) {
            asistPorAlumno[a.alumnoid].push(fechaCorta);
          }
        });
        setAsistencias(asistPorAlumno);
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [apiGet, mesActual]);

  useEffect(() => {
    if (autenticado) cargarDatos();
  }, [autenticado, mesActual, cargarDatos]);

  // Filters
  const alumnosDisciplina = alumnos.filter(a =>
    a.disciplinas?.includes(disciplinaActiva) || (!a.disciplinas && disciplinaActiva === 'Futvoley')
  );
  const pagosDisciplina = pagos.filter(p =>
    p.disciplina === disciplinaActiva || (!p.disciplina && disciplinaActiva === 'Futvoley')
  );

  // Calculations
  const alumnosActivos = alumnosDisciplina.filter(a => a.estado === 'Activo');
  const alumnosConPago = new Set(pagosDisciplina.filter(p => p.estado === 'Pagado').map(p => p.alumnoid));
  const pagosPendientes = alumnosActivos.filter(a => !alumnosConPago.has(a.id));
  const preciosDisciplina = precios[disciplinaActiva] || PRECIOS_DEFAULT['Futvoley'];
  const montoPendiente = pagosPendientes.reduce((sum, a) =>
    sum + (preciosDisciplina[a.plan]?.[a.frecuencia] || 95000), 0
  );
  const montoCobrado = pagosDisciplina
    .filter(p => p.estado === 'Pagado')
    .reduce((sum, p) => sum + (parseInt(p.monto) || 0), 0);

  const alumnosFiltrados = alumnosDisciplina.filter(a => {
    const matchBusqueda = a.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.telefono?.includes(busqueda);
    const matchHorario = horarioFiltro === 'todos' || a.horario === horarioFiltro;
    return matchBusqueda && matchHorario;
  });

  // Professors calculation
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

  // Handlers
  const handleGuardarAlumno = async (nuevoAlumno) => {
    setSyncing(true);
    try {
      const res = await apiPost('addAlumno', { ...nuevoAlumno, disciplina: disciplinaActiva });
      if (res.success) await cargarDatos();
    } catch (err) {
      setError('Error al guardar');
    } finally {
      setSyncing(false);
    }
  };

  const handleGuardarProfe = (nuevoProfe) => {
    setProfesores(prev => [...prev, {
      id: `PR${String(prev.length + 1).padStart(3, '0')}`,
      nombre: nuevoProfe.nombre,
      cbu: nuevoProfe.cbu,
      estado: 'Activo'
    }]);
  };

  const handleEliminarProfe = (profeId) => {
    if (confirm('¿Eliminar profesor?')) {
      setProfesores(prev => prev.filter(p => p.id !== profeId));
    }
  };

  const handleAsignarClase = (fecha, horario, profeId) => {
    setClasesPorProfe(prev => ({
      ...prev,
      [`${disciplinaActiva}-${fecha}-${horario}`]: profeId
    }));
  };

  const handleToggleAsistencia = async (alumnoId, fecha) => {
    const fechaCompleta = `${fecha}/${anio}`;
    const asiste = (asistencias[alumnoId] || []).includes(fecha);
    setSyncing(true);
    try {
      if (asiste) {
        await apiPost('removeAsistencia', { alumnoId, fecha: fechaCompleta });
        setAsistencias(prev => ({
          ...prev,
          [alumnoId]: (prev[alumnoId] || []).filter(f => f !== fecha)
        }));
      } else {
        await apiPost('addAsistencia', { alumnoId, fecha: fechaCompleta });
        setAsistencias(prev => ({
          ...prev,
          [alumnoId]: [...(prev[alumnoId] || []), fecha]
        }));
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
      const fechaCompleta = `${fechaLista}/${anio}`;
      setSyncing(true);
      try {
        await apiPost('addAsistenciasLista', {
          alumnoIds: encontrados.map(a => a.id),
          fecha: fechaCompleta
        });
        setAsistencias(prev => {
          const nuevo = { ...prev };
          encontrados.forEach(a => {
            if (!nuevo[a.id]) nuevo[a.id] = [];
            if (!nuevo[a.id].includes(fechaLista)) nuevo[a.id].push(fechaLista);
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

  const handleProcesarPago = async (inputComando) => {
    if (!inputComando.trim()) return { success: false, mensaje: 'Escribí un nombre' };

    const palabras = inputComando.toLowerCase().split(/\s+/);
    let alumno = null;
    for (const p of palabras) {
      alumno = buscarAlumno(p, alumnosDisciplina);
      if (alumno) break;
    }

    if (!alumno) {
      return { success: false, mensaje: `No encontré "${inputComando}"` };
    }

    const mesEncontrado = MESES.find(m => inputComando.toLowerCase().includes(m.toLowerCase()));
    const mes = mesEncontrado ? `${mesEncontrado} ${anio}` : mesActual;

    const existe = pagosDisciplina.find(p =>
      p.alumnoid === alumno.id && p.mes === mes && p.estado === 'Pagado'
    );
    if (existe) {
      return { success: false, mensaje: `${alumno.nombre} ya pagó ${mes}` };
    }

    const monto = preciosDisciplina[alumno.plan]?.[alumno.frecuencia] || 95000;
    setSyncing(true);
    try {
      const res = await apiPost('addPago', {
        pago: {
          alumnoid: alumno.id,
          nombre: alumno.nombre,
          mes,
          monto,
          estado: 'Pagado',
          metodo: 'EFT',
          disciplina: disciplinaActiva
        }
      });
      if (res.success) {
        await cargarDatos();
        return { success: true, mensaje: `✓ ${alumno.nombre} - ${formatMonto(monto)}` };
      }
      return { success: false, mensaje: 'Error al registrar' };
    } catch (err) {
      return { success: false, mensaje: 'Error de conexión' };
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdatePrecios = (disciplina, plan, frecuencia, valor) => {
    setPrecios(prev => ({
      ...prev,
      [disciplina]: {
        ...prev[disciplina],
        [plan]: {
          ...prev[disciplina]?.[plan],
          [frecuencia]: valor
        }
      }
    }));
  };

  // Render Login
  if (!autenticado) {
    return <Login onLogin={handleLogin} />;
  }

  // Render Loading
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

  // Render Main App
  return (
    <div className="min-h-screen bg-surface">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 bg-error text-white px-4 py-3 rounded-2xl shadow-lg fade-in flex items-center gap-3 z-[100]">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      {/* Desktop Sidebar */}
      <Sidebar
        seccionActiva={seccionActiva}
        setSeccionActiva={setSeccionActiva}
        disciplinaActiva={disciplinaActiva}
        setDisciplinaActiva={setDisciplinaActiva}
        onSync={cargarDatos}
        onLogout={handleLogout}
        syncing={syncing}
      />

      {/* Main Content */}
      <main className="lg:pl-72 min-h-screen pb-24 lg:pb-8">
        {/* Top Header */}
        <header className="flex justify-between items-center w-full px-6 py-4 lg:py-6 sticky top-0 z-40 bg-surface/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-on-surface lg:hidden">Arriba Club</h2>
            <div className="hidden lg:flex items-center bg-surface-container-low px-4 py-2 rounded-full gap-2">
              <Icon name="calendar_month" className="text-outline" size={20} />
              <select
                value={mesActual}
                onChange={(e) => setMesActual(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm font-semibold text-on-surface-variant cursor-pointer"
              >
                {MESES.map(m => <option key={m} value={`${m} ${anio}`}>{m} {anio}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {syncing && <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full spinner"></div>}
            <div className="lg:hidden">
              <select
                value={disciplinaActiva}
                onChange={(e) => setDisciplinaActiva(e.target.value)}
                className="px-3 py-2 bg-primary/10 border-0 rounded-xl text-primary text-xs font-bold"
              >
                {DISCIPLINAS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </header>

        {/* Content */}
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
              busqueda={busqueda}
              setBusqueda={setBusqueda}
              horarioFiltro={horarioFiltro}
              setHorarioFiltro={setHorarioFiltro}
              onGuardarAlumno={handleGuardarAlumno}
              syncing={syncing}
            />
          )}

          {seccionActiva === 'clases' && (
            <Clases
              disciplinaActiva={disciplinaActiva}
              mesActual={mesActual}
              fechasClase={fechasClase}
              fechaSeleccionada={fechaSeleccionada}
              setFechaSeleccionada={setFechaSeleccionada}
              horarioFiltro={horarioFiltro}
              setHorarioFiltro={setHorarioFiltro}
              alumnosFiltrados={alumnosFiltrados}
              asistencias={asistencias}
              profesores={profesores}
              clasesPorProfe={clasesPorProfe}
              onToggleAsistencia={handleToggleAsistencia}
              onProcesarLista={handleProcesarLista}
              syncing={syncing}
              anio={anio}
            />
          )}

          {seccionActiva === 'pagos' && (
            <Pagos
              disciplinaActiva={disciplinaActiva}
              mesActual={mesActual}
              montoCobrado={montoCobrado}
              montoPendiente={montoPendiente}
              pagosPendientes={pagosPendientes}
              pagosDisciplina={pagosDisciplina}
              alumnos={alumnos}
              preciosDisciplina={preciosDisciplina}
              onProcesarPago={handleProcesarPago}
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

          {seccionActiva === 'configuracion' && (
            <Configuracion
              disciplinaActiva={disciplinaActiva}
              precios={precios}
              onUpdatePrecios={handleUpdatePrecios}
            />
          )}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNav
        seccionActiva={seccionActiva}
        setSeccionActiva={setSeccionActiva}
      />
    </div>
  );
}

export default App;
