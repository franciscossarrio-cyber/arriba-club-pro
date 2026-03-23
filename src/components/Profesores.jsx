import { useState } from 'react';
import Icon from './Icon';
import { HORARIOS, formatMonto } from '../utils/helpers';

const Profesores = ({
  disciplinaActiva,
  mesActual,
  fechasClase,
  profesores,
  clasesPorProfe,
  datosProfes,
  onGuardarProfe,
  onEliminarProfe,
  onAsignarClase,
  syncing
}) => {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevoProfe, setNuevoProfe] = useState({ nombre: '', cbu: '' });

  const handleGuardar = () => {
    if (nuevoProfe.nombre) {
      onGuardarProfe(nuevoProfe);
      setMostrarForm(false);
      setNuevoProfe({ nombre: '', cbu: '' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Profesores</h1>
          <p className="text-on-surface-variant">{disciplinaActiva} • {mesActual}</p>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-full shadow-lg"
        >
          <Icon name="person_add" size={20} />
          <span className="text-sm">Nuevo Profesor</span>
        </button>
      </div>

      {/* Payout Summary */}
      <div className="bg-gradient-to-br from-primary to-primary-container rounded-3xl p-6 text-white">
        <p className="text-white/70 text-sm font-medium mb-1">Total a Repartir (50%)</p>
        <p className="text-3xl font-black">{formatMonto(datosProfes.totalParaProfes)}</p>
        <p className="text-white/70 text-xs mt-2">{datosProfes.totalClases} clases asignadas</p>
      </div>

      {/* Professors List */}
      <div className="space-y-4">
        {datosProfes.pagosProfes.map(profe => (
          <div key={profe.id} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-on-surface">{profe.nombre}</h3>
                <p className="text-sm text-on-surface-variant">{profe.cbu || 'Sin CBU'}</p>
              </div>
              <button
                onClick={() => onEliminarProfe(profe.id)}
                className="p-2 hover:bg-error/10 rounded-lg text-error transition-colors"
              >
                <Icon name="delete" size={20} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-container-low p-3 rounded-xl text-center">
                <p className="text-2xl font-black text-primary">{profe.clasesDadas}</p>
                <p className="text-[10px] text-outline font-bold uppercase">Clases</p>
              </div>
              <div className="bg-surface-container-low p-3 rounded-xl text-center">
                <p className="text-2xl font-black text-secondary">{profe.porcentaje}%</p>
                <p className="text-[10px] text-outline font-bold uppercase">Porcentaje</p>
              </div>
              <div className="bg-success/10 p-3 rounded-xl text-center">
                <p className="text-xl font-black text-success">{formatMonto(profe.pago)}</p>
                <p className="text-[10px] text-success font-bold uppercase">A Pagar</p>
              </div>
            </div>
          </div>
        ))}
        
        {profesores.length === 0 && (
          <div className="bg-surface-container-lowest rounded-2xl p-8 text-center">
            <Icon name="person_off" className="text-outline mx-auto mb-2" size={40} />
            <p className="text-on-surface-variant">No hay profesores registrados</p>
          </div>
        )}
      </div>

      {/* Class Assignment */}
      <div className="bg-surface-container-lowest rounded-3xl p-6">
        <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
          <Icon name="calendar_month" className="text-primary" size={20} />
          Asignación de Clases
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {fechasClase.map(fecha => (
            <div key={fecha} className="bg-surface-container-low rounded-xl p-3">
              <p className="font-bold text-on-surface mb-3 text-center border-b border-surface-container pb-2">{fecha}</p>
              <div className="space-y-2">
                {HORARIOS.map(horario => (
                  <div key={`${fecha}-${horario}`} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-on-surface-variant w-12">{horario}</span>
                    <select
                      value={clasesPorProfe[`${disciplinaActiva}-${fecha}-${horario}`] || ''}
                      onChange={(e) => onAsignarClase(fecha, horario, e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-surface-container-lowest border border-surface-container rounded-lg text-xs"
                    >
                      <option value="">--</option>
                      {profesores.filter(p => p.estado === 'Activo').map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Professor Modal */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setMostrarForm(false)}>
          <div className="bg-surface-container-lowest rounded-3xl p-6 w-full max-w-md shadow-2xl fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-on-surface mb-6">Nuevo Profesor</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={nuevoProfe.nombre}
                onChange={(e) => setNuevoProfe({ ...nuevoProfe, nombre: e.target.value })}
                placeholder="Nombre completo"
                className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl focus:border-primary"
              />
              <input
                type="text"
                value={nuevoProfe.cbu}
                onChange={(e) => setNuevoProfe({ ...nuevoProfe, cbu: e.target.value })}
                placeholder="CBU / Alias"
                className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl focus:border-primary"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setMostrarForm(false)} className="flex-1 py-3 bg-surface-container-high rounded-xl font-medium text-on-surface-variant">
                Cancelar
              </button>
              <button onClick={handleGuardar} className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-bold">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profesores;
