import { useState, useMemo } from 'react';
import Icon from './Icon';
import { HORARIOS } from '../utils/helpers';

const CUPO_MAX = 8;

const DIAS_NOMBRE = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function fechaCorta(fechaCompleta) {
  return fechaCompleta ? fechaCompleta.substring(0, 5) : '';
}

function diaNombre(fecha, anio) {
  const [dd, mm] = fecha.split('/').map(Number);
  return DIAS_NOMBRE[new Date(anio, mm - 1, dd).getDay()];
}

const Clases = ({
  disciplinaActiva,
  mesActual,
  anio,
  ocupacion,       // array de docs de ocupacion_cancha
  alumnos,         // lista completa de alumnos (para nombre lookup)
  alumnosDisciplina,
  asistencias,     // { alumnoId: { 'dd/mm': estado } }
  profesores,
  clasesPorProfe,
  onRegistrarAsistencia,
  onProcesarLista,
  syncing,
}) => {
  const [horarioActivo, setHorarioActivo] = useState(HORARIOS[1]); // 18:00 default
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [mostrarCargaLista, setMostrarCargaLista] = useState(false);
  const [inputLista, setInputLista] = useState('');
  const [fechaLista, setFechaLista] = useState('');
  const [resultadoLista, setResultadoLista] = useState(null);

  // Fechas que tienen slots en cancha3 para el horario activo
  const fechasOcupadas = useMemo(() => {
    const set = new Set(
      ocupacion
        .filter(s => s.canchaId === 'cancha3' && s.horario === horarioActivo)
        .map(s => s.fecha)
    );
    return [...set].sort((a, b) => {
      const [dA, mA] = a.split('/').map(Number);
      const [dB, mB] = b.split('/').map(Number);
      return mA !== mB ? mA - mB : dA - dB;
    });
  }, [ocupacion, horarioActivo]);

  // Slot actual (cancha3 + fecha + horario)
  const slotActual = useMemo(() => {
    if (!fechaSeleccionada) return null;
    return ocupacion.find(
      s => s.canchaId === 'cancha3' &&
           s.fecha === fechaSeleccionada &&
           s.horario === horarioActivo
    ) || null;
  }, [ocupacion, fechaSeleccionada, horarioActivo]);

  const alumnosEnSlot = slotActual?.alumnos || [];

  // Cupos: los que marcaron cambio_turno liberan un cupo para ese día
  const cambiosTurno = alumnosEnSlot.filter(
    id => asistencias[id]?.[fechaSeleccionada] === 'cambio_turno'
  ).length;
  const cuposOcupados = alumnosEnSlot.length - cambiosTurno;
  const cuposLibres = CUPO_MAX - cuposOcupados;

  // Profe asignado
  const profeId = clasesPorProfe[`${disciplinaActiva}-${fechaSeleccionada}-${horarioActivo}`];
  const profe = profesores.find(p => p.id === profeId);

  const handleProcesarLista = async () => {
    const resultado = await onProcesarLista(inputLista, fechaLista, horarioActivo);
    setResultadoLista(resultado);
    if (resultado?.success) setInputLista('');
  };

  const handleHorario = (h) => {
    setHorarioActivo(h);
    setFechaSeleccionada('');
  };

  const toggleAsistencia = (alumnoId, estadoActual, nuevoEstado) => {
    // Si ya tiene ese estado, lo borra (toggle off)
    onRegistrarAsistencia(
      alumnoId,
      fechaSeleccionada,
      horarioActivo,
      estadoActual === nuevoEstado ? null : nuevoEstado
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Clases</h1>
          <p className="text-on-surface-variant">{disciplinaActiva} · Cancha 3 · {mesActual}</p>
        </div>
        <button
          onClick={() => setMostrarCargaLista(!mostrarCargaLista)}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all ${mostrarCargaLista ? 'bg-primary text-white' : 'bg-surface-container-lowest text-primary'}`}
        >
          <Icon name="content_paste" size={18} />
          Carga Rápida
        </button>
      </div>

      {/* Carga Rápida */}
      {mostrarCargaLista && (
        <div className="bg-surface-container-lowest rounded-2xl p-5 space-y-4 fade-in">
          <div className="flex items-center gap-3">
            <Icon name="content_paste_go" className="text-primary" />
            <p className="font-bold text-on-surface">Carga Masiva de Asistencias</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-outline font-bold uppercase mb-2 block">Fecha</label>
              <select
                value={fechaLista}
                onChange={(e) => setFechaLista(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl"
              >
                <option value="">Seleccionar fecha</option>
                {fechasOcupadas.map(f => (
                  <option key={f} value={f}>{diaNombre(f, anio)} {f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-outline font-bold uppercase mb-2 block">Horario</label>
              <select
                value={horarioActivo}
                onChange={(e) => setHorarioActivo(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl"
              >
                {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <textarea
            value={inputLista}
            onChange={(e) => setInputLista(e.target.value)}
            placeholder="Pegá la lista de nombres acá (uno por línea)"
            className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl focus:border-primary min-h-[100px] resize-none"
          />
          <button
            onClick={handleProcesarLista}
            disabled={syncing || !fechaLista}
            className="w-full py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-bold disabled:opacity-50"
          >
            {syncing ? 'Procesando...' : 'Procesar Lista'}
          </button>
          {resultadoLista && (
            <div className={`p-4 rounded-xl ${resultadoLista.success ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
              <p className="font-bold">{resultadoLista.mensaje}</p>
              {resultadoLista.noEncontrados?.length > 0 && (
                <p className="text-sm mt-1 opacity-80">✗ No encontrados: {resultadoLista.noEncontrados.join(', ')}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Horario tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {HORARIOS.map(h => (
          <button
            key={h}
            onClick={() => handleHorario(h)}
            className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              horarioActivo === h
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-surface-container-lowest text-on-surface-variant'
            }`}
          >
            {h}
          </button>
        ))}
      </div>

      {/* Selector de fechas */}
      {fechasOcupadas.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {fechasOcupadas.map(fecha => (
            <button
              key={fecha}
              onClick={() => setFechaSeleccionada(fecha)}
              className={`flex flex-col items-center px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all min-w-[60px] ${
                fechaSeleccionada === fecha
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className="text-[10px] uppercase opacity-70">{diaNombre(fecha, anio)}</span>
              <span>{fecha}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl p-6 text-center text-on-surface-variant">
          <Icon name="event_busy" size={32} className="mx-auto mb-2 opacity-40" />
          <p className="font-medium">Sin clases cargadas para las {horarioActivo}</p>
          <p className="text-sm mt-1 opacity-70">Los cupos se llenan automáticamente al registrar un pago de membresía</p>
        </div>
      )}

      {/* Slot de cancha */}
      {fechaSeleccionada && (
        <div className="space-y-4 fade-in">
          {/* Info del slot */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="font-black text-on-surface text-lg">
                Cancha 3 · {diaNombre(fechaSeleccionada, anio)} {fechaSeleccionada} · {horarioActivo}
              </p>
              {profe && (
                <p className="text-sm text-on-surface-variant mt-0.5">
                  <Icon name="person" size={14} className="inline mr-1" />
                  {profe.nombre}
                </p>
              )}
            </div>
            {/* Cupo */}
            <div className={`flex flex-col items-center px-4 py-2 rounded-xl ${
              cuposLibres === 0 ? 'bg-error/10 text-error' :
              cuposLibres <= 2 ? 'bg-amber-500/10 text-amber-600' :
              'bg-success/10 text-success'
            }`}>
              <span className="text-2xl font-black">{cuposOcupados}/{CUPO_MAX}</span>
              <span className="text-[10px] font-bold uppercase">
                {cuposLibres === 0 ? 'Completo' : `${cuposLibres} libre${cuposLibres !== 1 ? 's' : ''}`}
              </span>
              {cambiosTurno > 0 && (
                <span className="text-[10px] text-amber-500">+{cambiosTurno} cambio</span>
              )}
            </div>
          </div>

          {/* Lista de alumnos del slot */}
          {alumnosEnSlot.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-6 text-center text-on-surface-variant">
              <p className="font-medium">No hay alumnos en este turno</p>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-3xl overflow-hidden">
              <div className="divide-y divide-surface-container">
                {alumnosEnSlot.map(alumnoId => {
                  const alumno = alumnos.find(a => a.id === alumnoId);
                  const estado = asistencias[alumnoId]?.[fechaSeleccionada];

                  return (
                    <div key={alumnoId} className={`flex items-center justify-between p-4 transition-colors ${
                      estado === 'cambio_turno' ? 'bg-amber-50/50' : 'hover:bg-surface-container-low'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          estado === 'asistio' ? 'bg-success/20 text-success' :
                          estado === 'falto' ? 'bg-error/20 text-error' :
                          estado === 'cambio_turno' ? 'bg-amber-500/20 text-amber-600' :
                          'bg-primary/10 text-primary'
                        }`}>
                          {alumno?.nombre?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-on-surface">{alumno?.nombre || alumnoId}</p>
                          <p className="text-xs text-on-surface-variant">{alumno?.plan} · {alumno?.frecuencia}</p>
                        </div>
                      </div>

                      {/* Botones de estado */}
                      <div className="flex gap-2">
                        {/* Fue */}
                        <button
                          onClick={() => toggleAsistencia(alumnoId, estado, 'asistio')}
                          disabled={syncing}
                          title="Fue"
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            estado === 'asistio'
                              ? 'bg-success text-white shadow-md shadow-success/30'
                              : 'bg-surface-container-high text-outline hover:bg-success/10 hover:text-success'
                          }`}
                        >
                          <Icon name="check" size={20} />
                        </button>
                        {/* Faltó */}
                        <button
                          onClick={() => toggleAsistencia(alumnoId, estado, 'falto')}
                          disabled={syncing}
                          title="Faltó"
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            estado === 'falto'
                              ? 'bg-error text-white shadow-md shadow-error/30'
                              : 'bg-surface-container-high text-outline hover:bg-error/10 hover:text-error'
                          }`}
                        >
                          <Icon name="close" size={20} />
                        </button>
                        {/* Cambio de turno */}
                        <button
                          onClick={() => toggleAsistencia(alumnoId, estado, 'cambio_turno')}
                          disabled={syncing}
                          title="Pidió cambio de turno"
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            estado === 'cambio_turno'
                              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                              : 'bg-surface-container-high text-outline hover:bg-amber-500/10 hover:text-amber-600'
                          }`}
                        >
                          <Icon name="sync" size={20} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Leyenda */}
          <div className="flex gap-4 text-xs text-on-surface-variant px-1">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-success inline-block"></span>Fue</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-error inline-block"></span>Faltó</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>Cambio de turno</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clases;
