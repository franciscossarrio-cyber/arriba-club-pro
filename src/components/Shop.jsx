import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import Icon from './Icon';
import { formatMonto } from '../utils/helpers';
import { functions } from '../firebase/config';
import { generarFacturaPDF, imprimirRecibo80mm } from '../utils/facturasPDF';
import {
  getProductos, addProducto, updateProducto, deleteProducto,
  getFacturas, addFactura,
  getConfigArca, setConfigArca,
} from '../firebase/firestore';

const fnGenerarCSR    = httpsCallable(functions, 'generarCSR');
const fnEmitirFactura = httpsCallable(functions, 'emitirFactura');

const CATEGORIAS  = ['General', 'Indumentaria', 'Equipamiento', 'Bebidas', 'Suplementos', 'Servicios', 'Otro'];
const IVA_OPCIONES = [0, 10.5, 21, 27];
const ivaIdMap = (pct) => ({ 0: 3, 10.5: 4, 21: 5, 27: 6 }[pct] ?? 5);

const TABS = [
  { id: 'cobrar',   icon: 'point_of_sale', label: 'Cobrar'      },
  { id: 'productos',icon: 'inventory_2',   label: 'Productos'   },
  { id: 'historial',icon: 'history',       label: 'Historial'   },
  { id: 'config',   icon: 'key',           label: 'Config ARCA' },
];

const PRODUCTO_VACIO = { nombre: '', precio: '', iva: 21, categoria: 'General', descripcion: '' };

const ESTADO_LABEL = { enviada: 'Emitida', borrador: 'Borrador', error: 'Error' };
const ESTADO_COLOR = {
  enviada: 'bg-success/10 text-success',
  borrador:'bg-amber-100 text-amber-700',
  error:   'bg-error/10 text-error',
};

// ─── Componente principal ──────────────────────────────────────────────────────
const Shop = () => {
  const [tab, setTab] = useState('cobrar');
  const [loading, setLoading] = useState(true);

  const [productos,  setProductos]      = useState([]);
  const [facturas,   setFacturas]       = useState([]);

  // Carrito
  const [items,      setItems]          = useState([]);
  const [cobrando,   setCobrando]       = useState(false);

  // Producto form
  const [showForm,      setShowForm]    = useState(false);
  const [editingId,     setEditingId]   = useState(null);
  const [productoForm,  setProductoForm]= useState(PRODUCTO_VACIO);
  const [saving,        setSaving]      = useState(false);

  // Modal de resultado
  const [facturaModal, setFacturaModal] = useState(null);

  // Retry desde historial
  const [enviando, setEnviando] = useState(false);

  // Config ARCA
  const [arcaForm,     setArcaForm]     = useState({ cuit: '', ptoVta: 1, cert: '', key: '' });
  const [arcaSaved,    setArcaSaved]    = useState(false);
  const [arcaSaving,   setArcaSaving]   = useState(false);
  const [csrGenerando, setCsrGenerando] = useState(false);
  const [csrResultado, setCsrResultado] = useState(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, facts, cfg] = await Promise.all([getProductos(), getFacturas(), getConfigArca()]);
      setProductos(prods);
      setFacturas(facts);
      if (cfg) setArcaForm(f => ({ ...f, ...cfg }));
    } catch (err) {
      console.error('Shop load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Carrito ────────────────────────────────────────────────────────────────
  const addItem = (producto) => {
    setItems(prev => {
      const existing = prev.find(i => i.productoId === producto.id);
      if (existing) return prev.map(i => i.productoId === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { productoId: producto.id, nombre: producto.nombre, precio: producto.precio, iva: producto.iva ?? 21, cantidad: 1 }];
    });
  };

  const setItemCantidad = (productoId, cantidad) => {
    if (cantidad <= 0) setItems(prev => prev.filter(i => i.productoId !== productoId));
    else setItems(prev => prev.map(i => i.productoId === productoId ? { ...i, cantidad } : i));
  };

  const calcTotales = (itemList = items) => {
    let neto = 0, ivaTotal = 0;
    itemList.forEach(({ precio, cantidad, iva }) => {
      const sub  = precio * cantidad;
      const rate = iva / 100;
      const n    = sub / (1 + rate);
      neto     += n;
      ivaTotal += sub - n;
    });
    return { neto, ivaTotal, total: neto + ivaTotal };
  };

  const buildArcaPayload = (totales, itemList = items, ptoVta = arcaForm.ptoVta) => {
    const ivaMap = {};
    itemList.forEach(({ precio, cantidad, iva }) => {
      const sub  = precio * cantidad;
      const rate = iva / 100;
      const n    = sub / (1 + rate);
      if (!ivaMap[iva]) ivaMap[iva] = { Id: ivaIdMap(iva), BaseImp: 0, Importe: 0 };
      ivaMap[iva].BaseImp += n;
      ivaMap[iva].Importe += sub - n;
    });
    return {
      PtoVta:     ptoVta || 1,
      CbteTipo:   6,
      Concepto:   1,
      DocTipo:    99,
      DocNro:     0,
      CbteFch:    new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      ImpTotal:   parseFloat(totales.total.toFixed(2)),
      ImpNeto:    parseFloat(totales.neto.toFixed(2)),
      ImpIVA:     parseFloat(totales.ivaTotal.toFixed(2)),
      ImpTotConc: 0, ImpOpEx: 0, ImpTrib: 0,
      MonId:      'PES', MonCotiz: 1,
      Iva: Object.values(ivaMap).map(v => ({
        ...v,
        BaseImp: parseFloat(v.BaseImp.toFixed(2)),
        Importe: parseFloat(v.Importe.toFixed(2)),
      })),
    };
  };

  // ── Cobrar (genera + envía a AFIP en un solo paso) ─────────────────────────
  const handleCobrar = async () => {
    if (items.length === 0) return;
    setCobrando(true);
    const snapshot = [...items];
    const totales  = calcTotales(snapshot);
    try {
      const factura = {
        fecha:       new Date().toLocaleDateString('es-AR'),
        cliente:     { nombre: 'Consumidor Final', tipoDoc: 99, docNum: '' },
        items:       snapshot,
        neto:        totales.neto,
        ivaTotal:    totales.ivaTotal,
        total:       totales.total,
        arcaPayload: buildArcaPayload(totales, snapshot),
        estado:      'borrador',
      };
      const id = await addFactura(factura);
      setItems([]);

      const res = await fnEmitirFactura({ facturaId: id });
      const { cae, caeFchVto, nroComprobante } = res.data;
      const emitida = { ...factura, id, estado: 'enviada', cae, caeFchVto, nroComprobante };

      setFacturas(prev => [emitida, ...prev.filter(f => f.id !== id)]);
      setFacturaModal(emitida);
      imprimirRecibo80mm(emitida).catch(() => {});
    } catch (err) {
      const msg = err.message ?? 'Error desconocido';
      setFacturas(prev => {
        const existe = prev.find(f => f.estado === 'borrador' && !f.cae);
        return existe ? prev.map(f => f.id === existe.id ? { ...f, estado: 'error', errorMsg: msg } : f) : prev;
      });
      alert('Error al emitir: ' + msg);
    } finally {
      setCobrando(false);
    }
  };

  // ── Retry desde historial ──────────────────────────────────────────────────
  const handleReintentar = async (facturaId) => {
    setEnviando(true);
    try {
      const res = await fnEmitirFactura({ facturaId });
      const { cae, caeFchVto, nroComprobante } = res.data;
      setFacturas(prev => prev.map(f =>
        f.id === facturaId ? { ...f, estado: 'enviada', cae, caeFchVto, nroComprobante } : f
      ));
      setFacturaModal(prev => prev?.id === facturaId
        ? { ...prev, estado: 'enviada', cae, caeFchVto, nroComprobante }
        : prev
      );
    } catch (err) {
      alert('Error ARCA: ' + err.message);
    } finally {
      setEnviando(false);
    }
  };

  // ── Productos CRUD ─────────────────────────────────────────────────────────
  const openNew  = () => { setEditingId(null); setProductoForm(PRODUCTO_VACIO); setShowForm(true); };
  const openEdit = (p) => {
    setEditingId(p.id);
    setProductoForm({ nombre: p.nombre, precio: p.precio, iva: p.iva ?? 21, categoria: p.categoria || 'General', descripcion: p.descripcion || '' });
    setShowForm(true);
  };
  const handleSave = async () => {
    if (!productoForm.nombre || !productoForm.precio) return;
    setSaving(true);
    try {
      const data = { ...productoForm, precio: parseFloat(productoForm.precio) || 0 };
      if (editingId) await updateProducto(editingId, data); else await addProducto(data);
      await cargar();
      setShowForm(false);
    } finally { setSaving(false); }
  };
  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar producto?')) return;
    await deleteProducto(id);
    setProductos(prev => prev.filter(p => p.id !== id));
  };

  // ── Config ARCA ────────────────────────────────────────────────────────────
  const handleSaveArca = async () => {
    setArcaSaving(true);
    try { await setConfigArca(arcaForm); setArcaSaved(true); setTimeout(() => setArcaSaved(false), 2000); }
    finally { setArcaSaving(false); }
  };
  const handleGenerarCSR = async () => {
    if (!arcaForm.cuit) return alert('Ingresá el CUIT primero');
    setCsrGenerando(true); setCsrResultado(null);
    try {
      await setConfigArca({ cuit: arcaForm.cuit, ptoVta: arcaForm.ptoVta });
      const res = await fnGenerarCSR({ cuit: arcaForm.cuit, organizacion: 'Arriba Club' });
      setCsrResultado(res.data.csr);
      setArcaForm(f => ({ ...f, key: '(guardada en Firestore)' }));
    } catch (err) { alert('Error al generar CSR: ' + err.message); }
    finally { setCsrGenerando(false); }
  };

  // ── Totales del carrito activo ─────────────────────────────────────────────
  const { neto, ivaTotal, total } = calcTotales();

  // ──────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4 pb-48">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-on-surface tracking-tight">Shop</h1>
        <p className="text-on-surface-variant text-sm">Facturación electrónica · ARENA GROUP S.R.L.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container-high p-1 rounded-2xl overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Icon name={t.icon} size={16} filled={tab === t.id} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: COBRAR ─────────────────────────────────────────────────────── */}
      {tab === 'cobrar' && (
        <div>
          {productos.length === 0 ? (
            <div className="text-center py-20 text-on-surface-variant">
              <Icon name="inventory_2" size={52} className="opacity-20 mb-3" />
              <p className="font-bold text-base">Sin productos cargados</p>
              <p className="text-sm opacity-60 mt-1">Agregá productos en la pestaña Productos</p>
              <button onClick={() => setTab('productos')}
                className="mt-4 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
              >
                Ir a Productos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {productos.map(p => {
                const enCarrito = items.find(i => i.productoId === p.id);
                return (
                  <button key={p.id} onClick={() => addItem(p)}
                    className={`relative rounded-2xl p-4 text-left transition-all active:scale-95 select-none ${
                      enCarrito
                        ? 'bg-primary text-white shadow-lg shadow-primary/25 ring-2 ring-primary'
                        : 'bg-white shadow-sm hover:shadow-md hover:ring-2 hover:ring-primary/20'
                    }`}
                  >
                    {enCarrito && (
                      <span className="absolute top-2.5 right-2.5 min-w-[1.4rem] h-6 bg-white text-primary rounded-full text-xs font-black flex items-center justify-center px-1 shadow">
                        ×{enCarrito.cantidad}
                      </span>
                    )}
                    <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${enCarrito ? 'text-white/60' : 'text-outline'}`}>
                      {p.categoria}
                    </p>
                    <p className={`font-bold text-sm leading-tight line-clamp-2 ${enCarrito ? 'text-white' : 'text-on-surface'}`}>
                      {p.nombre}
                    </p>
                    <p className={`font-black text-lg mt-2 ${enCarrito ? 'text-white' : 'text-primary'}`}>
                      {formatMonto(p.precio)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Carrito flotante ─────────────────────────────────────────────── */}
          {items.length > 0 && (
            <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 md:relative md:bottom-auto md:px-0 md:pb-0 md:mt-6">
              <div className="bg-white rounded-3xl shadow-2xl border border-outline/10 overflow-hidden">
                {/* Items */}
                <div className="px-5 pt-4 pb-3 space-y-2.5 max-h-52 overflow-y-auto">
                  {items.map(item => (
                    <div key={item.productoId} className="flex items-center gap-3">
                      <span className="flex-1 text-sm font-medium text-on-surface truncate">{item.nombre}</span>
                      <div className="flex items-center bg-surface-container rounded-xl overflow-hidden flex-shrink-0">
                        <button onClick={() => setItemCantidad(item.productoId, item.cantidad - 1)}
                          className="px-3 py-1.5 text-error font-black text-base hover:bg-error/10 transition-colors leading-none"
                        >−</button>
                        <span className="w-7 text-center text-sm font-bold">{item.cantidad}</span>
                        <button onClick={() => setItemCantidad(item.productoId, item.cantidad + 1)}
                          className="px-3 py-1.5 text-success font-black text-base hover:bg-success/10 transition-colors leading-none"
                        >+</button>
                      </div>
                      <span className="w-20 text-right text-sm font-bold text-on-surface flex-shrink-0">
                        {formatMonto(item.precio * item.cantidad)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totales + botón */}
                <div className="border-t border-outline/10 px-5 py-4 space-y-3 bg-surface-container-low/50">
                  <div className="flex justify-between text-xs text-on-surface-variant">
                    <span>Neto gravado</span><span>{formatMonto(neto)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-on-surface-variant">
                    <span>IVA</span><span>{formatMonto(ivaTotal)}</span>
                  </div>
                  <div className="flex justify-between font-black text-xl text-on-surface">
                    <span>Total</span>
                    <span className="text-primary">{formatMonto(total)}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setItems([])}
                      className="p-3 rounded-xl border-2 border-outline/20 hover:bg-surface-container transition-colors"
                    >
                      <Icon name="delete_sweep" size={20} className="text-on-surface-variant" />
                    </button>
                    <button onClick={handleCobrar} disabled={cobrando}
                      className="flex-1 py-3.5 bg-primary text-white rounded-xl font-black text-base hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                    >
                      {cobrando
                        ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Emitiendo...</>
                        : <><Icon name="point_of_sale" size={20} /> Cobrar {formatMonto(total)}</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: PRODUCTOS ──────────────────────────────────────────────────── */}
      {tab === 'productos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-on-surface-variant">{productos.length} producto{productos.length !== 1 ? 's' : ''}</span>
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              <Icon name="add" size={18} /> Nuevo
            </button>
          </div>

          {productos.length === 0 && (
            <div className="text-center py-16 text-on-surface-variant">
              <Icon name="inventory_2" size={48} className="opacity-20 mb-3" />
              <p className="font-medium">Sin productos todavía</p>
              <p className="text-sm opacity-60">Creá el primero con el botón de arriba</p>
            </div>
          )}

          <div className="space-y-2">
            {productos.map(p => (
              <div key={p.id} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="inventory_2" className="text-primary" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-on-surface truncate">{p.nombre}</div>
                  <div className="text-xs text-on-surface-variant">{p.categoria} · IVA {p.iva ?? 21}%{p.descripcion ? ` · ${p.descripcion}` : ''}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-black text-primary">{formatMonto(p.precio)}</div>
                  <div className="text-[10px] text-outline">precio final</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(p)} className="p-2 hover:bg-surface-container-high rounded-xl text-on-surface-variant transition-colors">
                    <Icon name="edit" size={18} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-error/10 rounded-xl text-error transition-colors">
                    <Icon name="delete" size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: HISTORIAL ──────────────────────────────────────────────────── */}
      {tab === 'historial' && (
        <div className="space-y-2">
          {facturas.length === 0 && (
            <div className="text-center py-16 text-on-surface-variant">
              <Icon name="history" size={48} className="opacity-20 mb-3" />
              <p className="font-medium">Sin facturas todavía</p>
            </div>
          )}
          {facturas.map(f => (
            <div key={f.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  f.estado === 'enviada' ? 'bg-success/10' : f.estado === 'error' ? 'bg-error/10' : 'bg-amber-100'
                }`}>
                  <Icon name={f.estado === 'enviada' ? 'receipt_long' : f.estado === 'error' ? 'error' : 'pending'}
                    className={f.estado === 'enviada' ? 'text-success' : f.estado === 'error' ? 'text-error' : 'text-amber-600'}
                    size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-on-surface">{formatMonto(f.total)}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${ESTADO_COLOR[f.estado] ?? ESTADO_COLOR.borrador}`}>
                      {ESTADO_LABEL[f.estado] ?? f.estado}
                    </span>
                  </div>
                  <div className="text-xs text-on-surface-variant mt-0.5">
                    {f.fecha}
                    {f.nroComprobante ? ` · Nro ${String(f.nroComprobante).padStart(8, '0')}` : ''}
                    {' · '}{f.items?.length ?? 0} ítem{(f.items?.length ?? 0) !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {f.estado === 'enviada' && (<>
                    <button onClick={() => imprimirRecibo80mm(f)}
                      className="p-2 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary transition-colors"
                      title="Reimprimir ticket"
                    >
                      <Icon name="print" size={18} />
                    </button>
                    <button onClick={() => generarFacturaPDF(f)}
                      className="p-2 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary transition-colors"
                      title="Descargar PDF"
                    >
                      <Icon name="download" size={18} />
                    </button>
                  </>)}
                  {(f.estado === 'borrador' || f.estado === 'error') && (
                    <button onClick={() => setFacturaModal(f)}
                      className="p-2 bg-amber-100 hover:bg-amber-200 rounded-xl text-amber-700 transition-colors"
                      title="Ver / reintentar"
                    >
                      <Icon name="refresh" size={18} />
                    </button>
                  )}
                </div>
              </div>
              {f.estado === 'error' && f.errorMsg && (
                <p className="mt-2 text-xs text-error bg-error/5 rounded-xl px-3 py-2 leading-relaxed">
                  {f.errorMsg}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: CONFIG ARCA ────────────────────────────────────────────────── */}
      {tab === 'config' && (
        <div className="space-y-4 max-w-xl">
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-on-surface">Credenciales ARCA</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase text-outline mb-1 block">CUIT Emisor</label>
                <input type="text" value={arcaForm.cuit}
                  onChange={e => setArcaForm(f => ({ ...f, cuit: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus:border-primary outline-none text-sm"
                  placeholder="30-00000000-0"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-outline mb-1 block">Punto de Venta</label>
                <input type="number" value={arcaForm.ptoVta} min={1}
                  onChange={e => setArcaForm(f => ({ ...f, ptoVta: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus:border-primary outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-outline mb-1 block">Certificado AFIP (.crt)</label>
              <textarea value={arcaForm.cert} onChange={e => setArcaForm(f => ({ ...f, cert: e.target.value }))}
                rows={4} className="w-full px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus:border-primary outline-none text-xs font-mono resize-none"
                placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-outline mb-1 block">Clave Privada (.key)</label>
              <textarea value={arcaForm.key} onChange={e => setArcaForm(f => ({ ...f, key: e.target.value }))}
                rows={4} className="w-full px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus:border-primary outline-none text-xs font-mono resize-none"
                placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={handleSaveArca} disabled={arcaSaving}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Icon name={arcaSaved ? 'check_circle' : 'save'} size={18} filled={arcaSaved} />
                {arcaSaved ? 'Guardado!' : arcaSaving ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={handleGenerarCSR} disabled={csrGenerando || !arcaForm.cuit}
                className="flex-1 py-3 bg-secondary text-white rounded-xl font-bold hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Icon name="vpn_key" size={18} />
                {csrGenerando ? 'Generando...' : 'Generar CSR'}
              </button>
            </div>
          </div>

          {csrResultado && (
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Icon name="check_circle" className="text-success" size={20} filled />
                <h3 className="font-bold text-on-surface">CSR generado</h3>
              </div>
              <ol className="text-sm text-on-surface-variant space-y-1 list-decimal list-inside">
                <li>Copiá el texto de abajo</li>
                <li>Entrá a ARCA → Administración de Certificados Digitales</li>
                <li>Subí el CSR y bajá el <strong>.crt</strong></li>
                <li>Pegá el <strong>.crt</strong> en el campo Certificado de arriba</li>
                <li>Guardá</li>
              </ol>
              <textarea readOnly value={csrResultado} rows={5}
                className="w-full px-3 py-2 bg-surface-container border-2 border-outline/20 rounded-xl text-xs font-mono resize-none"
                onClick={e => e.target.select()}
              />
              <button onClick={() => navigator.clipboard.writeText(csrResultado)}
                className="w-full py-2 border-2 border-outline/20 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
              >
                <Icon name="content_copy" size={16} /> Copiar CSR
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: producto form ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-on-surface">{editingId ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-surface-container-high rounded-xl">
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-outline mb-1 block">Nombre *</label>
                <input type="text" value={productoForm.nombre}
                  onChange={e => setProductoForm(p => ({ ...p, nombre: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus:border-primary outline-none"
                  placeholder="Ej: Camiseta Arriba Club" autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-outline mb-1 block">Precio final *</label>
                  <div className="flex items-center gap-1 px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus-within:border-primary">
                    <span className="text-outline text-sm">$</span>
                    <input type="number" value={productoForm.precio}
                      onChange={e => setProductoForm(p => ({ ...p, precio: e.target.value }))}
                      className="flex-1 bg-transparent outline-none" placeholder="0" min="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-outline mb-1 block">IVA incluido</label>
                  <select value={productoForm.iva}
                    onChange={e => setProductoForm(p => ({ ...p, iva: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus:border-primary outline-none"
                  >
                    {IVA_OPCIONES.map(v => <option key={v} value={v}>{v}%</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-outline mb-1 block">Categoría</label>
                <select value={productoForm.categoria}
                  onChange={e => setProductoForm(p => ({ ...p, categoria: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus:border-primary outline-none"
                >
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-outline mb-1 block">Descripción (opcional)</label>
                <input type="text" value={productoForm.descripcion}
                  onChange={e => setProductoForm(p => ({ ...p, descripcion: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus:border-primary outline-none"
                  placeholder="Ej: Talle M, color azul"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 border-2 border-outline/20 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
              >Cancelar</button>
              <button onClick={handleSave} disabled={!productoForm.nombre || !productoForm.precio || saving}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: resultado de factura ──────────────────────────────────────── */}
      {facturaModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {facturaModal.estado === 'enviada' ? (
              /* Confirmación simple: mensaje + total — el ticket ya se imprime solo */
              <div className="text-center space-y-3 py-2">
                <div className="w-14 h-14 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                  <Icon name="verified" size={32} className="text-success" filled />
                </div>
                <h3 className="font-black text-lg text-on-surface">¡Factura emitida!</h3>
                <p className="text-xs text-on-surface-variant">
                  Nro {String(facturaModal.nroComprobante ?? '').padStart(8, '0')}
                </p>
                <p className="text-3xl font-black text-primary">{formatMonto(facturaModal.total)}</p>
                <button onClick={() => setFacturaModal(null)}
                  className="w-full py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors mt-2"
                >Cerrar</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-on-surface">Factura</h3>
                  <button onClick={() => setFacturaModal(null)} className="p-2 hover:bg-surface-container-high rounded-xl">
                    <Icon name="close" size={20} />
                  </button>
                </div>

                {/* Ítems */}
                <div className="space-y-1.5">
                  {facturaModal.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">{item.cantidad}× {item.nombre}</span>
                      <span className="font-bold">{formatMonto(item.precio * item.cantidad)}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-outline/10 space-y-1">
                    <div className="flex justify-between text-xs text-on-surface-variant">
                      <span>Neto gravado</span><span>{formatMonto(facturaModal.neto)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-on-surface-variant">
                      <span>IVA</span><span>{formatMonto(facturaModal.ivaTotal)}</span>
                    </div>
                    <div className="flex justify-between font-black text-lg">
                      <span>Total</span>
                      <span className="text-primary">{formatMonto(facturaModal.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Borrador / retry */}
                <div className="space-y-3">
                  {facturaModal.errorMsg && (
                    <div className="bg-error/10 rounded-xl p-3 text-xs text-error">{facturaModal.errorMsg}</div>
                  )}
                  <button onClick={() => handleReintentar(facturaModal.id)} disabled={enviando}
                    className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                  >
                    {enviando
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</>
                      : <><Icon name="send" size={18} /> Reintentar envío a AFIP</>
                    }
                  </button>
                </div>

                <button onClick={() => setFacturaModal(null)}
                  className="w-full py-3 border-2 border-outline/20 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
                >Cerrar</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
