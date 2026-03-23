# Arriba Club Pro 🏐

Sistema de gestión para clubes de Beach Sports (Futvoley, Beach Tennis, Beach Volley, Funcional).

![React](https://img.shields.io/badge/React-18-blue)
![Vite](https://img.shields.io/badge/Vite-5-purple)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-cyan)

## ✨ Características

- **Dashboard** - Métricas en tiempo real por disciplina
- **Gestión de Alumnos** - CRUD completo con filtros por horario
- **Control de Clases** - Asistencias con carga masiva desde WhatsApp
- **Pagos** - Registro rápido con comando de texto + recordatorios por WhatsApp
- **Profesores** - Asignación de clases y cálculo automático de pagos (50%)
- **Configuración** - Precios por plan y frecuencia
- **Responsive** - Funciona en desktop y mobile

## 🚀 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/arriba-club-pro.git
cd arriba-club-pro

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu API URL

# Iniciar en desarrollo
npm run dev
```

## 📁 Estructura del Proyecto

```
arriba-club-pro/
├── src/
│   ├── components/       # Componentes React
│   │   ├── Icon.jsx
│   │   ├── Login.jsx
│   │   ├── Sidebar.jsx
│   │   ├── BottomNav.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Alumnos.jsx
│   │   ├── Clases.jsx
│   │   ├── Pagos.jsx
│   │   ├── Profesores.jsx
│   │   └── Configuracion.jsx
│   ├── hooks/            # Custom hooks
│   │   └── useApi.js
│   ├── utils/            # Funciones auxiliares
│   │   └── helpers.js
│   ├── App.jsx           # Componente principal
│   ├── main.jsx          # Entry point
│   └── index.css         # Estilos globales + Tailwind
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── .env.example
```

## ⚙️ Configuración

### Variables de Entorno

```env
VITE_API_URL=https://script.google.com/macros/s/TU_ID/exec
VITE_ACCESS_KEY=tu_clave_de_acceso
```

### Backend (Google Apps Script)

El proyecto usa Google Apps Script como backend. Necesitás:

1. Crear un Google Sheet con las hojas: `Alumnos`, `Pagos`, `Asistencias`
2. Crear un proyecto de Apps Script vinculado
3. Implementar las funciones de API (getAlumnos, addPago, etc.)
4. Deployar como Web App

## 🛠️ Scripts

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build para producción
npm run preview  # Preview del build
npm run lint     # Verificar código
```

## 🚀 Deploy

### Vercel (Recomendado)

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm run build
# Subir carpeta dist/ a Netlify
```

## 📱 Screenshots

| Dashboard | Alumnos | Pagos |
|-----------|---------|-------|
| ![Dashboard](screenshots/dashboard.png) | ![Alumnos](screenshots/alumnos.png) | ![Pagos](screenshots/pagos.png) |

## 🗺️ Roadmap

- [ ] Migrar a Supabase (Auth + Database)
- [ ] Roles de usuario (Admin, Profesor, Alumno)
- [ ] Notificaciones push
- [ ] Integración con Mercado Pago
- [ ] App móvil (React Native)

## 📄 Licencia

MIT © Arriba Club

---

Desarrollado con ❤️ para la comunidad de Beach Sports
