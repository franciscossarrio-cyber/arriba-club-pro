import { useState } from 'react';
import Icon from './Icon';
import { HORARIOS } from '../utils/helpers';

const Clases = ({
  disciplinaActiva,
  mesActual,
  fechasClase,
  fechaSeleccionada,
  setFechaSeleccionada,
  horarioFiltro,
  setHorarioFiltro,
  alumnosFiltrados,
  asistencias,
  profesores,
  clasesPorProfe,
  onToggleAsistencia,
  onProcesarLista,
  syncing,
  anio
}) => {
  const [mostrarCargaLista, setMostrarCargaLista] = useState(false);
  const [inputLista, setInputLista] = useState('');
  const [fechaLista, setFechaLista] = useState('');
  const [resultadoLista, setResultadoLista] = useState(null);

  const handleProcesarLista = async () => {
    const resultado = await onProcesarLista(inputLista, fechaLista, horarioFiltro);
    setResultadoLista(resultado);
    if (resultado.success) {
      setInputLista('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Clases</h1>
          <p className="text-on-surface-variant">{disciplinaActiva} • {mesActual}</p>
        </div>
        <button
          onClick={() => setMostrarCargaLista(!mostrarCargaLista)}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all ${mostrarCargaLista ? 'bg-primary text-white' : 'bg-surface-container-lowest text-primary'}`}
        >
          <Icon name="content_paste" size={18} />
          Carga Rápida
        </button>
      </div>

      {/* Carga Rápida de Lista */}
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
                {fechasClase.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-outline font-bold uppercase mb-2 block">Horario</label>
              <select
                value={horarioFiltro}
                onChange={(e) => setHorarioFiltro(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl"
              >
                {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <textarea
            value={inputLista}
            onChange={(e) => setInputLista(e.target.value)}
            placeholder="Pegá la lista de nombres acá (uno por línea o copiada de WhatsApp)"
            className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl focus:border-primary min-h-[120px] resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={handleProcesarLista}
              disabled={syncing || !fechaLista}
              className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-bold disabled:opacity-50"
            >
              {syncing ? 'Procesando...' : 'Procesar Lista'}
            </button>
          </div>
          {resultadoLista && (
            <div className={`p-4 rounded-xl ${resultadoLista.success ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
              <p className="font-bold">{resultadoLista.mensaje}</p>
              {resultadoLista.encontrados?.length > 0 && (
                <p className="text-sm mt-1 opacity-80">✓ {resultadoLista.encontrados.join(', ')}</p>
              )}
              {resultadoLista.noEncontrados?.length > 0 && (
                <p className="text-sm mt-1 opacity-80">✗ No encontrados: {resultadoLista.noEncontrados.join(', ')}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Horario Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setHorarioFiltro('todos')}
          className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${horarioFiltro === 'todos' ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface-variant'}`}
        >
          Todos
        </button>
        {HORARIOS.map(h => (
          <button
            key={h}
            onClick={() => setHorarioFiltro(h)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${horarioFiltro === h ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface-variant'}`}
          >
            {h}
          </button>
        ))}
      </div>

      {/* Date Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {fechasClase.map(fecha => (
          <button
            key={fecha}
            onClick={() => setFechaSeleccionada(fecha)}
            className={`px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${fechaSeleccionada === fecha ? 'bg-primary text-white shadow-lg' : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            {fecha}
          </button>
        ))}
      </div>

      {/* Profesor de la clase */}
      {fechaSeleccionada && (
        <div className="bg-surface-container-lowest rounded-2xl p-4">
          <p className="text-xs text-outline font-bold uppercase mb-2">Profesor asignado</p>
          <div className="flex gap-4">
            {HORARIOS.filter(h => horarioFiltro === 'todos' || horarioFiltro === h).map(h => {
              const profeId = clasesPorProfe[`${disciplinaActiva}-${fechaSeleccionada}-${h}`];
              const profe = profesores.find(p => p.id === profeId);
              return (
                <div key={h} className="flex-1 bg-surface-container-low p-3 rounded-xl">
                  <p className="text-xs text-on-surface-variant font-medium">{h}</p>
                  <p className="font-bold text-on-surface">{profe?.nombre || 'Sin asignar'}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Students List */}
      <div className="bg-surface-container-lowest rounded-3xl overflow-hidden">
        <div className="divide-y divide-surface-container">
          {alumnosFiltrados.filter(a => a.estado === 'Activo').map(alumno => {
            const asiste = (asistencias[alumno.id] || []).includes(fechaSeleccionada);
            return (
              <div key={alumno.id} className="flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">{alumno.nombre.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-on-surface">{alumno.nombre}</p>
                    <p className="text-xs text-on-surface-variant">{alumno.horario || '18:00'}</p>
                  </div>
                </div>
                <button
                  onClick={() => onToggleAsistencia(alumno.id, fechaSeleccionada)}
                  disabled={syncing}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${asiste ? 'bg-success text-white shadow-lg shadow-success/30' : 'bg-surface-container-high text-outline hover:bg-primary/10 hover:text-primary'}`}
                >
                  <Icon name={asiste ? 'check' : 'close'} filled={asiste} size={24} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Clases;
