import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { io } from 'socket.io-client';
import { api, API_URL } from '@/api/apiClient';
import ReviewModal from '@/components/ReviewModal';

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const bottomRef = useRef(null);
  const [user, setUser] = useState(null);
  const [text, setText] = useState('');
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate('/'));
  }, []);

  const { data: conversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => api.entities.Conversation.get(conversationId),
    enabled: !!conversationId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => api.entities.Message.filter({ conversationId }, 'created_date'),
    enabled: !!conversationId,
  });

  const { data: existingReviews = [] } = useQuery({
    queryKey: ['review', conversationId],
    queryFn: () => api.entities.ProviderReview.filter({ conversationId }),
    enabled: !!conversationId,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!user || !conversation || messages.length === 0) return;
    const unread = messages.filter((message) => message.senderId !== user.id && !message.read);
    if (unread.length === 0) return;

    Promise.all(unread.map((message) => api.entities.Message.update(message.id, { read: true }))).then(() => {
      api.entities.Conversation.update(conversation.id, { unreadCount: 0 });
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
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
      if (!cleanText || !user || !conversation) return;
      const senderType = user.id === conversation.clientId ? 'client' : 'provider';
      const recipientId = senderType === 'client' ? conversation.providerId : conversation.clientId;

      await api.entities.Message.create({
        conversationId,
        senderId: user.id,
        senderName: user.fullName || user.full_name,
        senderType,
        text: cleanText,
        read: false,
      });

      await api.entities.Conversation.update(conversationId, {
        lastMessage: cleanText,
        lastMessageTime: new Date().toISOString(),
        unreadCount: (conversation.unreadCount || 0) + 1,
      });

      await api.entities.Notification.create({
        userId: recipientId,
        type: 'new_message',
        title: 'Nova mensagem no chat',
        description: `${user.fullName || user.full_name} respondeu sua conversa.`,
        relatedId: conversationId,
        read: false,
      });
    },
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    },
  });

  const isClient = user?.id === conversation?.clientId;

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

  if (!user || !conversation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
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
        {isClient && conversation.status === 'active' && (
          <button
            onClick={handleMarkComplete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors shrink-0"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Concluído
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3 max-w-lg mx-auto w-full">
        {messages.map((message) => {
          const mine = message.senderId === user.id;
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${mine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card border border-border text-foreground rounded-bl-sm'}`}>
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                <p className={`text-[10px] mt-1 ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {new Date(message.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
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
      ) : (
        <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3">
          <div className="max-w-lg mx-auto flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={1}
              className="flex-1 px-4 py-3 border border-border rounded-xl bg-card text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={() => sendMutation.mutate()}
              disabled={!text.trim() || sendMutation.isPending}
              className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
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