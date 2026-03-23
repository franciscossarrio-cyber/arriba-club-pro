import Icon from './Icon';
import { DISCIPLINAS, formatMonto } from '../utils/helpers';

const Dashboard = ({
  disciplinaActiva,
  setDisciplinaActiva,
  mesActual,
  alumnosActivos,
  montoCobrado,
  pagosPendientes,
  fechasClase,
  preciosDisciplina,
  alumnos
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-on-surface tracking-tight">Dashboard</h1>
        <p className="text-on-surface-variant">{disciplinaActiva} • {mesActual}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Icon name="group" className="text-primary" />
          </div>
          <p className="text-2xl font-black text-on-surface">{alumnosActivos.length}</p>
          <p className="text-xs text-on-surface-variant font-medium">Alumnos Activos</p>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mb-3">
            <Icon name="payments" className="text-success" />
          </div>
          <p className="text-2xl font-black text-success">{formatMonto(montoCobrado)}</p>
          <p className="text-xs text-on-surface-variant font-medium">Recaudado</p>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-3">
            <Icon name="pending" className="text-warning" />
          </div>
          <p className="text-2xl font-black text-warning">{pagosPendientes.length}</p>
          <p className="text-xs text-on-surface-variant font-medium">Pagos Pendientes</p>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center mb-3">
            <Icon name="schedule" className="text-secondary" />
          </div>
          <p className="text-2xl font-black text-on-surface">{fechasClase.length * 2}</p>
          <p className="text-xs text-on-surface-variant font-medium">Clases del Mes</p>
        </div>
      </div>

      {/* Disciplines Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {DISCIPLINAS.map(d => {
          const count = alumnos.filter(a => a.disciplinas?.includes(d) && a.estado === 'Activo').length;
          const colors = {
            'Futvoley': 'from-primary to-primary-container',
            'Beach Tennis': 'from-secondary to-secondary-container',
            'Beach Volley': 'from-blue-500 to-blue-600',
            'Funcional': 'from-tertiary to-tertiary-container'
          };
          return (
            <button
              key={d}
              onClick={() => setDisciplinaActiva(d)}
              className={`p-5 rounded-2xl transition-all ${disciplinaActiva === d ? `bg-gradient-to-br ${colors[d]} text-white shadow-lg` : 'bg-surface-container-lowest hover:shadow-md'}`}
            >
              <p className={`text-2xl font-black ${disciplinaActiva === d ? 'text-white' : 'text-on-surface'}`}>{count}</p>
              <p className={`text-xs font-medium ${disciplinaActiva === d ? 'text-white/80' : 'text-on-surface-variant'}`}>{d}</p>
            </button>
          );
        })}
      </div>

      {/* Pending Payments */}
      {pagosPendientes.length > 0 && (
        <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
            <Icon name="warning" className="text-warning" size={20} />
            Pagos Pendientes ({pagosPendientes.length})
          </h3>
          <div className="space-y-3">
            {pagosPendientes.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
                <div>
                  <p className="font-medium text-on-surface">{a.nombre}</p>
                  <p className="text-xs text-on-surface-variant">{a.plan} • {a.frecuencia}</p>
                </div>
                <p className="font-bold text-warning">{formatMonto(preciosDisciplina[a.plan]?.[a.frecuencia] || 95000)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
