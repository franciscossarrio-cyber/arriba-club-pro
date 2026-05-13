import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import Icon from './Icon';
import { formatMonto } from '../utils/helpers';
import { functions } from '../firebase/config';
import {
  getProductos,
  addProducto,
  updateProducto,
  deleteProducto,
  getFacturas,
  addFactura,
  getConfigArca,
  setConfigArca,
} from '../firebase/firestore';

const fnGenerarCSR    = httpsCallable(functions, 'generarCSR');
const fnEmitirFactura = httpsCallable(functions, 'emitirFactura');

const CATEGORIAS = ['General', 'Indumentaria', 'Equipamiento', 'Bebidas', 'Suplementos', 'Servicios', 'Otro'];
const IVA_OPCIONES = [0, 10.5, 21, 27];

// IVA id según ARCA: 3=0%, 4=10.5%, 5=21%, 6=27%
const ivaIdMap = (pct) => ({ 0: 3, 10.5: 4, 21: 5, 27: 6 }[pct] ?? 5);

const TABS = [
  { id: 'productos', icon: 'inventory_2',  label: 'Productos'  },
  { id: 'facturar',  icon: 'receipt_long', label: 'Facturar'   },
  { id: 'historial', icon: 'history',      label: 'Historial'  },
  { id: 'config',    icon: 'key',          label: 'Config ARCA'},
];

// ─── Formulario vacío ─────────────────────────────────────────────────────────
const PRODUCTO_VACIO = { nombre: '', precio: '', iva: 21, categoria: 'General', descripcion: '' };
const CLIENTE_VACIO  = { nombre: '', docNum: '', tipoDoc: 96 }; // 96 = DNI

// ─── Componente principal ─────────────────────────────────────────────────────
const Shop = () => {
  const [tab, setTab] = useState('productos');
  const [loading, setLoading] = useState(true);

  // Data
  const [productos, setProductos]   = useState([]);
  const [facturas,  setFacturas]    = useState([]);
  const [configArca, setConfigArcaState] = useState(null);

  // Product form
  const [showForm, setShowForm]         = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [productoForm, setProductoForm] = useState(PRODUCTO_VACIO);
  const [saving, setSaving]             = useState(false);

  // Invoice builder
  const [clienteForm, setClienteForm] = useState(CLIENTE_VACIO);
  const [items, setItems]             = useState([]);
  const [generando, setGenerando]     = useState(false);
  const [facturaModal, setFacturaModal] = useState(null);

  // ARCA config
  const [arcaForm, setArcaForm]     = useState({ cuit: '', ptoVta: 1, cert: '', key: '' });
  const [arcaSaved, setArcaSaved]   = useState(false);
  const [arcaSaving, setArcaSaving] = useState(false);
  const [csrGenerando, setCsrGenerando] = useState(false);
  const [csrResultado, setCsrResultado] = useState(null); // texto del .csr generado

  // Envío a AFIP
  const [enviando, setEnviando] = useState(false);

  // ── Carga inicial ───────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, facts, cfg] = await Promise.all([getProductos(), getFacturas(), getConfigArca()]);
      setProductos(prods);
      setFacturas(facts);
      if (cfg) {
        setConfigArcaState(cfg);
        setArcaForm(f => ({ ...f, ...cfg }));
      }
    } catch (err) {
      console.error('Shop load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Productos ───────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditingId(null);
    setProductoForm(PRODUCTO_VACIO);
    setShowForm(true);
  };

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
      if (editingId) {
        await updateProducto(editingId, data);
      } else {
        await addProducto(data);
      }
      await cargar();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar producto?')) return;
    await deleteProducto(id);
    setProductos(prev => prev.filter(p => p.id !== id));
  };

  // ── Factura builder ─────────────────────────────────────────────────────────
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

  const calcTotales = () => {
    let neto = 0, ivaTotal = 0;
    items.forEach(({ precio, cantidad, iva }) => {
      const total = precio * cantidad;
      const rate  = iva / 100;
      const n     = total / (1 + rate);
      neto     += n;
      ivaTotal += total - n;
    });
    return { neto, ivaTotal, total: neto + ivaTotal };
  };

  const buildArcaPayload = ({ neto, ivaTotal, total }) => {
    // Agrupar IVA por alícuota para el array Iva
    const ivaMap = {};
    items.forEach(({ precio, cantidad, iva }) => {
      const sub  = precio * cantidad;
      const rate = iva / 100;
      const n    = sub / (1 + rate);
      if (!ivaMap[iva]) ivaMap[iva] = { Id: ivaIdMap(iva), BaseImp: 0, Importe: 0 };
      ivaMap[iva].BaseImp += n;
      ivaMap[iva].Importe += sub - n;
    });

    return {
      PtoVta:     arcaForm.ptoVta || 1,
      CbteTipo:   6, // Factura B — Responsable Inscripto a Consumidor Final
      Concepto:   1,
      DocTipo:    clienteForm.tipoDoc,
      DocNro:     clienteForm.tipoDoc === 99 ? 0 : (parseInt(clienteForm.docNum.replace(/\D/g, '')) || 0),
      CbteFch:    new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      ImpTotal:   parseFloat(total.toFixed(2)),
      ImpNeto:    parseFloat(neto.toFixed(2)),
      ImpIVA:     parseFloat(ivaTotal.toFixed(2)),
      ImpTotConc: 0,
      ImpOpEx:    0,
      ImpTrib:    0,
      MonId:      'PES',
      MonCotiz:   1,
      Iva: Object.values(ivaMap).map(v => ({
        ...v,
        BaseImp: parseFloat(v.BaseImp.toFixed(2)),
        Importe: parseFloat(v.Importe.toFixed(2)),
      })),
    };
  };

  const handleGenerarFactura = async () => {
    if (!clienteForm.nombre || items.length === 0) return;
    setGenerando(true);
    try {
      const totales = calcTotales();
      const factura = {
        fecha:       new Date().toLocaleDateString('es-AR'),
        cliente:     { ...clienteForm },
        items:       [...items],
        neto:        totales.neto,
        ivaTotal:    totales.ivaTotal,
        total:       totales.total,
        arcaPayload: buildArcaPayload(totales),
        estado:      'borrador',
      };
      const id = await addFactura(factura);
      setFacturas(prev => [{ ...factura, id }, ...prev]);
      setFacturaModal({ ...factura, id });
      setItems([]);
      setClienteForm(CLIENTE_VACIO);
    } finally {
      setGenerando(false);
    }
  };

  // ── Config ARCA ─────────────────────────────────────────────────────────────
  const handleSaveArca = async () => {
    setArcaSaving(true);
    try {
      await setConfigArca(arcaForm);
      setArcaSaved(true);
      setTimeout(() => setArcaSaved(false), 2000);
    } finally {
      setArcaSaving(false);
    }
  };

  const handleGenerarCSR = async () => {
    if (!arcaForm.cuit) return alert('Ingresá el CUIT primero');
    setCsrGenerando(true);
    setCsrResultado(null);
    try {
      // Guarda el CUIT antes de llamar
      await setConfigArca({ cuit: arcaForm.cuit, ptoVta: arcaForm.ptoVta });
      const res = await fnGenerarCSR({ cuit: arcaForm.cuit, organizacion: 'Arriba Club' });
      setCsrResultado(res.data.csr);
      // Actualizar form — la key quedó guardada en Firestore por la Cloud Function
      setArcaForm(f => ({ ...f, key: '(guardada automáticamente en Firestore)' }));
    } catch (err) {
      alert('Error al generar CSR: ' + err.message);
    } finally {
      setCsrGenerando(false);
    }
  };

  const handleEmitirFactura = async (facturaId, arcaPayload) => {
    setEnviando(true);
    try {
      const res = await fnEmitirFactura({ facturaId });
      const { cae, caeFchVto, nroComprobante } = res.data;
      // Actualizar lista local
      setFacturas(prev => prev.map(f =>
        f.id === facturaId
          ? { ...f, estado: 'enviada', cae, caeFchVto, nroComprobante }
          : f
      ));
      setFacturaModal(prev => prev ? { ...prev, estado: 'enviada', cae, caeFchVto } : null);
      alert(`✓ Factura emitida!\nCAE: ${cae}\nVence: ${caeFchVto}`);
    } catch (err) {
      alert('Error ARCA: ' + err.message);
      setFacturas(prev => prev.map(f =>
        f.id === facturaId ? { ...f, estado: 'error', errorMsg: err.message } : f
      ));
    } finally {
      setEnviando(false);
    }
  };

  // ── Totales ─────────────────────────────────────────────────────────────────
  const { neto, ivaTotal, total } = calcTotales();

  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full spinner"></div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-on-surface tracking-tight">Shop</h1>
        <p className="text-on-surface-variant text-sm">Productos y facturación electrónica (ARCA/AFIP)</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container-high p-1 rounded-2xl overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              tab === t.id
                ? 'bg-white text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Icon name={t.icon} size={16} filled={tab === t.id} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Productos ─────────────────────────────────────────────────────── */}
      {tab === 'productos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-on-surface-variant">
              {productos.length} producto{productos.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              <Icon name="add" size={18} /> Nuevo Producto
            </button>
          </div>

          {/* Lista */}
          <div className="space-y-2">
            {productos.length === 0 && (
              <div className="text-center py-16 text-on-surface-variant">
                <Icon name="inventory_2" size={48} className="opacity-20 mb-3" />
                <p className="font-medium">Sin productos todavía</p>
                <p className="text-sm opacity-60">Creá el primero con el botón de arriba</p>
              </div>
            )}
            {productos.map(p => (
              <div key={p.id} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="inventory_2" className="text-primary" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-on-surface truncate">{p.nombre}</div>
                  <div className="text-xs text-on-surface-variant">
                    {p.categoria} · IVA {p.iva ?? 21}%
                    {p.descripcion ? ` · ${p.descripcion}` : ''}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-black text-primary">{formatMonto(p.precio)}</div>
                  <div className="text-[10px] text-outline">precio final</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(p)}
                    className="p-2 hover:bg-surface-container-high rounded-xl text-on-surface-variant transition-colors"
                  >
                    <Icon name="edit" size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-2 hover:bg-error/10 rounded-xl text-error transition-colors"
                  >
                    <Icon name="delete" size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: Facturar ──────────────────────────────────────────────────────── */}
      {tab === 'facturar' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Izquierda: catálogo */}
          <div className="space-y-3">
            <h3 className="font-bold text-on-surface">Catálogo</h3>
            {productos.length === 0 && (
              <p className="text-sm text-on-surface-variant py-8 text-center">
                Primero cargá productos en la pestaña "Productos"
              </p>
            )}
            {productos.map(p => (
              <button
                key={p.id}
                onClick={() => addItem(p)}
                className="w-full flex items-center gap-3 p-3 bg-white rounded-2xl hover:bg-primary/5 text-left transition-colors shadow-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="add_circle" className="text-primary" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-on-surface truncate">{p.nombre}</div>
                  <div className="text-xs text-outline">{p.categoria} · IVA {p.iva ?? 21}%</div>
                </div>
                <div className="font-bold text-primary text-sm flex-shrink-0">{formatMonto(p.precio)}</div>
              </button>
            ))}
          </div>

          {/* Derecha: ticket */}
          <div className="space-y-4">
            {/* Datos del cliente */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <h3 className="font-bold text-on-surface flex items-center gap-2">
                <Icon name="person" size={18} className="text-primary" /> Datos del cliente
              </h3>
              <input
                type="text"
                value={clienteForm.nombre}
                onChange={e => setClienteForm(c => ({ ...c, nombre: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus:border-primary outline-none text-sm"
                placeholder="Nombre o razón social *"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={clienteForm.tipoDoc}
                  onChange={e => setClienteForm(c => ({ ...c, tipoDoc: parseInt(e.target.value) }))}
                  className="px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus:border-primary outline-none text-sm"
                >
                  <option value={99}>Consumidor Final</option>
                  <option value={96}>DNI</option>
                  <option value={80}>CUIT</option>
                </select>
                <input
                  type="text"
                  value={clienteForm.docNum}
                  onChange={e => setClienteForm(c => ({ ...c, docNum: e.target.value }))}
                  disabled={clienteForm.tipoDoc === 99}
                  className="px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus:border-primary outline-none text-sm disabled:opacity-40"
                  placeholder="Número"
                />
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <h3 className="font-bold text-on-surface flex items-center gap-2">
                <Icon name="shopping_cart" size={18} className="text-primary" /> Items
              </h3>
              {items.length === 0 && (
                <p className="text-center text-on-surface-variant text-sm py-4 opacity-60">
                  Tocá productos del catálogo para agregarlos
                </p>
              )}
              {items.map(item => (
                <div key={item.productoId} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-on-surface truncate">{item.nombre}</div>
                    <div className="text-xs text-outline">{formatMonto(item.precio)} c/u · IVA {item.iva}%</div>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-container rounded-xl flex-shrink-0">
                    <button
                      onClick={() => setItemCantidad(item.productoId, item.cantidad - 1)}
                      className="px-2.5 py-1 hover:text-error transition-colors font-bold text-lg leading-none"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{item.cantidad}</span>
                    <button
                      onClick={() => setItemCantidad(item.productoId, item.cantidad + 1)}
                      className="px-2.5 py-1 hover:text-success transition-colors font-bold text-lg leading-none"
                    >
                      +
                    </button>
                  </div>
                  <div className="font-bold text-sm text-right w-20 flex-shrink-0">
                    {formatMonto(item.precio * item.cantidad)}
                  </div>
                </div>
              ))}

              {/* Totales */}
              {items.length > 0 && (
                <div className="pt-3 border-t-2 border-outline/10 space-y-1.5">
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>Neto gravado</span>
                    <span>{formatMonto(neto)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>IVA</span>
                    <span>{formatMonto(ivaTotal)}</span>
                  </div>
                  <div className="flex justify-between font-black text-on-surface text-lg pt-1">
                    <span>Total</span>
                    <span className="text-primary">{formatMonto(total)}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleGenerarFactura}
              disabled={!clienteForm.nombre || items.length === 0 || generando}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {generando
                ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full spinner" /> Generando...</>
                : <><Icon name="receipt_long" size={22} /> Generar Factura</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: Historial ─────────────────────────────────────────────────────── */}
      {tab === 'historial' && (
        <div className="space-y-3">
          {facturas.length === 0 && (
            <div className="text-center py-16 text-on-surface-variant">
              <Icon name="history" size={48} className="opacity-20 mb-3" />
              <p className="font-medium">Sin facturas generadas</p>
            </div>
          )}
          {facturas.map(f => (
            <button
              key={f.id}
              onClick={() => setFacturaModal(f)}
              className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:bg-surface-container-low transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                <Icon name="receipt_long" className="text-success" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-on-surface">{f.cliente?.nombre}</div>
                <div className="text-xs text-on-surface-variant">
                  {f.fecha} · {f.items?.length ?? 0} item{(f.items?.length ?? 0) !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="font-black text-primary flex-shrink-0">{formatMonto(f.total)}</div>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 ${
                f.estado === 'enviada'  ? 'bg-success/10 text-success' :
                f.estado === 'error'   ? 'bg-error/10 text-error'     :
                'bg-amber-100 text-amber-700'
              }`}>
                {f.estado}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── TAB: Config ARCA ───────────────────────────────────────────────────── */}
      {tab === 'config' && (
        <div className="space-y-4 max-w-xl">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
            <div className="flex gap-2 items-start">
              <Icon name="info" className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-amber-800 text-sm space-y-1">
                <p className="font-bold">Integración en modo prototipo</p>
                <p>
                  La conexión real con AFIP/ARCA requiere un servidor Node.js (ej: Firebase Cloud Function)
                  porque el SDK firma con certificados digitales, lo que no puede hacerse desde el browser.
                  Los datos de factura se generan correctamente y el payload JSON queda listo para enviar.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-on-surface">Credenciales ARCA</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase text-outline mb-1 block">CUIT Emisor</label>
                <input
                  type="text"
                  value={arcaForm.cuit}
                  onChange={e => setArcaForm(f => ({ ...f, cuit: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus:border-primary outline-none text-sm"
                  placeholder="20-12345678-9"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-outline mb-1 block">Punto de Venta</label>
                <input
                  type="number"
                  value={arcaForm.ptoVta}
                  min={1}
                  onChange={e => setArcaForm(f => ({ ...f, ptoVta: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus:border-primary outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-outline mb-1 block">
                Certificado AFIP (.crt)
              </label>
              <textarea
                value={arcaForm.cert}
                onChange={e => setArcaForm(f => ({ ...f, cert: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus:border-primary outline-none text-xs font-mono resize-none"
                placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-outline mb-1 block">
                Clave Privada (.key)
              </label>
              <textarea
                value={arcaForm.key}
                onChange={e => setArcaForm(f => ({ ...f, key: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus:border-primary outline-none text-xs font-mono resize-none"
                placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveArca}
                disabled={arcaSaving}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Icon name={arcaSaved ? 'check_circle' : 'save'} size={18} filled={arcaSaved} />
                {arcaSaved ? 'Guardado!' : arcaSaving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={handleGenerarCSR}
                disabled={csrGenerando || !arcaForm.cuit}
                className="flex-1 py-3 bg-secondary text-white rounded-xl font-bold hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Icon name="vpn_key" size={18} />
                {csrGenerando ? 'Generando...' : 'Generar CSR'}
              </button>
            </div>
          </div>

          {/* Resultado CSR */}
          {csrResultado && (
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Icon name="check_circle" className="text-success" size={20} filled />
                <h3 className="font-bold text-on-surface">CSR generado</h3>
              </div>
              <p className="text-sm text-on-surface-variant">
                La clave privada quedó guardada en Firestore automáticamente.
                Ahora tenés que subir este archivo <strong>.csr</strong> a ARCA:
              </p>
              <ol className="text-sm text-on-surface-variant space-y-1 list-decimal list-inside">
                <li>Copiá el texto de abajo</li>
                <li>Entrá a ARCA → Administración de Certificados Digitales</li>
                <li>Subí el CSR y bajá el <strong>.crt</strong> que te devuelven</li>
                <li>Pegá el contenido del <strong>.crt</strong> en el campo "Certificado" de arriba</li>
                <li>Guardá</li>
              </ol>
              <textarea
                readOnly
                value={csrResultado}
                rows={6}
                className="w-full px-3 py-2 bg-surface-container border-2 border-outline/20 rounded-xl text-xs font-mono resize-none"
                onClick={e => e.target.select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(csrResultado);
                }}
                className="w-full py-2 border-2 border-outline/20 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
              >
                <Icon name="content_copy" size={16} /> Copiar CSR
              </button>
            </div>
          )}

          <div className="bg-surface-container-low rounded-2xl p-4 text-sm text-on-surface-variant space-y-1">
            <p className="font-bold text-on-surface">¿Cómo obtener el certificado?</p>
            <p>1. Ingresá a <span className="font-mono text-xs">servicios1.afip.gov.ar/clavefiscal</span></p>
            <p>2. Accedé al servicio <strong>Administración de Certificados Digitales</strong></p>
            <p>3. Generá un par de claves y descargá el .crt y .key</p>
            <p>4. Solicitá acceso al WS <strong>wsfe</strong> para facturación electrónica</p>
          </div>
        </div>
      )}

      {/* ── Modal: Producto form ────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-on-surface">
                {editingId ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-surface-container-high rounded-xl">
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-outline mb-1 block">Nombre *</label>
                <input
                  type="text"
                  value={productoForm.nombre}
                  onChange={e => setProductoForm(p => ({ ...p, nombre: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus:border-primary outline-none"
                  placeholder="Ej: Camiseta Arriba Club"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-outline mb-1 block">Precio final *</label>
                  <div className="flex items-center gap-1 px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus-within:border-primary">
                    <span className="text-outline text-sm">$</span>
                    <input
                      type="number"
                      value={productoForm.precio}
                      onChange={e => setProductoForm(p => ({ ...p, precio: e.target.value }))}
                      className="flex-1 bg-transparent outline-none"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-outline mb-1 block">IVA incluido</label>
                  <select
                    value={productoForm.iva}
                    onChange={e => setProductoForm(p => ({ ...p, iva: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus:border-primary outline-none"
                  >
                    {IVA_OPCIONES.map(v => <option key={v} value={v}>{v}%</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-outline mb-1 block">Categoría</label>
                <select
                  value={productoForm.categoria}
                  onChange={e => setProductoForm(p => ({ ...p, categoria: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus:border-primary outline-none"
                >
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-outline mb-1 block">Descripción (opcional)</label>
                <input
                  type="text"
                  value={productoForm.descripcion}
                  onChange={e => setProductoForm(p => ({ ...p, descripcion: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-container border-2 border-transparent rounded-xl focus:border-primary outline-none"
                  placeholder="Ej: Talle M, color azul"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 border-2 border-outline/20 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!productoForm.nombre || !productoForm.precio || saving}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Factura generada ─────────────────────────────────────────────── */}
      {facturaModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-on-surface">Factura</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                  facturaModal.estado === 'enviada' ? 'bg-success/10 text-success' :
                  facturaModal.estado === 'error'   ? 'bg-error/10 text-error'     :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {facturaModal.estado === 'borrador' ? 'Borrador · Pendiente de envío a ARCA' : facturaModal.estado}
                </span>
              </div>
              <button onClick={() => setFacturaModal(null)} className="p-2 hover:bg-surface-container-high rounded-xl">
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* Datos cliente */}
            <div className="bg-surface-container-low rounded-2xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-outline">Cliente</span>
                <span className="font-bold">{facturaModal.cliente?.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Documento</span>
                <span className="font-bold">
                  {facturaModal.cliente?.tipoDoc === 99
                    ? 'Consumidor Final'
                    : `${facturaModal.cliente?.tipoDoc === 80 ? 'CUIT' : 'DNI'} ${facturaModal.cliente?.docNum}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Fecha</span>
                <span className="font-bold">{facturaModal.fecha}</span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              {facturaModal.items?.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">{item.cantidad}× {item.nombre}</span>
                  <span className="font-bold">{formatMonto(item.precio * item.cantidad)}</span>
                </div>
              ))}

              <div className="pt-2 border-t-2 border-outline/10 space-y-1.5">
                <div className="flex justify-between text-sm text-on-surface-variant">
                  <span>Neto gravado</span>
                  <span>{formatMonto(facturaModal.neto)}</span>
                </div>
                <div className="flex justify-between text-sm text-on-surface-variant">
                  <span>IVA</span>
                  <span>{formatMonto(facturaModal.ivaTotal)}</span>
                </div>
                <div className="flex justify-between font-black text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatMonto(facturaModal.total)}</span>
                </div>
              </div>
            </div>

            {/* Payload ARCA */}
            <details className="group">
              <summary className="cursor-pointer text-xs font-bold text-outline hover:text-on-surface flex items-center gap-1.5 select-none">
                <Icon name="code" size={14} />
                Ver payload JSON para ARCA
              </summary>
              <pre className="mt-2 text-[10px] bg-surface-container-low rounded-xl p-3 overflow-x-auto text-on-surface-variant leading-relaxed">
                {JSON.stringify(facturaModal.arcaPayload, null, 2)}
              </pre>
            </details>

            {facturaModal.estado === 'borrador' && (
              <button
                onClick={() => handleEmitirFactura(facturaModal.id, facturaModal.arcaPayload)}
                disabled={enviando}
                className="w-full py-3 bg-success text-white rounded-xl font-bold hover:bg-success/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {enviando
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" /> Enviando a AFIP...</>
                  : <><Icon name="send" size={18} /> Enviar a AFIP</>
                }
              </button>
            )}

            {facturaModal.estado === 'enviada' && (
              <div className="bg-success/10 rounded-2xl p-4 space-y-1 text-sm">
                <div className="flex items-center gap-2 font-bold text-success">
                  <Icon name="verified" size={18} filled /> Comprobante emitido
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>CAE</span>
                  <span className="font-mono font-bold">{facturaModal.cae}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Vence</span>
                  <span>{facturaModal.caeFchVto}</span>
                </div>
              </div>
            )}

            {facturaModal.estado === 'error' && (
              <div className="bg-error/10 rounded-2xl p-4 text-sm text-error">
                <span className="font-bold">Error:</span> {facturaModal.errorMsg}
              </div>
            )}

            <button
              onClick={() => setFacturaModal(null)}
              className="w-full py-3 border-2 border-outline/20 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
