import { useState, useMemo } from 'react';
import Icon from './Icon';
import { HORARIOS, TIPOS_MEMBRESIA } from '../utils/helpers';

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
  nombre: '', apodo: '', telefono: '', instagram: '', fechaNacimiento: '',
  plan: 'Arena Basic', frecuencia: '2x sem',
  diasElegidos: [], horariosPorDia: {}, disciplinas: [], tipoMembresia: '', referidoPor: '', estado: 'Activo',
};

const COLS = [
  { key: 'nombre',       label: 'Nombre',     sortable: true  },
  { key: 'tipoMembresia',label: 'Membresía',  sortable: true  },
  { key: 'plan',         label: 'Plan',       sortable: true  },
  { key: 'frecuencia',   label: 'Frec.',      sortable: false },
  { key: 'horario',      label: 'Horario',    sortable: true  },
  { key: 'diasElegidos', label: 'Días',       sortable: false },
  { key: 'disciplinas',  label: 'Disciplinas',sortable: false },
  { key: 'telefono',     label: 'Teléfono',   sortable: false },
  { key: 'estado',       label: 'Estado',     sortable: true  },
];

const MEMBRESIA_ABREV = {
  'Membresía mensual': 'Mensual',
  'Clases sueltas':    'Suelta',
  'Clases privadas':   'Privada',
};

const Alumnos = ({
  disciplinaActiva,
  alumnosFiltrados,
  todosLosAlumnos = [],
  clasesDisponiblesMap = {},
  busqueda, setBusqueda,
  horarioFiltro, setHorarioFiltro,
  membresiaFiltro, setMembresiaFiltro,
  planFiltro, setPlanFiltro,
  onGuardarAlumno, onEditarAlumno, onEliminarAlumno,
  syncing,
}) => {
  const [mostrarForm, setMostrarForm]   = useState(false);
  const [alumnoEditando, setAlumnoEditando] = useState(null);
  const [form, setForm]                 = useState(ALUMNO_VACIO);
  const [errors, setErrors]             = useState({});
  const [eliminandoId, setEliminandoId] = useState(null);
  const [sortCol, setSortCol]           = useState('nombre');
  const [sortAsc, setSortAsc]           = useState(true);

  const abrirNuevo = () => { setAlumnoEditando(null); setForm(ALUMNO_VACIO); setErrors({}); setMostrarForm(true); };

  const abrirEditar = (alumno) => {
    setAlumnoEditando(alumno);
    setForm({
      nombre: alumno.nombre || '', apodo: alumno.apodo || '',
      telefono: alumno.telefono || '', instagram: alumno.instagram || '',
      fechaNacimiento: alumno.fechaNacimiento || '',
      tipoMembresia: alumno.tipoMembresia || '',
      plan: alumno.plan || 'Arena Basic', frecuencia: alumno.frecuencia || '2x sem',
      diasElegidos: alumno.diasElegidos || [],
      horariosPorDia: alumno.horariosPorDia || (alumno.horario && alumno.diasElegidos?.length
        ? Object.fromEntries(alumno.diasElegidos.map(d => [d, alumno.horario]))
        : {}),
      disciplinas: alumno.disciplinas || [], referidoPor: alumno.referidoPor || '',
      estado: alumno.estado || 'Activo',
    });
    setErrors({});
    setMostrarForm(true);
  };

  const cerrarForm = () => { setMostrarForm(false); setAlumnoEditando(null); setForm(ALUMNO_VACIO); setErrors({}); };

  const setField = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    if (errors[key]) setErrors(p => ({ ...p, [key]: undefined }));
  };

  const toggleDia = (num) => setForm(p => {
    const yaElegido = p.diasElegidos.includes(num);
    const diasElegidos = yaElegido ? p.diasElegidos.filter(d => d !== num) : [...p.diasElegidos, num];
    const horariosPorDia = { ...p.horariosPorDia };
    if (yaElegido) delete horariosPorDia[num];
    else horariosPorDia[num] = HORARIOS[1] || HORARIOS[0];
    return { ...p, diasElegidos, horariosPorDia };
  });
  const setHorarioDia = (num, horario) => setForm(p => ({ ...p, horariosPorDia: { ...p.horariosPorDia, [num]: horario } }));
  const toggleDisciplina = (disc) => {
    setForm(p => ({ ...p, disciplinas: p.disciplinas.includes(disc) ? p.disciplinas.filter(d => d !== disc) : [...p.disciplinas, disc] }));
    if (errors.disciplinas) setErrors(p => ({ ...p, disciplinas: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.nombre.trim())    e.nombre       = 'El nombre es obligatorio';
    if (!form.tipoMembresia)    e.tipoMembresia = 'Seleccioná un tipo de membresía';
    if (!form.disciplinas.length) e.disciplinas = 'Seleccioná al menos una disciplina';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleGuardar = async () => {
    if (!validate()) return;
    if (alumnoEditando) await onEditarAlumno({ ...alumnoEditando, ...form });
    else await onGuardarAlumno(form);
    cerrarForm();
  };

  const handleSort = (key) => {
    if (sortCol === key) setSortAsc(a => !a);
    else { setSortCol(key); setSortAsc(true); }
  };

  const sorted = useMemo(() => {
    const arr = [...alumnosFiltrados];
    arr.sort((a, b) => {
      const va = (a[sortCol] ?? '').toString().toLowerCase();
      const vb = (b[sortCol] ?? '').toString().toLowerCase();
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return arr;
  }, [alumnosFiltrados, sortCol, sortAsc]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Alumnos</h1>
          <p className="text-on-surface-variant text-sm">{alumnosFiltrados.length} alumnos · {disciplinaActiva}</p>
        </div>
        <button onClick={abrirNuevo}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95 text-sm">
          <Icon name="person_add" size={18} />
          Nuevo
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[160px] relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-9 pr-3 py-2 bg-surface-container-lowest border-2 border-transparent rounded-xl text-sm focus:border-primary transition-all" />
        </div>
        <select value={horarioFiltro} onChange={e => setHorarioFiltro(e.target.value)}
          className="px-3 py-2 bg-surface-container-lowest border-2 border-transparent rounded-xl text-sm font-medium">
          <option value="todos">Todos los horarios</option>
          {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <select value={membresiaFiltro} onChange={e => setMembresiaFiltro(e.target.value)}
          className="px-3 py-2 bg-surface-container-lowest border-2 border-transparent rounded-xl text-sm font-medium">
          <option value="todos">Todas las membresías</option>
          {TIPOS_MEMBRESIA.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={planFiltro} onChange={e => setPlanFiltro(e.target.value)}
          className="px-3 py-2 bg-surface-container-lowest border-2 border-transparent rounded-xl text-sm font-medium">
          <option value="todos">Todos los planes</option>
          <option value="Arena Basic">Arena Basic</option>
          <option value="Arena Plus">Arena Plus</option>
          <option value="Arena Premium">Arena Premium</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-surface-container-lowest rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {COLS.map(col => (
                  <th key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap select-none ${col.sortable ? 'cursor-pointer hover:text-primary hover:bg-slate-100 transition-colors' : ''}`}>
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortCol === col.key && (
                        <Icon name={sortAsc ? 'arrow_upward' : 'arrow_downward'} size={12} className="text-primary" />
                      )}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-500 w-20">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={COLS.length + 1} className="text-center py-12 text-on-surface-variant text-sm">
                    Sin resultados
                  </td>
                </tr>
              )}
              {sorted.map((alumno, idx) => {
                const diasNombres = DIAS.filter(d => alumno.diasElegidos?.includes(d.num)).map(d => d.nombre);
                const balance = clasesDisponiblesMap[alumno.id];
                const esActivo = alumno.estado === 'Activo';
                return (
                  <>
                    <tr key={alumno.id}
                      className={`border-b border-slate-100 transition-colors cursor-pointer group ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      } hover:bg-primary/5`}
                      onClick={() => abrirEditar(alumno)}>

                      {/* Nombre */}
                      <td className="px-4 py-3 font-semibold text-on-surface whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${esActivo ? 'bg-green-500' : 'bg-slate-300'}`} />
                          <span>{alumno.nombre}</span>
                          {alumno.apodo && (
                            <span className="text-xs text-slate-400 font-normal">"{alumno.apodo}"</span>
                          )}
                        </div>
                        {balance && (() => {
                          const { restantes, extras, total } = balance;
                          if (total === 0) return null;
                          return (
                            <div className="mt-1 flex items-center gap-1.5">
                              <div className="w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${extras > 0 || restantes === 0 ? 'bg-red-400' : restantes <= 1 ? 'bg-amber-400' : 'bg-green-400'}`}
                                  style={{ width: `${Math.min(((total - restantes) / total) * 100, 100)}%` }}
                                />
                              </div>
                              <span className={`text-[9px] font-bold ${extras > 0 || restantes === 0 ? 'text-red-500' : restantes <= 1 ? 'text-amber-500' : 'text-slate-400'}`}>
                                {extras > 0 ? `+${extras} extra` : `${restantes}/${total}`}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Membresía */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {alumno.tipoMembresia ? (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-md">
                            {MEMBRESIA_ABREV[alumno.tipoMembresia] || alumno.tipoMembresia}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3 text-on-surface whitespace-nowrap">
                        {alumno.plan || <span className="text-slate-300">—</span>}
                      </td>

                      {/* Frecuencia */}
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap text-xs">
                        {alumno.frecuencia || <span className="text-slate-300">—</span>}
                      </td>

                      {/* Horario */}
                      <td className="px-4 py-3 text-on-surface whitespace-nowrap font-mono text-xs">
                        {alumno.horariosPorDia && Object.keys(alumno.horariosPorDia).length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {DIAS.filter(d => alumno.horariosPorDia[d.num]).map(d => (
                              <span key={d.num}>{d.nombre} {alumno.horariosPorDia[d.num]}</span>
                            ))}
                          </div>
                        ) : alumno.horario || <span className="text-slate-300">—</span>}
                      </td>

                      {/* Días */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-0.5">
                          {DIAS.map(d => (
                            <span key={d.num} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              alumno.diasElegidos?.includes(d.num)
                                ? 'bg-primary/15 text-primary'
                                : 'text-transparent'
                            }`}>
                              {d.nombre}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Disciplinas */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap min-w-[80px]">
                          {alumno.disciplinas?.length > 0
                            ? alumno.disciplinas.map(d => (
                                <span key={d} className="text-[9px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                  {d.split(' ')[0]}
                                </span>
                              ))
                            : <span className="text-slate-300">—</span>
                          }
                        </div>
                      </td>

                      {/* Teléfono */}
                      <td className="px-4 py-3 text-on-surface-variant text-xs whitespace-nowrap">
                        {alumno.telefono || <span className="text-slate-300">—</span>}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full ${
                          esActivo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {alumno.estado}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        {eliminandoId === alumno.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setEliminandoId(null)}
                              className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 text-slate-500 font-bold">
                              No
                            </button>
                            <button onClick={() => { onEliminarAlumno(alumno.id); setEliminandoId(null); }}
                              disabled={syncing}
                              className="text-[10px] px-2 py-1 rounded-lg bg-red-500 text-white font-bold disabled:opacity-50">
                              Sí
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => abrirEditar(alumno)}
                              className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                              <Icon name="edit" size={14} />
                            </button>
                            <button onClick={() => setEliminandoId(alumno.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                              <Icon name="delete" size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {eliminandoId === alumno.id && (
                      <tr key={`${alumno.id}-confirm`} className="bg-red-50">
                        <td colSpan={COLS.length + 1} className="px-4 py-2 text-xs text-red-600 font-bold">
                          ¿Eliminar a {alumno.nombre}? — usá los botones Sí / No en la fila.
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {sorted.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {sorted.length} alumno{sorted.length !== 1 ? 's' : ''}
              {sorted.filter(a => a.estado === 'Activo').length !== sorted.length &&
                ` · ${sorted.filter(a => a.estado === 'Activo').length} activos`}
            </span>
            <span className="text-[11px] text-slate-400">
              Click en una fila para editar
            </span>
          </div>
        )}
      </div>

      {/* Modal form */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={cerrarForm}>
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl fade-in flex flex-col max-h-[92vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {alumnoEditando ? 'Editar alumno' : 'Nuevo alumno'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Los campos con <span className="text-red-500">*</span> son obligatorios</p>
              </div>
              <button onClick={cerrarForm} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

              {/* Sección: Datos personales */}
              <section className="space-y-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Datos personales</p>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Nombre completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" value={form.nombre}
                    onChange={e => setField('nombre', e.target.value)}
                    placeholder="Ej: Juan García"
                    className={`w-full px-4 py-3 rounded-xl text-sm bg-slate-50 border-2 focus:outline-none focus:bg-white transition-all ${
                      errors.nombre ? 'border-red-400 bg-red-50' : 'border-transparent focus:border-primary'
                    }`}
                  />
                  {errors.nombre && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><Icon name="error" size={12} />{errors.nombre}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Apodo</label>
                    <input type="text" value={form.apodo} onChange={e => setField('apodo', e.target.value)}
                      placeholder="Opcional"
                      className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 border-2 border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Teléfono</label>
                    <input type="tel" value={form.telefono} onChange={e => setField('telefono', e.target.value)}
                      placeholder="Ej: 1122334455"
                      className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 border-2 border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Instagram</label>
                    <input type="text" value={form.instagram} onChange={e => setField('instagram', e.target.value)}
                      placeholder="Sin @"
                      className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 border-2 border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fecha de nacimiento</label>
                    <input type="date" value={form.fechaNacimiento} onChange={e => setField('fechaNacimiento', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 border-2 border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Referido por</label>
                  <select value={form.referidoPor} onChange={e => setField('referidoPor', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 border-2 border-transparent focus:border-primary focus:outline-none transition-all">
                    <option value="">— ninguno —</option>
                    {todosLosAlumnos
                      .filter(a => !alumnoEditando || a.id !== alumnoEditando.id)
                      .sort((a, b) => a.nombre.localeCompare(b.nombre))
                      .map(a => <option key={a.id} value={a.nombre}>{a.nombre}</option>)}
                  </select>
                </div>
              </section>

              {/* Sección: Membresía */}
              <section className="space-y-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Membresía</p>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Tipo de membresía <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.tipoMembresia}
                    onChange={e => setField('tipoMembresia', e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl text-sm bg-slate-50 border-2 focus:outline-none focus:bg-white transition-all ${
                      errors.tipoMembresia ? 'border-red-400 bg-red-50' : 'border-transparent focus:border-primary'
                    }`}
                  >
                    <option value="">Seleccioná un tipo</option>
                    {TIPOS_MEMBRESIA.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.tipoMembresia && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><Icon name="error" size={12} />{errors.tipoMembresia}</p>}
                </div>

                {['Membresía mensual', 'Clases privadas'].includes(form.tipoMembresia) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Plan</label>
                      <select value={form.plan} onChange={e => setField('plan', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 border-2 border-transparent focus:border-primary focus:outline-none transition-all">
                        <option>Arena Basic</option>
                        <option>Arena Plus</option>
                        <option>Arena Premium</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Frecuencia</label>
                      <select value={form.frecuencia} onChange={e => setField('frecuencia', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 border-2 border-transparent focus:border-primary focus:outline-none transition-all">
                        <option value="1x sem">1x semana</option>
                        <option value="2x sem">2x semana</option>
                        <option value="3x sem">3x semana</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Disciplinas <span className="text-red-500">*</span>
                  </label>
                  <div className={`flex flex-wrap gap-2 p-3 rounded-xl border-2 transition-all ${
                    errors.disciplinas ? 'border-red-400 bg-red-50' : 'border-transparent bg-slate-50'
                  }`}>
                    {DISCIPLINAS_FORM.map(disc => (
                      <button key={disc} type="button" onClick={() => toggleDisciplina(disc)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2 ${
                          form.disciplinas.includes(disc)
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}>
                        {disc}
                      </button>
                    ))}
                  </div>
                  {errors.disciplinas && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><Icon name="error" size={12} />{errors.disciplinas}</p>}
                </div>
              </section>

              {/* Sección: Horario */}
              <section className="space-y-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Días y horarios</p>
                <div className="space-y-2">
                  {DIAS.map(d => {
                    const activo = form.diasElegidos.includes(d.num);
                    return (
                      <div key={d.num} className="flex items-center gap-2">
                        <button type="button" onClick={() => toggleDia(d.num)}
                          className={`w-16 shrink-0 px-3 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                            activo
                              ? 'bg-primary/10 border-primary/30 text-primary'
                              : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                          }`}>
                          {d.nombre}
                        </button>
                        {activo && (
                          <select value={form.horariosPorDia[d.num] || HORARIOS[0]}
                            onChange={e => setHorarioDia(d.num, e.target.value)}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-slate-50 border-2 border-transparent focus:border-primary focus:outline-none transition-all">
                            {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Estado (solo edición) */}
              {alumnoEditando && (
                <section className="space-y-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estado</p>
                  <div className="flex gap-2">
                    {['Activo', 'Inactivo'].map(est => (
                      <button key={est} type="button" onClick={() => setField('estado', est)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                          form.estado === est
                            ? est === 'Activo'
                              ? 'bg-green-50 border-green-300 text-green-700'
                              : 'bg-slate-100 border-slate-300 text-slate-600'
                            : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                        }`}>
                        {est}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={cerrarForm}
                className="flex-1 py-3 bg-slate-100 rounded-xl font-semibold text-slate-600 hover:bg-slate-200 transition-colors text-sm">
                Cancelar
              </button>
              <button onClick={handleGuardar} disabled={syncing}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold disabled:opacity-60 hover:bg-primary/90 transition-colors text-sm shadow-lg shadow-primary/20">
                {syncing ? 'Guardando...' : alumnoEditando ? 'Guardar cambios' : 'Crear alumno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alumnos;
