import { useState } from 'react';
import Icon from './Icon';
import { TIPOS_MEMBRESIA } from '../utils/helpers';

const PERSONAS = [1, 2, 3, 4];
const FRECUENCIAS = [
  { key: '1x sem', label: '1x semana' },
  { key: '2x sem', label: '2x semana' },
];

const Configuracion = ({
  disciplinaActiva,
  mesActual,
  precios,
  onUpdatePrecios,
  preciosQR = {},
  onUpdatePreciosQR,
  preciosTipos = {},
  onUpdatePrecioTipo,
  preciosPrivadas = {},
  onUpdatePreciosPrivadas,
}) => {
  const [editando, setEditando] = useState(false);

  const planes = ['Arena Basic', 'Arena Plus', 'Arena Premium'];
  const colores = {
    'Arena Basic':   'border-outline/20 bg-surface-container-low',
    'Arena Plus':    'border-primary/20 bg-primary/5',
    'Arena Premium': 'border-secondary/20 bg-secondary/5',
  };

  const inputCls = (active) =>
    `w-full px-3 py-2 rounded-xl border-2 text-right text-sm transition-colors outline-none
    ${active
      ? 'bg-surface-container-lowest border-transparent focus:border-primary cursor-text'
      : 'bg-surface-container border-transparent text-on-surface-variant cursor-default select-none'}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Configuración</h1>
          <p className="text-on-surface-variant text-sm">{disciplinaActiva} · {mesActual}</p>
        </div>
        <button
          onClick={() => setEditando(v => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            editando
              ? 'bg-success text-white'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <Icon name={editando ? 'check' : 'edit'} size={16} />
          {editando ? 'Listo' : 'Editar'}
        </button>
      </div>

      {/* Membresías — EFT y QR por plan */}
      <div className="space-y-4">
        {planes.map(plan => (
          <div key={plan} className={`rounded-2xl p-5 border-2 ${colores[plan]}`}>
            <h4 className="font-bold text-on-surface mb-4">{plan}</h4>
            {/* Header columnas */}
            <div className="grid grid-cols-3 gap-3 mb-2">
              <span />
              <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant text-right">Efectivo</span>
              <span className="text-xs font-bold uppercase tracking-wide text-indigo-600 text-right">QR / MP</span>
            </div>
            {FRECUENCIAS.map(({ key, label }) => (
              <div key={key} className="grid grid-cols-3 gap-3 mb-2 items-center">
                <label className="text-xs font-semibold text-on-surface-variant">{label}</label>
                <div className="flex items-center gap-1">
                  <span className="text-on-surface-variant text-sm flex-shrink-0">$</span>
                  <input
                    type="number"
                    disabled={!editando}
                    value={precios[disciplinaActiva]?.[plan]?.[key] || ''}
                    onChange={(e) => onUpdatePrecios(disciplinaActiva, plan, key, e.target.value)}
                    className={inputCls(editando)}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-indigo-400 text-sm flex-shrink-0">$</span>
                  <input
                    type="number"
                    disabled={!editando}
                    value={preciosQR[disciplinaActiva]?.[plan]?.[key] || ''}
                    onChange={(e) => onUpdatePreciosQR(disciplinaActiva, plan, key, e.target.value)}
                    className={inputCls(editando)}
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Tipos de Membresía (precio único, sin privadas) */}
      <div>
        <h2 className="text-lg font-bold text-on-surface mb-3">Tipos de Clase</h2>
        <div className="space-y-2">
          {TIPOS_MEMBRESIA.filter(t => t !== 'Clases privadas').map(tipo => (
            <div key={tipo} className="rounded-2xl px-4 py-3 border-2 border-outline/10 bg-surface-container-low flex items-center justify-between gap-4">
              <span className="font-medium text-on-surface text-sm">{tipo}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-on-surface-variant text-sm">$</span>
                <input
                  type="number"
                  disabled={!editando}
                  value={preciosTipos[disciplinaActiva]?.[tipo] ?? ''}
                  onChange={(e) => onUpdatePrecioTipo(disciplinaActiva, tipo, e.target.value)}
                  className={`w-32 px-3 py-2 rounded-xl border-2 text-right text-sm transition-colors outline-none ${
                    editando
                      ? 'bg-surface-container-lowest border-transparent focus:border-primary'
                      : 'bg-surface-container border-transparent text-on-surface-variant cursor-default'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clases Privadas / Semi-privadas — EFT y QR */}
      <div>
        <h2 className="text-lg font-bold text-on-surface mb-1">Clases Privadas</h2>
        <p className="text-xs text-on-surface-variant mb-3">{disciplinaActiva} · precio por persona</p>
        <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/50 overflow-hidden">
          <div className="grid grid-cols-3 px-4 py-2 border-b border-purple-100">
            <span className="text-xs font-bold uppercase tracking-wide text-purple-700">Personas</span>
            <span className="text-xs font-bold uppercase tracking-wide text-purple-700 text-right">Efectivo</span>
            <span className="text-xs font-bold uppercase tracking-wide text-purple-700 text-right">QR / MP</span>
          </div>
          {PERSONAS.map((n, i) => (
            <div key={n} className={`grid grid-cols-3 items-center px-4 py-3 gap-3 ${i < PERSONAS.length - 1 ? 'border-b border-purple-100' : ''}`}>
              <span className="font-semibold text-on-surface text-sm">{n} {n === 1 ? 'persona' : 'personas'}</span>
              {['Efectivo', 'Transferencia'].map(metodo => (
                <div key={metodo} className="flex items-center gap-1 justify-end">
                  <span className="text-on-surface-variant text-sm">$</span>
                  <input
                    type="number"
                    disabled={!editando}
                    value={preciosPrivadas[disciplinaActiva]?.[`privada_${n}p`]?.[metodo] ?? ''}
                    onChange={(e) => onUpdatePreciosPrivadas(disciplinaActiva, n, metodo, e.target.value)}
                    className={`w-28 px-3 py-2 rounded-xl border-2 text-right text-sm transition-colors outline-none ${
                      editando
                        ? 'bg-surface-container-lowest border-transparent focus:border-purple-400'
                        : 'bg-purple-50 border-transparent text-purple-900 cursor-default'
                    }`}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={`rounded-2xl p-4 flex items-center gap-3 transition-colors ${
        editando ? 'bg-amber-50' : 'bg-success/10'
      }`}>
        <Icon name={editando ? 'edit' : 'check_circle'} className={editando ? 'text-amber-600' : 'text-success'} filled />
        <p className={`text-sm font-medium ${editando ? 'text-amber-700' : 'text-success'}`}>
          {editando ? 'Editando precios — los cambios se guardan automáticamente' : 'Tocá Editar para modificar precios'}
        </p>
      </div>
    </div>
  );
};

export default Configuracion;
