import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { X, Send } from 'lucide-react';

const WHEN_OPTIONS = [
  { id: 'today', label: 'Hoje' },
  { id: 'tomorrow', label: 'Amanhã' },
  { id: 'this_week', label: 'Esta semana' },
  { id: 'next_30', label: 'Nos próximos 30 dias' },
  { id: 'scheduled', label: 'Com hora marcada' },
];

export default function NewServiceRequestModal({ category, onClose }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(category?.label || '');
  const [description, setDescription] = useState('');
  const [when, setWhen] = useState('');

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceRequest.create(data),
    onSuccess: (result) => {
      onClose();
      navigate(`/client/request/${result.id}`);
    },
  });

  const handleSubmit = async () => {
    const user = await base44.auth.me();
    const profiles = await base44.entities.UserProfile.filter({ userId: user.id });
    const profile = profiles[0];
    createMutation.mutate({
      title,
      description,
      category: category?.label || 'other',
      subcategory: category?.label || '',
      city: user.city || '',
      neighborhood: profile?.neighborhood || '',
      address: profile?.address || '',
      urgency: 'medium',
      status: 'open',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-background rounded-t-2xl max-h-[92vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-border">
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">Publicar solicitação</h2>
            {category && <p className="text-xs text-primary font-medium mt-0.5">{category.label}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Service Field */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Qual serviço você precisa?
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Instalação de chuveiro, pintura, limpeza..."
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Descreva seu pedido
            </label>
            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 70))}
                placeholder="Conte mais detalhes sobre o serviço que você precisa..."
                rows={3}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none bg-card"
              />
              <span className="absolute bottom-3 right-3 text-xs text-muted-foreground">{description.length}/70</span>
            </div>
          </div>

          {/* Info */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground leading-relaxed">
              O atendimento será no seu endereço cadastrado.
            </p>
          </div>

          {/* When */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">Quando você precisa?</label>
            <div className="grid grid-cols-2 gap-2">
              {WHEN_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setWhen(option.id === when ? '' : option.id)}
                  className={`py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
                    when === option.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-foreground hover:bg-secondary/30'
                  } ${option.id === 'scheduled' ? 'col-span-2' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || createMutation.isPending}
            className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Publicar solicitação
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
