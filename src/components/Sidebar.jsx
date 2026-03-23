import Icon from './Icon';
import { DISCIPLINAS } from '../utils/helpers';

const Sidebar = ({
  seccionActiva,
  setSeccionActiva,
  disciplinaActiva,
  setDisciplinaActiva,
  onSync,
  onLogout,
  syncing
}) => {
  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { id: 'alumnos', icon: 'group', label: 'Alumnos' },
    { id: 'clases', icon: 'fact_check', label: 'Clases' },
    { id: 'pagos', icon: 'payments', label: 'Pagos' },
    { id: 'profesores', icon: 'sports', label: 'Profesores' },
    { id: 'configuracion', icon: 'settings', label: 'Configuración' },
  ];

  return (
    <aside className="hidden lg:flex flex-col p-4 bg-white/70 backdrop-blur-xl rounded-3xl m-4 h-[calc(100vh-2rem)] w-64 fixed left-0 top-0 shadow-[0_20px_40px_rgba(25,28,30,0.06)] z-50">
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-lg">
          <Icon name="sports_tennis" filled />
        </div>
        <div>
          <h1 className="text-lg font-black text-primary">Arriba Club Pro</h1>
          <p className="text-[10px] uppercase tracking-widest text-outline">Beach Sports Mgmt</p>
        </div>
      </div>

      {/* Discipline Selector */}
      <div className="px-2 mb-6">
        <select
          value={disciplinaActiva}
          onChange={(e) => setDisciplinaActiva(e.target.value)}
          className="w-full px-4 py-3 bg-primary/10 border-2 border-primary/20 rounded-xl text-primary text-sm font-bold cursor-pointer"
        >
          {DISCIPLINAS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setSeccionActiva(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              seccionActiva === item.id
                ? 'bg-primary/10 text-primary font-bold'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
            }`}
          >
            <Icon name={item.icon} filled={seccionActiva === item.id} />
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto space-y-2">
        <button
          onClick={onSync}
          disabled={syncing}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface-container-high hover:bg-surface-container-highest rounded-xl text-on-surface-variant text-sm font-medium transition-colors"
        >
          <Icon name="sync" className={syncing ? 'spinner' : ''} size={18} /> Sincronizar
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 hover:bg-error/10 rounded-xl text-error text-sm font-medium transition-colors"
        >
          <Icon name="logout" size={18} /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
