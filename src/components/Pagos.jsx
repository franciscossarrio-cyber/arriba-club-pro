import { useState, useEffect, useMemo } from 'react';
import Icon from './Icon';
import { formatMonto, getWhatsAppLink, HORARIOS } from '../utils/helpers';

const TIPOS_PAGO = [
  { id: 'suelta',    label: 'Clase Suelta',    color: 'text-amber-600',  dot: 'bg-amber-500' },
  { id: 'dayuse',    label: 'Day Use',          color: 'text-orange-600', dot: 'bg-orange-500' },
  { id: 'privada',   label: 'Clase Privada',    color: 'text-purple-600', dot: 'bg-purple-500' },
  { id: 'prueba',    label: 'Clase de Prueba',  color: 'text-teal-600',   dot: 'bg-teal-500' },
  { id: 'membresia', label: 'Membresía',         color: 'text-primary',    dot: 'bg-primary' },
];

const CircleProgress = ({ pct }) => {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  return (
    <svg width="68" height="68" className="-rotate-90 flex-shrink-0">
      <circle cx="34" cy="34" r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-gray-200" />
      <circle cx="34" cy="34" r={r} fill="none" stroke="currentColor" strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" className="text-indigo-500" />
    </svg>
  );
};

const Avatar = ({ nombre }) => {
  const initials = (nombre || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-sm flex-shrink-0">
      {initials}
    </div>
  );
};

const Pagos = ({
  disciplinaActiva,
  mesActual,
  montoCobrado,
  montoPendiente,
  pagosPendientes,
  pagosSueltasPendientes = [],
  pagosDisciplina,
  alumnos,
  preciosDisciplina,
  preciosTiposActivos = {},
  fechasMes,
  onProcesarPago,
  onProcesarSuelta,
  onProcesarPrivada,
  onProcesarPrueba,
  onProcesarDayUse,
  onPagarMembresia,
  onMarcarPagado,
  onPagarSueltaVirtual,
  onCancelarSuelta,
  syncing
}) => {
  // ── Form ─────────────────────────────────────────────────────────────────────
  const [formAbierto, setFormAbierto] = useState(false);
  const [tipo, setTipo] = useState('suelta');
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState(fechasMes?.[0] || '');
  const [horario, setHorario] = useState(HORARIOS[1] || '18:00');
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState('Efectivo');
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    const map = {
      suelta:  preciosTiposActivos['Clases sueltas']  || 0,
      dayuse:  preciosTiposActivos['Day Use']          || 0,
      privada: preciosTiposActivos['Clases privadas']  || 0,
      prueba:  preciosTiposActivos['Clase de prueba']  || 0,
    };
    if (tipo !== 'membresia') setMonto(String(map[tipo] || ''));
  }, [tipo, preciosTiposActivos]);

  const handleSubmit = async () => {
    if (!nombre.trim()) return;
    let res;
    if (tipo === 'membresia')     res = await onProcesarPago(nombre, metodo);
    else if (tipo === 'suelta')   res = await onProcesarSuelta(nombre, fecha, horario, parseInt(monto) || 0, metodo);
    else if (tipo === 'dayuse')   res = await onProcesarDayUse(nombre, fecha, horario, parseInt(monto) || 0, metodo);
    else if (tipo === 'privada')  res = await onProcesarPrivada(nombre, fecha, horario, parseInt(monto) || 0, metodo);
    else if (tipo === 'prueba')   res = await onProcesarPrueba(nombre, fecha, horario, parseInt(monto) || 0, metodo);
    setResultado(res);
    if (res?.success) { setNombre(''); setFormAbierto(false); }
  };

  // ── Pago inline ───────────────────────────────────────────────────────────────
  const [pagoActivoId, setPagoActivoId] = useState(null);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const abrirPago  = (id) => { setPagoActivoId(id); setMetodoPago('Efectivo'); };
  const cerrarPago = () => setPagoActivoId(null);

  const confirmarPagoMembresia = async (alumno) => {
    await onPagarMembresia(alumno, metodoPago);
    cerrarPago();
  };
  const confirmarMarcarPagado = async (pago) => {
    if (pago.virtual) await onPagarSueltaVirtual(pago, metodoPago);
    else              await onMarcarPagado(pago.id, metodoPago);
    cerrarPago();
  };

  // ── Búsqueda ──────────────────────────────────────────────────────────────────
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState(new Set());

  const totalPendientes = pagosPendientes.length + pagosSueltasPendientes.length;

  const { memFiltradas, sueltasFiltradas } = useMemo(() => {
    const q = busqueda.toLowerCase();
    return {
      memFiltradas: pagosPendientes.filter(a =>
        !q || (a.nombre || '').toLowerCase().includes(q) || (a.plan || '').toLowerCase().includes(q)
      ),
      sueltasFiltradas: pagosSueltasPendientes.filter(p => {
        const al = alumnos.find(a => a.id === p.alumnoId);
        return !q || (al?.nombre || p.nombre || '').toLowerCase().includes(q);
      }),
    };
  }, [busqueda, pagosPendientes, pagosSueltasPendientes, alumnos]);

  const toggleSeleccion = (id) => setSeleccionados(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const seleccionarTodos = () => {
    const ids = [
      ...memFiltradas.map(a => a.id),
      ...sueltasFiltradas.map(p => p.id),
    ];
    setSeleccionados(prev => prev.size === ids.length ? new Set() : new Set(ids));
  };

  const exportarCSV = () => {
    const rows = [['Nombre', 'Tipo', 'Plan', 'Frecuencia', 'Monto', 'Estado']];
    memFiltradas.forEach(a =>
      rows.push([a.nombre, 'Membresía', a.plan, a.frecuencia, preciosDisciplina[a.plan]?.[a.frecuencia] || 0, 'Pendiente'])
    );
    sueltasFiltradas.forEach(p => {
      const al = alumnos.find(a => a.id === p.alumnoId);
      rows.push([al?.nombre || p.nombre, p.tipo, '-', '-', p.monto, 'Pendiente']);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pagos-pendientes-${mesActual}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Listas pagados ────────────────────────────────────────────────────────────
  const pagosPagados  = pagosDisciplina.filter(p => p.estado === 'Pagado');
  const pagosSueltos  = pagosPagados.filter(p => p.tipo === 'suelta');
  const pagosPrivados = pagosPagados.filter(p => p.tipo === 'privada');
  const pagosPrueba   = pagosPagados.filter(p => p.tipo === 'prueba');
  const pagosDayUse   = pagosPagados.filter(p => p.tipo === 'dayuse');
  const pagosMembresia = pagosPagados.filter(p => !['suelta', 'privada', 'prueba', 'dayuse'].includes(p.tipo));

  const totalEsperado = montoCobrado + montoPendiente;
  const pct = totalEsperado > 0 ? Math.round((montoCobrado / totalEsperado) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight">Pagos</h1>
          <p className="text-on-surface-variant text-sm mt-0.5">Gestión financiera del mes en curso</p>
        </div>
        <button
          onClick={() => { setFormAbierto(v => !v); setResultado(null); }}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-md transition-colors flex-shrink-0"
        >
          <Icon name="add" size={18} />
          Registrar pago
        </button>
      </div>

      {/* ── Formulario colapsable ──────────────────────────────────────────── */}
      {formAbierto && (
        <div className="bg-surface-container-lowest rounded-2xl p-5 space-y-3 shadow-sm border border-surface-container">
          <p className="font-bold text-on-surface text-sm uppercase tracking-wide">Nuevo registro</p>
          <select
            value={tipo}
            onChange={e => { setTipo(e.target.value); setResultado(null); }}
            className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl font-medium focus:border-indigo-400 outline-none"
          >
            {TIPOS_PAGO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <input
            type="text" value={nombre} onChange={e => setNombre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Nombre o apodo del alumno"
            className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl focus:border-indigo-400 outline-none"
          />
          {tipo !== 'membresia' && (
            <div className="grid grid-cols-2 gap-2">
              <select value={fecha} onChange={e => setFecha(e.target.value)}
                className="px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl outline-none focus:border-indigo-400">
                {(fechasMes || []).map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select value={horario} onChange={e => setHorario(e.target.value)}
                className="px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl outline-none focus:border-indigo-400">
                {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          )}
          {tipo !== 'membresia' && (
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline font-bold text-sm">$</span>
              <input type="number" value={monto} onChange={e => setMonto(e.target.value)}
                placeholder="Monto"
                className="w-full pl-8 pr-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl focus:border-indigo-400 outline-none" />
            </div>
          )}
          <div className="flex gap-2">
            {['Efectivo', 'Transferencia'].map(m => (
              <button key={m} onClick={() => setMetodo(m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  metodo === m ? 'bg-indigo-600 text-white shadow-sm' : 'bg-surface-container-high text-on-surface-variant'
                }`}>{m}</button>
            ))}
          </div>
          <button onClick={handleSubmit} disabled={syncing || !nombre.trim()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-50 transition-colors">
            {syncing
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              : 'Guardar'}
          </button>
          {resultado && (
            <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${resultado.success ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
              <Icon name={resultado.success ? 'check_circle' : 'error'} size={18} />
              <span className="font-medium">{resultado.mensaje}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Cobrado */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Cobrado</p>
          <p className="text-2xl font-black text-success leading-tight">{formatMonto(montoCobrado)}</p>
          <div className="flex items-center justify-between">
            <p className="text-xs text-on-surface-variant">{pct}% de la meta mensual</p>
            <div className="relative flex items-center justify-center">
              <CircleProgress pct={pct} />
              <span className="absolute text-xs font-bold text-indigo-600">{pct}%</span>
            </div>
          </div>
        </div>

        {/* Pendiente */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Pendiente</p>
          <p className="text-2xl font-black text-amber-600 leading-tight">{formatMonto(montoPendiente)}</p>
          {totalPendientes > 0 && (
            <div className="flex items-center gap-1.5 text-amber-600">
              <Icon name="warning" size={15} />
              <p className="text-xs font-semibold">{totalPendientes} Pagos por recolectar</p>
            </div>
          )}
        </div>

        {/* Disciplina Activa */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-5 text-white shadow-sm flex flex-col justify-between">
          <p className="text-xs font-bold uppercase tracking-widest opacity-75">Disciplina Activa</p>
          <p className="text-2xl font-black leading-tight mt-1">{disciplinaActiva}</p>
          <div className="flex items-center gap-1.5 opacity-80 mt-1">
            <Icon name="sports_volleyball" size={14} />
            <p className="text-xs font-medium">{mesActual}</p>
          </div>
          {/* decorative circles */}
          <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute right-4 -bottom-10 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
        </div>
      </div>

      {/* ── Buscador ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-3 bg-surface-container-lowest rounded-2xl px-4 py-3 shadow-sm">
          <Icon name="search" size={18} className="text-outline flex-shrink-0" />
          <input
            type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre de alumno o plan..."
            className="bg-transparent flex-1 text-sm text-on-surface placeholder:text-outline outline-none"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="text-outline hover:text-on-surface">
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
        <button className="flex items-center gap-2 px-4 py-3 bg-surface-container-lowest rounded-2xl text-sm font-medium text-on-surface-variant shadow-sm hover:bg-surface-container transition-colors">
          <Icon name="tune" size={16} />
          Filtros
        </button>
      </div>

      {/* ── Pendientes ─────────────────────────────────────────────────────── */}
      {(memFiltradas.length > 0 || sueltasFiltradas.length > 0) && (
        <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-surface-container">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-on-surface text-base">Pendientes de pago</h3>
              <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-amber-500 text-white text-xs font-bold">
                {memFiltradas.length + sueltasFiltradas.length}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-on-surface-variant">
              <button onClick={seleccionarTodos} className="hover:text-on-surface transition-colors font-medium">
                Seleccionar todos
              </button>
              <span className="text-outline">|</span>
              <button onClick={exportarCSV} className="hover:text-on-surface transition-colors font-medium">
                Exportar CSV
              </button>
            </div>
          </div>

          <div className="divide-y divide-surface-container">
            {/* Membresías pendientes */}
            {memFiltradas.map(alumno => {
              const montoPago = preciosDisciplina[alumno.plan]?.[alumno.frecuencia] || 0;
              return (
                <div key={alumno.id} className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    <input type="checkbox" className="rounded accent-indigo-600 flex-shrink-0"
                      checked={seleccionados.has(alumno.id)}
                      onChange={() => toggleSeleccion(alumno.id)} />
                    <Avatar nombre={alumno.nombre} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-on-surface text-sm truncate">{alumno.nombre}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {alumno.plan} • {alumno.frecuencia}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Membresía</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{mesActual}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Importe</p>
                      <p className="text-base font-black text-amber-600 mt-0.5">{formatMonto(montoPago)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {alumno.telefono && (
                        <a href={getWhatsAppLink(alumno, mesActual, preciosDisciplina)}
                          target="_blank" rel="noopener noreferrer"
                          className="w-8 h-8 rounded-xl bg-green-500 hover:bg-green-600 flex items-center justify-center text-white transition-colors">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </a>
                      )}
                      <button onClick={() => abrirPago(alumno.id)}
                        className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-full text-sm font-bold transition-colors">
                        Pagar
                      </button>
                    </div>
                  </div>
                  {pagoActivoId === alumno.id && (
                    <div className="mt-3 ml-14 p-4 bg-surface-container rounded-2xl space-y-3">
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Forma de pago</p>
                      <div className="flex gap-2">
                        {['Efectivo', 'Transferencia'].map(m => (
                          <button key={m} onClick={() => setMetodoPago(m)}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                              metodoPago === m ? 'bg-indigo-600 text-white' : 'bg-surface-container-high text-on-surface-variant'
                            }`}>{m}</button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={cerrarPago}
                          className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-surface-container-high text-on-surface-variant hover:bg-surface-container transition-colors">
                          Cancelar
                        </button>
                        <button onClick={() => confirmarPagoMembresia(alumno)} disabled={syncing}
                          className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-success text-white disabled:opacity-50 transition-colors">
                          {syncing ? '...' : 'Confirmar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Clases sueltas / Day Use pendientes */}
            {sueltasFiltradas.map(pago => {
              const alumno = alumnos.find(a => a.id === pago.alumnoId);
              const tipoInfo = TIPOS_PAGO.find(t => t.id === pago.tipo) || TIPOS_PAGO[0];
              const nombreAlumno = alumno?.nombre || pago.nombre || 'Alumno';
              return (
                <div key={pago.id} className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    <input type="checkbox" className="rounded accent-indigo-600 flex-shrink-0"
                      checked={seleccionados.has(pago.id)}
                      onChange={() => toggleSeleccion(pago.id)} />
                    <Avatar nombre={nombreAlumno} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-on-surface text-sm truncate">{nombreAlumno}</p>
                      <p className={`text-xs font-semibold mt-0.5 ${tipoInfo.color}`}>
                        {pago.esExtra ? 'Clase extra (fuera de plan)' : tipoInfo.label}
                        {pago.virtual && !pago.esExtra ? ' · sin registrar' : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Fecha</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{pago.fecha}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Importe</p>
                      <p className="text-base font-black text-amber-600 mt-0.5">{formatMonto(pago.monto)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!pago.virtual && (
                        <button onClick={() => onCancelarSuelta(pago.id)} disabled={syncing}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-error/10 text-outline hover:text-error transition-colors"
                          title="Cancelar deuda">
                          <Icon name="close" size={16} />
                        </button>
                      )}
                      <button onClick={() => abrirPago(pago.id)}
                        className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-full text-sm font-bold transition-colors">
                        Pagar
                      </button>
                    </div>
                  </div>
                  {pagoActivoId === pago.id && (
                    <div className="mt-3 ml-14 p-4 bg-surface-container rounded-2xl space-y-3">
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Forma de pago</p>
                      <div className="flex gap-2">
                        {['Efectivo', 'Transferencia'].map(m => (
                          <button key={m} onClick={() => setMetodoPago(m)}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                              metodoPago === m ? 'bg-indigo-600 text-white' : 'bg-surface-container-high text-on-surface-variant'
                            }`}>{m}</button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={cerrarPago}
                          className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-surface-container-high text-on-surface-variant hover:bg-surface-container transition-colors">
                          Cancelar
                        </button>
                        <button onClick={() => confirmarMarcarPagado(pago)} disabled={syncing}
                          className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-success text-white disabled:opacity-50 transition-colors">
                          {syncing ? '...' : 'Confirmar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Membresías pagadas ─────────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-surface-container flex items-center gap-3">
          <Icon name="check_circle" className="text-success" size={20} />
          <h3 className="font-bold text-on-surface">Membresías</h3>
          <span className="text-sm text-on-surface-variant">({pagosMembresia.length})</span>
        </div>
        <div className="divide-y divide-surface-container">
          {pagosMembresia.map((pago, i) => {
            const alumno = alumnos.find(a => a.id === pago.alumnoId);
            return (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Avatar nombre={alumno?.nombre || pago.nombre} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-on-surface text-sm truncate">{alumno?.nombre || pago.nombre || 'Alumno'}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{pago.metodo || 'Efectivo'}</p>
                </div>
                <p className="font-bold text-success text-sm flex-shrink-0">{formatMonto(pago.monto)}</p>
              </div>
            );
          })}
          {pagosMembresia.length === 0 && (
            <div className="px-5 py-10 text-center text-on-surface-variant text-sm">
              No hay membresías registradas este mes
            </div>
          )}
        </div>
      </div>

      {/* ── Clases Sueltas pagadas ─────────────────────────────────────────── */}
      {pagosSueltos.length > 0 && (
        <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-surface-container flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0" />
            <h3 className="font-bold text-on-surface">Clases Sueltas</h3>
            <span className="text-sm text-on-surface-variant">({pagosSueltos.length})</span>
          </div>
          <div className="divide-y divide-surface-container">
            {pagosSueltos.map((pago, i) => {
              const alumno = alumnos.find(a => a.id === pago.alumnoId);
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <Avatar nombre={alumno?.nombre || pago.nombre} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-on-surface text-sm truncate">{alumno?.nombre || pago.nombre || 'Alumno'}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{pago.fecha} • {pago.metodo || 'Efectivo'}</p>
                  </div>
                  <p className="font-bold text-amber-600 text-sm flex-shrink-0">{formatMonto(pago.monto)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Day Use pagados ────────────────────────────────────────────────── */}
      {pagosDayUse.length > 0 && (
        <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-surface-container flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0" />
            <h3 className="font-bold text-on-surface">Day Use</h3>
            <span className="text-sm text-on-surface-variant">({pagosDayUse.length})</span>
          </div>
          <div className="divide-y divide-surface-container">
            {pagosDayUse.map((pago, i) => {
              const alumno = alumnos.find(a => a.id === pago.alumnoId);
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <Avatar nombre={alumno?.nombre || pago.nombre} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-on-surface text-sm truncate">{alumno?.nombre || pago.nombre || 'Alumno'}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{pago.fecha} • {pago.metodo || 'Efectivo'}</p>
                  </div>
                  <p className="font-bold text-orange-600 text-sm flex-shrink-0">{formatMonto(pago.monto)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Clases Privadas pagadas ────────────────────────────────────────── */}
      {pagosPrivados.length > 0 && (
        <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-surface-container flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-purple-500 flex-shrink-0" />
            <h3 className="font-bold text-on-surface">Clases Privadas</h3>
            <span className="text-sm text-on-surface-variant">({pagosPrivados.length})</span>
          </div>
          <div className="divide-y divide-surface-container">
            {pagosPrivados.map((pago, i) => {
              const alumno = alumnos.find(a => a.id === pago.alumnoId);
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <Avatar nombre={alumno?.nombre || pago.nombre} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-on-surface text-sm truncate">{alumno?.nombre || pago.nombre || 'Alumno'}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{pago.fecha} • {pago.metodo || 'Efectivo'}</p>
                  </div>
                  <p className="font-bold text-purple-600 text-sm flex-shrink-0">{formatMonto(pago.monto)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Clases de Prueba pagadas ───────────────────────────────────────── */}
      {pagosPrueba.length > 0 && (
        <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-surface-container flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-teal-500 flex-shrink-0" />
            <h3 className="font-bold text-on-surface">Clases de Prueba</h3>
            <span className="text-sm text-on-surface-variant">({pagosPrueba.length})</span>
          </div>
          <div className="divide-y divide-surface-container">
            {pagosPrueba.map((pago, i) => {
              const alumno = alumnos.find(a => a.id === pago.alumnoId);
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <Avatar nombre={alumno?.nombre || pago.nombre} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-on-surface text-sm truncate">{alumno?.nombre || pago.nombre || 'Alumno'}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{pago.fecha} • {pago.metodo || 'Efectivo'}</p>
                  </div>
                  <p className="font-bold text-teal-600 text-sm flex-shrink-0">{formatMonto(pago.monto)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Pagos;
