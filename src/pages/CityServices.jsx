import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { ChevronRight, ChevronLeft, MapPin, Home, ClipboardList } from 'lucide-react';
import NewServiceRequestModal from '../components/NewServiceRequestModal';
import { useNavigate, Link } from 'react-router-dom';
import { useServices } from '@/hooks/useServices';
import { CATEGORY_GROUPS } from '@/lib/categories';

const LOGO_URL = "/logo.png";

export default function CityServices() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { categories } = useServices();

  useEffect(() => {
    api.auth.me().then(setUser).catch(console.error);
  }, []);

  const { data: providers = [] } = useQuery({
    queryKey: ['providers-city', user?.city],
    queryFn: () => api.entities.ProviderProfile.filter({ city: user?.city, active: true }),
    enabled: !!user?.city,
  });

  const countForCategory = (categoryName) => {
    return providers.filter((p) =>
      p.specialties?.some((s) =>
        s.toLowerCase().includes(categoryName.toLowerCase()) ||
        categoryName.toLowerCase().includes(s.toLowerCase())
      )
    ).length;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-card">
        <button
          onClick={() => navigate('/client')}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <img src={LOGO_URL} alt="ServiLocal" className="w-6 h-6 object-contain" />
          <span className="text-sm font-semibold text-foreground">Servi<span className="font-bold">Local</span></span>
        </div>
        <div className="w-9" />
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {user?.city && (
          <div className="flex items-center justify-center gap-1.5 mb-4">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{user.city}</span>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
            Serviços disponíveis na sua cidade
          </h1>
          <p className="text-sm text-muted-foreground">
            Toque em uma categoria para publicar seu pedido.
          </p>
        </div>

        <div className="space-y-6">
          {CATEGORY_GROUPS.map((group) => {
            const groupCats = categories.filter(c => group.items.includes(c.name));
            if (groupCats.length === 0) return null;
            return (
              <div key={group.label}>
                <h2 className="text-xs font-semibold text-primary tracking-wider mb-3">
                  {group.label}
                </h2>
                <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
                  {groupCats.map((cat) => {
                    const count = countForCategory(cat.name);
                    return (
                      <button
                        key={cat.name}
                        onClick={() => setSelectedCategory({ label: cat.name })}
                        className="w-full flex items-center justify-between px-4 py-4 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="text-left">
                          <p className="text-sm font-medium text-foreground">{cat.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {count > 0
                              ? `${count} profissional${count > 1 ? 'is' : ''} disponível`
                              : 'Nenhum prestador cadastrou nessa categoria ainda'}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedCategory && (
        <NewServiceRequestModal
          category={selectedCategory}
          onClose={() => setSelectedCategory(null)}
        />
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="flex items-center justify-around max-w-2xl mx-auto">
          <Link
            to="/client"
            className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="text-xs">Início</span>
          </Link>
          <Link
            to="/client/orders"
            className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-xs">Pedidos</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
