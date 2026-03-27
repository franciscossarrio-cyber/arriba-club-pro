/**
 * DisciplinaIcon — SVG logo para cada disciplina del club.
 * Props: disciplina (string), size (number, default 32)
 */

const Futvoley = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    {/* Pelota de fútbol / futvoley */}
    <circle cx="20" cy="20" r="17" fill="#1c1c2e" />
    {/* Pentágono central */}
    <polygon points="20,9 27,14.5 24.5,22.5 15.5,22.5 13,14.5" fill="white" />
    {/* Líneas a los hexágonos del borde */}
    <line x1="20"   y1="9"    x2="20"   y2="3.5"  stroke="white" strokeWidth="1.4"/>
    <line x1="27"   y1="14.5" x2="32"   y2="11"   stroke="white" strokeWidth="1.4"/>
    <line x1="24.5" y1="22.5" x2="28"   y2="27"   stroke="white" strokeWidth="1.4"/>
    <line x1="15.5" y1="22.5" x2="12"   y2="27"   stroke="white" strokeWidth="1.4"/>
    <line x1="13"   y1="14.5" x2="8"    y2="11"   stroke="white" strokeWidth="1.4"/>
    <circle cx="20" cy="20" r="17" stroke="#111" strokeWidth="1.2"/>
  </svg>
);

const BeachTennis = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    {/* Cabeza de raqueta */}
    <ellipse cx="20" cy="15.5" rx="13" ry="13.5" fill="#e05a00" />
    {/* Arco interior */}
    <ellipse cx="20" cy="15.5" rx="9.5" ry="10" fill="none" stroke="white" strokeWidth="1.4"/>
    {/* Cuerdas verticales */}
    <line x1="15" y1="5.5"  x2="15" y2="25.5" stroke="white" strokeWidth="0.9"/>
    <line x1="20" y1="2.5"  x2="20" y2="28.5" stroke="white" strokeWidth="0.9"/>
    <line x1="25" y1="5.5"  x2="25" y2="25.5" stroke="white" strokeWidth="0.9"/>
    {/* Cuerdas horizontales */}
    <line x1="7.5" y1="11"  x2="32.5" y2="11"  stroke="white" strokeWidth="0.9"/>
    <line x1="7"   y1="15.5" x2="33"  y2="15.5" stroke="white" strokeWidth="0.9"/>
    <line x1="7.5" y1="20"  x2="32.5" y2="20"  stroke="white" strokeWidth="0.9"/>
    {/* Mango */}
    <rect x="18" y="28.5" width="4" height="9" rx="2" fill="#b34500"/>
    <rect x="18" y="31"   width="4" height="2" fill="#8a3400" rx="1"/>
    {/* Pelotita */}
    <circle cx="33" cy="8" r="3.5" fill="#c8e000" />
    <path d="M30.5,6.5 C32,5 34,6 34,7.5" stroke="#8fa000" strokeWidth="0.8" fill="none"/>
  </svg>
);

const BeachVolley = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    {/* Pelota de vóley */}
    <circle cx="20" cy="20" r="17" fill="#f5a623" />
    {/* Panel lines — 3 bandas curvas */}
    <path d="M20,3 C12,9 12,18 20,20 C28,22 34,15 37,10" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M3,20 C9,12 18,12 20,20 C22,28 15,34 10,37" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M37,20 C31,28 22,28 20,20 C18,12 25,6 30,3"  stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    <circle cx="20" cy="20" r="17" stroke="#c8810a" strokeWidth="1.2"/>
  </svg>
);

const Funcional = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    {/* Barra */}
    <rect x="5" y="18" width="30" height="4" rx="2" fill="#7c3aed"/>
    {/* Disco izquierdo */}
    <rect x="3"  y="13" width="7" height="14" rx="3.5" fill="#5b21b6"/>
    {/* Disco derecho */}
    <rect x="30" y="13" width="7" height="14" rx="3.5" fill="#5b21b6"/>
    {/* Collar izquierdo */}
    <rect x="1"  y="15" width="4" height="10" rx="2" fill="#4c1d95"/>
    {/* Collar derecho */}
    <rect x="35" y="15" width="4" height="10" rx="2" fill="#4c1d95"/>
  </svg>
);

const ICONS = {
  'Futvoley':     Futvoley,
  'Beach Tennis': BeachTennis,
  'Beach Volley': BeachVolley,
  'Funcional':    Funcional,
};

const DisciplinaIcon = ({ disciplina, size = 32 }) => {
  const Comp = ICONS[disciplina];
  if (!Comp) return null;
  return <Comp size={size} />;
};

export default DisciplinaIcon;
