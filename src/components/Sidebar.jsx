import Icon from './Icon';
import DisciplinaIcon from './DisciplinaIcon';
import { DISCIPLINAS } from '../utils/helpers';

const DISCIPLINA_COLORS = {
  'Futvoley':     { ring: 'ring-slate-800',  bg: 'bg-slate-800/10',  text: 'text-slate-800'  },
  'Beach Tennis': { ring: 'ring-orange-600', bg: 'bg-orange-600/10', text: 'text-orange-600' },
  'Beach Volley': { ring: 'ring-amber-500',  bg: 'bg-amber-500/10',  text: 'text-amber-600'  },
  'Funcional':    { ring: 'ring-violet-600', bg: 'bg-violet-600/10', text: 'text-violet-700'  },
};

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
    { id: 'dashboard',     icon: 'dashboard',   label: 'Dashboard'    },
    { id: 'alumnos',       icon: 'group',        label: 'Alumnos'      },
    { id: 'clases',        icon: 'fact_check',   label: 'Clases'       },
    { id: 'canchas',       icon: 'grid_view',    label: 'Canchas'      },
    { id: 'pagos',         icon: 'payments',     label: 'Pagos'        },
    { id: 'profesores',    icon: 'sports',       label: 'Profesores'   },
    { id: 'configuracion', icon: 'settings',     label: 'Configuración'},
  ];

  const colores = DISCIPLINA_COLORS[disciplinaActiva] || DISCIPLINA_COLORS['Futvoley'];

  return (
    <aside className="hidden lg:flex flex-col p-4 bg-white/70 backdrop-blur-xl rounded-3xl m-4 h-[calc(100vh-2rem)] w-64 fixed left-0 top-0 shadow-[0_20px_40px_rgba(25,28,30,0.06)] z-50">
      <div className="flex items-center gap-3 px-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-lg">
          <Icon name="sports_tennis" filled />
        </div>
        <div>
          <h1 className="text-lg font-black text-primary">Arriba Club Pro</h1>
          <p className="text-[10px] uppercase tracking-widest text-outline">Beach Sports Mgmt</p>
        </div>
      </div>

      {/* Discipline Selector — icon grid */}
      <div className="px-1 mb-5">
        <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2 px-1">Disciplina</p>
        <div className="grid grid-cols-2 gap-2">
          {DISCIPLINAS.map(d => {
            const c = DISCIPLINA_COLORS[d] || DISCIPLINA_COLORS['Futvoley'];
            const activo = disciplinaActiva === d;
            return (
              <button
                key={d}
                onClick={() => setDisciplinaActiva(d)}
                className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-2xl transition-all duration-200 border-2 ${
                  activo
                    ? `${c.bg} ${c.ring.replace('ring-', 'border-')} shadow-sm`
                    : 'border-transparent bg-surface-container-high hover:bg-surface-container-highest'
                }`}
              >
                <DisciplinaIcon disciplina={d} size={28} />
                <span className={`text-[10px] font-bold leading-tight text-center ${activo ? c.text : 'text-on-surface-variant'}`}>
                  {d}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
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

      <div className="mt-auto space-y-2 pt-2">
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
