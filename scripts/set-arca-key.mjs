import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const forge = require(join(__dirname, '../functions/node_modules/node-forge'));

const app = initializeApp({
  apiKey:            'AIzaSyD1q2z3oaRl6gCdWSx599UEkGCQyYZ0l1E',
  authDomain:        'arriba-club-pro.firebaseapp.com',
  projectId:         'arriba-club-pro',
  storageBucket:     'arriba-club-pro.firebasestorage.app',
  messagingSenderId: '972629066872',
  appId:             '1:972629066872:web:8f2f819daf996b0599598d',
});

const db = getFirestore(app);

// Convertir PKCS#8 → PKCS#1 (RSA)
const pkcs8Pem = readFileSync('C:/Users/Usuario/Downloads/arenagroup.key', 'utf8');
const privateKey = forge.pki.privateKeyFromPem(pkcs8Pem);
const pkcs1Pem = forge.pki.privateKeyToPem(privateKey);

await setDoc(doc(db, 'config', 'arca'), {
  key:        pkcs1Pem,
  production: true,
  ptoVta:     2,
}, { merge: true });

console.log('✓ Firestore actualizado:');
console.log('  key:        PKCS#1 RSA');
console.log('  production: true');
console.log('  ptoVta:     2');
process.exit(0);
