// Configuración
export const DISCIPLINAS = ['Futvoley', 'Beach Tennis', 'Beach Volley', 'Funcional'];
export const HORARIOS = ['17:00', '18:00', '19:00', '20:00', '21:00'];
export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const PRECIOS_DEFAULT = {
  'Futvoley': { 'Arena Basic': { '1x sem': 50000, '2x sem': 95000 }, 'Arena Plus': { '1x sem': 70000, '2x sem': 140000 }, 'Arena Premium': { '1x sem': 85000, '2x sem': 175000 } },
  'Beach Tennis': { 'Arena Basic': { '1x sem': 50000, '2x sem': 95000 }, 'Arena Plus': { '1x sem': 70000, '2x sem': 140000 }, 'Arena Premium': { '1x sem': 85000, '2x sem': 175000 } },
  'Beach Volley': { 'Arena Basic': { '1x sem': 50000, '2x sem': 95000 }, 'Arena Plus': { '1x sem': 70000, '2x sem': 140000 }, 'Arena Premium': { '1x sem': 85000, '2x sem': 175000 } },
  'Funcional': { 'Arena Basic': { '1x sem': 50000, '2x sem': 95000 }, 'Arena Plus': { '1x sem': 70000, '2x sem': 140000 }, 'Arena Premium': { '1x sem': 85000, '2x sem': 175000 } },
};

// Obtener mes actual formateado
export const getMesActual = () => {
  const hoy = new Date();
  return `${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`;
};

// Obtener fechas de clase del mes (Lunes y Miércoles)
export const getFechasClaseMes = (mes, anio) => {
  const fechas = [];
  const fecha = new Date(anio, mes - 1, 1);
  while (fecha.getMonth() === mes - 1) {
    if (fecha.getDay() === 1 || fecha.getDay() === 3) {
      const dia = String(fecha.getDate()).padStart(2, '0');
      const mesStr = String(fecha.getMonth() + 1).padStart(2, '0');
      fechas.push(`${dia}/${mesStr}`);
    }
    fecha.setDate(fecha.getDate() + 1);
  }
  return fechas;
};

// Formatear monto como moneda argentina
export const formatMonto = (monto) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(monto);
};

// Parsear mes actual a número y año
export const parseMesActual = (mesActual) => {
  const partes = mesActual.split(' ');
  return {
    mesNum: MESES.indexOf(partes[0]) + 1,
    anio: parseInt(partes[1])
  };
};

// Generar link de WhatsApp
export const getWhatsAppLink = (alumno, mesActual, preciosDisciplina) => {
  let telefono = alumno.telefono?.replace(/\D/g, '') || '';
  if (!telefono.startsWith('54')) {
    telefono = '54' + telefono;
  }
  const monto = formatMonto(preciosDisciplina[alumno.plan]?.[alumno.frecuencia] || 95000);
  const mensaje = encodeURIComponent(
    `Hola ${alumno.nombre.split(' ')[0]}! Te escribo de Arriba Club. Queríamos recordarte que tenés pendiente el pago de ${mesActual} (${monto}). Cualquier duda avisanos!`
  );
  return `https://wa.me/${telefono}?text=${mensaje}`;
};

// Buscar alumno por nombre o apodo
export const buscarAlumno = (texto, alumnos) => {
  const t = texto.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return alumnos.find(a =>
    a.apodos?.some(ap => ap.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(t)) ||
    a.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(t)
  );
};

// Storage helpers
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(`arribaclub_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(`arribaclub_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  },
  remove: (key) => {
    localStorage.removeItem(`arribaclub_${key}`);
  }
};
