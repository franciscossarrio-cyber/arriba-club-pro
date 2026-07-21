/**
 * Cloud Functions — Arriba Club Pro
 *
 * generarCSR   → genera un par de claves RSA + CSR listo para subir a ARCA
 * emitirFactura → firma y envía una factura a AFIP via SDK de ARCA
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp }      = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { Arca }               = require('@arcasdk/core');
const forge                  = require('node-forge');

initializeApp();

const NC_TIPO_MAP = { 1: 3, 6: 8, 11: 13 };

// ─── generarCSR ──────────────────────────────────────────────────────────────
/**
 * Genera un par de claves RSA 2048 y un CSR listo para subir a ARCA.
 *
 * Input:  { cuit: string, organizacion?: string }
 * Output: { csr: string }   ← el .csr que hay que subir a ARCA
 *
 * La clave privada (.key) se guarda automáticamente en Firestore config/arca
 * para que emitirFactura la use después.
 */
exports.generarCSR = onCall({ invoker: 'public' }, async (request) => {
  const { cuit, organizacion = 'Arriba Club' } = request.data || {};

  if (!cuit) {
    throw new HttpsError('invalid-argument', 'El campo "cuit" es requerido');
  }

  // Generar par de claves RSA 2048 bits
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048 });

  // Construir el CSR
  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = keypair.publicKey;
  csr.setSubject([
    { name: 'commonName',       value: cuit.replace(/\D/g, '') },
    { name: 'organizationName', value: organizacion             },
    { name: 'countryName',      value: 'AR'                    },
  ]);
  csr.sign(keypair.privateKey, forge.md.sha256.create());

  const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
  const csrPem        = forge.pki.certificationRequestToPem(csr);

  // Guardar la clave privada en Firestore (la usará emitirFactura)
  const db = getFirestore();
  await db.doc('config/arca').set(
    { key: privateKeyPem, cuit },
    { merge: true }
  );

  // Solo devolvemos el CSR — el .key queda seguro en Firestore, no en el cliente
  return { csr: csrPem };
});

// ─── emitirFactura ────────────────────────────────────────────────────────────
/**
 * Envía una factura a AFIP/ARCA y guarda el CAE en Firestore.
 *
 * Input:  { facturaId: string }
 * Output: { cae: string, caeFchVto: string, nroComprobante: number }
 */
exports.emitirFactura = onCall({ invoker: 'public' }, async (request) => {
  const { facturaId } = request.data || {};

  if (!facturaId) {
    throw new HttpsError('invalid-argument', 'El campo "facturaId" es requerido');
  }

  const db = getFirestore();

  // Leer factura
  const facturaSnap = await db.doc(`facturas/${facturaId}`).get();
  if (!facturaSnap.exists) {
    throw new HttpsError('not-found', `Factura ${facturaId} no encontrada`);
  }
  const factura = facturaSnap.data();

  // Leer credenciales ARCA
  const configSnap = await db.doc('config/arca').get();
  const config     = configSnap.exists ? configSnap.data() : null;

  if (!config?.cuit || !config?.cert || !config?.key) {
    throw new HttpsError(
      'failed-precondition',
      'Configuración ARCA incompleta. Necesitás CUIT, certificado (.crt) y clave privada (.key).'
    );
  }

  try {
    const arca = new Arca({
      cuit:       parseInt(config.cuit.replace(/\D/g, ''), 10),
      cert:       config.cert,
      key:        config.key,
      production: config.production === true, // false = homologación (default)
    });

    const payload = { ...factura.arcaPayload };

    // createNextVoucher auto-calcula CbteDesde/CbteHasta consultando el último nro
    const lastVoucher    = await arca.electronicBillingService.getLastVoucher(payload.PtoVta, payload.CbteTipo);
    const nroComprobante = (lastVoucher.cbteNro || 0) + 1;

    const resultado = await arca.electronicBillingService.createNextVoucher({
      CantReg: 1,
      ...payload,
    });

    const cae       = resultado.cae;
    const caeFchVto = resultado.caeFchVto;

    // Actualizar factura con el CAE
    await db.doc(`facturas/${facturaId}`).update({
      estado:         'enviada',
      cae,
      caeFchVto,
      nroComprobante,
    });

    return { cae, caeFchVto, nroComprobante };

  } catch (err) {
    // Guardar el error en la factura para diagnóstico
    await db.doc(`facturas/${facturaId}`).update({
      estado:   'error',
      errorMsg: err.message,
    });
    throw new HttpsError('internal', err.message);
  }
});

// ─── emitirNotaCredito ────────────────────────────────────────────────────────
/**
 * Emite una Nota de Crédito que anula una factura previamente enviada.
 *
 * Input:  { facturaId: string }   ← ID de la factura original
 * Output: { notaCreditoId, cae, caeFchVto, nroComprobante }
 */
exports.emitirNotaCredito = onCall({ invoker: 'public' }, async (request) => {
  const { facturaId, fechaISO } = request.data || {};

  if (!facturaId) {
    throw new HttpsError('invalid-argument', 'El campo "facturaId" es requerido');
  }

  const fechaArca    = fechaISO ? fechaISO.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fechaDisplay = fechaISO
    ? fechaISO.split('-').reverse().join('/')
    : new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

  const db = getFirestore();

  // Leer factura original
  const facturaSnap = await db.doc(`facturas/${facturaId}`).get();
  if (!facturaSnap.exists) {
    throw new HttpsError('not-found', `Factura ${facturaId} no encontrada`);
  }
  const factura = facturaSnap.data();

  if (factura.estado !== 'enviada') {
    throw new HttpsError('failed-precondition', 'Solo se puede emitir NC de facturas enviadas');
  }
  if (factura.notaCreditoId) {
    throw new HttpsError('already-exists', 'Esta factura ya tiene una Nota de Crédito emitida');
  }

  const cbteTipoOrig = factura.arcaPayload?.CbteTipo;
  const cbteTipoNC   = NC_TIPO_MAP[cbteTipoOrig];
  if (!cbteTipoNC) {
    throw new HttpsError('invalid-argument', `El tipo de comprobante ${cbteTipoOrig} no admite NC`);
  }

  // Leer credenciales ARCA
  const configSnap = await db.doc('config/arca').get();
  const config     = configSnap.exists ? configSnap.data() : null;
  if (!config?.cuit || !config?.cert || !config?.key) {
    throw new HttpsError('failed-precondition', 'Configuración ARCA incompleta (CUIT, cert, key)');
  }

  // Construir payload de la NC
  const ncPayload = {
    ...factura.arcaPayload,
    CbteTipo:   cbteTipoNC,
    CbteFch:    fechaArca,
    CbtesAsoc:  [{ Tipo: cbteTipoOrig, PtoVta: factura.arcaPayload.PtoVta, Nro: factura.nroComprobante }],
  };

  // Crear documento NC en borrador
  const ncRef = await db.collection('facturas').add({
    tipo:              'nota_credito',
    facturaOriginalId: facturaId,
    fecha:             fechaDisplay,
    cliente:           factura.cliente,
    items:             factura.items,
    neto:              factura.neto,
    ivaTotal:          factura.ivaTotal,
    total:             factura.total,
    arcaPayload:       ncPayload,
    estado:            'borrador',
    creadoEn:          FieldValue.serverTimestamp(),
  });

  try {
    const arca = new Arca({
      cuit:       parseInt(config.cuit.replace(/\D/g, ''), 10),
      cert:       config.cert,
      key:        config.key,
      production: config.production === true,
    });

    const lastVoucher    = await arca.electronicBillingService.getLastVoucher(ncPayload.PtoVta, ncPayload.CbteTipo);
    const nroComprobante = (lastVoucher.cbteNro || 0) + 1;

    const resultado = await arca.electronicBillingService.createNextVoucher({
      CantReg: 1,
      ...ncPayload,
    });

    const cae       = resultado.cae;
    const caeFchVto = resultado.caeFchVto;

    await ncRef.update({ estado: 'enviada', cae, caeFchVto, nroComprobante });
    await db.doc(`facturas/${facturaId}`).update({ notaCreditoId: ncRef.id });

    return { notaCreditoId: ncRef.id, cae, caeFchVto, nroComprobante };

  } catch (err) {
    await ncRef.update({ estado: 'error', errorMsg: err.message });
    throw new HttpsError('internal', err.message);
  }
});
