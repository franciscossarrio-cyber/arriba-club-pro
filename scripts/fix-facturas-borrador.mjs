import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

const app = initializeApp({
  apiKey:            'AIzaSyD1q2z3oaRl6gCdWSx599UEkGCQyYZ0l1E',
  authDomain:        'arriba-club-pro.firebaseapp.com',
  projectId:         'arriba-club-pro',
  storageBucket:     'arriba-club-pro.firebasestorage.app',
  messagingSenderId: '972629066872',
  appId:             '1:972629066872:web:8f2f819daf996b0599598d',
});

const db = getFirestore(app);
const snap = await getDocs(query(collection(db, 'facturas'), where('estado', '==', 'borrador')));

for (const d of snap.docs) {
  const f = d.data();
  const total    = parseFloat(f.total.toFixed(2));
  const ivaTotal = parseFloat((f.ivaTotal ?? 0).toFixed(2));
  const neto     = parseFloat((f.neto ?? total).toFixed(2));

  // Reconstruir array Iva por ítem
  const ivaMap = {};
  (f.items ?? []).forEach(({ precio, cantidad, iva = 21 }) => {
    const sub  = precio * cantidad;
    const rate = iva / 100;
    const n    = sub / (1 + rate);
    const id   = { 0: 3, 10.5: 4, 21: 5, 27: 6 }[iva] ?? 5;
    if (!ivaMap[iva]) ivaMap[iva] = { Id: id, BaseImp: 0, Importe: 0 };
    ivaMap[iva].BaseImp += n;
    ivaMap[iva].Importe += sub - n;
  });

  const ivaArray = Object.values(ivaMap).map(v => ({
    ...v,
    BaseImp: parseFloat(v.BaseImp.toFixed(2)),
    Importe: parseFloat(v.Importe.toFixed(2)),
  }));

  const newPayload = {
    ...f.arcaPayload,
    CbteTipo:   6,
    ImpTotal:   total,
    ImpNeto:    neto,
    ImpIVA:     ivaTotal,
    ImpTotConc: 0,
    ImpOpEx:    0,
    ImpTrib:    0,
    Iva:        ivaArray,
  };

  await updateDoc(doc(db, 'facturas', d.id), { arcaPayload: newPayload });
  console.log(`✓ ${d.id} — Factura B, total: ${total}, IVA: ${ivaTotal}`);
}

console.log('Listo.');
process.exit(0);
