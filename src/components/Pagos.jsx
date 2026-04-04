import { useState, useEffect } from 'react';
import Icon from './Icon';
import { formatMonto, getWhatsAppLink, HORARIOS } from '../utils/helpers';

const TIPOS_PAGO = [
  { id: 'suelta',   label: 'Clase Suelta',    color: 'text-amber-600',  dot: 'bg-amber-500' },
  { id: 'dayuse',   label: 'Day Use',          color: 'text-orange-600', dot: 'bg-orange-500' },
  { id: 'privada',  label: 'Clase Privada',   color: 'text-purple-600', dot: 'bg-purple-500' },
  { id: 'prueba',   label: 'Clase de Prueba', color: 'text-teal-600',   dot: 'bg-teal-500' },
  { id: 'membresia',label: 'Membresía',        color: 'text-primary',    dot: 'bg-primary' },
];

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
  // ── Form colapsable ───────────────────────────────────────────────────────
  const [formAbierto, setFormAbierto] = useState(false);
  const [tipo, setTipo] = useState('suelta');
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState(fechasMes?.[0] || '');
  const [horario, setHorario] = useState(HORARIOS[1] || '18:00');
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState('Efectivo');
  const [resultado, setResultado] = useState(null);

  // Pre-cargar precio al cambiar tipo
  useEffect(() => {
    const map = {
      suelta:   preciosTiposActivos['Clases sueltas']  || 0,
      dayuse:   preciosTiposActivos['Day Use']          || 0,
      privada:  preciosTiposActivos['Clases privadas']  || 0,
      prueba:   preciosTiposActivos['Clase de prueba']  || 0,
    };
    if (tipo !== 'membresia') setMonto(String(map[tipo] || ''));
  }, [tipo, preciosTiposActivos]);

  const handleSubmit = async () => {
    if (!nombre.trim()) return;
    let res;
    if (tipo === 'membresia') res = await onProcesarPago(nombre, metodo);
    else if (tipo === 'suelta') res = await onProcesarSuelta(nombre, fecha, horario, parseInt(monto) || 0, metodo);
    else if (tipo === 'dayuse') res = await onProcesarDayUse(nombre, fecha, horario, parseInt(monto) || 0, metodo);
    else if (tipo === 'privada') res = await onProcesarPrivada(nombre, fecha, horario, parseInt(monto) || 0, metodo);
    else if (tipo === 'prueba') res = await onProcesarPrueba(nombre, fecha, horario, parseInt(monto) || 0, metodo);
    setResultado(res);
    if (res?.success) { setNombre(''); setFormAbierto(false); }
  };

  // ── Pago inline en pendientes ─────────────────────────────────────────────
  const [pagoActivoId, setPagoActivoId] = useState(null);
  const [metodoPago, setMetodoPago] = useState('Efectivo');

  const abrirPago = (id) => { setPagoActivoId(id); setMetodoPago('Efectivo'); };
  const cerrarPago = () => setPagoActivoId(null);

  const confirmarPagoMembresia = async (alumno) => {
    await onPagarMembresia(alumno, metodoPago);
    cerrarPago();
  };

  const confirmarMarcarPagado = async (pago) => {
    if (pago.virtual) {
      await onPagarSueltaVirtual(pago, metodoPago);
    } else {
      await onMarcarPagado(pago.id, metodoPago);
    }
    cerrarPago();
  };

  // ── Listas de pagados ─────────────────────────────────────────────────────
  const pagosPagados = pagosDisciplina.filter(p => p.estado === 'Pagado');
  const pagosSueltos   = pagosPagados.filter(p => p.tipo === 'suelta');
  const pagosPrivados  = pagosPagados.filter(p => p.tipo === 'privada');
  const pagosPrueba    = pagosPagados.filter(p => p.tipo === 'prueba');
  const pagosDayUse    = pagosPagados.filter(p => p.tipo === 'dayuse');
  const pagosMembresia = pagosPagados.filter(p => !['suelta', 'privada', 'prueba', 'dayuse'].includes(p.tipo));

  const totalPendientes = pagosPendientes.length + pagosSueltasPendientes.length;

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

      {/* ── Formulario colapsable ── */}
      <div className="bg-surface-container-lowest rounded-2xl overflow-hidden">
        <button
          onClick={() => { setFormAbierto(v => !v); setResultado(null); }}
          className="w-full flex items-center justify-between px-4 py-3 font-bold text-on-surface"
        >
          <span className="flex items-center gap-2">
            <Icon name="add_circle" className="text-primary" size={20} />
            Registrar pago
          </span>
          <Icon name={formAbierto ? 'expand_less' : 'expand_more'} size={20} className="text-outline" />
        </button>

        {formAbierto && (
          <div className="px-4 pb-4 space-y-3 border-t border-surface-container">
            {/* Tipo */}
            <select
              value={tipo}
              onChange={e => { setTipo(e.target.value); setResultado(null); }}
              className="w-full mt-3 px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl font-medium"
            >
              {TIPOS_PAGO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>

            {/* Alumno */}
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Nombre o apodo del alumno"
              className="w-full px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl focus:border-primary"
            />

            {/* Fecha + Horario (no para membresía) */}
            {tipo !== 'membresia' && (
              <div className="grid grid-cols-2 gap-2">
                <select value={fecha} onChange={e => setFecha(e.target.value)} className="px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl">
                  {(fechasMes || []).map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <select value={horario} onChange={e => setHorario(e.target.value)} className="px-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl">
                  {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            )}

            {/* Monto (no para membresía — se calcula del plan) */}
            {tipo !== 'membresia' && (
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline font-bold text-sm">$</span>
                <input
                  type="number"
                  value={monto}
                  onChange={e => setMonto(e.target.value)}
                  placeholder="Monto"
                  className="w-full pl-8 pr-4 py-3 bg-surface-container-high border-2 border-transparent rounded-xl focus:border-primary"
                />
              </div>
            )}

            {/* Forma de pago */}
            <div className="flex gap-2">
              {['Efectivo', 'Transferencia'].map(m => (
                <button key={m} type="button" onClick={() => setMetodo(m)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                    metodo === m ? 'bg-on-surface text-surface shadow-sm' : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >{m}</button>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={syncing || !nombre.trim()}
              className="w-full py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-bold disabled:opacity-50"
            >
              {syncing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full spinner mx-auto" /> : 'Guardar'}
            </button>

            {resultado && (
              <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${resultado.success ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                <Icon name={resultado.success ? 'check_circle' : 'error'} size={18} />
                <span className="font-medium">{resultado.mensaje}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Pendientes ── */}
      {totalPendientes > 0 && (
        <div className="bg-surface-container-lowest rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-surface-container">
            <h3 className="font-bold text-on-surface flex items-center gap-2">
              <Icon name="warning" className="text-warning" size={20} />
              Pendientes de pago ({totalPendientes})
            </h3>
          </div>
          <div className="divide-y divide-surface-container">

            {/* Membresías pendientes */}
            {pagosPendientes.map(alumno => (
              <div key={alumno.id} className="p-4">
                <div className="flex items-center justify-between">
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
                    <p className="font-bold text-warning">{formatMonto(preciosDisciplina[alumno.plan]?.[alumno.frecuencia] || 0)}</p>
                    {alumno.telefono && (
                      <a href={getWhatsAppLink(alumno, mesActual, preciosDisciplina)} target="_blank" rel="noopener noreferrer"
                        className="w-9 h-9 rounded-xl bg-green-500 hover:bg-green-600 flex items-center justify-center text-white transition-colors">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </a>
                    )}
                    <button onClick={() => abrirPago(alumno.id)}
                      className="px-3 py-1.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
                      Pagar
                    </button>
                  </div>
                </div>
                {/* Panel inline de pago */}
                {pagoActivoId === alumno.id && (
                  <div className="mt-3 p-3 bg-surface-container rounded-xl space-y-2">
                    <p className="text-xs font-bold text-on-surface-variant uppercase">Forma de pago</p>
                    <div className="flex gap-2">
                      {['Efectivo', 'Transferencia'].map(m => (
                        <button key={m} onClick={() => setMetodoPago(m)}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                            metodoPago === m ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'
                          }`}>{m}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={cerrarPago} className="flex-1 py-2 rounded-lg text-sm font-medium bg-surface-container-high text-on-surface-variant">Cancelar</button>
                      <button onClick={() => confirmarPagoMembresia(alumno)} disabled={syncing}
                        className="flex-1 py-2 rounded-lg text-sm font-bold bg-success text-white disabled:opacity-50">
                        {syncing ? '...' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Clases sueltas / Day Use pendientes */}
            {pagosSueltasPendientes.map(pago => {
              const alumno = alumnos.find(a => a.id === pago.alumnoId);
              const tipoInfo = TIPOS_PAGO.find(t => t.id === pago.tipo) || TIPOS_PAGO[0];
              return (
                <div key={pago.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                        <span className="text-warning font-bold">{(alumno?.nombre || pago.nombre || '?').charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-on-surface">{alumno?.nombre || pago.nombre || 'Alumno'}</p>
                        <p className={`text-xs font-bold ${tipoInfo.color}`}>
                          {pago.esExtra ? 'Clase extra (fuera de plan)' : tipoInfo.label}
                          {pago.virtual && !pago.esExtra ? ' · sin registrar' : ''}
                          {' • '}{pago.fecha}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-warning">{formatMonto(pago.monto)}</p>
                      {!pago.virtual && (
                        <button onClick={() => onCancelarSuelta(pago.id)} disabled={syncing}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-error/10 text-outline hover:text-error transition-colors"
                          title="Cancelar deuda">
                          <Icon name="close" size={16} />
                        </button>
                      )}
                      <button onClick={() => abrirPago(pago.id)}
                        className="px-3 py-1.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
                        Pagar
                      </button>
                    </div>
                  </div>
                  {pagoActivoId === pago.id && (
                    <div className="mt-3 p-3 bg-surface-container rounded-xl space-y-2">
                      <p className="text-xs font-bold text-on-surface-variant uppercase">Forma de pago</p>
                      <div className="flex gap-2">
                        {['Efectivo', 'Transferencia'].map(m => (
                          <button key={m} onClick={() => setMetodoPago(m)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                              metodoPago === m ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'
                            }`}>{m}</button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={cerrarPago} className="flex-1 py-2 rounded-lg text-sm font-medium bg-surface-container-high text-on-surface-variant">Cancelar</button>
                        <button onClick={() => confirmarMarcarPagado(pago)} disabled={syncing}
                          className="flex-1 py-2 rounded-lg text-sm font-bold bg-success text-white disabled:opacity-50">
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

      {/* ── Pagados ── */}
      {/* Membresías */}
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
                    <p className="text-xs text-on-surface-variant">{pago.metodo || 'Efectivo'}</p>
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

      {/* Clases sueltas */}
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
                      <p className="text-xs text-on-surface-variant">{pago.fecha} • {pago.metodo || 'Efectivo'}</p>
                    </div>
                  </div>
                  <p className="font-bold text-amber-600">{formatMonto(pago.monto)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day Use */}
      {pagosDayUse.length > 0 && (
        <div className="bg-surface-container-lowest rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-surface-container">
            <h3 className="font-bold text-on-surface flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
              Day Use ({pagosDayUse.length})
            </h3>
          </div>
          <div className="divide-y divide-surface-container">
            {pagosDayUse.map((pago, i) => {
              const alumno = alumnos.find(a => a.id === pago.alumnoId);
              return (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <Icon name="wb_sunny" className="text-orange-600" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-on-surface">{alumno?.nombre || pago.nombre || 'Alumno'}</p>
                      <p className="text-xs text-on-surface-variant">{pago.fecha} • {pago.metodo || 'Efectivo'}</p>
                    </div>
                  </div>
                  <p className="font-bold text-orange-600">{formatMonto(pago.monto)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clases privadas */}
      {pagosPrivados.length > 0 && (
        <div className="bg-surface-container-lowest rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-surface-container">
            <h3 className="font-bold text-on-surface flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
              Clases Privadas ({pagosPrivados.length})
            </h3>
          </div>
          <div className="divide-y divide-surface-container">
            {pagosPrivados.map((pago, i) => {
              const alumno = alumnos.find(a => a.id === pago.alumnoId);
              return (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Icon name="person" className="text-purple-600" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-on-surface">{alumno?.nombre || pago.nombre || 'Alumno'}</p>
                      <p className="text-xs text-on-surface-variant">{pago.fecha} • {pago.metodo || 'Efectivo'}</p>
                    </div>
                  </div>
                  <p className="font-bold text-purple-600">{formatMonto(pago.monto)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clases de prueba */}
      {pagosPrueba.length > 0 && (
        <div className="bg-surface-container-lowest rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-surface-container">
            <h3 className="font-bold text-on-surface flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-teal-500 inline-block" />
              Clases de Prueba ({pagosPrueba.length})
            </h3>
          </div>
          <div className="divide-y divide-surface-container">
            {pagosPrueba.map((pago, i) => {
              const alumno = alumnos.find(a => a.id === pago.alumnoId);
              return (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                      <Icon name="science" className="text-teal-600" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-on-surface">{alumno?.nombre || pago.nombre || 'Alumno'}</p>
                      <p className="text-xs text-on-surface-variant">{pago.fecha} • {pago.metodo || 'Efectivo'}</p>
                    </div>
                  </div>
                  <p className="font-bold text-teal-600">{formatMonto(pago.monto)}</p>
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
