import { useState } from 'react';
import Icon from './Icon';
import { HORARIOS, TIPOS_MEMBRESIA } from '../utils/helpers';

// Días de la semana con su número JS (getDay())
const DIAS = [
  { nombre: 'Lun', num: 1 },
  { nombre: 'Mar', num: 2 },
  { nombre: 'Mié', num: 3 },
  { nombre: 'Jue', num: 4 },
  { nombre: 'Vie', num: 5 },
  { nombre: 'Sáb', num: 6 },
];

const DISCIPLINAS_FORM = ['Futvoley', 'Beach Tennis', 'Beach Volley', 'Funcional', 'Gimnasio'];

const ALUMNO_VACIO = {
  nombre: '',
  apodo: '',
  telefono: '',
  instagram: '',
  fechaNacimiento: '',
  plan: 'Arena Basic',
  frecuencia: '2x sem',
  horario: '18:00',
  diasElegidos: [],
  disciplinas: [],
  tipoMembresia: '',
  referidoPor: '',
  estado: 'Activo',
};

const Alumnos = ({
  disciplinaActiva,
  alumnosFiltrados,
  todosLosAlumnos = [],
  clasesDisponiblesMap = {},
  busqueda,
  setBusqueda,
  horarioFiltro,
  setHorarioFiltro,
  membresiaFiltro,
  setMembresiaFiltro,
  planFiltro,
  setPlanFiltro,
  onGuardarAlumno,
  onEditarAlumno,
  onEliminarAlumno,
  syncing
}) => {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [alumnoEditando, setAlumnoEditando] = useState(null);
  const [form, setForm] = useState(ALUMNO_VACIO);
  const [eliminandoId, setEliminandoId] = useState(null);

  const abrirNuevo = () => {
    setAlumnoEditando(null);
    setForm(ALUMNO_VACIO);
    setMostrarForm(true);
  };

  const abrirEditar = (alumno) => {
    setAlumnoEditando(alumno);
    setForm({
      nombre: alumno.nombre || '',
      apodo: alumno.apodo || '',
      telefono: alumno.telefono || '',
      instagram: alumno.instagram || '',
      fechaNacimiento: alumno.fechaNacimiento || '',
      tipoMembresia: alumno.tipoMembresia || '',
      plan: alumno.plan || 'Arena Basic',
      frecuencia: alumno.frecuencia || '2x sem',
      horario: alumno.horario || '18:00',
      diasElegidos: alumno.diasElegidos || [],
      disciplinas: alumno.disciplinas || [],
      referidoPor: alumno.referidoPor || '',
      estado: alumno.estado || 'Activo',
    });
    setMostrarForm(true);
  };

  const cerrarForm = () => {
    setMostrarForm(false);
    setAlumnoEditando(null);
    setForm(ALUMNO_VACIO);
  };

  const toggleDia = (num) => {
    setForm(prev => ({
      ...prev,
      diasElegidos: prev.diasElegidos.includes(num)
        ? prev.diasElegidos.filter(d => d !== num)
        : [...prev.diasElegidos, num],
    }));
  };

  const toggleDisciplina = (disc) => {
    setForm(prev => ({
      ...prev,
      disciplinas: prev.disciplinas.includes(disc)
        ? prev.disciplinas.filter(d => d !== disc)
        : [...prev.disciplinas, disc],
    }));
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
        <select
          value={membresiaFiltro}
          onChange={(e) => setMembresiaFiltro(e.target.value)}
          className="px-4 py-3 bg-surface-container-lowest border-2 border-transparent rounded-2xl font-medium"
        >
          <option value="todos">Todas las membresías</option>
          {TIPOS_MEMBRESIA.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={planFiltro}
          onChange={(e) => setPlanFiltro(e.target.value)}
          className="px-4 py-3 bg-surface-container-lowest border-2 border-transparent rounded-2xl font-medium"
        >
          <option value="todos">Todos los planes</option>
          <option value="Arena Basic">Arena Basic</option>
          <option value="Arena Plus">Arena Plus</option>
          <option value="Arena Premium">Arena Premium</option>
        </select>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {alumnosFiltrados.map(alumno => (
          <div key={alumno.id} className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-on-surface">{alumno.nombre}</h3>
                {alumno.apodo && <p className="text-sm text-on-surface-variant">"{alumno.apodo}"</p>}
                {alumno.tipoMembresia && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-bold rounded-full">
                    {alumno.tipoMembresia}
                  </span>
                )}
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
                <button
                  onClick={() => setEliminandoId(alumno.id)}
                  className="p-1.5 hover:bg-error/10 rounded-lg text-error/50 hover:text-error transition-colors"
                >
                  <Icon name="delete" size={16} />
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
              {alumno.instagram && (
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <Icon name="alternate_email" size={16} className="text-primary" />
                  <span>{alumno.instagram}</span>
                </div>
              )}
              {alumno.fechaNacimiento && (
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <Icon name="cake" size={16} className="text-primary" />
                  <span>{new Date(alumno.fechaNacimiento + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                </div>
              )}
              {alumno.referidoPor && (
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <Icon name="person" size={16} className="text-primary" />
                  <span>Ref: {alumno.referidoPor}</span>
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
              {/* Días elegidos */}
              {alumno.diasElegidos?.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {DIAS.filter(d => alumno.diasElegidos.includes(d.num)).map(d => (
                    <span key={d.num} className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-bold rounded-full">
                      {d.nombre}
                    </span>
                  ))}
                </div>
              )}
              {/* Balance de clases clásicas */}
              {clasesDisponiblesMap[alumno.id] && (() => {
                const { total, consumidas, restantes, extras } = clasesDisponiblesMap[alumno.id];
                const pct = total > 0 ? Math.min((consumidas / total) * 100, 100) : 0;
                const color = extras > 0 ? 'bg-error' : restantes === 0 ? 'bg-error' : restantes <= 1 ? 'bg-warning' : 'bg-success';
                const textColor = extras > 0 ? 'text-error' : restantes === 0 ? 'text-error' : restantes <= 1 ? 'text-warning' : 'text-success';
                return (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-outline font-bold uppercase">Clases clásicas</span>
                      {extras > 0
                        ? <span className="text-[11px] font-black text-error">+{extras} extra{extras > 1 ? 's' : ''}</span>
                        : <span className={`text-[11px] font-black ${textColor}`}>{restantes} / {total} restantes</span>
                      }
                    </div>
                    <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Confirmación de eliminación */}
            {eliminandoId === alumno.id && (
              <div className="mt-3 pt-3 border-t border-error/20 flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-error">¿Eliminar a {alumno.nombre.split(' ')[0]}?</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEliminandoId(null)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-surface-container text-on-surface-variant"
                  >
                    No
                  </button>
                  <button
                    onClick={() => { onEliminarAlumno(alumno.id); setEliminandoId(null); }}
                    disabled={syncing}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-error text-white disabled:opacity-50"
                  >
                    Sí, eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New / Edit Student Modal */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={cerrarForm}>
          <div className="bg-surface-container-lowest rounded-3xl p-6 w-full max-w-md shadow-2xl fade-in overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
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
                type="text"
                value={form.apodo}
                onChange={(e) => setForm({ ...form, apodo: e.target.value })}
                placeholder="Apodo (opcional)"
                className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl focus:border-primary"
              />
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="Teléfono"
                className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl focus:border-primary"
              />
              <input
                type="text"
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                placeholder="Instagram (sin @)"
                className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl focus:border-primary"
              />
              <div>
                <p className="text-sm font-bold text-on-surface-variant mb-2">Fecha de nacimiento</p>
                <input
                  type="date"
                  value={form.fechaNacimiento}
                  onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl focus:border-primary"
                />
              </div>

              {/* Tipo de membresía */}
              <select
                value={form.tipoMembresia}
                onChange={(e) => setForm({ ...form, tipoMembresia: e.target.value })}
                className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl"
              >
                <option value="">Tipo de membresía (opcional)</option>
                {TIPOS_MEMBRESIA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              {/* Disciplinas */}
              <div>
                <p className="text-sm font-bold text-on-surface-variant mb-2">Disciplinas</p>
                <div className="flex gap-2 flex-wrap">
                  {DISCIPLINAS_FORM.map(disc => (
                    <button
                      key={disc}
                      type="button"
                      onClick={() => toggleDisciplina(disc)}
                      className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                        form.disciplinas.includes(disc)
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {disc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Referido por */}
              <select
                value={form.referidoPor}
                onChange={(e) => setForm({ ...form, referidoPor: e.target.value })}
                className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl"
              >
                <option value="">Referido por... (opcional)</option>
                {todosLosAlumnos
                  .filter(a => !alumnoEditando || a.id !== alumnoEditando.id)
                  .sort((a, b) => a.nombre.localeCompare(b.nombre))
                  .map(a => (
                    <option key={a.id} value={a.nombre}>{a.nombre}</option>
                  ))
                }
              </select>

              {['Membresía mensual', 'Clases privadas'].includes(form.tipoMembresia) && (
                <>
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
                </>
              )}
              <select
                value={form.horario}
                onChange={(e) => setForm({ ...form, horario: e.target.value })}
                className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl"
              >
                {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>

              {/* Días de la semana */}
              <div>
                <p className="text-sm font-bold text-on-surface-variant mb-2">Días que asiste</p>
                <div className="flex gap-2 flex-wrap">
                  {DIAS.map(d => (
                    <button
                      key={d.num}
                      type="button"
                      onClick={() => toggleDia(d.num)}
                      className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                        form.diasElegidos.includes(d.num)
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {d.nombre}
                    </button>
                  ))}
                </div>
              </div>

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
