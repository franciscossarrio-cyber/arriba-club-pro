/**
 * Cloud Functions — Arriba Club Pro
 *
 * generarCSR   → genera un par de claves RSA + CSR listo para subir a ARCA
 * emitirFactura → firma y envía una factura a AFIP via SDK de ARCA
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp }      = require('firebase-admin/app');
const { getFirestore }       = require('firebase-admin/firestore');
const { Arca }               = require('@arcasdk/core');
const forge                  = require('node-forge');

initializeApp();

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

    // Obtener el último número de comprobante autorizado para este PtoVta y CbteTipo
    // y calcular el siguiente
    const payload = { ...factura.arcaPayload };

    const resultado = await arca.electronicBillingService.createVoucher({
      CantReg:    1,
      ...payload,
    });

    const cae            = resultado.CAE;
    const caeFchVto      = resultado.CAEFchVto;
    const nroComprobante = payload.CbteDesde;

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
