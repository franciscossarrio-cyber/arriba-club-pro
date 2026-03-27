import { useState, useMemo } from 'react';
import Icon from './Icon';
import DisciplinaIcon from './DisciplinaIcon';
import { DISCIPLINAS } from '../utils/helpers';

// ─── Constantes ────────────────────────────────────────────────────────────────

const HORARIOS_GRILLA = Array.from({ length: 16 }, (_, i) =>
  `${String(i + 7).padStart(2, '0')}:00`
);

const CANCHAS = [
  { id: 'cancha1', label: 'Cancha 1' },
  { id: 'cancha2', label: 'Cancha 2' },
  { id: 'cancha3', label: 'Cancha 3' },
];

const TIPO_STYLES = {
  membresia: { bg: 'bg-blue-50  border-blue-200',  badge: 'bg-blue-500',   text: 'text-blue-700',   label: 'Membresía'  },
  privada:   { bg: 'bg-violet-50 border-violet-200', badge: 'bg-violet-500', text: 'text-violet-700', label: 'Privada'    },
  suelta:    { bg: 'bg-amber-50  border-amber-200',  badge: 'bg-amber-500',  text: 'text-amber-700',  label: 'Suelta'     },
  day_use:   { bg: 'bg-green-50  border-green-200',  badge: 'bg-green-500',  text: 'text-green-700',  label: 'Day Use'    },
};

// Colores de asistencia — igual que en el Excel:
// Verde = vino y pagó | Rojo = no vino | Azul = vino sin pagar | Ámbar = canceló
const ASIST = {
  asistio:      { pill: 'bg-green-500  text-white',  dot: 'bg-green-500'  },
  falto:        { pill: 'bg-red-500    text-white',  dot: 'bg-red-500'    },
  vino_no_pago: { pill: 'bg-blue-500   text-white',  dot: 'bg-blue-500'   },
  cambio_turno: { pill: 'bg-amber-500  text-white',  dot: 'bg-amber-500'  },
};

const DIAS_NOMBRE = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// ─── SVG Cancha de Beach Volleyball ──────────────────────────────────────────

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

/** Devuelve los 7 días (lun-dom) de la semana que contiene `fecha` dd/mm */
function semanaDelMes(fecha, mesNum, anio) {
  const [dd, mm] = fecha.split('/').map(Number);
  const date = new Date(anio, mm - 1, dd);
  const dow = date.getDay(); // 0=Dom
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

/** Avanza o retrocede una semana */
function offsetSemana(fecha, offset, mesNum, anio) {
  const [dd, mm] = fecha.split('/').map(Number);
  const d = new Date(anio, mm - 1, dd + offset * 7);
  // clampear al mes
  if (d.getMonth() + 1 < mesNum || d.getFullYear() < anio)
    return `01/${String(mesNum).padStart(2,'0')}`;
  if (d.getMonth() + 1 > mesNum || d.getFullYear() > anio) {
    const ultimo = new Date(anio, mesNum, 0).getDate();
    return `${String(ultimo).padStart(2,'0')}/${String(mesNum).padStart(2,'0')}`;
  }
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

// ─── Celda de slot con colores de asistencia ──────────────────────────────────

const SlotCell = ({ slot, alumnosMap, asistencias, fecha, onClick }) => {
  const ids = slot?.alumnos || [];
  const tipo = slot?.tipo || 'membresia';
  const styles = TIPO_STYLES[tipo] || TIPO_STYLES.membresia;

  if (ids.length === 0) {
    return (
      <button
        onClick={onClick}
        className="w-full h-[76px] border-2 border-dashed border-surface-container-high rounded-xl
                   hover:border-primary/40 hover:bg-primary/5 transition-all
                   flex items-center justify-center group"
      >
        <Icon name="add" size={18} className="text-outline/40 group-hover:text-primary/50 transition-colors" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full h-[76px] border-2 rounded-xl p-1.5 overflow-hidden transition-all hover:shadow-md text-left ${styles.bg}`}
    >
      {/* Nombres con color de asistencia */}
      <div className="flex flex-wrap gap-[2px] mb-1">
        {ids.slice(0, 7).map(id => {
          const nombre = alumnosMap[id]?.nombre?.split(' ')[0] || '?';
          const estado = asistencias?.[id]?.[fecha];
          const asist = ASIST[estado];
          return (
            <span
              key={id}
              className={`text-[9px] font-bold px-1 py-0.5 rounded-md truncate max-w-[44px] ${
                asist ? `${asist.pill}` : `bg-white/70 ${styles.text}`
              }`}
            >
              {nombre}
            </span>
          );
        })}
        {ids.length > 7 && (
          <span className="text-[9px] text-outline font-bold">+{ids.length - 7}</span>
        )}
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-bold uppercase ${styles.text} opacity-70`}>
          {slot?.disciplina ? slot.disciplina.split(' ')[0] : styles.label}
        </span>
        <span className={`text-[10px] font-black ${ids.length >= 8 ? 'text-error' : styles.text}`}>
          {ids.length}/8
        </span>
      </div>
    </button>
  );
};

// ─── Modal de edición ─────────────────────────────────────────────────────────

const EditModal = ({
  canchaId, fecha, horario, slot,
  alumnos, alumnosMap, asistencias,
  onClose, onAgregar, onRemover, onCrearSlot, onRegistrarAsistencia,
  syncing,
}) => {
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState(slot?.tipo || 'membresia');
  const [disciplina, setDisciplina] = useState(slot?.disciplina || 'Futvoley');
  const ids = slot?.alumnos || [];

  const disponibles = alumnos.filter(a =>
    !ids.includes(a.id) &&
    (a.nombre.toLowerCase().includes(search.toLowerCase()) ||
     a.apodos?.some(ap => ap.toLowerCase().includes(search.toLowerCase())))
  );

  const styles = TIPO_STYLES[tipo] || TIPO_STYLES.membresia;

  const estadoBotones = [
    { key: 'asistio',      label: 'Vino ✓',       cls: 'bg-green-500 text-white', clsOff: 'hover:bg-green-50 hover:text-green-700' },
    { key: 'falto',        label: 'No vino',       cls: 'bg-red-500 text-white',   clsOff: 'hover:bg-red-50 hover:text-red-700'   },
    { key: 'vino_no_pago', label: 'Vino sin $',    cls: 'bg-blue-500 text-white',  clsOff: 'hover:bg-blue-50 hover:text-blue-700' },
    { key: 'cambio_turno', label: 'Canceló',       cls: 'bg-amber-500 text-white', clsOff: 'hover:bg-amber-50 hover:text-amber-700' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-on-surface text-lg">
                {CANCHAS.find(c => c.id === canchaId)?.label}
              </h3>
              <DisciplinaIcon disciplina={disciplina} size={20} />
            </div>
            <p className="text-sm text-on-surface-variant">{fecha} · {horario} · {disciplina}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-surface-container transition-colors">
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Disciplina */}
        <div className="mb-4">
          <label className="text-xs font-bold text-outline uppercase mb-2 block">Disciplina</label>
          <div className="grid grid-cols-4 gap-1.5">
            {DISCIPLINAS.map(d => (
              <button
                key={d}
                onClick={() => { setDisciplina(d); onCrearSlot(canchaId, fecha, horario, tipo, d); }}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all border-2 ${
                  disciplina === d
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-transparent bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <DisciplinaIcon disciplina={d} size={22} />
                <span className="leading-tight text-center">{d}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tipo */}
        <div className="mb-4">
          <label className="text-xs font-bold text-outline uppercase mb-2 block">Tipo de clase</label>
          <div className="grid grid-cols-4 gap-1.5">
            {Object.entries(TIPO_STYLES).map(([key, s]) => (
              <button
                key={key}
                onClick={() => { setTipo(key); onCrearSlot(canchaId, fecha, horario, key, disciplina); }}
                className={`py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                  tipo === key ? `${s.bg} border-current ${s.text}` : 'border-transparent bg-surface-container text-on-surface-variant'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Alumnos con asistencia */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-outline uppercase">Alumnos · asistencia</label>
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
              ids.length >= 8 ? 'bg-error/10 text-error' : 'bg-surface-container text-on-surface-variant'
            }`}>{ids.length}/8</span>
          </div>

          {ids.length === 0 ? (
            <p className="text-sm text-on-surface-variant italic py-2">Sin alumnos asignados</p>
          ) : (
            <div className="space-y-1.5">
              {ids.map(id => {
                const alumno = alumnosMap[id];
                const estado = asistencias?.[id]?.[fecha];
                const as = ASIST[estado];
                return (
                  <div key={id} className="bg-surface-container rounded-xl p-2">
                    {/* Nombre + quitar */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${as ? `${as.pill}` : `${styles.bg} ${styles.text}`}`}>
                          {alumno?.nombre?.charAt(0) || '?'}
                        </div>
                        <span className="text-sm font-medium text-on-surface">{alumno?.nombre || id}</span>
                      </div>
                      <button
                        onClick={() => onRemover(canchaId, fecha, horario, id)}
                        disabled={syncing}
                        className="p-1 rounded-lg hover:bg-error/10 text-error/50 hover:text-error transition-colors"
                      >
                        <Icon name="remove_circle" size={16} />
                      </button>
                    </div>
                    {/* Botones de asistencia */}
                    {onRegistrarAsistencia && (
                      <div className="grid grid-cols-4 gap-1">
                        {estadoBotones.map(b => (
                          <button
                            key={b.key}
                            onClick={() => onRegistrarAsistencia(id, fecha, horario, estado === b.key ? null : b.key)}
                            disabled={syncing}
                            className={`text-[9px] font-bold py-1.5 rounded-lg transition-all border ${
                              estado === b.key
                                ? `${b.cls} border-transparent shadow-sm`
                                : `bg-surface-container-high text-on-surface-variant border-transparent ${b.clsOff}`
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
        </div>

        {/* Agregar alumno */}
        {ids.length < 8 && (
          <div>
            <label className="text-xs font-bold text-outline uppercase mb-2 block">Agregar alumno</label>
            <div className="relative mb-2">
              <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full pl-9 pr-4 py-2.5 bg-surface-container rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1">
              {disponibles.slice(0, 8).map(a => (
                <button
                  key={a.id}
                  onClick={() => { onAgregar(canchaId, fecha, horario, a.id); setSearch(''); }}
                  disabled={syncing}
                  className="w-full text-left px-3 py-2 bg-surface-container-high hover:bg-primary/10 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {a.nombre}
                  {a.apodos?.length > 0 && <span className="text-xs text-outline ml-1">"{a.apodos[0]}"</span>}
                </button>
              ))}
              {disponibles.length === 0 && search && (
                <p className="text-sm text-on-surface-variant px-3 py-2">Sin resultados</p>
              )}
            </div>
          </div>
        )}

        {/* Leyenda asistencia */}
        <div className="flex gap-3 flex-wrap pt-4 border-t border-surface-container mt-4">
          {[
            { color: 'bg-green-500',  label: 'Vino y pagó' },
            { color: 'bg-red-500',    label: 'No vino' },
            { color: 'bg-blue-500',   label: 'Vino sin $' },
            { color: 'bg-amber-500',  label: 'Canceló' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1 text-[10px] text-on-surface-variant">
              <span className={`w-2 h-2 rounded-full ${l.color}`}/>
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
  onAgregar,
  onRemover,
  onCrearSlot,
  onRegistrarAsistencia,
  syncing,
}) => {
  const defaultFecha = (() => {
    const hoy = new Date();
    if (hoy.getMonth() + 1 === mesNum && hoy.getFullYear() === anio)
      return `${String(hoy.getDate()).padStart(2,'0')}/${String(mesNum).padStart(2,'0')}`;
    return `01/${String(mesNum).padStart(2,'0')}`;
  })();

  const [fechaSeleccionada, setFechaSeleccionada] = useState(defaultFecha);
  const [soloHorasActivas, setSoloHorasActivas] = useState(true);
  const [modalSlot, setModalSlot] = useState(null);

  const alumnosMap = useMemo(
    () => Object.fromEntries(alumnos.map(a => [a.id, a])),
    [alumnos]
  );

  // Semana actual
  const diasSemana = useMemo(
    () => semanaDelMes(fechaSeleccionada, mesNum, anio),
    [fechaSeleccionada, mesNum, anio]
  );

  // Slots del día indexados por "canchaId|horario"
  const slotsDia = useMemo(() => {
    const map = {};
    ocupacion
      .filter(s => s.fecha === fechaSeleccionada)
      .forEach(s => { map[`${s.canchaId}|${s.horario}`] = s; });
    return map;
  }, [ocupacion, fechaSeleccionada]);

  // Horarios a mostrar — puede ser todos o solo los que tienen actividad
  const horariosVisibles = useMemo(() => {
    if (!soloHorasActivas) return HORARIOS_GRILLA;
    const conActividad = new Set(
      ocupacion
        .filter(s => s.fecha === fechaSeleccionada)
        .map(s => s.horario)
    );
    // Siempre mostrar al menos 17-21
    const base = new Set(['17:00','18:00','19:00','20:00','21:00']);
    return HORARIOS_GRILLA.filter(h => base.has(h) || conActividad.has(h));
  }, [soloHorasActivas, ocupacion, fechaSeleccionada]);

  const openModal = (canchaId, horario) => setModalSlot({ canchaId, horario });
  const closeModal = () => setModalSlot(null);
  const slotModal = modalSlot ? slotsDia[`${modalSlot.canchaId}|${modalSlot.horario}`] || null : null;

  const diaSemana = (() => {
    const [dd, mm] = fechaSeleccionada.split('/').map(Number);
    return DIAS_NOMBRE[new Date(anio, mm - 1, dd).getDay()];
  })();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Canchas</h1>
          <p className="text-on-surface-variant text-sm">{mesActual}</p>
        </div>
        <button
          onClick={() => setSoloHorasActivas(v => !v)}
          className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
            soloHorasActivas
              ? 'bg-primary/10 text-primary'
              : 'bg-surface-container-low text-on-surface-variant'
          }`}
        >
          {soloHorasActivas ? 'Horas activas' : 'Todo el día'}
        </button>
      </div>

      {/* Navegador de semana */}
      <div className="bg-surface-container-lowest rounded-2xl p-3">
        <div className="flex items-center gap-2">
          {/* Semana anterior */}
          <button
            onClick={() => setFechaSeleccionada(f => offsetSemana(f, -1, mesNum, anio))}
            className="p-2 rounded-xl hover:bg-surface-container transition-colors shrink-0"
          >
            <Icon name="chevron_left" size={20} />
          </button>

          {/* Días de la semana */}
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

              // ¿Tiene algún slot ese día?
              const tieneDatos = ocupacion.some(s => s.fecha === fecha);

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

          {/* Semana siguiente */}
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

      {/* Grilla */}
      <div className="overflow-x-auto rounded-2xl">
        <div className="min-w-[480px]">

          {/* Headers canchas con SVG */}
          <div className="grid grid-cols-[52px_1fr_1fr_1fr] gap-2 mb-2 px-1">
            <div />
            {CANCHAS.map(c => (
              <div key={c.id} className="flex flex-col items-center gap-1">
                <div className="w-full h-14 rounded-xl overflow-hidden shadow-sm">
                  <CourtSVG />
                </div>
                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">
                  {c.label}
                </span>
              </div>
            ))}
          </div>

          {/* Filas de horarios */}
          <div className="space-y-1 px-1">
            {horariosVisibles.map(horario => (
              <div key={horario} className="grid grid-cols-[52px_1fr_1fr_1fr] gap-2 items-center">
                <div className="text-right pr-2">
                  <span className="text-[11px] font-bold text-on-surface-variant">{horario}</span>
                </div>
                {CANCHAS.map(c => (
                  <SlotCell
                    key={c.id}
                    slot={slotsDia[`${c.id}|${horario}`]}
                    alumnosMap={alumnosMap}
                    asistencias={asistencias}
                    fecha={fechaSeleccionada}
                    onClick={() => openModal(c.id, horario)}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Leyenda doble: tipo de clase + asistencia */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-4 px-1 pb-1">
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
        </div>
      </div>

      {/* Modal */}
      {modalSlot && (
        <EditModal
          canchaId={modalSlot.canchaId}
          fecha={fechaSeleccionada}
          horario={modalSlot.horario}
          slot={slotModal}
          alumnos={alumnos}
          alumnosMap={alumnosMap}
          asistencias={asistencias}
          onClose={closeModal}
          onAgregar={async (...a) => { await onAgregar(...a); }}
          onRemover={async (...a) => { await onRemover(...a); }}
          onCrearSlot={async (cId, f, h, tipo, disc) => { await onCrearSlot(cId, f, h, { tipo, disciplina: disc }); }}
          onRegistrarAsistencia={onRegistrarAsistencia}
          syncing={syncing}
        />
      )}
    </div>
  );
};

export default GrillaCancha;
