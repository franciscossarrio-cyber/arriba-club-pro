import { useState } from 'react';
import Icon from './Icon';

const ACCESS_KEY = import.meta.env.VITE_ACCESS_KEY || 'arriba2026';

const Login = ({ onLogin }) => {
  const [inputClave, setInputClave] = useState('');
  const [errorClave, setErrorClave] = useState(false);

  const handleLogin = (e) => {
    e?.preventDefault();
    if (inputClave === ACCESS_KEY) {
      onLogin();
    } else {
      setErrorClave(true);
      setTimeout(() => setErrorClave(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-surface">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-secondary/10 blur-[120px]"></div>
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #3525cd 1px, transparent 0)',
            backgroundSize: '48px 48px'
          }}
        ></div>
      </div>

      <main className="relative z-10 w-full max-w-[440px] px-6 fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-primary/20">
            <Icon name="sports_tennis" filled className="text-white text-3xl" />
          </div>
          <h1 className="text-3xl font-black text-on-surface tracking-tighter mb-1">Arriba Club Pro</h1>
          <p className="text-sm font-medium text-on-surface-variant tracking-widest uppercase opacity-70">Beach Sports Mgmt</p>
        </div>

        {/* Login Card */}
        <div className="glass-card rounded-3xl p-10 shadow-[0_20px_40px_rgba(25,28,30,0.06)] border border-white/40">
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-on-surface">Bienvenido</h2>
              <p className="text-sm text-on-surface-variant">Introduce tu clave de acceso para continuar.</p>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-primary mb-2 ml-1">
                  Clave de Acceso
                </label>
                <div className="relative">
                  <Icon name="lock" className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
                  <input
                    type="password"
                    value={inputClave}
                    onChange={(e) => setInputClave(e.target.value)}
                    className={`w-full pl-12 pr-4 py-4 bg-surface-container-high border-2 ${errorClave ? 'border-error' : 'border-transparent'} rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all duration-300 placeholder:text-outline-variant`}
                    placeholder="••••••••"
                  />
                </div>
                {errorClave && <p className="text-error text-xs mt-2 ml-1">Clave incorrecta</p>}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span className="text-sm tracking-wide">Entrar</span>
              <Icon name="arrow_forward" size={18} />
            </button>
          </form>
        </div>
      </main>

      <footer className="mt-auto mb-8 relative z-10 flex flex-col items-center space-y-2">
        <p className="text-[10px] font-medium text-outline">v2.5.0 • Arriba Club Pro System</p>
      </footer>
    </div>
  );
};

export default Login;
