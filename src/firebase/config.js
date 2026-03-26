import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────
// Completá estas variables en tu archivo .env local.
// Copiá .env.example → .env y reemplazá cada valor con los
// datos de tu proyecto en Firebase Console > Configuración.
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'TU_API_KEY',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || 'tu-proyecto.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || 'tu-proyecto-id',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || 'tu-proyecto.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || '1:000000000000:web:0000000000000000',
};

const app = initializeApp(firebaseConfig);

/** Instancia de Firestore lista para importar */
export const db = getFirestore(app);

export default app;
