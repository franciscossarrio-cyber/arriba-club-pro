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

const PagoModal = ({ item, onClose, onConfirm, syncing }) => {
  const [monto, setMonto] = useState(String(item.monto));
  const [metodo, setMetodo] = useState('Efectivo');
  const [loading, setLoading] = useState(false);

  const montoNum = parseInt(monto) || 0;
  const valido = montoNum > 0 && montoNum <= item.monto;
  const esParcial = valido && montoNum < item.monto;

  const confirmar = async () => {
    if (!valido) return;
    setLoading(true);
    try {
      await onConfirm(montoNum, metodo);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl fade-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar nombre={item.nombre} />
            <div className="min-w-0">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Registrar cobro</p>
              <h3 className="text-base font-black text-slate-900 truncate">{item.nombre}</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors flex-shrink-0">
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center justify-between bg-amber-50 rounded-2xl px-4 py-3">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Deuda total</span>
            <span className="text-lg font-black text-amber-700">{formatMonto(item.monto)}</span>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Monto a cobrar</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
              <input
                type="number" value={monto} onChange={e => setMonto(e.target.value)} autoFocus
                className="w-full pl-8 pr-4 py-3 bg-slate-50 rounded-xl text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button onClick={() => setMonto(String(item.monto))}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                  montoNum === item.monto ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>
                Total
              </button>
              <button onClick={() => setMonto(String(Math.round(item.monto / 2)))}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                  montoNum === Math.round(item.monto / 2) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>
                Mitad ({formatMonto(Math.round(item.monto / 2))})
              </button>
            </div>
            {esParcial && (
              <p className="text-xs text-amber-600 font-medium mt-2 flex items-center gap-1">
                <Icon name="info" size={14} />
                Queda pendiente {formatMonto(item.monto - montoNum)}
              </p>
            )}
            {!valido && monto !== '' && (
              <p className="text-xs text-error font-medium mt-2">El monto debe ser mayor a $0 y no superar la deuda</p>
            )}
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Forma de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {['Efectivo', 'Transferencia'].map(m => (
                <button key={m} onClick={() => setMetodo(m)}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${
                    metodo === m ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}>{m}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer: botones equilibrados */}
        <div className="px-6 py-4 border-t border-slate-100 grid grid-cols-2 gap-3">
          <button onClick={onClose}
            className="py-3 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            Cancelar
          </button>
          <button onClick={confirmar} disabled={!valido || loading || syncing}
            className="py-3 rounded-xl text-sm font-bold bg-success text-white disabled:opacity-50 transition-colors">
            {loading ? '...' : esParcial ? 'Registrar parcial' : 'Confirmar pago'}
          </button>
        </div>
      </div>
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

  // ── Vista: Deudas | Historial ─────────────────────────────────────────────────
  const [vista, setVista] = useState('deudas');
  const [filtroDeuda, setFiltroDeuda] = useState('todos');
  const [filtroHistorial, setFiltroHistorial] = useState('todos');

  // ── Pago (modal) ──────────────────────────────────────────────────────────────
  const [pagoModalItem, setPagoModalItem] = useState(null);

  const pagarUnidad = async (pago, metodo, montoOverride) => {
    if (pago.virtual) await onPagarSueltaVirtual(pago, metodo, montoOverride);
    else              await onMarcarPagado(pago.id, metodo, montoOverride);
  };

  // Aplica el monto cobrado (puede ser parcial) sobre el item; en un grupo se
  // reparte entre las clases sueltas más antiguas primero.
  const pagarItemMonto = async (item, montoTotal, metodo) => {
    if (item.kind === 'membresia') {
      await onPagarMembresia(item.alumno, metodo, montoTotal);
      return;
    }
    if (item.kind === 'pago-group') {
      let restante = montoTotal;
      for (const p of item.pagos) {
        if (restante <= 0) break;
        const aplicar = Math.min(restante, p.monto);
        await pagarUnidad(p, metodo, aplicar);
        restante -= aplicar;
      }
      return;
    }
    await pagarUnidad(item.pago, metodo, montoTotal);
  };

  const cancelarItem = (item) => {
    if (item.kind === 'pago-group') item.pagos.filter(p => !p.virtual).forEach(p => onCancelarSuelta(p.id));
    else onCancelarSuelta(item.pago.id);
  };

  // ── Búsqueda + selección ──────────────────────────────────────────────────────
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState(new Set());

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

  // Lista unificada de deudas (membresías + sueltas/privadas/prueba/dayuse)
  const itemsPendientes = useMemo(() => {
    const mem = memFiltradas.map(a => ({
      id: a.id, kind: 'membresia', tipo: 'membresia', alumno: a,
      nombre: a.nombre,
      sub: `${a.plan} • ${a.frecuencia}`,
      subColor: 'text-on-surface-variant',
      monto: a._montoPendienteMembresia ?? (preciosDisciplina[a.plan]?.[a.frecuencia] || 0),
      colLabel: 'Membresía', colValue: mesActual,
      whatsappHref: a.telefono ? getWhatsAppLink(a, mesActual, preciosDisciplina) : null,
      cancelable: false,
    }));
    const tipoSuelta = TIPOS_PAGO.find(t => t.id === 'suelta');
    const sueltasPuras = sueltasFiltradas.filter(p => p.tipo === 'suelta' && !p.esExtra);
    const otras = sueltasFiltradas.filter(p => !(p.tipo === 'suelta' && !p.esExtra));

    const gruposSuelta = {};
    sueltasPuras.forEach(p => {
      const key = p.alumnoId || p.nombre;
      (gruposSuelta[key] ||= []).push(p);
    });

    const sueltaItems = Object.values(gruposSuelta).map(pagos => {
      const p0 = pagos[0];
      const al = alumnos.find(a => a.id === p0.alumnoId);
      const nombre = al?.nombre || p0.nombre || 'Alumno';
      const monto = pagos.reduce((sum, p) => sum + (p.monto || 0), 0);
      if (pagos.length === 1) {
        return {
          id: p0.id, kind: 'pago', tipo: 'suelta', pago: p0,
          nombre,
          sub: `${tipoSuelta.label}${p0.virtual ? ' · sin registrar' : ''}`,
          subColor: tipoSuelta.color,
          monto,
          colLabel: 'Fecha', colValue: p0.fecha,
          whatsappHref: null,
          cancelable: !p0.virtual,
        };
      }
      return {
        id: `suelta-group-${p0.alumnoId || nombre}`, kind: 'pago-group', tipo: 'suelta', pagos,
        nombre,
        sub: `${pagos.length} clases sueltas`,
        subColor: tipoSuelta.color,
        monto,
        colLabel: 'Fechas', colValue: `${pagos.length} fechas`,
        whatsappHref: null,
        cancelable: pagos.some(p => !p.virtual),
      };
    });

    const otrosItems = otras.map(p => {
      const al = alumnos.find(a => a.id === p.alumnoId);
      const tipoInfo = TIPOS_PAGO.find(t => t.id === p.tipo) || TIPOS_PAGO[0];
      return {
        id: p.id, kind: 'pago', tipo: p.tipo, pago: p,
        nombre: al?.nombre || p.nombre || 'Alumno',
        sub: p.esExtra ? 'Clase extra (fuera de plan)' : `${tipoInfo.label}${p.virtual && !p.esExtra ? ' · sin registrar' : ''}`,
        subColor: tipoInfo.color,
        monto: p.monto,
        colLabel: 'Fecha', colValue: p.fecha,
        whatsappHref: null,
        cancelable: !p.virtual,
      };
    });

    return [...mem, ...sueltaItems, ...otrosItems];
  }, [memFiltradas, sueltasFiltradas, alumnos, preciosDisciplina, mesActual]);

  const chipsDeuda = useMemo(() => ([
    { id: 'todos', label: 'Todos', dot: null, count: itemsPendientes.length },
    ...TIPOS_PAGO.map(t => ({ ...t, count: itemsPendientes.filter(i => i.tipo === t.id).length })).filter(t => t.count > 0),
  ]), [itemsPendientes]);

  const itemsPendientesFiltrados = filtroDeuda === 'todos'
    ? itemsPendientes
    : itemsPendientes.filter(i => i.tipo === filtroDeuda);

  const toggleSeleccion = (id) => setSeleccionados(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const seleccionarTodos = () => {
    const ids = itemsPendientesFiltrados.map(i => i.id);
    setSeleccionados(prev => ids.every(id => prev.has(id)) && prev.size === ids.length ? new Set() : new Set(ids));
  };

  // ── Cobro masivo ──────────────────────────────────────────────────────────────
  const [metodoBulk, setMetodoBulk] = useState('Efectivo');
  const [bulkLoading, setBulkLoading] = useState(false);

  const cobrarSeleccionados = async () => {
    setBulkLoading(true);
    try {
      const seleccionActual = itemsPendientes.filter(i => seleccionados.has(i.id));
      for (const item of seleccionActual) await pagarItemMonto(item, item.monto, metodoBulk);
    } finally {
      setSeleccionados(new Set());
      setBulkLoading(false);
    }
  };

  const exportarCSV = () => {
    const rows = [['Nombre', 'Tipo', 'Monto', 'Estado']];
    itemsPendientesFiltrados.forEach(i => rows.push([i.nombre, i.colLabel, i.monto, 'Pendiente']));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pagos-pendientes-${mesActual}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Historial (pagados) ───────────────────────────────────────────────────────
  const pagosPagados = pagosDisciplina.filter(p => p.estado === 'Pagado');

  const historialItems = useMemo(() => pagosPagados.map((p, i) => {
    const al = alumnos.find(a => a.id === p.alumnoId);
    const tipoNorm = ['suelta', 'privada', 'prueba', 'dayuse'].includes(p.tipo) ? p.tipo : 'membresia';
    const tipoInfo = TIPOS_PAGO.find(t => t.id === tipoNorm) || TIPOS_PAGO[TIPOS_PAGO.length - 1];
    return {
      id: p.id || i, nombre: al?.nombre || p.nombre || 'Alumno', tipo: tipoNorm, tipoInfo,
      monto: p.monto, metodo: p.metodo || 'Efectivo', fecha: p.fecha,
    };
  }), [pagosPagados, alumnos]);

  const chipsHistorial = useMemo(() => ([
    { id: 'todos', label: 'Todos', dot: null, count: historialItems.length },
    ...TIPOS_PAGO.map(t => ({ ...t, count: historialItems.filter(i => i.tipo === t.id).length })).filter(t => t.count > 0),
  ]), [historialItems]);

  const historialFiltrado = filtroHistorial === 'todos'
    ? historialItems
    : historialItems.filter(i => i.tipo === filtroHistorial);

  const totalEsperado = montoCobrado + montoPendiente;
  const pct = totalEsperado > 0 ? Math.round((montoCobrado / totalEsperado) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight">Pagos</h1>
          <p className="text-on-surface-variant text-sm mt-0.5">Gestión de deudas del mes en curso</p>
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

        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Pendiente</p>
          <p className="text-2xl font-black text-amber-600 leading-tight">{formatMonto(montoPendiente)}</p>
          {itemsPendientes.length > 0 && (
            <div className="flex items-center gap-1.5 text-amber-600">
              <Icon name="warning" size={15} />
              <p className="text-xs font-semibold">{itemsPendientes.length} Pagos por recolectar</p>
            </div>
          )}
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-5 text-white shadow-sm flex flex-col justify-between">
          <p className="text-xs font-bold uppercase tracking-widest opacity-75">Disciplina Activa</p>
          <p className="text-2xl font-black leading-tight mt-1">{disciplinaActiva}</p>
          <div className="flex items-center gap-1.5 opacity-80 mt-1">
            <Icon name="sports_volleyball" size={14} />
            <p className="text-xs font-medium">{mesActual}</p>
          </div>
          <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute right-4 -bottom-10 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
        </div>
      </div>

      {/* ── Tabs Deudas / Historial ────────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-surface-container-lowest rounded-2xl w-fit shadow-sm">
        {[
          { key: 'deudas',     label: 'Deudas',     count: itemsPendientes.length },
          { key: 'historial',  label: 'Historial',  count: historialItems.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setVista(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              vista === t.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t.label}
            <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-bold ${
              vista === t.key ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface-variant'
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════ DEUDAS ══════════════════════════════ */}
      {vista === 'deudas' && (
        <>
          {/* Buscador */}
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
            <button onClick={exportarCSV}
              className="flex items-center gap-2 px-4 py-3 bg-surface-container-lowest rounded-2xl text-sm font-medium text-on-surface-variant shadow-sm hover:bg-surface-container transition-colors">
              <Icon name="download" size={16} />
              Exportar
            </button>
          </div>

          {/* Chips de filtro */}
          <div className="flex flex-wrap gap-2">
            {chipsDeuda.map(c => (
              <button
                key={c.id}
                onClick={() => setFiltroDeuda(c.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
                  filtroDeuda === c.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {c.dot && <span className={`w-2 h-2 rounded-full ${c.dot}`} />}
                {c.label} ({c.count})
              </button>
            ))}
          </div>

          {/* Barra de acción masiva */}
          {seleccionados.size > 0 && (
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 flex-wrap bg-indigo-600 text-white rounded-2xl px-5 py-3 shadow-md">
              <span className="text-sm font-bold">{seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}</span>
              <div className="flex items-center gap-2 flex-wrap">
                {['Efectivo', 'Transferencia'].map(m => (
                  <button key={m} onClick={() => setMetodoBulk(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      metodoBulk === m ? 'bg-white text-indigo-600' : 'bg-white/15 text-white hover:bg-white/25'
                    }`}>{m}</button>
                ))}
                <button onClick={cobrarSeleccionados} disabled={bulkLoading || syncing}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-success text-white disabled:opacity-50 transition-colors">
                  {bulkLoading ? '...' : 'Cobrar seleccionados'}
                </button>
                <button onClick={() => setSeleccionados(new Set())}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista de deudas */}
          <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 flex items-center justify-between border-b border-surface-container">
              <h3 className="font-bold text-on-surface text-base">Pendientes de pago</h3>
              <button onClick={seleccionarTodos} className="text-sm hover:text-on-surface transition-colors font-medium text-on-surface-variant">
                Seleccionar todos
              </button>
            </div>

            {itemsPendientesFiltrados.length === 0 ? (
              <div className="px-5 py-14 text-center text-on-surface-variant text-sm">
                <Icon name="check_circle" size={32} className="mx-auto mb-2 text-success" />
                No hay deudas pendientes en este filtro
              </div>
            ) : (
              <div className="divide-y divide-surface-container">
                {itemsPendientesFiltrados.map(item => (
                  <div key={item.id} className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <input type="checkbox" className="rounded accent-indigo-600 flex-shrink-0"
                        checked={seleccionados.has(item.id)}
                        onChange={() => toggleSeleccion(item.id)} />
                      <Avatar nombre={item.nombre} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-on-surface text-sm truncate">{item.nombre}</p>
                        <p className={`text-xs font-medium mt-0.5 ${item.subColor}`}>{item.sub}</p>
                      </div>
                      <div className="text-right flex-shrink-0 hidden sm:block">
                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">{item.colLabel}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">{item.colValue}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Importe</p>
                        <p className="text-base font-black text-amber-600 mt-0.5">{formatMonto(item.monto)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.whatsappHref && (
                          <a href={item.whatsappHref} target="_blank" rel="noopener noreferrer"
                            className="w-8 h-8 rounded-xl bg-green-500 hover:bg-green-600 flex items-center justify-center text-white transition-colors">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                          </a>
                        )}
                        {item.cancelable && (
                          <button onClick={() => cancelarItem(item)} disabled={syncing}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-error/10 text-outline hover:text-error transition-colors"
                            title="Cancelar deuda">
                            <Icon name="close" size={16} />
                          </button>
                        )}
                        <button onClick={() => setPagoModalItem(item)}
                          className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-full text-sm font-bold transition-colors">
                          Pagar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════ HISTORIAL ═══════════════════════════ */}
      {vista === 'historial' && (
        <>
          <div className="flex flex-wrap gap-2">
            {chipsHistorial.map(c => (
              <button
                key={c.id}
                onClick={() => setFiltroHistorial(c.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
                  filtroHistorial === c.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {c.dot && <span className={`w-2 h-2 rounded-full ${c.dot}`} />}
                {c.label} ({c.count})
              </button>
            ))}
          </div>

          <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-surface-container flex items-center gap-3">
              <Icon name="check_circle" className="text-success" size={20} />
              <h3 className="font-bold text-on-surface">Pagos registrados</h3>
              <span className="text-sm text-on-surface-variant">({historialFiltrado.length})</span>
            </div>
            {historialFiltrado.length === 0 ? (
              <div className="px-5 py-14 text-center text-on-surface-variant text-sm">
                No hay pagos registrados en este filtro
              </div>
            ) : (
              <div className="divide-y divide-surface-container">
                {historialFiltrado.map(item => (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                    <Avatar nombre={item.nombre} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-on-surface text-sm truncate">{item.nombre}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${item.tipoInfo.dot}`} />
                        {item.tipoInfo.label} · {item.fecha ? `${item.fecha} · ` : ''}{item.metodo}
                      </p>
                    </div>
                    <p className={`font-bold text-sm flex-shrink-0 ${item.tipoInfo.color}`}>{formatMonto(item.monto)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal de cobro */}
      {pagoModalItem && (
        <PagoModal
          item={pagoModalItem}
          syncing={syncing}
          onClose={() => setPagoModalItem(null)}
          onConfirm={async (montoNum, metodo) => {
            await pagarItemMonto(pagoModalItem, montoNum, metodo);
            setPagoModalItem(null);
          }}
        />
      )}
    </div>
  );
};

export default Pagos;
