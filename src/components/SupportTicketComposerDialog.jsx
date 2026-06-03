import { useEffect, useMemo, useState } from 'react';
import { Loader2, Paperclip, Plus } from 'lucide-react';
import { api } from '@/api/apiClient';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SUPPORT_CATEGORY_OPTIONS } from '@/lib/support';

function buildInitialForm(initialContext) {
  return {
    category: initialContext?.category || '',
    subject: initialContext?.subject || '',
    description: initialContext?.description || '',
    relatedServiceRequestId: initialContext?.relatedServiceRequestId || '',
    relatedConversationId: initialContext?.relatedConversationId || '',
  };
}

export default function SupportTicketComposerDialog({
  open,
  onOpenChange,
  audience,
  user,
  requestOptions,
  conversationOptions,
  initialContext,
  onCreated,
}) {
  const [form, setForm] = useState(() => buildInitialForm(initialContext));
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contextKey = useMemo(() => JSON.stringify(initialContext || {}), [initialContext]);

  useEffect(() => {
    if (!open) return;
    setForm(buildInitialForm(initialContext));
    setFiles([]);
  }, [open, contextKey]);

  const selectedConversation = useMemo(
    () => conversationOptions.find((option) => option.id === form.relatedConversationId),
    [conversationOptions, form.relatedConversationId]
  );

  const selectedRequest = useMemo(
    () => requestOptions.find((option) => option.id === form.relatedServiceRequestId),
    [requestOptions, form.relatedServiceRequestId]
  );

  const linkedContextItems = [
    selectedRequest ? `Pedido: ${selectedRequest.label}` : null,
    selectedConversation ? `Conversa: ${selectedConversation.label}` : null,
  ].filter(Boolean);

  const handleConversationChange = (value) => {
    const option = conversationOptions.find((item) => item.id === value);
    setForm((current) => ({
      ...current,
      relatedConversationId: value,
      relatedServiceRequestId: option?.serviceRequestId || current.relatedServiceRequestId,
    }));
  };

  const handleRequestChange = (value) => {
    setForm((current) => {
      const shouldClearConversation = current.relatedConversationId
        && selectedConversation?.serviceRequestId
        && selectedConversation.serviceRequestId !== value;

      return {
        ...current,
        relatedServiceRequestId: value,
        relatedConversationId: shouldClearConversation ? '' : current.relatedConversationId,
      };
    });
  };

  const handleFilesChange = (event) => {
    setFiles(Array.from(event.target.files || []));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;

    if (!form.category || !form.subject.trim() || !form.description.trim()) {
      toast({
        title: 'Preencha os campos obrigatorios',
        description: 'Categoria, assunto e descricao precisam estar completos.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const attachments = files.length > 0
        ? await Promise.all(files.map((file) => api.uploadFile(file)))
        : [];

      const ticket = await api.support.create({
        category: form.category,
        subject: form.subject.trim(),
        description: form.description.trim(),
        attachments,
        relatedServiceRequestId: form.relatedServiceRequestId || undefined,
        relatedConversationId: form.relatedConversationId || undefined,
      });

      toast({
        title: 'Solicitacao criada',
        description: 'Sua mensagem ja entrou na fila do suporte.',
      });

      onOpenChange(false);
      onCreated?.(ticket);
    } catch (error) {
      toast({
        title: 'Nao foi possivel abrir a solicitacao',
        description: error.message || 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-xl overflow-y-auto rounded-2xl px-0 py-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-left">
            <Plus className="h-5 w-5 text-primary" />
            Abrir solicitacao
          </DialogTitle>
          <DialogDescription className="text-left">
            O suporte recebe o contexto do pedido e da conversa quando voce vincula os dois.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {(initialContext?.sourceLabel || linkedContextItems.length > 0) && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
              <p className="font-semibold text-foreground">Contexto rapido</p>
              <p className="mt-1 text-muted-foreground">
                {initialContext?.sourceLabel || linkedContextItems.join(' | ')}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Categoria</label>
            <select
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Selecione uma categoria</option>
              {SUPPORT_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Assunto</label>
            <input
              value={form.subject}
              onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
              placeholder="Resuma o que aconteceu"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Descricao</label>
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder={audience === 'provider'
                ? 'Conte o problema pelo seu ponto de vista e detalhe o que voce ja tentou.'
                : 'Explique o que aconteceu, quando aconteceu e o que voce espera de ajuda.'}
              rows={5}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Pedido relacionado</label>
              <select
                value={form.relatedServiceRequestId}
                onChange={(event) => handleRequestChange(event.target.value)}
                disabled={requestOptions.length === 0}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Sem pedido vinculado</option>
                {requestOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Conversa relacionada</label>
              <select
                value={form.relatedConversationId}
                onChange={(event) => handleConversationChange(event.target.value)}
                disabled={conversationOptions.length === 0}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Sem conversa vinculada</option>
                {conversationOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">Anexos (prints)</label>
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
              <span className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Selecionar imagens
              </span>
              <span>{files.length > 0 ? `${files.length} arquivo(s)` : 'Opcional'}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFilesChange}
              />
            </label>
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={`${file.name}-${file.lastModified}`}
                    className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-foreground"
                  >
                    {file.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-3 border-t border-border px-0 pt-5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40 sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {isSubmitting ? 'Abrindo...' : 'Abrir solicitacao'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
