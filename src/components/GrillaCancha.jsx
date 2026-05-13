import { useState, useMemo } from 'react';
import Icon from './Icon';
import { DISCIPLINAS, DISC_COLORS } from '../utils/helpers';

// ─── Constantes ────────────────────────────────────────────────────────────────

const HORARIOS_GRILLA = Array.from({ length: 16 }, (_, i) =>
  `${String(i + 7).padStart(2, '0')}:00`
);

const HORARIOS_MANANA = HORARIOS_GRILLA.filter(h => parseInt(h) <= 16);
const HORARIOS_TARDE  = HORARIOS_GRILLA.filter(h => parseInt(h) >= 17);

const CANCHAS = [
  { id: 'cancha1', label: 'Cancha 1' },
  { id: 'cancha2', label: 'Cancha 2' },
  { id: 'cancha3', label: 'Cancha 3' },
];

const TIPO_STYLES = {
  clasica: { bg: 'bg-blue-50   border-blue-200',   badge: 'bg-blue-500',   text: 'text-blue-700',   label: 'Clásica'  },
  privada: { bg: 'bg-violet-50 border-violet-200', badge: 'bg-violet-500', text: 'text-violet-700', label: 'Privada'  },
  dayuse:  { bg: 'bg-green-50  border-green-200',  badge: 'bg-green-500',  text: 'text-green-700',  label: 'Day Use'  },
};

const normTipo = t => (t === 'membresia' || t === 'suelta') ? 'clasica' : (t === 'day_use' ? 'dayuse' : t);

const ASIST = {
  asistio:      { pill: 'bg-green-500  text-white', dot: 'bg-green-500'  },
  falto:        { pill: 'bg-red-500    text-white', dot: 'bg-red-500'    },
  vino_no_pago: { pill: 'bg-blue-500   text-white', dot: 'bg-blue-500'   },
  cambio_turno: { pill: 'bg-amber-500  text-white', dot: 'bg-amber-500'  },
};

const DIAS_NOMBRE = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// ─── SVG Cancha ───────────────────────────────────────────────────────────────

const CourtSVG = () => (
  <svg viewBox="0 0 180 100" className="w-full h-full">
    <rect width="180" height="100" fill="#f5e0a0" rx="8"/>
    <rect x="18" y="14" width="144" height="72" fill="#d4a030" rx="2"/>
    <rect x="18" y="14" width="144" height="72" fill="none" stroke="white" strokeWidth="2.5"/>
    <rect x="88" y="10" width="4" height="80" fill="#333" rx="1"/>
    <line x1="90" y1="10" x2="90" y2="4"  stroke="#cc0000" strokeWidth="2"/>
    <line x1="90" y1="90" x2="90" y2="96" stroke="#cc0000" strokeWidth="2"/>
    <line x1="18" y1="50" x2="162" y2="50" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2"/>
    <rect x="86" y="14" width="8" height="72" fill="rgba(0,0,0,0.08)"/>
  </svg>
);

// ─── Helpers de semana ────────────────────────────────────────────────────────

function semanaDelMes(fecha, mesNum, anio) {
  const [dd, mm] = fecha.split('/').map(Number);
  const date = new Date(anio, mm - 1, dd);
  const dow = date.getDay();
  const lunes = new Date(date);
  lunes.setDate(date.getDate() - (dow === 0 ? 6 : dow - 1));
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    const f = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
    dias.push({ fecha: f, enMes: d.getMonth() + 1 === mesNum && d.getFullYear() === anio });
  }
  return dias;
}

function offsetSemana(fecha, offset, mesNum, anio) {
  const [dd, mm] = fecha.split('/').map(Number);
  const d = new Date(anio, mm - 1, dd + offset * 7);
  if (d.getMonth() + 1 < mesNum || d.getFullYear() < anio)
    return `01/${String(mesNum).padStart(2,'0')}`;
  if (d.getMonth() + 1 > mesNum || d.getFullYear() > anio) {
    const ultimo = new Date(anio, mesNum, 0).getDate();
    return `${String(ultimo).padStart(2,'0')}/${String(mesNum).padStart(2,'0')}`;
  }
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

// ─── Helper: computa slots de un día (Firestore + virtuales) ─────────────────

function computeSlots(fecha, ocupacion, alumnos, alumnosIdSet, anio) {
  const map = {};
  ocupacion
    .filter(s => s.fecha === fecha)
    .forEach(s => {
      map[`${s.canchaId}|${s.horario}`] = {
        ...s,
        alumnos: (s.alumnos || []).filter(id => alumnosIdSet.has(id)),
      };
    });

  const [dd, mm] = fecha.split('/').map(Number);
  const dow = new Date(anio, mm - 1, dd).getDay();

  const gruposVirtuales = {};
  alumnos
    .filter(a => a.estado === 'Activo' && a.diasElegidos?.includes(dow) && a.horario && a.tipoMembresia !== 'Clases sueltas')
    .forEach(a => {
      const disc = a.disciplinas?.[0] || 'Futvoley';
      const k = `${a.horario}|${disc}`;
      if (!gruposVirtuales[k]) gruposVirtuales[k] = { horario: a.horario, disciplina: disc, ids: [] };
      gruposVirtuales[k].ids.push(a.id);
    });

  Object.values(gruposVirtuales).forEach(grupo => {
    const key = `cancha3|${grupo.horario}`;
    if (map[key]) {
      const disciplinaSlot = map[key].disciplina || 'Futvoley';
      if (grupo.disciplina !== disciplinaSlot) return;
      const removidos = map[key].removidos || [];
      grupo.ids.forEach(id => {
        if (removidos.includes(id)) return;
        const existentes = map[key].alumnos || [];
        if (!existentes.includes(id))
          map[key] = { ...map[key], alumnos: [...existentes, id] };
      });
    } else {
      if (!map[key] || grupo.ids.length > (map[key].alumnos || []).length) {
        map[key] = {
          canchaId: 'cancha3', fecha, horario: grupo.horario,
          alumnos: grupo.ids, tipo: 'membresia', disciplina: grupo.disciplina,
        };
      }
    }
  });

  return map;
}

// ─── SlotCell ─────────────────────────────────────────────────────────────────

const BADGE = {
  clasica: { label: 'CLASE GRUPAL',   bg: 'bg-blue-50   text-blue-600',   border: 'border-l-blue-500'   },
  privada: { label: 'CLASE PRIVADA',  bg: 'bg-violet-50 text-violet-600', border: 'border-l-violet-500' },
  dayuse:  { label: 'DAY USE',        bg: 'bg-green-50  text-green-600',  border: 'border-l-green-500'  },
};

const SlotCell = ({ slot, alumnosMap, asistencias, fecha, horario, onClick, compact = false, profesoresMap = {} }) => {
  const ids     = slot?.alumnos || [];
  const tipo    = normTipo(slot?.tipo || 'clasica');
  const clave   = `${fecha}|${horario}`;
  const confirmados = ids.filter(id => asistencias?.[id]?.[clave] === 'asistio').length;
  const cancelados  = ids.filter(id => asistencias?.[id]?.[clave] === 'cambio_turno').length;
  const efectivos   = ids.length - cancelados;
  const badge   = BADGE[tipo] || BADGE.clasica;
  const profe   = slot?.profesorId ? profesoresMap[slot.profesorId] : null;

  // ── Compact (vista semanal) ────────────────────────────────────────────────
  if (compact) {
    if (ids.length === 0) {
      return (
        <button onClick={onClick}
          className="w-full h-[54px] border border-dashed border-slate-200 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center group">
          <Icon name="add" size={14} className="text-slate-300 group-hover:text-primary/50 transition-colors" />
        </button>
      );
    }
    return (
      <button onClick={onClick}
        className={`w-full h-[54px] border-l-[3px] ${badge.border} border border-slate-200 rounded-xl bg-white hover:shadow-sm transition-all text-left px-2 py-1.5 flex flex-col justify-between overflow-hidden`}>
        <div className="flex items-center gap-1 min-w-0">
          {ids.slice(0, 3).map((id, i) => {
            const estado = asistencias?.[id]?.[clave];
            const asist  = ASIST[estado];
            return (
              <div key={id} style={{ marginLeft: i === 0 ? 0 : -4, zIndex: 3 - i }}
                className={`w-4 h-4 rounded-full border border-white flex items-center justify-center text-[7px] font-bold ${asist ? asist.pill : 'bg-slate-300 text-white'}`}>
                {alumnosMap[id]?.nombre?.charAt(0) || '?'}
              </div>
            );
          })}
          {ids.length > 3 && <span className="text-[8px] text-slate-400 font-bold ml-0.5">+{ids.length - 3}</span>}
        </div>
        <span className={`text-[8px] font-black uppercase tracking-wide ${badge.bg.split(' ')[1]}`}>
          {tipo === 'clasica' ? (slot?.disciplina || badge.label) : badge.label}
        </span>
      </button>
    );
  }

  // ── Full (vista diaria) ────────────────────────────────────────────────────
  if (ids.length === 0) {
    return (
      <button onClick={onClick}
        className="w-full h-[118px] border border-dashed border-slate-200 rounded-xl hover:border-primary/30 hover:bg-slate-50 transition-all flex items-center justify-center group">
        <Icon name="add" size={20} className="text-slate-300 group-hover:text-primary/40 transition-colors" />
      </button>
    );
  }

  const nombrePrincipal = ids.length === 1
    ? (alumnosMap[ids[0]]?.nombre || 'Alumno')
    : ids.slice(0, 2).map(id => alumnosMap[id]?.nombre?.split(' ')[0]).filter(Boolean).join(' / ')
      + (ids.length > 2 ? ` +${ids.length - 2}` : '');

  return (
    <button onClick={onClick}
      className={`w-full h-[118px] border border-slate-200 border-l-[4px] ${badge.border} rounded-xl bg-white hover:shadow-md transition-all text-left p-3 flex flex-col justify-between overflow-hidden`}>

      {/* Fila superior: badge */}
      <div className="flex items-center gap-1">
        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${badge.bg}`}>
          {tipo === 'clasica' ? (slot?.disciplina || badge.label) : badge.label}
        </span>
      </div>

      {/* Centro: nombre + coach */}
      <div className="flex-1 py-1.5 min-w-0">
        <p className="text-sm font-bold text-on-surface leading-tight truncate">{nombrePrincipal}</p>
        {profe && <p className="text-[10px] text-on-surface-variant mt-0.5 truncate">Coach: {profe.nombre}</p>}
      </div>

      {/* Fila inferior: avatares apilados + contador */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {ids.slice(0, 5).map((id, i) => {
            const estado = asistencias?.[id]?.[clave];
            const asist  = ASIST[estado];
            return (
              <div key={id} style={{ marginLeft: i === 0 ? 0 : -6, zIndex: 5 - i }}
                className={`w-[22px] h-[22px] rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold ${asist ? asist.pill : 'bg-slate-300 text-white'}`}>
                {alumnosMap[id]?.nombre?.charAt(0) || '?'}
              </div>
            );
          })}
          {ids.length > 5 && (
            <div style={{ marginLeft: -6, zIndex: 0 }}
              className="w-[22px] h-[22px] rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500">
              +{ids.length - 5}
            </div>
          )}
        </div>
        <span className={`text-[10px] font-bold tabular-nums ${
          efectivos >= 8 ? 'text-red-500' : confirmados >= 4 ? 'text-amber-500' : 'text-slate-400'
        }`}>
          {tipo === 'dayuse' ? `${ids.length} inscrip.` : `${confirmados}/${8} Slots`}
        </span>
      </div>
    </button>
  );
};

// ─── Modal de edición ─────────────────────────────────────────────────────────


const TIPO_CONFIG = {
  clasica: { label: 'Clásica', icon: 'groups',  activeBg: 'bg-blue-500',   activeText: 'text-white' },
  privada: { label: 'Privada', icon: 'person',  activeBg: 'bg-violet-500', activeText: 'text-white' },
  dayuse:  { label: 'Day Use', icon: 'wb_sunny',activeBg: 'bg-emerald-500',activeText: 'text-white' },
};

const ASIST_BTN = [
  { key: 'asistio',      label: 'Vino',     on: 'bg-green-500 text-white' },
  { key: 'falto',        label: 'No vino',  on: 'bg-red-500 text-white'   },
  { key: 'vino_no_pago', label: 'Sin pago', on: 'bg-blue-500 text-white'  },
  { key: 'cambio_turno', label: 'Canceló',  on: 'bg-amber-500 text-white' },
];

const EditModal = ({
  canchaId, fecha, horario, slot,
  alumnos, alumnosMap, asistencias,
  profesores, profeId,
  onClose, onAgregar, onRemover, onCrearSlot, onRegistrarAsistencia, onAsignarProfe,
  syncing,
}) => {
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState(normTipo(slot?.tipo || 'clasica'));
  const [disciplina, setDisciplina] = useState(slot?.disciplina || 'Futvoley');
  const [pendingDisciplina, setPendingDisciplina] = useState(null);
  const ids = slot?.alumnos || [];
  const clave = `${fecha}|${horario}`;
  const cancelados = ids.filter(id => asistencias?.[id]?.[clave] === 'cambio_turno').length;
  const efectivos  = ids.length - cancelados;

  const disponibles = alumnos.filter(a =>
    !ids.includes(a.id) &&
    (a.nombre.toLowerCase().includes(search.toLowerCase()) ||
     a.apodo?.toLowerCase().includes(search.toLowerCase()) ||
     a.apodos?.some(ap => ap.toLowerCase().includes(search.toLowerCase())))
  );

  const canchaLabel = CANCHAS.find(c => c.id === canchaId)?.label || canchaId;
  const tipoCfg     = TIPO_CONFIG[tipo] || TIPO_CONFIG.clasica;
  const cupoFull    = tipo !== 'dayuse' && efectivos >= 8;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[92vh] overflow-hidden flex flex-col shadow-2xl fade-in"
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`w-2.5 h-2.5 rounded-full ${tipoCfg.activeBg}`} />
                <h3 className="text-xl font-black text-slate-900">{canchaLabel}</h3>
              </div>
              <p className="text-sm text-slate-400 font-medium pl-[18px]">
                {fecha} · {horario} · <span className="text-slate-600 font-semibold">{disciplina}</span>
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
              <Icon name="close" size={18} />
            </button>
          </div>

          {/* Barra de cupo */}
          {tipo !== 'dayuse' && (
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-400">Cupo ocupado</span>
                <span className={cupoFull ? 'text-red-500 font-bold' : 'text-slate-600'}>
                  {efectivos}/8
                  {cancelados > 0 && <span className="text-amber-500 font-normal ml-1.5">· {cancelados} cancelaron</span>}
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${cupoFull ? 'bg-red-400' : efectivos >= 6 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min((efectivos / 8) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Body scrollable ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* Tipo de clase */}
          <section>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Tipo de clase</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(TIPO_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => { setTipo(key); onCrearSlot(canchaId, fecha, horario, key, disciplina); }}
                  className={`py-3 rounded-2xl text-sm font-bold transition-all flex flex-col items-center gap-1.5 ${
                    tipo === key
                      ? `${cfg.activeBg} ${cfg.activeText} shadow-md`
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Icon name={cfg.icon} size={18} filled={tipo === key} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </section>

          {/* Disciplina */}
          <section>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Disciplina</p>
            <div className="grid grid-cols-2 gap-2">
              {DISCIPLINAS.map(d => {
                const dc = DISC_COLORS[d] || DISC_COLORS['Futvoley'];
                const activo = disciplina === d;
                return (
                  <button
                    key={d}
                    onClick={() => {
                      if (d === disciplina) return;
                      if (ids.length > 0) setPendingDisciplina(d);
                      else { setDisciplina(d); onCrearSlot(canchaId, fecha, horario, tipo, d, false); }
                    }}
                    className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all border-2 ${
                      activo
                        ? `${dc.bg} ${dc.border} ${dc.text}`
                        : pendingDisciplina === d
                          ? 'bg-red-50 border-red-300 text-red-600'
                          : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            {pendingDisciplina && (
              <div className="mt-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
                <p className="text-sm font-bold text-red-700 mb-0.5">¿Cambiar a {pendingDisciplina}?</p>
                <p className="text-xs text-red-400 mb-3">Se eliminarán los {ids.length} alumno{ids.length !== 1 ? 's' : ''} asignados.</p>
                <div className="flex gap-2">
                  <button onClick={() => setPendingDisciplina(null)} className="flex-1 py-2 text-xs font-bold rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">Cancelar</button>
                  <button
                    onClick={() => { setDisciplina(pendingDisciplina); onCrearSlot(canchaId, fecha, horario, tipo, pendingDisciplina, true); setPendingDisciplina(null); }}
                    disabled={syncing}
                    className="flex-1 py-2 text-xs font-bold rounded-xl bg-red-500 text-white disabled:opacity-50"
                  >Confirmar</button>
                </div>
              </div>
            )}
          </section>

          {/* Profesor */}
          {profesores?.length > 0 && (
            <section>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Profesor</p>
              <select
                value={profeId || ''}
                onChange={e => onAsignarProfe(canchaId, fecha, horario, disciplina, e.target.value || null)}
                disabled={syncing}
                className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              >
                <option value="">Sin asignar</option>
                {profesores.filter(p => p.estado === 'Activo').map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </section>
          )}

          {/* Alumnos */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Alumnos</p>
              {tipo === 'dayuse'
                ? <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Sin límite</span>
                : <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${cupoFull ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>{efectivos} / 8</span>
              }
            </div>

            {ids.length === 0 ? (
              <div className="text-center py-10 text-slate-300">
                <Icon name="person_add" size={36} className="mx-auto mb-2" />
                <p className="text-sm font-medium">Sin alumnos asignados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ids.map(id => {
                  const alumno = alumnosMap[id];
                  const estado = asistencias?.[id]?.[clave];
                  const as = ASIST[estado];
                  return (
                    <div key={id} className="rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${as ? as.pill : 'bg-slate-200 text-slate-500'}`}>
                            {alumno?.nombre?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 leading-tight">{alumno?.nombre || id}</p>
                            {alumno?.plan && <p className="text-[10px] text-slate-400 leading-tight">{alumno.plan}</p>}
                          </div>
                        </div>
                        <button
                          onClick={() => onRemover(canchaId, fecha, horario, id, ids)}
                          disabled={syncing}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors"
                        >
                          <Icon name="person_remove" size={16} />
                        </button>
                      </div>
                      {onRegistrarAsistencia && (
                        <div className="grid grid-cols-4 gap-px bg-slate-100">
                          {ASIST_BTN.map(b => (
                            <button
                              key={b.key}
                              onClick={() => onRegistrarAsistencia(id, fecha, horario, estado === b.key ? null : b.key, canchaId)}
                              disabled={syncing}
                              className={`text-[10px] font-bold py-2 transition-all ${
                                estado === b.key ? b.on : 'bg-white text-slate-400 hover:bg-slate-50'
                              }`}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Agregar alumno */}
          {(tipo === 'dayuse' || efectivos < 8) && (
            <section>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Agregar alumno</p>
              <div className="relative">
                <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o apodo..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all placeholder:text-slate-300"
                />
              </div>
              {search.trim() && (
                <div className="mt-2 rounded-2xl border border-slate-100 overflow-hidden">
                  {disponibles.length === 0 ? (
                    <p className="text-sm text-slate-400 px-4 py-3 text-center">Sin resultados</p>
                  ) : disponibles.slice(0, 8).map((a, i) => (
                    <button
                      key={a.id}
                      onClick={() => { onAgregar(canchaId, fecha, horario, a.id, tipo); setSearch(''); }}
                      disabled={syncing}
                      className={`w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors disabled:opacity-50 flex items-center justify-between gap-3 ${i > 0 ? 'border-t border-slate-50' : ''}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{a.nombre}</p>
                        {(a.apodo || a.apodos?.[0]) && <p className="text-xs text-slate-400">"{a.apodo || a.apodos[0]}"</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {a.plan && <p className="text-[11px] text-slate-400">{a.plan}</p>}
                        {a.horario && <p className="text-[11px] text-slate-400">{a.horario}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center gap-4 flex-wrap bg-slate-50/50">
          {[
            { color: 'bg-green-500', label: 'Vino y pagó' },
            { color: 'bg-red-500',   label: 'No vino'     },
            { color: 'bg-blue-500',  label: 'Sin pago'    },
            { color: 'bg-amber-500', label: 'Canceló'     },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <span className={`w-2 h-2 rounded-full ${l.color}`} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

const GrillaCancha = ({
  mesActual, mesNum, anio,
  ocupacion,
  alumnos,
  asistencias,
  profesores,
  clasesPorProfe,
  onAgregar,
  onRemover,
  onCrearSlot,
  onRegistrarAsistencia,
  onAsignarProfe,
  syncing,
  vistaMode,
  setVistaMode,
}) => {
  const defaultFecha = (() => {
    const hoy = new Date();
    if (hoy.getMonth() + 1 === mesNum && hoy.getFullYear() === anio)
      return `${String(hoy.getDate()).padStart(2,'0')}/${String(mesNum).padStart(2,'0')}`;
    return `01/${String(mesNum).padStart(2,'0')}`;
  })();

  const [fechaSeleccionada, setFechaSeleccionada] = useState(defaultFecha);
  const [turno, setTurno] = useState('tarde'); // 'manana' | 'tarde' | 'todos'
  const [modalSlot, setModalSlot] = useState(null); // { canchaId, horario, fecha }

  const alumnosMap = useMemo(
    () => Object.fromEntries(alumnos.map(a => [a.id, a])),
    [alumnos]
  );

  const profesoresMap = useMemo(
    () => Object.fromEntries(profesores.map(p => [p.id, p])),
    [profesores]
  );

  const horaActual = `${String(new Date().getHours()).padStart(2, '0')}:00`;
  const esDiaHoy = (() => {
    const hoy = new Date();
    const [dd, mm] = fechaSeleccionada.split('/').map(Number);
    return hoy.getDate() === dd && hoy.getMonth() + 1 === mm && hoy.getFullYear() === anio;
  })();

  const diasSemana = useMemo(
    () => semanaDelMes(fechaSeleccionada, mesNum, anio),
    [fechaSeleccionada, mesNum, anio]
  );

  const alumnosIdSet = useMemo(() => new Set(alumnos.map(a => a.id)), [alumnos]);

  const slotsDia = useMemo(
    () => computeSlots(fechaSeleccionada, ocupacion, alumnos, alumnosIdSet, anio),
    [ocupacion, fechaSeleccionada, alumnos, alumnosIdSet, anio]
  );

  // Lun-Vie de la semana activa
  const diasLaborales = useMemo(() =>
    diasSemana.filter(({ fecha }) => {
      const [dd, mm] = fecha.split('/').map(Number);
      const dow = new Date(anio, mm - 1, dd).getDay();
      return dow >= 1 && dow <= 5;
    }),
    [diasSemana, anio]
  );

  // Slots para todos los días laborales (vista semanal)
  const slotsSemana = useMemo(() => {
    if (vistaMode !== 'semana') return {};
    return Object.fromEntries(
      diasLaborales
        .filter(d => d.enMes)
        .map(({ fecha }) => [fecha, computeSlots(fecha, ocupacion, alumnos, alumnosIdSet, anio)])
    );
  }, [vistaMode, diasLaborales, ocupacion, alumnos, alumnosIdSet, anio]);

  const horariosVisibles = useMemo(() => {
    if (turno === 'manana') return HORARIOS_MANANA;
    if (turno === 'tarde')  return HORARIOS_TARDE;
    return HORARIOS_GRILLA;
  }, [turno]);

  const openModal  = (canchaId, horario, fecha) => setModalSlot({ canchaId, horario, fecha: fecha || fechaSeleccionada });
  const closeModal = () => setModalSlot(null);
  const modalFecha = modalSlot?.fecha || fechaSeleccionada;
  const slotModal  = modalSlot
    ? (slotsSemana[modalFecha] || slotsDia)[`${modalSlot.canchaId}|${modalSlot.horario}`] || null
    : null;

  const diaSemana = (() => {
    const [dd, mm] = fechaSeleccionada.split('/').map(Number);
    return DIAS_NOMBRE[new Date(anio, mm - 1, dd).getDay()];
  })();

  const TURNOS = [
    { key: 'manana', label: 'Turno Mañana',      sub: '07 – 16 h' },
    { key: 'tarde',  label: 'Turno Tarde/Noche', sub: '17 – 22 h' },
    { key: 'todos',  label: 'Todo el día',        sub: '07 – 22 h' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Canchas</h1>
          <p className="text-on-surface-variant text-sm">{mesActual}</p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-surface-container-lowest rounded-xl shadow-sm">
          {[
            { key: 'dia',    label: 'Día',    icon: 'calendar_today'     },
            { key: 'semana', label: 'Semana', icon: 'calendar_view_week' },
          ].map(v => (
            <button
              key={v.key}
              onClick={() => setVistaMode(v.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                vistaMode === v.key
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon name={v.icon} size={14} />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de turno */}
      <div className="grid grid-cols-3 gap-2">
        {TURNOS.map(t => (
          <button
            key={t.key}
            onClick={() => setTurno(t.key)}
            className={`flex flex-col items-center py-2.5 px-3 rounded-2xl transition-all border-2 ${
              turno === t.key
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : 'border-transparent bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className={`text-[11px] font-black ${turno === t.key ? 'text-primary' : 'text-on-surface'}`}>
              {t.label}
            </span>
            <span className={`text-[10px] ${turno === t.key ? 'text-primary/70' : 'text-outline'}`}>
              {t.sub}
            </span>
          </button>
        ))}
      </div>

      {/* Navegador de semana */}
      <div className="bg-surface-container-lowest rounded-2xl p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFechaSeleccionada(f => offsetSemana(f, -1, mesNum, anio))}
            className="p-2 rounded-xl hover:bg-surface-container transition-colors shrink-0"
          >
            <Icon name="chevron_left" size={20} />
          </button>

          <div className="flex-1 grid grid-cols-7 gap-1">
            {diasSemana.map(({ fecha, enMes }) => {
              const [dd] = fecha.split('/').map(Number);
              const dow = new Date(anio, parseInt(fecha.split('/')[1]) - 1, dd).getDay();
              const esHoy = (() => {
                const hoy = new Date();
                return hoy.getDate() === dd &&
                       hoy.getMonth() + 1 === parseInt(fecha.split('/')[1]) &&
                       hoy.getFullYear() === anio;
              })();
              const seleccionado = fecha === fechaSeleccionada;
              const tieneDatos = enMes && (ocupacion.some(s => s.fecha === fecha) || (() => {
                const [dd2, mm2] = fecha.split('/').map(Number);
                const dow2 = new Date(anio, mm2 - 1, dd2).getDay();
                return alumnos.some(a => a.estado === 'Activo' && a.diasElegidos?.includes(dow2) && a.horario);
              })());

              return (
                <button
                  key={fecha}
                  onClick={() => enMes && setFechaSeleccionada(fecha)}
                  disabled={!enMes}
                  className={`flex flex-col items-center py-1.5 px-1 rounded-xl transition-all text-center ${
                    seleccionado
                      ? 'bg-primary text-white shadow-sm'
                      : enMes
                        ? 'hover:bg-surface-container text-on-surface-variant'
                        : 'opacity-20 cursor-not-allowed text-on-surface-variant'
                  }`}
                >
                  <span className={`text-[9px] font-bold uppercase ${seleccionado ? 'text-white/80' : 'text-outline'}`}>
                    {DIAS_NOMBRE[dow]}
                  </span>
                  <span className={`text-sm font-black ${esHoy && !seleccionado ? 'text-primary' : ''}`}>
                    {dd}
                  </span>
                  {tieneDatos && !seleccionado && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setFechaSeleccionada(f => offsetSemana(f, 1, mesNum, anio))}
            className="p-2 rounded-xl hover:bg-surface-container transition-colors shrink-0"
          >
            <Icon name="chevron_right" size={20} />
          </button>
        </div>

        <p className="text-center text-xs font-bold text-on-surface-variant mt-2">
          {diaSemana} {fechaSeleccionada}
        </p>
      </div>

      {/* ── Vista Día ───────────────────────────────────────────────────── */}
      {vistaMode === 'dia' && (
        <div className="overflow-x-auto">
          <div className="min-w-[480px] bg-surface-container-lowest rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
            {/* Header de canchas */}
            <div className="grid grid-cols-[52px_1fr_1fr_1fr] border-b border-slate-200/60">
              <div className="py-3 border-r border-slate-200/40" />
              {CANCHAS.map((c, i) => (
                <div key={c.id} className={`py-3 px-2 flex flex-col items-center gap-1.5 ${i < 2 ? 'border-r border-slate-200/40' : ''}`}>
                  <div className="w-full h-10 rounded-lg overflow-hidden"><CourtSVG /></div>
                  <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">{c.label}</span>
                </div>
              ))}
            </div>
            {/* Filas de horarios */}
            {horariosVisibles.map((horario, rowIdx) => {
              const isLast    = rowIdx === horariosVisibles.length - 1;
              const esAhora   = esDiaHoy && horario === horaActual;
              return (
                <div key={horario}
                  className={`grid grid-cols-[52px_1fr_1fr_1fr] ${!isLast ? 'border-b border-slate-200/40' : ''} ${esAhora ? 'bg-primary/5' : ''}`}>
                  {/* Columna hora */}
                  <div className="flex items-center justify-end pr-3 py-2 border-r border-slate-200/40 gap-1.5">
                    {esAhora && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    <span className={`text-[11px] font-bold tabular-nums ${esAhora ? 'text-primary' : 'text-slate-400'}`}>
                      {horario}
                    </span>
                  </div>
                  {CANCHAS.map((c, i) => (
                    <div key={c.id} className={`p-2 ${i < 2 ? 'border-r border-slate-200/40' : ''}`}>
                      <SlotCell
                        slot={slotsDia[`${c.id}|${horario}`]}
                        alumnosMap={alumnosMap}
                        asistencias={asistencias}
                        fecha={fechaSeleccionada}
                        horario={horario}
                        onClick={() => openModal(c.id, horario)}
                        profesoresMap={profesoresMap}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Vista Semana (Lun-Vie) ───────────────────────────────────────── */}
      {vistaMode === 'semana' && (
        <div className="space-y-4">
          {CANCHAS.map(cancha => (
            <div key={cancha.id} className="overflow-x-auto">
              <div className="min-w-[520px] bg-surface-container-lowest rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
                {/* Header: nombre cancha + días */}
                <div
                  className="grid border-b border-slate-200/60 bg-slate-50/80"
                  style={{ gridTemplateColumns: `52px repeat(${diasLaborales.length}, 1fr)` }}
                >
                  <div className="py-2.5 px-2 border-r border-slate-200/40 flex items-center justify-center">
                    <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-wider leading-tight text-center">{cancha.label}</span>
                  </div>
                  {diasLaborales.map(({ fecha, enMes }, i) => {
                    const [dd, mm] = fecha.split('/').map(Number);
                    const dow = new Date(anio, mm - 1, dd).getDay();
                    const hoy = new Date();
                    const esHoy = hoy.getDate() === dd && hoy.getMonth() + 1 === mm && hoy.getFullYear() === anio;
                    return (
                      <div
                        key={fecha}
                        className={`py-2 px-1 text-center ${i < diasLaborales.length - 1 ? 'border-r border-slate-200/40' : ''} ${!enMes ? 'opacity-30' : ''}`}
                      >
                        <p className="text-[9px] font-bold text-outline uppercase">{DIAS_NOMBRE[dow]}</p>
                        <p className={`text-sm font-black tabular-nums ${esHoy ? 'text-primary' : 'text-on-surface'}`}>{dd}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Filas de horarios */}
                {horariosVisibles.map((horario, rowIdx) => {
                  const isLast = rowIdx === horariosVisibles.length - 1;
                  return (
                    <div
                      key={horario}
                      className={`grid ${!isLast ? 'border-b border-slate-200/40' : ''} ${rowIdx % 2 === 0 ? 'bg-slate-50/30' : ''}`}
                      style={{ gridTemplateColumns: `52px repeat(${diasLaborales.length}, 1fr)` }}
                    >
                      <div className="flex items-center justify-end pr-2 py-1 border-r border-slate-200/40">
                        <span className="text-[10px] font-bold text-slate-400 tabular-nums">{horario}</span>
                      </div>
                      {diasLaborales.map(({ fecha, enMes }, i) => (
                        <div key={fecha} className={`p-1 ${i < diasLaborales.length - 1 ? 'border-r border-slate-200/40' : ''}`}>
                          {enMes ? (
                            <SlotCell
                              slot={slotsSemana[fecha]?.[`${cancha.id}|${horario}`]}
                              alumnosMap={alumnosMap}
                              asistencias={asistencias}
                              fecha={fecha}
                              horario={horario}
                              onClick={() => openModal(cancha.id, horario, fecha)}
                              compact
                            />
                          ) : (
                            <div className="h-[54px] rounded-xl bg-slate-50 border border-dashed border-slate-100" />
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leyenda */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 px-1 pb-1">
        <div className="flex gap-3 flex-wrap">
          {Object.entries(TIPO_STYLES).map(([key, s]) => (
            <span key={key} className="flex items-center gap-1 text-[10px] text-on-surface-variant">
              <span className={`w-2 h-2 rounded-full ${s.badge}`}/>
              {s.label}
            </span>
          ))}
        </div>
        <div className="w-px bg-surface-container-high hidden sm:block" />
        <div className="flex gap-3 flex-wrap">
          {[
            { color: 'bg-green-500', label: 'Vino y pagó' },
            { color: 'bg-red-500',   label: 'No vino'     },
            { color: 'bg-blue-500',  label: 'Vino sin $'  },
            { color: 'bg-amber-500', label: 'Canceló'     },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1 text-[10px] text-on-surface-variant">
              <span className={`w-2 h-2 rounded-full ${l.color}`}/>
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modalSlot && (
        <EditModal
          canchaId={modalSlot.canchaId}
          fecha={modalFecha}
          horario={modalSlot.horario}
          slot={slotModal}
          alumnos={alumnos}
          alumnosMap={alumnosMap}
          asistencias={asistencias}
          profesores={profesores}
          profeId={clasesPorProfe?.[`${slotModal?.disciplina || 'Futvoley'}-${modalFecha}-${modalSlot.horario}`] || null}
          onClose={closeModal}
          onAgregar={async (...a) => { await onAgregar(...a); }}
          onRemover={async (...a) => { await onRemover(...a); }}
          onCrearSlot={async (cId, f, h, tipo, disc, clearAlumnos) => {
            await onCrearSlot(cId, f, h, {
              tipo,
              disciplina: disc,
              ...(clearAlumnos ? { alumnos: [], removidos: [] } : {}),
            });
          }}
          onRegistrarAsistencia={onRegistrarAsistencia}
          onAsignarProfe={onAsignarProfe}
          syncing={syncing}
        />
      )}
    </div>
  );
};

export default GrillaCancha;
