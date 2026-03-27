/**
 * DisciplinaIcon — SVG logo para cada disciplina del club.
 * Props: disciplina (string), size (number, default 32)
 */

const Futvoley = ({ size }) => (
  /* Pelota Mikasa FT-5 — amarilla con paneles negros pentagonales/hexagonales */
  <svg width={size} height={size} viewBox="0 0 40 40">
    <defs>
      <clipPath id="fv-c"><circle cx="20" cy="20" r="17"/></clipPath>
      <radialGradient id="fv-g" cx="38%" cy="32%" r="65%">
        <stop offset="0%"   stopColor="#FFE840"/>
        <stop offset="100%" stopColor="#F5A800"/>
      </radialGradient>
    </defs>

    {/* Sombra */}
    <circle cx="21" cy="21.5" r="16.5" fill="rgba(0,0,0,0.2)"/>
    {/* Base amarilla */}
    <circle cx="20" cy="20" r="17" fill="url(#fv-g)"/>

    {/* Paneles negros — patrón Mikasa FT-5 (pentágono + 6 hexágonos alrededor) */}
    <g clipPath="url(#fv-c)" fill="#111">
      {/* Pentágono superior */}
      <polygon points="20,4  25.2,8  23.2,14  16.8,14  14.8,8"/>
      {/* Hexágono top-right */}
      <polygon points="25.2,8  32,6.5  35.5,13.5  31,19.5  23.2,14"/>
      {/* Hexágono right */}
      <polygon points="31,19.5  37,22  35,29.5  28.5,31.5  25.5,25  23.2,19.5"/>
      {/* Hexágono bottom-right */}
      <polygon points="25.5,25  28,32.5  22,37  16.5,34.5  16.8,27.5"/>
      {/* Hexágono bottom-left */}
      <polygon points="9,28.5  15,25.5  16.8,27.5  14.5,35  8,32"/>
      {/* Hexágono left */}
      <polygon points="4.5,21.5  10.5,18.5  14.8,22  13,30  7,27.5"/>
      {/* Hexágono top-left */}
      <polygon points="14.8,8  16.8,14  10.5,17  5,13  8,6.5"/>
    </g>

    {/* Costuras finas entre paneles */}
    <g clipPath="url(#fv-c)" fill="none" stroke="#555" strokeWidth="0.35" opacity="0.6">
      <polygon points="20,4  25.2,8  23.2,14  16.8,14  14.8,8"/>
      <polygon points="25.2,8  32,6.5  35.5,13.5  31,19.5  23.2,14"/>
      <polygon points="31,19.5  37,22  35,29.5  28.5,31.5  25.5,25  23.2,19.5"/>
      <polygon points="25.5,25  28,32.5  22,37  16.5,34.5  16.8,27.5"/>
      <polygon points="9,28.5  15,25.5  16.8,27.5  14.5,35  8,32"/>
      <polygon points="4.5,21.5  10.5,18.5  14.8,22  13,30  7,27.5"/>
      <polygon points="14.8,8  16.8,14  10.5,17  5,13  8,6.5"/>
    </g>

    {/* Contorno */}
    <circle cx="20" cy="20" r="17" fill="none" stroke="#CC8C00" strokeWidth="1.2"/>
    {/* Reflejo */}
    <ellipse cx="13" cy="12" rx="5" ry="3" fill="white" opacity="0.22" transform="rotate(-35 13 12)"/>
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
