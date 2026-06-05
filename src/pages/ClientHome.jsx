import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { ChevronRight, MapPin, ShieldCheck, LogOut, X, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import ClientBottomNav from '../components/ClientBottomNav';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useServices } from '@/hooks/useServices';

const QUICK_CATEGORIES = [
  { icon: '⚡', label: 'Elétrica',   bg: 'bg-yellow-100', name: 'Elétrica' },
  { icon: '🚿', label: 'Hidráulica', bg: 'bg-blue-100',   name: 'Hidráulica' },
  { icon: '🎨', label: 'Pintura',    bg: 'bg-rose-100',   name: 'Pintura' },
  { icon: '🧹', label: 'Limpeza',    bg: 'bg-teal-100',   name: 'Limpeza' },
  { icon: '🏠', label: 'Reformas',   bg: 'bg-purple-100', name: 'Construção e Reformas' },
  { icon: '···', label: 'Outros',   bg: 'bg-gray-100',   name: null },
];

const STATUS_LABELS = {
  open: 'Procurando profissional',
  in_conversation: 'Em conversa',
  agreed: 'Acordado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const STATUS_COLORS = {
  open: 'bg-orange-50 text-orange-500',
  in_conversation: 'bg-blue-50 text-blue-600',
  agreed: 'bg-teal-50 text-teal-600',
  completed: 'bg-green-50 text-green-600',
  cancelled: 'bg-gray-100 text-gray-500',
};

function getCategoryStyle(text = '') {
  const t = text.toLowerCase();
  if (t.includes('elétric') || t.includes('eletric')) return { icon: '⚡', bg: 'bg-yellow-100' };
  if (t.includes('hidrá') || t.includes('hidra') || t.includes('encana')) return { icon: '🚿', bg: 'bg-blue-100' };
  if (t.includes('pintur')) return { icon: '🎨', bg: 'bg-rose-100' };
  if (t.includes('limpez')) return { icon: '🧹', bg: 'bg-teal-100' };
  if (t.includes('reform') || t.includes('constru')) return { icon: '🏠', bg: 'bg-purple-100' };
  return { icon: '🔧', bg: 'bg-gray-100' };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `Solicitado em ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function ClientHome() {
  const navigate = useNavigate();
  const [selectedCat, setSelectedCat] = useState(null);
  const [showOthersModal, setShowOthersModal] = useState(false);
  const [modalCat, setModalCat] = useState(null);

  const { data: user, isLoading } = useCurrentUser();
  const { categories } = useServices();

  const { data: requests = [] } = useQuery({
    queryKey: ['client-requests', user?.id],
    queryFn: () => api.entities.ServiceRequest.filter({ clientId: user?.id }, '-created_date'),
    enabled: !!user?.id,
  });

  const firstName = (user?.fullName || user?.full_name)?.split(' ')[0] || '';

  const getSubcategories = (name) => categories.find(c => c.name === name)?.subcategories || [];
  const selectedSubs = selectedCat ? getSubcategories(selectedCat) : [];

  const handleQuickCatClick = (cat) => {
    if (!cat.name) {
      setShowOthersModal(true);
      setModalCat(null);
    } else {
      setSelectedCat(prev => prev === cat.name ? null : cat.name);
    }
  };

  const closeModal = () => {
    setShowOthersModal(false);
    setModalCat(null);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const activeRequests = requests.filter((r) => r.status !== 'cancelled');

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col min-h-screen bg-background">
        <div className="flex-1 overflow-y-auto pb-20">

          {/* Greeting card */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-3 bg-card rounded-2xl p-4 border border-border">
              <button onClick={() => navigate('/client/profile')} className="shrink-0">
                {user.photo ? (
                  <img src={user.photo} alt="foto" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    {firstName?.[0]?.toUpperCase()}
                  </div>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground">Olá, {firstName} 👋</p>
                {user.city && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">{user.city}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => api.auth.logout('/')}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Categorias */}
          <div className="px-4 mb-5">
            <p className="text-base font-bold text-foreground mb-3">O que você precisa hoje?</p>
            <div className="grid grid-cols-3 gap-3">
              {QUICK_CATEGORIES.map((cat) => {
                const isSelected = selectedCat === cat.name;
                return (
                  <button
                    key={cat.label}
                    onClick={() => handleQuickCatClick(cat)}
                    className={`flex flex-col items-center gap-2 py-3 px-2 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/30 hover:bg-primary/5'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full ${cat.bg} flex items-center justify-center shrink-0`}>
                      <span className="text-2xl leading-none">{cat.icon}</span>
                    </div>
                    <span className={`text-xs font-medium text-center leading-tight ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Subcategories inline */}
            {selectedCat && selectedSubs.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Selecione o tipo:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedSubs.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => navigate('/client/new-request', { state: { category: selectedCat, subcategory: sub } })}
                      className="px-3 py-2 rounded-full border border-border bg-background text-xs font-medium text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Seus pedidos */}
          <div className="px-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-base font-bold text-foreground">Seus pedidos</p>
              {activeRequests.length > 0 && (
                <Link to="/client/orders" className="text-xs text-primary font-medium">
                  Ver todos
                </Link>
              )}
            </div>
            {activeRequests.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-xl p-5 flex flex-col items-center text-center gap-2">
                <p className="text-sm text-muted-foreground">Você ainda não tem pedidos.</p>
                <button
                  onClick={() => navigate('/client/new-request')}
                  className="text-sm font-semibold text-primary hover:opacity-80"
                >
                  Criar primeiro pedido
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeRequests.slice(0, 3).map((request) => {
                  const catStyle = getCategoryStyle(`${request.category || ''} ${request.title || ''}`);
                  return (
                    <Link
                      key={request.id}
                      to={`/client/request/${request.id}`}
                      className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:bg-secondary/30 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-full ${catStyle.bg} flex items-center justify-center shrink-0`}>
                        <span className="text-lg leading-none">{catStyle.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{request.title}</p>
                        {request.city && (
                          <p className="text-xs text-muted-foreground truncate">{request.city}</p>
                        )}
                        {request.created_date && (
                          <p className="text-xs text-muted-foreground">{formatDate(request.created_date)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[request.status] || 'bg-secondary text-muted-foreground'}`}>
                          {STATUS_LABELS[request.status] || request.status}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Profissionais verificados */}
          <div className="px-4 mb-6">
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">Profissionais verificados</p>
                <p className="text-xs text-muted-foreground mt-0.5">Mais segurança e qualidade para você.</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modal: Outros — todos os serviços */}
      {showOthersModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          {/* Header */}
          <div className="bg-card border-b border-border px-4 h-14 flex items-center justify-between shrink-0">
            {modalCat ? (
              <button
                onClick={() => setModalCat(null)}
                className="p-2 -ml-2 rounded-xl hover:bg-secondary/50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
            ) : (
              <div className="w-9" />
            )}
            <span className="font-semibold text-base text-foreground">
              {modalCat ? modalCat.name : 'Todos os serviços'}
            </span>
            <button
              onClick={closeModal}
              className="p-2 -mr-2 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 max-w-md mx-auto w-full">
            {!modalCat ? (
              // Todos as categorias em grid de ícones
              <div className="grid grid-cols-3 gap-3">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => setModalCat(cat)}
                      className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-foreground text-center leading-tight">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              // Subcategorias da categoria selecionada
              <div>
                <p className="text-sm text-muted-foreground mb-4">Selecione o tipo de serviço:</p>
                <div className="flex flex-wrap gap-2">
                  {modalCat.subcategories.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => {
                        navigate('/client/new-request', { state: { category: modalCat.name, subcategory: sub } });
                        closeModal();
                      }}
                      className="px-4 py-2.5 rounded-full border border-border bg-card text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ClientBottomNav active="home" />
    </div>
  );
}
