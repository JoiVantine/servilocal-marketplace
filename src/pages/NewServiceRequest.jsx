import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ChevronLeft, Home, ClipboardList, Send, ChevronDown } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';

const LOGO_URL = "/logo.png";

const WHEN_OPTIONS = [
  { id: 'today', label: 'Hoje' },
  { id: 'tomorrow', label: 'Amanhã' },
  { id: 'this_week', label: 'Esta semana' },
  { id: 'next_30', label: 'Nos próximos 30 dias' },
  { id: 'scheduled', label: 'Com hora marcada' },
];


export default function NewServiceRequest() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [title, setTitle] = useState(state?.subcategory || '');
  const [description, setDescription] = useState('');
  const [when, setWhen] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(state?.category || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState(state?.subcategory || '');
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [expandedCat, setExpandedCat] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.ServiceRequest.create(data),
    onSuccess: (result) => {
      navigate(`/client/request/${result.id || result._id}`);
    },
  });

  const handleSubmit = async () => {
    try {
      const user = await api.auth.me();
      const profiles = await api.entities.UserProfile.filter({ userId: user.id });
      const profile = profiles[0];
      createMutation.mutate({
        title: title || selectedSubcategory,
        description,
        category: selectedCategory,
        subcategory: selectedSubcategory,
        city: user.city || '',
        neighborhood: profile?.neighborhood || '',
        address: profile?.address || '',
        clientPhone: user.phone || '',
        when,
        scheduledAt: when === 'scheduled' && scheduledAt ? scheduledAt : undefined,
        urgency: 'medium',
        status: 'open',
      });
    } catch {
      // auth/profile fetch failed silently — mutation won't fire
    }
  };

  const isValid = selectedSubcategory !== '' || title.trim().length > 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <img src={LOGO_URL} alt="ServiLocal" className="w-6 h-6 object-contain" />
          <span className="text-sm font-semibold text-foreground">Servi<span className="font-bold">Local</span></span>
        </div>
        <button
          onClick={() => navigate('/client')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <span>⤳</span> Sair
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Sub Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/client')}
            className="p-2 hover:bg-secondary rounded-lg transition-colors mr-2"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 flex flex-col items-center pr-8">
            <div className="flex items-center gap-2 mb-1">
              <img src={LOGO_URL} alt="ServiLocal" className="w-5 h-5 object-contain" />
              <span className="text-sm font-semibold text-foreground">Servi<span className="font-bold">Local</span></span>
            </div>
            <span className="text-xs text-primary font-medium">Atendimento no domicílio</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Publicar solicitação</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Conte o que precisa e receba propostas<br />de profissionais da sua cidade.
          </p>
        </div>

        {/* Category + Subcategory Selector */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-foreground mb-2">
            Qual serviço você precisa? <span className="text-red-500">*</span>
          </label>
          <button
            onClick={() => setCategoryExpanded(!categoryExpanded)}
            className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg text-sm transition-colors ${
              selectedSubcategory ? 'border-primary bg-primary/5 text-foreground' : 'border-border bg-card text-muted-foreground'
            }`}
          >
            <span>{selectedSubcategory ? `${selectedCategory} › ${selectedSubcategory}` : 'Selecione a categoria e especialidade'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${categoryExpanded ? 'rotate-180' : ''}`} />
          </button>
          {categoryExpanded && (
            <div className="mt-2 border border-border rounded-xl overflow-hidden bg-card shadow-sm max-h-72 overflow-y-auto">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const isExp = expandedCat === cat.name;
                return (
                  <div key={cat.name}>
                    <button
                      onClick={() => setExpandedCat(isExp ? null : cat.name)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/20 border-b border-border last:border-0 text-sm"
                    >
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 font-medium text-foreground">{cat.name}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExp ? 'rotate-180' : ''}`} />
                    </button>
                    {isExp && (
                      <div className="p-3 flex flex-wrap gap-2 bg-secondary/10 border-b border-border">
                        {cat.subcategories.map(sub => (
                          <button
                            key={sub}
                            onClick={() => {
                              setSelectedCategory(cat.name);
                              setSelectedSubcategory(sub);
                              setCategoryExpanded(false);
                              setTitle(sub);
                            }}
                            className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-background text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Service Title override */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-foreground mb-2">
            Detalhes adicionais (opcional)
          </label>
          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: preciso de 2 tomadas na sala..."
              className="w-full px-4 py-3 pl-10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
            />
            <span className="absolute left-3 top-3.5 text-muted-foreground text-sm">✏️</span>
          </div>
        </div>

        {/* Description Field */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-foreground mb-2">
            Descreva seu pedido
          </label>
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 70))}
              placeholder="Conte mais detalhes sobre o serviço que você precisa..."
              rows={4}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none bg-card"
            />
            <span className="absolute bottom-3 right-3 text-xs text-muted-foreground">
              {description.length}/70
            </span>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-xs text-muted-foreground leading-relaxed">
            O atendimento será no seu endereço cadastrado. Caso precise de serviço em outro local (como empresa), cadastre seu CNPJ depois nas configurações.
          </p>
        </div>

        {/* When */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-foreground mb-3">
            Quando você precisa?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {WHEN_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setWhen(option.id === when ? '' : option.id)}
                className={`py-3 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  when === option.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-foreground hover:bg-secondary/30'
                } ${option.id === 'scheduled' ? 'col-span-2' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {when === 'scheduled' && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-foreground mb-1.5">Escolha a data e horário</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                min={new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16)}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || (when === 'scheduled' && !scheduledAt) || createMutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Publicar solicitação
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <Link
            to="/client"
            className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="text-xs">Início</span>
          </Link>
          <button className="flex-1 flex flex-col items-center gap-1 py-3 text-primary font-medium">
            <ClipboardList className="w-5 h-5" />
            <span className="text-xs">Pedidos</span>
          </button>
        </div>
      </div>
    </div>
  );
}