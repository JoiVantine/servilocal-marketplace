import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle, Camera, Loader2 } from 'lucide-react';

export default function NewServiceRequestModal({ category, request, onClose, onUpdated }) {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const isEdit = !!request;
  const [title, setTitle] = useState(request?.title ?? category?.label ?? '');
  const [description, setDescription] = useState(request?.description ?? '');

  const initialScheduledAt = (() => {
    const raw = request?.scheduledAt
      || (request?.scheduleOptions?.[0]
        ? `${request.scheduleOptions[0].date}T${request.scheduleOptions[0].startTime}`
        : '');
    if (!raw) return '';
    return raw.slice(0, 16);
  })();
  const [scheduledAt, setScheduledAt] = useState(initialScheduledAt);
  const [photos, setPhotos] = useState(request?.photos ?? []);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const hasChanged = isEdit && (
    title !== (request?.title ?? '') ||
    description !== (request?.description ?? '') ||
    scheduledAt !== (request?.scheduledAt ?? '') ||
    photos.join(',') !== (request?.photos ?? []).join(',')
  );

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.ServiceRequest.create(data),
    onSuccess: (result) => {
      onClose();
      navigate(`/client/request/${result.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.entities.ServiceRequest.update(request.id, data),
    onSuccess: () => setShowSuccess(true),
  });

  const mutation = isEdit ? updateMutation : createMutation;

  const handlePhotoAdd = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError(true);
      e.target.value = '';
      return;
    }
    setPhotoLoading(true);
    setPhotoError(false);
    try {
      const url = await api.uploadFile(file);
      setPhotos(prev => [...prev, url]);
    } catch {
      setPhotoError(true);
    } finally {
      setPhotoLoading(false);
      e.target.value = '';
    }
  };

  const [dateError, setDateError] = useState('');

  const handleSubmit = async () => {
    if (scheduledAt) {
      const chosen = new Date(scheduledAt);
      const minAllowed = new Date();
      minAllowed.setMinutes(minAllowed.getMinutes() + 30);
      if (chosen < minAllowed) {
        setDateError('A data/hora deve ser no mínimo 30 minutos a partir de agora.');
        return;
      }
    }
    setDateError('');

    if (isEdit) {
      mutation.mutate({
        title,
        description,
        when: scheduledAt ? 'scheduled' : '',
        scheduledAt: scheduledAt || undefined,
        photos,
      });
      return;
    }
    const user = await api.auth.me();
    const profiles = await api.entities.UserProfile.filter({ userId: user.id });
    const profile = profiles[0];
    mutation.mutate({
      title,
      description,
      category: category?.label || 'other',
      subcategory: category?.label || '',
      city: user.city || '',
      neighborhood: profile?.neighborhood || '',
      address: profile?.address || '',
      clientPhone: user.phone || '',
      when: scheduledAt ? 'scheduled' : '',
      scheduledAt: scheduledAt || undefined,
      photos,
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
              Descreva seu pedido <span className="text-red-500">*</span>
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

          {/* Photos */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Fotos (opcional)</label>
            <div className="flex gap-2 flex-wrap">
              {photos.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
                  <button
                    onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={photoLoading}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-border bg-secondary/20 flex items-center justify-center hover:border-primary/50 transition-colors disabled:opacity-50"
                >
                  {photoLoading
                    ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                    : <Camera className="w-4 h-4 text-muted-foreground" />
                  }
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoAdd} />
            {photoError && (
              <p className="text-xs text-red-500 mt-1.5">Falha ao enviar foto. Tente novamente.</p>
            )}
          </div>

          {/* When */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Quando você precisa? <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              min={minDateTimeStr}
              onChange={(e) => { setScheduledAt(e.target.value); setDateError(''); }}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card ${dateError ? 'border-red-400' : 'border-border'}`}
            />
            {dateError && <p className="text-xs text-red-500 mt-1">{dateError}</p>}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !description.trim() || mutation.isPending || (isEdit && !hasChanged)}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEdit ? 'Salvar alterações' : 'Publicar pedido'}
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
