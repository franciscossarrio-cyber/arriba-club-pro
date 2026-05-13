// Configuración
export const DISCIPLINAS = ['Futvoley', 'Beach Tennis', 'Beach Volley', 'Funcional'];

const _DC = { bg: 'bg-primary/10', border: 'border-primary/30', text: 'text-primary', ring: 'ring-primary' };
export const DISC_COLORS = {
  'Futvoley':     _DC,
  'Beach Tennis': _DC,
  'Beach Volley': _DC,
  'Funcional':    _DC,
};
export const HORARIOS = ['17:00', '18:00', '19:00', '20:00', '21:00'];
export const TIPOS_MEMBRESIA = ['Membresía mensual', 'Clases privadas', 'Clases sueltas', 'Clase de prueba', 'Day Use'];
export const PRECIOS_TIPOS_DEFAULT = {
  'Futvoley':     { 'Membresía mensual': 0, 'Clases privadas': 0, 'Clases sueltas': 0, 'Clase de prueba': 0, 'Day Use': 0 },
  'Beach Tennis': { 'Membresía mensual': 0, 'Clases privadas': 0, 'Clases sueltas': 0, 'Clase de prueba': 0, 'Day Use': 0 },
  'Beach Volley': { 'Membresía mensual': 0, 'Clases privadas': 0, 'Clases sueltas': 0, 'Clase de prueba': 0, 'Day Use': 0 },
  'Funcional':    { 'Membresía mensual': 0, 'Clases privadas': 0, 'Clases sueltas': 0, 'Clase de prueba': 0, 'Day Use': 0 },
  'Gimnasio':     { 'Membresía mensual': 0, 'Clases privadas': 0, 'Clases sueltas': 0, 'Clase de prueba': 0, 'Day Use': 0 },
};

// Precios QR de membresías por disciplina/plan/frecuencia (configurables por mes)
export const PRECIOS_QR_DEFAULT = {
  'Futvoley':     { 'Arena Basic': { '1x sem': 70000, '2x sem': 134000 }, 'Arena Plus': { '1x sem': 98000,  '2x sem': 209000 }, 'Arena Premium': { '1x sem': 129000, '2x sem': 246000 } },
  'Beach Tennis': { 'Arena Basic': { '1x sem': 84000, '2x sem': 162400 }, 'Arena Plus': { '1x sem': 117600, '2x sem': 235200 }, 'Arena Premium': { '1x sem': 147000, '2x sem': 296800 } },
  'Beach Volley': { 'Arena Basic': { '1x sem': 70000, '2x sem': 134000 }, 'Arena Plus': { '1x sem': 98000,  '2x sem': 209000 }, 'Arena Premium': { '1x sem': 129000, '2x sem': 246000 } },
  'Funcional':    { 'Arena Basic': { '1x sem': 70000, '2x sem': 134000 }, 'Arena Plus': { '1x sem': 98000,  '2x sem': 209000 }, 'Arena Premium': { '1x sem': 129000, '2x sem': 246000 } },
};

// Precios de clases privadas/semi-privadas por disciplina y número de personas
// Efectivo = EFT, Transferencia = QR (25% más)
const _BT_PRIV = { privada_1p: { Efectivo: 56000, Transferencia: 70000 }, privada_2p: { Efectivo: 36400, Transferencia: 45500 }, privada_3p: { Efectivo: 26320, Transferencia: 32900 }, privada_4p: { Efectivo: 20720, Transferencia: 25900 } };
const _FV_PRIV = { privada_1p: { Efectivo: 50000, Transferencia: 62500 }, privada_2p: { Efectivo: 30000, Transferencia: 37500 }, privada_3p: { Efectivo: 25000, Transferencia: 31250 }, privada_4p: { Efectivo: 25000, Transferencia: 31250 } };
export const PRECIOS_PRIVADAS_DEFAULT = {
  'Futvoley':     _FV_PRIV,
  'Beach Tennis': _BT_PRIV,
  'Beach Volley': _FV_PRIV,
  'Funcional':    _FV_PRIV,
  'Gimnasio':     _FV_PRIV,
};
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

/**
 * Cuenta cuántos días del mes caen en los días elegidos por el alumno.
 * @param {number[]} diasElegidos — ej: [1,3] para Lun y Mié (getDay())
 * @param {number} mes — 1-12
 * @param {number} anio
 */
export const getClasesDelMes = (diasElegidos, mes, anio) => {
  if (!diasElegidos?.length) return 0;
  const ultimo = new Date(anio, mes, 0).getDate();
  let count = 0;
  for (let d = 1; d <= ultimo; d++) {
    if (diasElegidos.includes(new Date(anio, mes - 1, d).getDay())) count++;
  }
  return count;
};

// Todas las fechas "dd/mm" de un mes
export const getFechasMes = (mes, anio) => {
  const fechas = [];
  const ultimo = new Date(anio, mes, 0).getDate();
  for (let d = 1; d <= ultimo; d++) {
    const dia = String(d).padStart(2, '0');
    const mesStr = String(mes).padStart(2, '0');
    fechas.push(`${dia}/${mesStr}`);
  }
  return fechas;
};

// Buscar alumno por nombre o apodo
export const buscarAlumno = (texto, alumnos) => {
  const t = texto.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return alumnos.find(a =>
    a.apodos?.some(ap => ap.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(t)) ||
    a.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(t)
  );
};

// Descarga un array como CSV (con BOM para Excel/Sheets)
export const downloadCSV = (headers, rows, filename) => {
  const BOM = '﻿';
  const csv = BOM + [headers, ...rows]
    .map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
