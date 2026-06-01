import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Users, Briefcase } from 'lucide-react';
import { useState } from 'react';

export default function RoleSelector() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const switchRole = async (mode) => {
    setLoading(true);
    try {
      await base44.auth.updateMe({ currentMode: mode });
      navigate(mode === 'client' ? '/client' : '/provider');
    } catch (error) {
      console.error('Error switching role:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-3xl font-bold mb-2 text-foreground">
            servi<span className="font-normal">Local</span>
          </h1>
          <p className="text-muted-foreground">Selecione como deseja entrar</p>
        </div>

        {/* Role Cards */}
        <div className="grid gap-4">
          <button
            onClick={() => switchRole('client')}
            disabled={loading}
            className="flex flex-col items-center gap-3 p-6 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-sm transition-all disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <h2 className="font-semibold text-foreground mb-1">Entrar como Cliente</h2>
              <p className="text-xs text-muted-foreground">
                Contratar serviços na sua cidade
              </p>
            </div>
          </button>

          <button
            onClick={() => switchRole('provider')}
            disabled={loading}
            className="flex flex-col items-center gap-3 p-6 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-sm transition-all disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <h2 className="font-semibold text-foreground mb-1">Entrar como Prestador</h2>
              <p className="text-xs text-muted-foreground">
                Oferecer seus serviços
              </p>
            </div>
          </button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-8">
          Você pode alternar entre os modos a qualquer momento
        </p>
      </div>
    </div>
  );
}