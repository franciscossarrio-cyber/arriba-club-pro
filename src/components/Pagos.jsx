import { useState } from 'react';
import Icon from './Icon';
import { formatMonto, getWhatsAppLink, HORARIOS } from '../utils/helpers';

const PRECIO_SUELTA_DEFAULT = 15000;

const Pagos = ({
  disciplinaActiva,
  mesActual,
  montoCobrado,
  montoPendiente,
  pagosPendientes,
  pagosDisciplina,
  alumnos,
  preciosDisciplina,
  fechasMes,
  onProcesarPago,
  onProcesarSuelta,
  syncing
}) => {
  const [modo, setModo] = useState('membresia'); // 'membresia' | 'suelta'

  // Membresía
  const [inputComando, setInputComando] = useState('');
  const [resultadoComando, setResultadoComando] = useState(null);

  // Clase suelta
  const [sNombre, setSNombre] = useState('');
  const [sFecha, setSFecha] = useState(fechasMes?.[0] || '');
  const [sHorario, setSHorario] = useState(HORARIOS[1] || '18:00');
  const [sMonto, setSMonto] = useState(String(PRECIO_SUELTA_DEFAULT));
  const [resultadoSuelta, setResultadoSuelta] = useState(null);

  const handleProcesarMembresia = async () => {
    const resultado = await onProcesarPago(inputComando);
    setResultadoComando(resultado);
    if (resultado.success) setInputComando('');
  };

  const handleProcesarClaseSuelta = async () => {
    if (!sNombre.trim() || !sFecha || !sHorario) {
      setResultadoSuelta({ success: false, mensaje: 'Completá nombre, fecha y horario' });
      return;
    }
    const resultado = await onProcesarSuelta(sNombre, sFecha, sHorario, parseInt(sMonto) || PRECIO_SUELTA_DEFAULT);
    setResultadoSuelta(resultado);
    if (resultado.success) setSNombre('');
  };

  const pagosPagados = pagosDisciplina.filter(p => p.estado === 'Pagado');
  const pagosSueltos = pagosPagados.filter(p => p.tipo === 'suelta');
  const pagosMembresia = pagosPagados.filter(p => p.tipo !== 'suelta');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-on-surface tracking-tight">Pagos</h1>
        <p className="text-on-surface-variant">{disciplinaActiva} • {mesActual}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-success/10 p-5 rounded-2xl">
          <p className="text-success text-xs font-bold uppercase">Cobrado</p>
          <p className="text-2xl font-black text-success">{formatMonto(montoCobrado)}</p>
        </div>
        <div className="bg-warning/10 p-5 rounded-2xl">
          <p className="text-warning text-xs font-bold uppercase">Pendiente</p>
          <p className="text-2xl font-black text-warning">{formatMonto(montoPendiente)}</p>
        </div>
      </div>

      {/* Registro rápido */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => { setModo('membresia'); setResultadoComando(null); setResultadoSuelta(null); }}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              modo === 'membresia'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            Membresía
          </button>
          <button
            onClick={() => { setModo('suelta'); setResultadoComando(null); setResultadoSuelta(null); }}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              modo === 'suelta'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            Clase Suelta
          </button>
        </div>

        {modo === 'membresia' ? (
          <>
            <p className="text-xs text-on-surface-variant">Nombre o apodo del alumno y presioná Enter</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputComando}
                onChange={(e) => setInputComando(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleProcesarMembresia()}
                placeholder="ej: Juan, Mati, Tina..."
                className="flex-1 px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl focus:border-primary text-on-surface"
              />
              <button
                onClick={handleProcesarMembresia}
                disabled={syncing || !inputComando.trim()}
                className="px-6 py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-bold disabled:opacity-50"
              >
                {syncing
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full spinner" />
                  : <Icon name="add" size={20} />}
              </button>
            </div>
            {resultadoComando && (
              <div className={`p-3 rounded-xl flex items-center gap-2 ${resultadoComando.success ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                <Icon name={resultadoComando.success ? 'check_circle' : 'error'} size={20} />
                <span className="font-medium">{resultadoComando.mensaje}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-xs text-on-surface-variant">Registrá una clase suelta — el alumno se agrega al slot de cancha automáticamente</p>
            <input
              type="text"
              value={sNombre}
              onChange={(e) => setSNombre(e.target.value)}
              placeholder="Nombre o apodo del alumno"
              className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl focus:border-amber-500 text-on-surface"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={sFecha}
                onChange={(e) => setSFecha(e.target.value)}
                className="px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl text-on-surface"
              >
                {(fechasMes || []).map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <select
                value={sHorario}
                onChange={(e) => setSHorario(e.target.value)}
                className="px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl text-on-surface"
              >
                {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline text-sm font-bold">$</span>
                <input
                  type="number"
                  value={sMonto}
                  onChange={(e) => setSMonto(e.target.value)}
                  placeholder="Monto"
                  className="w-full pl-8 pr-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl focus:border-amber-500 text-on-surface"
                />
              </div>
              <button
                onClick={handleProcesarClaseSuelta}
                disabled={syncing || !sNombre.trim()}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold disabled:opacity-50 transition-colors"
              >
                {syncing
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full spinner" />
                  : <Icon name="add" size={20} />}
              </button>
            </div>
            {resultadoSuelta && (
              <div className={`p-3 rounded-xl flex items-center gap-2 ${resultadoSuelta.success ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                <Icon name={resultadoSuelta.success ? 'check_circle' : 'error'} size={20} />
                <span className="font-medium">{resultadoSuelta.mensaje}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pending Payments */}
      {pagosPendientes.length > 0 && (
        <div className="bg-surface-container-lowest rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-surface-container flex items-center justify-between">
            <h3 className="font-bold text-on-surface flex items-center gap-2">
              <Icon name="warning" className="text-warning" size={20} />
              Pendientes de Pago ({pagosPendientes.length})
            </h3>
          </div>
          <div className="divide-y divide-surface-container">
            {pagosPendientes.map(alumno => (
              <div key={alumno.id} className="flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                    <span className="text-warning font-bold">{alumno.nombre.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-on-surface">{alumno.nombre}</p>
                    <p className="text-xs text-on-surface-variant">{alumno.plan} • {alumno.frecuencia}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-warning">{formatMonto(preciosDisciplina[alumno.plan]?.[alumno.frecuencia] || 95000)}</p>
                  {alumno.telefono && (
                    <a
                      href={getWhatsAppLink(alumno, mesActual, preciosDisciplina)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-xl bg-green-500 hover:bg-green-600 flex items-center justify-center text-white transition-colors shadow-lg shadow-green-500/30"
                      title="Enviar recordatorio por WhatsApp"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Membresía payments list */}
      <div className="bg-surface-container-lowest rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-surface-container">
          <h3 className="font-bold text-on-surface flex items-center gap-2">
            <Icon name="check_circle" className="text-success" size={20} />
            Membresías ({pagosMembresia.length})
          </h3>
        </div>
        <div className="divide-y divide-surface-container">
          {pagosMembresia.map((pago, i) => {
            const alumno = alumnos.find(a => a.id === pago.alumnoId);
            return (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <Icon name="check" className="text-success" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-on-surface">{alumno?.nombre || pago.nombre || 'Alumno'}</p>
                    <p className="text-xs text-on-surface-variant">{pago.metodo || 'EFT'}</p>
                  </div>
                </div>
                <p className="font-bold text-success">{formatMonto(pago.monto)}</p>
              </div>
            );
          })}
          {pagosMembresia.length === 0 && (
            <div className="p-8 text-center text-on-surface-variant">No hay membresías registradas este mes</div>
          )}
        </div>
      </div>

      {/* Clases sueltas list */}
      {pagosSueltos.length > 0 && (
        <div className="bg-surface-container-lowest rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-surface-container">
            <h3 className="font-bold text-on-surface flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              Clases Sueltas ({pagosSueltos.length})
            </h3>
          </div>
          <div className="divide-y divide-surface-container">
            {pagosSueltos.map((pago, i) => {
              const alumno = alumnos.find(a => a.id === pago.alumnoId);
              return (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Icon name="bolt" className="text-amber-600" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-on-surface">{alumno?.nombre || pago.nombre || 'Alumno'}</p>
                      <p className="text-xs text-on-surface-variant">{pago.fecha} • {pago.horario}</p>
                    </div>
                  </div>
                  <p className="font-bold text-amber-600">{formatMonto(pago.monto)}</p>
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
