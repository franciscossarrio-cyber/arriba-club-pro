import { useState } from 'react';
import Icon from './Icon';
import { HORARIOS } from '../utils/helpers';

const ALUMNO_VACIO = { nombre: '', telefono: '', plan: 'Arena Basic', frecuencia: '2x sem', horario: '18:00' };

const Alumnos = ({
  disciplinaActiva,
  alumnosFiltrados,
  busqueda,
  setBusqueda,
  horarioFiltro,
  setHorarioFiltro,
  onGuardarAlumno,
  onEditarAlumno,
  syncing
}) => {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [alumnoEditando, setAlumnoEditando] = useState(null);
  const [form, setForm] = useState(ALUMNO_VACIO);

  const abrirNuevo = () => {
    setAlumnoEditando(null);
    setForm(ALUMNO_VACIO);
    setMostrarForm(true);
  };

  const abrirEditar = (alumno) => {
    setAlumnoEditando(alumno);
    setForm({
      nombre: alumno.nombre || '',
      telefono: alumno.telefono || '',
      plan: alumno.plan || 'Arena Basic',
      frecuencia: alumno.frecuencia || '2x sem',
      horario: alumno.horario || '18:00',
      estado: alumno.estado || 'Activo'
    });
    setMostrarForm(true);
  };

  const cerrarForm = () => {
    setMostrarForm(false);
    setAlumnoEditando(null);
    setForm(ALUMNO_VACIO);
  };

  const handleGuardar = async () => {
    if (!form.nombre) return;
    if (alumnoEditando) {
      await onEditarAlumno({ ...alumnoEditando, ...form });
    } else {
      await onGuardarAlumno(form);
    }
    cerrarForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Alumnos</h1>
          <p className="text-on-surface-variant">{alumnosFiltrados.length} alumnos en {disciplinaActiva}</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95"
        >
          <Icon name="person_add" size={20} />
          <span className="text-sm">Nuevo Alumno</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={20} />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar alumno..."
            className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border-2 border-transparent rounded-2xl focus:border-primary transition-all"
          />
        </div>
        <select
          value={horarioFiltro}
          onChange={(e) => setHorarioFiltro(e.target.value)}
          className="px-4 py-3 bg-surface-container-lowest border-2 border-transparent rounded-2xl font-medium"
        >
          <option value="todos">Todos los horarios</option>
          {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {alumnosFiltrados.map(alumno => (
          <div key={alumno.id} className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-on-surface">{alumno.nombre}</h3>
                {alumno.apodos?.length > 0 && <p className="text-sm text-on-surface-variant">"{alumno.apodos[0]}"</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${alumno.estado === 'Activo' ? 'bg-success/10 text-success' : 'bg-outline/10 text-outline'}`}>
                  {alumno.estado}
                </span>
                <button
                  onClick={() => abrirEditar(alumno)}
                  className="p-1.5 hover:bg-primary/10 rounded-lg text-primary transition-colors"
                >
                  <Icon name="edit" size={16} />
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {alumno.telefono && (
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <Icon name="call" size={16} className="text-primary" />
                  <span>{alumno.telefono}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-surface-container-low p-2 rounded-xl">
                  <p className="text-[10px] text-outline font-bold uppercase">Plan</p>
                  <p className="text-sm font-bold text-primary">{alumno.plan}</p>
                </div>
                <div className="bg-surface-container-low p-2 rounded-xl">
                  <p className="text-[10px] text-outline font-bold uppercase">Horario</p>
                  <p className="text-sm font-bold text-on-surface">{alumno.horario || '18:00'}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New / Edit Student Modal */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={cerrarForm}>
          <div className="bg-surface-container-lowest rounded-3xl p-6 w-full max-w-md shadow-2xl fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-on-surface mb-6">
              {alumnoEditando ? 'Editar Alumno' : 'Nuevo Alumno'}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre completo"
                className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl focus:border-primary"
              />
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="Teléfono"
                className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl focus:border-primary"
              />
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl"
              >
                <option>Arena Basic</option>
                <option>Arena Plus</option>
                <option>Arena Premium</option>
              </select>
              <select
                value={form.frecuencia}
                onChange={(e) => setForm({ ...form, frecuencia: e.target.value })}
                className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl"
              >
                <option value="1x sem">1x semana</option>
                <option value="2x sem">2x semana</option>
                <option value="3x sem">3x semana</option>
              </select>
              <select
                value={form.horario}
                onChange={(e) => setForm({ ...form, horario: e.target.value })}
                className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl"
              >
                {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              {alumnoEditando && (
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={cerrarForm} className="flex-1 py-3 bg-surface-container-high rounded-xl font-medium text-on-surface-variant">
                Cancelar
              </button>
              <button onClick={handleGuardar} disabled={syncing} className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-bold">
                {syncing ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alumnos;
