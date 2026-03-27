/**
 * DisciplinaIcon — SVG logo para cada disciplina del club.
 * Props: disciplina (string), size (number, default 32)
 */

const Futvoley = ({ size }) => (
  /* Pelota Mikasa VLS300 — azul/amarillo, paneles curvos característicos */
  <svg width={size} height={size} viewBox="0 0 40 40">
    <defs>
      <clipPath id="mikasa-clip">
        <circle cx="20" cy="20" r="17"/>
      </clipPath>
      <radialGradient id="mikasa-grad" cx="38%" cy="35%" r="60%">
        <stop offset="0%" stopColor="#1E88E5"/>
        <stop offset="100%" stopColor="#0D47A1"/>
      </radialGradient>
    </defs>

    {/* Sombra suave */}
    <circle cx="21" cy="21.5" r="16.5" fill="rgba(0,0,0,0.18)"/>

    {/* Base azul con gradiente */}
    <circle cx="20" cy="20" r="17" fill="url(#mikasa-grad)"/>

    {/* Paneles amarillos Mikasa — clipeados al círculo */}
    <g clipPath="url(#mikasa-clip)">
      {/* Panel superior-izquierdo */}
      <path
        d="M2,14 C5,5 13,0 22,1 C30,2 37,8 38,17 C31,13 23,13 17,17 C11,21 8,28 10,35 C5,30 1,23 2,14Z"
        fill="#FFB300"
      />
      {/* Panel inferior-derecho */}
      <path
        d="M30,28 C28,34 23,38 18,39 C13,40 8,37 5,33 C9,35 15,35 20,32 C25,29 28,23 30,28Z"
        fill="#FFB300"
      />
    </g>

    {/* Costuras blancas */}
    <g clipPath="url(#mikasa-clip)" fill="none" stroke="white" strokeLinecap="round">
      {/* Costura superior del panel */}
      <path d="M2,14 C5,5 13,0 22,1 C30,2 37,8 38,17" strokeWidth="1.4"/>
      {/* Costura inferior del panel */}
      <path d="M10,35 C8,28 11,21 17,17 C23,13 31,13 38,17" strokeWidth="1.4"/>
      {/* Cola inferior */}
      <path d="M10,35 C11,37 14,39 18,39" strokeWidth="1.4"/>
      {/* Costura derecha */}
      <path d="M30,28 C32,23 32,17 29,13" strokeWidth="1" opacity="0.6"/>
    </g>

    {/* Contorno */}
    <circle cx="20" cy="20" r="17" fill="none" stroke="#0D47A1" strokeWidth="1"/>

    {/* Reflejo de luz */}
    <ellipse cx="13" cy="12" rx="5" ry="3" fill="white" opacity="0.2" transform="rotate(-35 13 12)"/>
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
