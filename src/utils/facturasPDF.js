import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

const EMISOR = {
  razonSocial: 'ARENA GROUP S.R.L.',
  cuit:        '30-71762826-4',
  domicilio:   'Arenales 3649 Piso 6 Dpto 13, CABA',
  iibb:        '30717628264',
  inicioAct:   '01/01/2020',
  condIva:     'Responsable Inscripto',
};

const TIPO_CBT = { 6: 'B', 1: 'A', 11: 'C' };
const TIPO_DOC = { 80: 'CUIT', 96: 'DNI', 99: 'Consumidor Final' };

function padNro(n, len) {
  return String(n ?? 0).padStart(len, '0');
}

function buildQrUrl(factura) {
  const p = factura.arcaPayload;
  const data = {
    ver:         1,
    fecha:       factura.fecha.split('/').reverse().join('-'), // dd/mm/yyyy → yyyy-mm-dd
    cuit:        parseInt(EMISOR.cuit.replace(/\D/g, '')),
    ptoVta:      p.PtoVta,
    tipoCmp:     p.CbteTipo,
    nroCmp:      factura.nroComprobante ?? 0,
    importe:     p.ImpTotal,
    moneda:      'PES',
    ctz:         1,
    tipoDocRec:  p.DocTipo,
    nroDocRec:   p.DocNro,
    tipoCodAut:  'E',
    codAut:      parseInt(factura.cae ?? '0'),
  };
  return 'https://www.afip.gob.ar/fe/qr/?p=' + btoa(JSON.stringify(data));
}

export async function generarFacturaPDF(factura) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const m = 15; // margen

  // ── Fuentes ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica');

  // ── Cabecera izquierda ────────────────────────────────────────────────────
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(EMISOR.razonSocial, m, 20);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`CUIT: ${EMISOR.cuit}`, m, 26);
  doc.text(`Domicilio: ${EMISOR.domicilio}`, m, 30);
  doc.text(`Ing. Brutos: ${EMISOR.iibb}`, m, 34);
  doc.text(`Inicio Actividades: ${EMISOR.inicioAct}`, m, 38);
  doc.text(`IVA: ${EMISOR.condIva}`, m, 42);

  // ── Letra del comprobante (centro) ────────────────────────────────────────
  const letra = TIPO_CBT[factura.arcaPayload?.CbteTipo] ?? 'B';
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(W / 2 - 10, 14, 20, 20);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(letra, W / 2, 28, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Cod. ${padNro(factura.arcaPayload?.CbteTipo, 2)}`, W / 2, 36, { align: 'center' });

  // ── Cabecera derecha ──────────────────────────────────────────────────────
  const rx = W / 2 + 14;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Nro: ${padNro(factura.arcaPayload?.PtoVta, 4)}-${padNro(factura.nroComprobante, 8)}`,
    rx, 22
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Fecha: ${factura.fecha}`, rx, 28);
  doc.text(`CUIT: ${EMISOR.cuit}`, rx, 33);

  // ── Línea separadora ──────────────────────────────────────────────────────
  doc.setLineWidth(0.3);
  doc.line(m, 48, W - m, 48);

  // ── Datos del cliente ─────────────────────────────────────────────────────
  let y = 54;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente:', m, y);
  doc.setFont('helvetica', 'normal');
  doc.text(factura.cliente?.nombre ?? '-', m + 18, y);

  const tipoDoc = factura.cliente?.tipoDoc;
  const nroDoc  = factura.cliente?.docNum;
  doc.text(
    tipoDoc === 99
      ? 'Consumidor Final'
      : `${TIPO_DOC[tipoDoc] ?? 'Doc'}: ${nroDoc}`,
    W / 2, y
  );
  doc.text(`Cond. IVA: Consumidor Final`, W - m, y, { align: 'right' });

  // ── Línea separadora ──────────────────────────────────────────────────────
  y += 6;
  doc.line(m, y, W - m, y);

  // ── Encabezado tabla ─────────────────────────────────────────────────────
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Descripción',         m,          y);
  doc.text('Cant.',               m + 95,     y, { align: 'right' });
  doc.text('Precio unit.',        m + 125,    y, { align: 'right' });
  doc.text('IVA %',               m + 148,    y, { align: 'right' });
  doc.text('Subtotal',            W - m,      y, { align: 'right' });
  y += 2;
  doc.setLineWidth(0.2);
  doc.line(m, y, W - m, y);
  y += 5;

  // ── Ítems ─────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  (factura.items ?? []).forEach(item => {
    const sub = item.precio * item.cantidad;
    doc.text(item.nombre,                          m,       y);
    doc.text(String(item.cantidad),                m + 95,  y, { align: 'right' });
    doc.text(`$${item.precio.toLocaleString('es-AR')}`, m + 125, y, { align: 'right' });
    doc.text(`${item.iva ?? 21}%`,                 m + 148, y, { align: 'right' });
    doc.text(`$${sub.toLocaleString('es-AR')}`,    W - m,   y, { align: 'right' });
    y += 6;
  });

  // ── Línea separadora ──────────────────────────────────────────────────────
  doc.line(m, y, W - m, y);
  y += 6;

  // ── Totales ───────────────────────────────────────────────────────────────
  const tx = W - m;
  doc.setFont('helvetica', 'normal');
  doc.text('Neto gravado:',  W - m - 60, y);
  doc.text(`$${(factura.neto ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, tx, y, { align: 'right' });
  y += 6;
  doc.text('IVA:',           W - m - 60, y);
  doc.text(`$${(factura.ivaTotal ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, tx, y, { align: 'right' });
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:',         W - m - 60, y);
  doc.text(`$${(factura.total ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, tx, y, { align: 'right' });

  // ── CAE ───────────────────────────────────────────────────────────────────
  y += 12;
  doc.setLineWidth(0.3);
  doc.line(m, y, W - m, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`CAE: ${factura.cae}`, m, y);
  doc.text(`Vencimiento CAE: ${factura.caeFchVto}`, m + 70, y);

  // ── QR AFIP ───────────────────────────────────────────────────────────────
  try {
    const qrUrl  = buildQrUrl(factura);
    const qrData = await QRCode.toDataURL(qrUrl, { width: 80, margin: 1 });
    doc.addImage(qrData, 'PNG', W - m - 25, y - 6, 25, 25);
  } catch (e) {
    console.warn('QR error:', e);
  }

  // ── Descarga ──────────────────────────────────────────────────────────────
  const nro = `${padNro(factura.arcaPayload?.PtoVta, 4)}-${padNro(factura.nroComprobante, 8)}`;
  doc.save(`Factura-${letra}${nro}.pdf`);
}

export async function imprimirRecibo80mm(factura) {
  const letra = TIPO_CBT[factura.arcaPayload?.CbteTipo] ?? 'B';
  const nro   = `${padNro(factura.arcaPayload?.PtoVta, 4)}-${padNro(factura.nroComprobante, 8)}`;

  let qrImg = '';
  try {
    const qrUrl = buildQrUrl(factura);
    qrImg = await QRCode.toDataURL(qrUrl, { width: 160, margin: 1 });
  } catch (e) {
    console.warn('QR error:', e);
  }

  const itemsHtml = (factura.items ?? []).map(item => `
    <tr>
      <td style="padding:2px 0">${item.cantidad}x ${item.nombre}</td>
      <td style="text-align:right;padding:2px 0">$${(item.precio * item.cantidad).toLocaleString('es-AR')}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: 80mm auto; margin: 3mm 4mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; font-size: 11px; color: #000; width: 72mm; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .sep { border: none; border-top: 1px dashed #000; margin: 5px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; }
  .total-row td { font-size: 14px; font-weight: bold; padding-top: 4px; }
  .cae { font-size: 9px; word-break: break-all; }
  .qr { text-align: center; margin: 6px 0; }
  .qr img { width: 80px; height: 80px; }
  @media print {
    body { -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="center bold" style="font-size:13px">${EMISOR.razonSocial}</div>
<div class="center" style="font-size:9px">${EMISOR.domicilio}</div>
<div class="center" style="font-size:9px">CUIT: ${EMISOR.cuit}</div>
<div class="center" style="font-size:9px">IVA: ${EMISOR.condIva}</div>
<hr class="sep">
<div class="center bold" style="font-size:15px">FACTURA ${letra}</div>
<div class="center" style="font-size:9px">Nro: ${nro}</div>
<div class="center" style="font-size:9px">Fecha: ${factura.fecha}</div>
<hr class="sep">
<table>${itemsHtml}</table>
<hr class="sep">
<table>
  <tr><td>Neto gravado</td><td style="text-align:right">$${(factura.neto ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td></tr>
  <tr><td>IVA</td><td style="text-align:right">$${(factura.ivaTotal ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td></tr>
  <tr class="total-row"><td>TOTAL</td><td style="text-align:right">$${(factura.total ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td></tr>
</table>
<hr class="sep">
<div class="cae">CAE: ${factura.cae ?? ''}</div>
<div class="cae">Vence: ${factura.caeFchVto ?? ''}</div>
${qrImg ? `<div class="qr"><img src="${qrImg}" alt="QR AFIP"></div>` : ''}
<div class="center" style="font-size:8px;margin-top:4px">Gracias por tu compra!</div>
</body>
</html>`;

  const winWidth = 320, winHeight = 600;
  const left = Math.max(0, Math.round((window.screen.width - winWidth) / 2));
  const top  = Math.max(0, Math.round((window.screen.height - winHeight) / 2));
  const win = window.open('', '_blank', `width=${winWidth},height=${winHeight},left=${left},top=${top}`);
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
    win.onafterprint = () => win.close();
  };
}
