import Icon from './Icon';

const Configuracion = ({
  disciplinaActiva,
  precios,
  onUpdatePrecios
}) => {
  const handlePrecioChange = (plan, frecuencia, valor) => {
    onUpdatePrecios(disciplinaActiva, plan, frecuencia, parseInt(valor) || 0);
  };

  const planes = ['Arena Basic', 'Arena Plus', 'Arena Premium'];
  
  const colores = {
    'Arena Basic': 'border-outline/20 bg-surface-container-low',
    'Arena Plus': 'border-primary/20 bg-primary/5',
    'Arena Premium': 'border-secondary/20 bg-secondary/5'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-on-surface tracking-tight">Configuración</h1>
        <p className="text-on-surface-variant">Precios de {disciplinaActiva}</p>
      </div>

      <div className="space-y-4">
        {planes.map(plan => (
          <div key={plan} className={`rounded-2xl p-5 border-2 ${colores[plan]}`}>
            <h4 className="font-bold text-on-surface mb-4">{plan}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-outline font-bold uppercase mb-2 block">1x Semana</label>
                <div className="flex items-center gap-2">
                  <span className="text-on-surface-variant font-medium">$</span>
                  <input
                    type="number"
                    value={precios[disciplinaActiva]?.[plan]?.['1x sem'] || ''}
                    onChange={(e) => handlePrecioChange(plan, '1x sem', e.target.value)}
                    className="flex-1 px-3 py-2 bg-surface-container-lowest border-2 border-transparent rounded-xl focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-outline font-bold uppercase mb-2 block">2x Semana</label>
                <div className="flex items-center gap-2">
                  <span className="text-on-surface-variant font-medium">$</span>
                  <input
                    type="number"
                    value={precios[disciplinaActiva]?.[plan]?.['2x sem'] || ''}
                    onChange={(e) => handlePrecioChange(plan, '2x sem', e.target.value)}
                    className="flex-1 px-3 py-2 bg-surface-container-lowest border-2 border-transparent rounded-xl focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-success/10 rounded-2xl p-4 flex items-center gap-3">
        <Icon name="check_circle" className="text-success" filled />
        <p className="text-success text-sm font-medium">Los cambios se guardan automáticamente</p>
      </div>
    </div>
  );
};

export default Configuracion;
