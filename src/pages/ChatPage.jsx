import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle, LifeBuoy, Image as ImageIcon, Mic, X, Loader2, Lock } from 'lucide-react';
import { io } from 'socket.io-client';
import { api, API_URL } from '@/api/apiClient';
import ReviewModal from '@/components/ReviewModal';
import { buildConversationSupportDraft, buildSupportComposerState } from '@/lib/support';

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const bottomRef = useRef(null);
  const imageInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [user, setUser] = useState(null);
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [recording, setRecording] = useState(false);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate('/'));
  }, []);

  const conversationQuery = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => api.entities.Conversation.get(conversationId),
    enabled: !!conversationId,
    retry: false,
  });
  const conversation = conversationQuery.data;

  const messagesQuery = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => api.entities.Message.filter({ conversationId }, 'created_date'),
    enabled: !!conversationId,
    retry: false,
    refetchInterval: 8000,
  });
  const messages = messagesQuery.data || [];

  const { data: existingReviews = [] } = useQuery({
    queryKey: ['review', conversationId],
    queryFn: () => api.entities.ProviderReview.filter({ conversationId }),
    enabled: !!conversationId,
  });

  const requestQuery = useQuery({
    queryKey: ['conversation-request', conversation?.serviceRequestId],
    queryFn: () => api.entities.ServiceRequest.get(conversation.serviceRequestId),
    enabled: !!conversation?.serviceRequestId,
    retry: false,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!user || !conversation || messages.length === 0) return;
    const unread = messages.filter((message) => message.senderId !== user.id && !message.read);
    if (unread.length === 0) return;

    const isProvider = user.id === conversation.providerId;
    const resetField = isProvider
      ? { providerUnreadCount: 0 }
      : { clientUnreadCount: 0 };

    Promise.all(unread.map((message) => api.entities.Message.update(message.id, { read: true }))).then(() => {
      api.entities.Conversation.update(conversation.id, resetField);
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['provider-conversations-unread'] });
      queryClient.invalidateQueries({ queryKey: ['client-conversations-badge'] });
    });
  }, [user?.id, conversation?.id, messages.length]);

  useEffect(() => {
    if (!conversationId) return;
    const socket = io(API_URL);
    socket.emit('join-conversation', conversationId);
    socket.on('new-message', (msg) => {
      if (msg.conversationId === conversationId) {
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      }
    });
    return () => {
      socket.emit('leave-conversation', conversationId);
      socket.disconnect();
    };
  }, [conversationId]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const cleanText = text.trim();
      if ((!cleanText && !attachment) || !user || !conversation) return;
      const senderType = user.id === conversation.clientId ? 'client' : 'provider';
      const recipientId = senderType === 'client' ? conversation.providerId : conversation.clientId;
      let uploadedAttachment = null;

      if (attachment?.file) {
        const url = await api.uploadFile(attachment.file);
        uploadedAttachment = {
          url,
          type: attachment.type,
          name: attachment.file.name,
          mimeType: attachment.file.type,
        };
      }

      const messageLabel = cleanText
        || (uploadedAttachment?.type === 'audio' ? 'Áudio enviado' : 'Imagem enviada');

      await api.entities.Message.create({
        conversationId,
        senderId: user.id,
        senderName: user.fullName || user.full_name,
        senderType,
        content: cleanText,
        text: cleanText,
        attachments: uploadedAttachment ? [uploadedAttachment] : [],
        read: false,
      });

      await api.entities.Conversation.update(conversationId, {
        lastMessage: messageLabel,
        lastMessageTime: new Date().toISOString(),
        lastSenderType: senderType,
        providerUnreadCount: senderType === 'client'
          ? (conversation.providerUnreadCount || 0) + 1
          : 0,
        clientUnreadCount: senderType === 'provider'
          ? (conversation.clientUnreadCount || 0) + 1
          : 0,
      });

      await api.entities.Notification.create({
        userId: recipientId,
        type: 'new_message',
        title: 'Nova mensagem no chat',
        body: `${user.fullName || user.full_name} respondeu sua conversa.`,
        description: `${user.fullName || user.full_name} respondeu sua conversa.`,
        data: { relatedId: conversationId },
        relatedId: conversationId,
        read: false,
      });

      if (senderType === 'provider') {
        api.progress.notifyMessage(conversationId, cleanText || null);
      }
    },
    onSuccess: () => {
      setText('');
      setAttachment(null);
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    },
  });

  const handleMicClick = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mr = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.includes('webm') ? 'webm' : 'm4a';
        const file = new File([blob], `audio.${ext}`, { type: mimeType });
        setAttachment({ file, type: 'audio', previewUrl: URL.createObjectURL(blob) });
        setRecording(false);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  };

  const handleAttachmentSelect = (event, type) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setAttachment({
      file,
      type,
      previewUrl: URL.createObjectURL(file),
    });
  };

  const isClient = user?.id === conversation?.clientId;
  const audience = isClient ? 'client' : 'provider';
  const supportPath = isClient ? '/client/support' : '/provider/support';

  const handleOpenSupport = () => {
    if (!conversation) return;
    navigate(supportPath, {
      state: buildSupportComposerState(
        buildConversationSupportDraft({
          audience,
          conversation,
          request: requestQuery.data || null,
        })
      ),
    });
  };

  const handleMarkComplete = async () => {
    if (!confirm('Marcar este serviço como concluído?')) return;
    await api.entities.Conversation.update(conversationId, { status: 'completed' });
    if (conversation?.serviceRequestId) {
      await api.entities.ServiceRequest.update(conversation.serviceRequestId, { status: 'completed' });
      const interests = await api.entities.ServiceRequestInterest.filter({
        serviceRequestId: conversation.serviceRequestId,
        providerId: conversation.providerId,
      });
      if (interests[0]) {
        await api.entities.ServiceRequestInterest.update(interests[0].id, { status: 'completed' });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    setShowReview(true);
  };

  if (!user || conversationQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (conversationQuery.isError || !conversation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-foreground">Acesso negado</h1>
            <p className="text-sm text-muted-foreground">
              {conversationQuery.error?.message || 'Voce nao tem acesso a esta conversa ou ela nao existe mais.'}
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const otherName = user.id === conversation.clientId ? conversation.providerName : conversation.clientName;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold text-foreground text-sm truncate">{otherName || 'Conversa'}</h1>
          <p className="text-xs text-muted-foreground truncate">Chat do pedido</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenSupport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            <LifeBuoy className="w-3.5 h-3.5" /> Suporte
          </button>
          {isClient && conversation.status === 'active' && (
            <button
              onClick={handleMarkComplete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Concluído
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3 max-w-lg mx-auto w-full">
        {messagesQuery.isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Nao foi possivel carregar as mensagens desta conversa agora.
          </div>
        )}
        {messages.map((message) => {
          if (message.senderType === 'system') {
            return (
              <div key={message.id} className="flex justify-center my-1">
                <span className="text-xs text-muted-foreground bg-secondary/70 border border-border px-3 py-1.5 rounded-full text-center max-w-[80%]">
                  {message.text || message.content}
                </span>
              </div>
            );
          }
          const isProviderMsg = message.senderType === 'provider';
          const isRight = !isProviderMsg; // client → right, provider → left
          return (
            <div key={message.id} className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isRight ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card border border-border text-foreground rounded-bl-sm'}`}>
                {message.attachments?.map((item, index) => (
                  <div key={`${item.url}-${index}`} className="mb-2">
                    {item.type === 'image' ? (
                      <img
                        src={item.url}
                        alt={item.name || 'Imagem enviada'}
                        className="max-h-64 rounded-xl object-cover"
                      />
                    ) : item.type === 'audio' ? (
                      <audio controls src={item.url} className="max-w-full" />
                    ) : (
                      <a href={item.url} target="_blank" rel="noreferrer" className="text-sm underline">
                        {item.name || 'Abrir anexo'}
                      </a>
                    )}
                  </div>
                ))}
                {(message.text || message.content) && (
                  <p className="text-sm whitespace-pre-wrap">{message.text || message.content}</p>
                )}
                <div className={`flex items-center gap-1 justify-end mt-1`}>
                  <p className={`text-[10px] ${isRight ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {new Date(message.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {message.senderId === user?.id && (
                    <span className={`text-[10px] font-bold leading-none ${message.read ? 'text-blue-400' : (isRight ? 'text-primary-foreground/50' : 'text-muted-foreground')}`}>
                      {message.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {conversation.status === 'closed' && (
          <div className="mx-2 my-2 p-4 bg-secondary/60 border border-border rounded-xl text-center">
            <Lock className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">Conversa encerrada</p>
            <p className="text-xs text-muted-foreground mt-1">
              O cliente já escolheu outro profissional para este serviço.
            </p>
          </div>
        )}
        {isClient && conversation.status === 'completed' && existingReviews.length === 0 && (
          <div className="mx-2 my-2 p-4 bg-card border border-border rounded-xl text-center">
            <p className="text-sm font-semibold text-foreground mb-1">Serviço concluído!</p>
            <p className="text-xs text-muted-foreground mb-3">
              Deixe uma avaliação para {conversation.providerName}
            </p>
            <button
              onClick={() => setShowReview(true)}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Avaliar serviço
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {conversation.status === 'completed' ? (
        <div className="sticky bottom-0 bg-background border-t border-border px-4 py-4 text-center">
          <p className="text-sm text-muted-foreground">Este serviço foi concluído.</p>
        </div>
      ) : conversation.status === 'closed' ? (
        <div className="sticky bottom-0 bg-background border-t border-border px-4 py-4 text-center flex items-center justify-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Conversa encerrada</p>
        </div>
      ) : (
        <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3">
          <div className="max-w-lg mx-auto space-y-2">
            {attachment && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
                {attachment.type === 'image' ? (
                  <img src={attachment.previewUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Mic className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{attachment.file.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {attachment.type === 'audio' ? 'Áudio pronto para envio' : 'Imagem pronta para envio'}
                  </p>
                </div>
                <button
                  onClick={() => setAttachment(null)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => handleAttachmentSelect(event, 'image')}
              />
              <button
                onClick={() => imageInputRef.current?.click()}
                className="w-11 h-12 rounded-xl border border-border bg-card text-muted-foreground flex items-center justify-center hover:text-foreground"
                title="Enviar imagem"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleMicClick}
                className={`w-11 h-12 rounded-xl border flex items-center justify-center transition-colors ${
                  recording
                    ? 'bg-red-500 border-red-500 text-white animate-pulse'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
                title={recording ? 'Parar gravação' : 'Gravar áudio'}
              >
                <Mic className="w-5 h-5" />
              </button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={1}
              className="flex-1 px-4 py-3 border border-border rounded-xl bg-card text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={() => sendMutation.mutate()}
              disabled={(!text.trim() && !attachment) || sendMutation.isPending}
              className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
            >
              {sendMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
            </div>
          </div>
        </div>
      )}

      {showReview && (
        <ReviewModal
          conversation={conversation}
          onClose={() => setShowReview(false)}
          onReviewed={() => {
            setShowReview(false);
            queryClient.invalidateQueries({ queryKey: ['review', conversationId] });
          }}
        />
      )}
    </div>
  );
}
