import Icon from './Icon';

const BottomNav = ({ seccionActiva, setSeccionActiva }) => {
  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Home' },
    { id: 'alumnos', icon: 'group', label: 'Alumnos' },
    { id: 'clases', icon: 'fact_check', label: 'Clases' },
    { id: 'pagos', icon: 'payments', label: 'Pagos' },
    { id: 'profesores', icon: 'sports', label: 'Profes' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 w-full px-4 pb-6 pt-2 flex justify-around items-center glass-nav z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
      {navItems.map(item => (
        <button
          key={item.id}
          onClick={() => setSeccionActiva(item.id)}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
            seccionActiva === item.id
              ? 'bg-primary text-white shadow-lg shadow-primary/30'
              : 'text-on-surface-variant'
          }`}
        >
          <Icon name={item.icon} filled={seccionActiva === item.id} size={22} />
          <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
