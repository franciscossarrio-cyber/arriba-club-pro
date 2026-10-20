import { MESES } from './helpers';

// Punto de venta 00004 (alta 16/10/2026, actividad "Enseñanza de gimnasia, deportes y
// actividades físicas"): factura los servicios del club — membresías, clases, day use,
// alquileres — separado del PV del Shop (comida/bebida/productos).
export const PTO_VTA_SERVICIOS_DEFAULT = 4;
export const IVA_SERVICIOS = 21;

const ivaIdMap = (pct) => ({ 0: 3, 10.5: 4, 21: 5, 27: 6 }[pct] ?? 5);
const toArcaFecha = (iso) => iso.replace(/-/g, '');
const pad2 = (n) => String(n).padStart(2, '0');

export const hoyISO = () => new Date().toISOString().slice(0, 10);
export const isoToDisplay = (iso) => iso.split('-').reverse().join('/');

/**
 * Período del servicio (ISO yyyy-mm-dd) a partir de un pago.
 * Membresía → mes completo; clase/day use → el día de la clase; si no se puede
 * deducir, el día de la factura.
 */
export const periodoServicio = (pago, fechaFacturaISO) => {
  const [mesNombre, anioStr] = (pago?.mes || '').split(' ');
  const mesNum = MESES.indexOf(mesNombre) + 1;
  const anio   = parseInt(anioStr);
  const esClase = ['suelta', 'privada', 'prueba', 'dayuse'].includes(pago?.tipo);
  if (!esClase && mesNum > 0 && anio) {
    const ultimo = new Date(anio, mesNum, 0).getDate();
    return { desde: `${anio}-${pad2(mesNum)}-01`, hasta: `${anio}-${pad2(mesNum)}-${pad2(ultimo)}` };
  }
  const m = (pago?.fecha || '').match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (m) {
    const y = m[3] || anio || fechaFacturaISO.slice(0, 4);
    const iso = `${y}-${pad2(m[2])}-${pad2(m[1])}`;
    return { desde: iso, hasta: iso };
  }
  return { desde: fechaFacturaISO, hasta: fechaFacturaISO };
};

/**
 * Arma una Factura B a Consumidor Final por servicios (Concepto 2) con un único ítem.
 * Devuelve el documento listo para addFactura (estado borrador).
 */
export const buildFacturaServicio = ({ descripcion, total, metodo, fechaISO, desdeISO, hastaISO, ptoVta, pagoId = null }) => {
  const rate = IVA_SERVICIOS / 100;
  const neto = total / (1 + rate);
  const iva  = total - neto;
  const r2   = (n) => parseFloat(n.toFixed(2));
  return {
    origen:   'servicios',
    pagoId,
    fecha:    isoToDisplay(fechaISO),
    cliente:  { nombre: 'Consumidor Final', tipoDoc: 99, docNum: '' },
    items:    [{ nombre: descripcion, precio: total, iva: IVA_SERVICIOS, cantidad: 1 }],
    neto,
    ivaTotal: iva,
    total,
    metodo,
    arcaPayload: {
      PtoVta:       ptoVta || PTO_VTA_SERVICIOS_DEFAULT,
      CbteTipo:     6,
      Concepto:     2,
      DocTipo:      99,
      DocNro:       0,
      CbteFch:      toArcaFecha(fechaISO),
      FchServDesde: toArcaFecha(desdeISO || fechaISO),
      FchServHasta: toArcaFecha(hastaISO || fechaISO),
      FchVtoPago:   toArcaFecha(fechaISO),
      ImpTotal:     r2(total),
      ImpNeto:      r2(neto),
      ImpIVA:       r2(iva),
      ImpTotConc: 0, ImpOpEx: 0, ImpTrib: 0,
      MonId:      'PES', MonCotiz: 1,
      Iva: [{ Id: ivaIdMap(IVA_SERVICIOS), BaseImp: r2(neto), Importe: r2(iva) }],
    },
    estado: 'borrador',
  };
};
