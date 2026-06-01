import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, MapPin, ChevronRight, CheckCircle2, MessageCircle } from 'lucide-react';

const LOGO_URL = "https://media.base44.com/images/public/6a1cd8a8428cf973557907e8/947386a2f_ChatGPT_Image_27_de_mai_de_2026__10_42_43-removebg-preview.png";

const STATUS_LABELS = {
  open: { label: 'AGUARDANDO', color: 'text-orange-500' },
  in_conversation: { label: 'EM CONVERSA', color: 'text-blue-500' },
  agreed: { label: 'ACORDADO', color: 'text-green-600' },
  completed: { label: 'CONCLUÍDO', color: 'text-muted-foreground' },
  cancelled: { label: 'CANCELADO', color: 'text-destructive' },
};

export default function ClientOrders() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    base44.auth.me().then((u) => setUserId(u.id)).catch(console.error);
  }, []);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['my-orders', userId],
    queryFn: () => base44.entities.ServiceRequest.filter({ created_by_id: userId }, '-created_date'),
    enabled: !!userId,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['client-conversations', userId],
    queryFn: () => base44.entities.Conversation.filter({ clientId: userId }, '-lastMessageTime'),
    enabled: !!userId,
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <img src={LOGO_URL} alt="ServiLocal" className="w-6 h-6 object-contain" />
          <span className="text-sm font-semibold text-foreground">Servi<span className="font-bold">Local</span></span>
        </div>
        <button
          onClick={() => base44.auth.logout('/')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-secondary/50 transition-colors"
        >
          ⤳ Sair
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Sub header */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-2 mb-1">
            <img src={LOGO_URL} alt="ServiLocal" className="w-5 h-5 object-contain" />
            <span className="text-sm font-semibold text-foreground">Servi<span className="font-bold">Local</span></span>
          </div>
        </div>

        {/* Title */}
        <h1 className="font-heading text-2xl font-bold text-foreground mb-1">Meus pedidos</h1>
        <p className="text-sm text-primary mb-6">Pedidos confirmados aparecem aqui.</p>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p>
            <Link to="/client/services" className="mt-4 inline-block text-sm font-medium text-primary hover:opacity-80">
              Publicar meu primeiro pedido →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const status = STATUS_LABELS[req.status] || STATUS_LABELS.open;
              const conversation = conversations.find((item) => item.serviceRequestId === req.id);
              return (
                <div key={req.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <Link
                    to={`/client/request/${req.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-secondary/20 transition-colors"
                  >
                    <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{req.title}</p>
                        <span className={`text-xs font-bold ${status.color}`}>{status.label}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground truncate">
                          {req.neighborhood ? `${req.neighborhood}, ` : ''}{req.city}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Link>
                  {req.status !== 'completed' && req.status !== 'cancelled' && (
                    <div className="border-t border-border px-4 py-2 flex gap-2">
                      {conversation && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/chat/${conversation.id}`);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg py-2 hover:bg-primary/5 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Conversar
                        </button>
                      )}
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          if (confirm('Tem certeza que deseja cancelar este pedido?')) {
                            await base44.entities.ServiceRequest.update(req.id, { status: 'cancelled' });
                            const [convs, interests] = await Promise.all([
                              base44.entities.Conversation.filter({ serviceRequestId: req.id }),
                              base44.entities.ServiceRequestInterest.filter({ serviceRequestId: req.id }),
                            ]);
                            await Promise.all([
                              ...convs.map(c => base44.entities.Conversation.update(c.id, { status: 'cancelled' })),
                              ...interests.map(i => base44.entities.ServiceRequestInterest.update(i.id, { status: 'cancelled' })),
                            ]);
                          }
                        }}
                        className="flex-1 text-xs font-medium text-red-600 border border-red-200 rounded-lg py-2 hover:bg-red-50 transition-colors"
                      >
                        Cancelar pedido
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <Link to="/client" className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground transition-colors">
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