import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Home, Briefcase, MessageCircle, Pencil, Trash2, Plus, MapPin, Clock, DollarSign } from 'lucide-react';
import ProviderServiceModal from '@/components/ProviderServiceModal';

const LOGO_URL = "/logo.png";

export default function ProviderServices() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    api.auth.me()
      .then(async (u) => {
        setUser(u);
        const svcs = await api.entities.ProviderService.filter({ providerId: u.id });
        setServices(svcs);
      })
      .catch(() => navigate('/provider/onboarding'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este serviço?')) return;
    setDeletingId(id);
    try {
      await api.entities.ProviderService.delete(id);
      setServices(prev => prev.filter(s => s.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = async (config) => {
    const updated = await api.entities.ProviderService.update(editingService.id, config);
    setServices(prev => prev.map(s => s.id === editingService.id ? { ...s, ...updated } : s));
    setEditingService(null);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <img src={LOGO_URL} alt="ServiLocal" className="w-6 h-6 object-contain" />
          <span className="text-sm font-semibold text-foreground">Servi<span className="font-bold">Local</span></span>
        </div>
        <button
          onClick={() => api.auth.logout('/')}
          className="px-3 py-1.5 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-secondary/50 transition-colors"
        >
          → Sair
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold text-foreground">Meus serviços</h1>
          <button
            onClick={() => navigate('/provider/onboarding?step=services')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-4 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3 text-center">
            <Briefcase className="w-14 h-14 text-muted-foreground/40" />
            <p className="font-semibold text-foreground">Nenhum serviço cadastrado</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Adicione os serviços que você oferece para aparecer nas buscas.
            </p>
            <button
              onClick={() => navigate('/provider/onboarding?step=services')}
              className="mt-2 px-6 py-2.5 border border-border rounded-full text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
            >
              Cadastrar serviços
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map(svc => (
              <div key={svc.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm leading-snug">
                      {svc.serviceName || svc.specialty || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setEditingService(svc)}
                      className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDelete(svc.id)}
                      disabled={deletingId === svc.id}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {svc.price && (
                    <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                      <DollarSign className="w-3 h-3" /> R$ {svc.price}
                    </span>
                  )}
                  {svc.duration && (
                    <span className="flex items-center gap-1 text-xs bg-secondary text-foreground px-2.5 py-1 rounded-full">
                      <Clock className="w-3 h-3 text-muted-foreground" /> {svc.duration}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingService && (
        <ProviderServiceModal
          key={editingService.id}
          subcategory={editingService.serviceName || editingService.specialty}
          category=""
          initialData={editingService}
          onClose={() => setEditingService(null)}
          onSave={handleSave}
        />
      )}

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <Link to="/provider" className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground">
            <Home className="w-5 h-5" />
            <span className="text-xs">Início</span>
          </Link>
          <button className="flex-1 flex flex-col items-center gap-1 py-3 text-primary font-medium">
            <Briefcase className="w-5 h-5" />
            <span className="text-xs">Meus serviços</span>
          </button>
          <Link to="/provider/conversations" className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground">
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs">Conversas</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
