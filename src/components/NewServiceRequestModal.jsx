import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { X, Send, Calendar, CheckCircle } from 'lucide-react';

const WHEN_OPTIONS = [
  { id: 'today', label: 'Hoje' },
  { id: 'tomorrow', label: 'Amanhã' },
  { id: 'this_week', label: 'Esta semana' },
  { id: 'next_30', label: 'Nos próximos 30 dias' },
  { id: 'scheduled', label: 'Com hora marcada', icon: Calendar },
];

export default function NewServiceRequestModal({ category, request, onClose, onUpdated }) {
  const navigate = useNavigate();
  const isEdit = !!request;
  const [title, setTitle] = useState(request?.title ?? category?.label ?? '');
  const [description, setDescription] = useState(request?.description ?? '');
  const [when, setWhen] = useState(request?.when ?? '');
  const [scheduledAt, setScheduledAt] = useState(request?.scheduledAt ?? '');
  const [showSuccess, setShowSuccess] = useState(false);

  const hasChanged = isEdit && (
    title !== (request?.title ?? '') ||
    description !== (request?.description ?? '') ||
    when !== (request?.when ?? '') ||
    scheduledAt !== (request?.scheduledAt ?? '')
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceRequest.create(data),
    onSuccess: (result) => {
      onClose();
      navigate(`/client/request/${result.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceRequest.update(request.id, data),
    onSuccess: () => setShowSuccess(true),
  });

  const mutation = isEdit ? updateMutation : createMutation;

  const handleSubmit = async () => {
    if (isEdit) {
      mutation.mutate({
        title,
        description,
        when,
        scheduledAt: when === 'scheduled' && scheduledAt ? scheduledAt : undefined,
      });
      return;
    }
    const user = await base44.auth.me();
    const profiles = await base44.entities.UserProfile.filter({ userId: user.id });
    const profile = profiles[0];
    mutation.mutate({
      title,
      description,
      category: category?.label || 'other',
      subcategory: category?.label || '',
      city: user.city || '',
      neighborhood: profile?.neighborhood || '',
      address: profile?.address || '',
      when,
      scheduledAt: when === 'scheduled' && scheduledAt ? scheduledAt : undefined,
      urgency: 'medium',
      status: 'open',
    });
  };

  const minDateTime = new Date();
  minDateTime.setMinutes(minDateTime.getMinutes() + 30);
  const minDateTimeStr = minDateTime.toISOString().slice(0, 16);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl max-h-[88vh] overflow-y-auto">
        {/* Handle — só no mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-heading text-base font-bold text-foreground">
              {isEdit ? 'Editar solicitação' : 'Publicar solicitação'}
            </h2>
            {!isEdit && category && <p className="text-xs text-primary font-medium mt-0.5">{category.label}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Service Field */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Qual serviço você precisa?
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Descreva seu pedido
            </label>
            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                placeholder="Conte mais detalhes..."
                rows={2}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none bg-card"
              />
              <span className="absolute bottom-2.5 right-3 text-xs text-muted-foreground">{description.length}/200</span>
            </div>
          </div>

          {/* Info */}
          <p className="text-xs text-muted-foreground px-1">
            📍 O atendimento será no seu endereço cadastrado.
          </p>

          {/* When */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Quando você precisa?</label>
            <div className="grid grid-cols-2 gap-2">
              {WHEN_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setWhen(option.id === when ? '' : option.id);
                    if (option.id !== 'scheduled') setScheduledAt('');
                  }}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    when === option.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-foreground hover:bg-secondary/30'
                  } ${option.id === 'scheduled' ? 'col-span-2' : ''}`}
                >
                  {option.icon && <option.icon className="w-3.5 h-3.5" />}
                  {option.label}
                </button>
              ))}
            </div>

            {when === 'scheduled' && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Escolha a data e horário
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  min={minDateTimeStr}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={
              !title.trim() ||
              (when === 'scheduled' && !scheduledAt) ||
              mutation.isPending ||
              (isEdit && !hasChanged)
            }
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEdit ? 'Salvar alterações' : 'Publicar solicitação'}
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-background rounded-2xl p-8 w-full max-w-xs text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-heading text-lg font-bold text-foreground mb-2">Alterações salvas!</h3>
            <p className="text-sm text-muted-foreground mb-6">Seu pedido foi atualizado com sucesso.</p>
            <button
              onClick={() => { onUpdated?.(); onClose(); }}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
